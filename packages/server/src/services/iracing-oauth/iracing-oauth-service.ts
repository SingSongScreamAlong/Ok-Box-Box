// =====================================================================
// iRacing OAuth Service
// Authorization Code + PKCE flow for iRacing Data API access
// =====================================================================

import crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';
import { pool } from '../../db/client.js';
import {
    IRacingTokens,
    IRacingIdentity,
    IRacingTokenResponse,
    OAuthState,
    OAuthFlowStart,
    OAuthCallbackResult,
    StoredIRacingToken,
    IRacingAccountLink
} from './types';
import { encryptTokens, decryptTokensFromDB } from './token-encryption';

// =====================================================================
// Configuration
// =====================================================================

const IRACING_OAUTH_BASE_URL = process.env.IRACING_OAUTH_BASE_URL || 'https://oauth.iracing.com';
const IRACING_CLIENT_ID = process.env.IRACING_CLIENT_ID || 'okboxbox';
const IRACING_CLIENT_SECRET = process.env.IRACING_CLIENT_SECRET;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redirect URIs by environment
const REDIRECT_URIS: Record<string, string> = {
    production: 'https://app.okboxbox.com/oauth/iracing/callback',
    staging: 'https://staging.okboxbox.com/oauth/iracing/callback',
    development: 'http://localhost:3001/oauth/iracing/callback'
};

// OAuth state TTL in Redis (10 minutes)
const STATE_TTL_SECONDS = 600;

// Access token refresh buffer (5 minutes before expiry)
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// =====================================================================
// Redis Client
// =====================================================================

let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType> {
    if (!redisClient) {
        redisClient = createClient({ url: REDIS_URL });
        redisClient.on('error', (err) => console.error('[IRacing OAuth] Redis error:', err));
        await redisClient.connect();
    }
    return redisClient;
}

// =====================================================================
// PKCE Helpers
// =====================================================================

/**
 * Generate cryptographically secure state for CSRF protection
 */
function generateState(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate PKCE code_verifier (RFC 7636)
 * 43-128 characters, URL-safe base64
 */
function generateCodeVerifier(): string {
    return crypto.randomBytes(32)
        .toString('base64url')
        .replace(/=/g, '');
}

/**
 * Generate code_challenge from verifier using SHA-256
 */
function generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256')
        .update(verifier)
        .digest('base64url')
        .replace(/=/g, '');
}

/**
 * Get redirect URI based on environment
 */
function getRedirectUri(): string {
    const env = process.env.NODE_ENV || 'development';
    return REDIRECT_URIS[env] || REDIRECT_URIS.development;
}

// =====================================================================
// OAuth Service Class
// =====================================================================

export class IRacingOAuthService {

    // -----------------------------------------------------------------
    // Flow Initiation
    // -----------------------------------------------------------------

    /**
     * Start the OAuth authorization flow for a user
     * Generates state and PKCE, stores in Redis, returns authorization URL
     */
    async startOAuthFlow(userId: string): Promise<OAuthFlowStart> {
        if (!IRACING_CLIENT_SECRET) {
            throw new Error('IRACING_CLIENT_SECRET is not configured');
        }

        const state = generateState();
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        const redirectUri = getRedirectUri();

        // Store state in Redis with TTL
        const redis = await getRedisClient();
        const stateData: OAuthState = {
            codeVerifier,
            userId,
            createdAt: Date.now(),
            redirectUri
        };

        await redis.setEx(
            `oauth:iracing:${state}`,
            STATE_TTL_SECONDS,
            JSON.stringify(stateData)
        );

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: IRACING_CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: 'code',
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            scope: 'openid'  // Request id_token for identity
        });

        const authorizationUrl = `${IRACING_OAUTH_BASE_URL}/authorize?${params.toString()}`;

        console.log(`[IRacing OAuth] Started flow for user ${userId}, state=${state.substring(0, 8)}...`);

        return { authorizationUrl, state };
    }

    // -----------------------------------------------------------------
    // Callback Handling
    // -----------------------------------------------------------------

    /**
     * Handle the OAuth callback from iRacing
     * Validates state, exchanges code for tokens, stores encrypted tokens
     */
    async handleCallback(code: string, state: string): Promise<OAuthCallbackResult> {
        const redis = await getRedisClient();

        // Retrieve and validate state from Redis
        const stateKey = `oauth:iracing:${state}`;
        const stateDataJson = await redis.get(stateKey);

        if (!stateDataJson) {
            console.error('[IRacing OAuth] Invalid or expired state');
            return { success: false, error: 'Invalid or expired authorization state' };
        }

        // Delete state immediately (one-time use)
        await redis.del(stateKey);

        const stateData: OAuthState = JSON.parse(stateDataJson);

        try {
            // Exchange code for tokens
            const tokenResponse = await this.exchangeCodeForTokens(
                code,
                stateData.codeVerifier,
                stateData.redirectUri
            );

            // Extract identity from id_token or fetch from member API
            let identity: IRacingIdentity;
            if (tokenResponse.id_token) {
                identity = this.extractIdentityFromIdToken(tokenResponse.id_token);
            } else {
                identity = await this.fetchMemberInfo(tokenResponse.access_token);
            }

            // Store encrypted tokens in database
            await this.storeTokens(
                stateData.userId,
                identity,
                tokenResponse
            );

            console.log(`[IRacing OAuth] Successfully linked iRacing account ${identity.customerId} to user ${stateData.userId}`);

            return { success: true, identity, userId: stateData.userId };

        } catch (error) {
            console.error('[IRacing OAuth] Callback error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Token exchange failed'
            };
        }
    }

    /**
     * Exchange authorization code for access and refresh tokens
     */
    private async exchangeCodeForTokens(
        code: string,
        codeVerifier: string,
        redirectUri: string
    ): Promise<IRacingTokenResponse> {
        const response = await fetch(`${IRACING_OAUTH_BASE_URL}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: IRACING_CLIENT_ID,
                client_secret: IRACING_CLIENT_SECRET!,
                code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[IRacing OAuth] Token exchange failed:', response.status, errorBody);
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        return response.json() as Promise<IRacingTokenResponse>;
    }

    /**
     * Extract iRacing identity from id_token JWT
     * Note: In production, validate signature against iRacing JWKS
     */
    private extractIdentityFromIdToken(idToken: string): IRacingIdentity {
        // Decode JWT payload (base64url)
        const parts = idToken.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid id_token format');
        }

        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf8')
        );

        return {
            customerId: payload.sub,
            displayName: payload.name || null,
            email: payload.email
        };
    }

    /**
     * Fetch member info from iRacing Data API (fallback if no id_token)
     */
    private async fetchMemberInfo(accessToken: string): Promise<IRacingIdentity> {
        const response = await fetch('https://members-ng.iracing.com/data/member/info', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch member info: ${response.status}`);
        }

        const data = await response.json() as { cust_id: number; display_name?: string };

        return {
            customerId: String(data.cust_id),
            displayName: data.display_name || null
        };
    }

    // -----------------------------------------------------------------
    // Token Storage
    // -----------------------------------------------------------------

    /**
     * Store encrypted tokens in database
     */
    private async storeTokens(
        userId: string,
        identity: IRacingIdentity,
        tokenResponse: IRacingTokenResponse
    ): Promise<void> {

        // Encrypt tokens
        const tokens: IRacingTokens = {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || ''
        };
        const encrypted = encryptTokens(tokens);

        // Calculate expiration time
        const accessTokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

        // Parse scopes
        const scopes = tokenResponse.scope ? tokenResponse.scope.split(' ') : null;

        // Upsert tokens (replace if user already has a link)
        await pool.query(
            `INSERT INTO iracing_oauth_tokens (
                admin_user_id,
                iracing_customer_id,
                iracing_display_name,
                tokens_encrypted,
                encryption_iv,
                encryption_auth_tag,
                access_token_expires_at,
                scopes,
                is_valid,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
            ON CONFLICT (admin_user_id) DO UPDATE SET
                iracing_customer_id = EXCLUDED.iracing_customer_id,
                iracing_display_name = EXCLUDED.iracing_display_name,
                tokens_encrypted = EXCLUDED.tokens_encrypted,
                encryption_iv = EXCLUDED.encryption_iv,
                encryption_auth_tag = EXCLUDED.encryption_auth_tag,
                access_token_expires_at = EXCLUDED.access_token_expires_at,
                scopes = EXCLUDED.scopes,
                is_valid = true,
                revoked_at = NULL,
                revoke_reason = NULL,
                updated_at = NOW()`,
            [
                userId,
                identity.customerId,
                identity.displayName,
                encrypted.encrypted,
                encrypted.iv,
                encrypted.authTag,
                accessTokenExpiresAt,
                scopes
            ]
        );
    }

    // -----------------------------------------------------------------
    // Token Retrieval and Refresh
    // -----------------------------------------------------------------

    /**
     * Get a valid access token for a user, refreshing if necessary
     * Returns null if no token exists or refresh failed
     */
    async getValidAccessToken(userId: string): Promise<string | null> {

        const result = await pool.query<StoredIRacingToken>(
            `SELECT * FROM iracing_oauth_tokens 
             WHERE admin_user_id = $1 AND is_valid = true`,
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];

        // Decrypt tokens
        const tokens = decryptTokensFromDB(
            row.tokensEncrypted,
            row.encryptionIv,
            row.encryptionAuthTag
        );

        // Check if access token expires within buffer window
        const expiresAt = new Date(row.accessTokenExpiresAt).getTime();
        const needsRefresh = expiresAt - Date.now() < REFRESH_BUFFER_MS;

        if (!needsRefresh) {
            // Token still valid, update last_used_at
            await pool.query(
                'UPDATE iracing_oauth_tokens SET last_used_at = NOW() WHERE id = $1',
                [row.id]
            );
            return tokens.accessToken;
        }

        // Token needs refresh
        console.log(`[IRacing OAuth] Refreshing token for user ${userId}`);
        return this.refreshAccessToken(userId, tokens.refreshToken);
    }

    /**
     * Refresh the access token using the refresh token
     */
    private async refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
        if (!refreshToken) {
            console.error('[IRacing OAuth] No refresh token available');
            await this.markTokenInvalid(userId, 'no_refresh_token');
            return null;
        }

        try {
            const response = await fetch(`${IRACING_OAUTH_BASE_URL}/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    client_id: IRACING_CLIENT_ID,
                    client_secret: IRACING_CLIENT_SECRET!,
                    refresh_token: refreshToken
                })
            });

            if (!response.ok) {
                console.error('[IRacing OAuth] Refresh failed:', response.status);
                await this.markTokenInvalid(userId, `refresh_failed_${response.status}`);
                return null;
            }

            const data = await response.json() as IRacingTokenResponse;

            // Re-encrypt with new tokens
            const newTokens: IRacingTokens = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token || refreshToken  // Use new or keep old
            };
            const encrypted = encryptTokens(newTokens);

            // Update database
            await pool.query(
                `UPDATE iracing_oauth_tokens 
                 SET tokens_encrypted = $1,
                     encryption_iv = $2,
                     encryption_auth_tag = $3,
                     access_token_expires_at = NOW() + INTERVAL '${data.expires_in} seconds',
                     last_refresh_at = NOW(),
                     updated_at = NOW()
                 WHERE admin_user_id = $4`,
                [encrypted.encrypted, encrypted.iv, encrypted.authTag, userId]
            );

            console.log(`[IRacing OAuth] Token refreshed for user ${userId}`);
            return data.access_token;

        } catch (error) {
            console.error('[IRacing OAuth] Refresh error:', error);
            await this.markTokenInvalid(userId, 'refresh_error');
            return null;
        }
    }

    /**
     * Mark a user's token as invalid
     */
    private async markTokenInvalid(userId: string, reason: string): Promise<void> {
        await pool.query(
            `UPDATE iracing_oauth_tokens 
             SET is_valid = false, revoked_at = NOW(), revoke_reason = $1, updated_at = NOW()
             WHERE admin_user_id = $2`,
            [reason, userId]
        );
    }

    // -----------------------------------------------------------------
    // Account Management
    // -----------------------------------------------------------------

    /**
     * Get linked iRacing account info for a user (safe for frontend)
     */
    async getLinkedAccount(userId: string): Promise<IRacingAccountLink | null> {

        const result = await pool.query(
            `SELECT iracing_customer_id, iracing_display_name, created_at, is_valid, last_used_at
             FROM iracing_oauth_tokens
             WHERE admin_user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            iracingCustomerId: row.iracing_customer_id,
            iracingDisplayName: row.iracing_display_name,
            linkedAt: row.created_at,
            isValid: row.is_valid,
            lastUsedAt: row.last_used_at
        };
    }

    /**
     * Revoke and delete a user's iRacing tokens
     */
    async revokeTokens(userId: string): Promise<void> {

        // We could call iRacing's revocation endpoint here if they have one
        // For now, just delete from our database

        await pool.query(
            'DELETE FROM iracing_oauth_tokens WHERE admin_user_id = $1',
            [userId]
        );

        console.log(`[IRacing OAuth] Revoked tokens for user ${userId}`);
    }

    /**
     * Check if a user has a valid iRacing link
     */
    async hasValidLink(userId: string): Promise<boolean> {

        const result = await pool.query(
            'SELECT 1 FROM iracing_oauth_tokens WHERE admin_user_id = $1 AND is_valid = true',
            [userId]
        );

        return result.rows.length > 0;
    }
}

// =====================================================================
// Singleton Instance
// =====================================================================

let serviceInstance: IRacingOAuthService | null = null;

export function getIRacingOAuthService(): IRacingOAuthService {
    if (!serviceInstance) {
        serviceInstance = new IRacingOAuthService();
    }
    return serviceInstance;
}

// =====================================================================
// Cleanup
// =====================================================================

export async function closeRedisConnection(): Promise<void> {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
