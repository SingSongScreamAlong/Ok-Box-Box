// =====================================================================
// iRacing OAuth Types
// TypeScript interfaces for OAuth integration
// =====================================================================

/**
 * Decrypted OAuth tokens
 */
export interface IRacingTokens {
    accessToken: string;
    refreshToken: string;
}

/**
 * Encrypted token bundle for database storage
 */
export interface EncryptedTokenBundle {
    encrypted: Buffer;
    iv: Buffer;
    authTag: Buffer;
}

/**
 * iRacing user identity extracted from id_token or member API
 */
export interface IRacingIdentity {
    customerId: string;
    displayName: string | null;
    email?: string;
}

/**
 * Token response from iRacing /oauth2/token endpoint
 */
export interface IRacingTokenResponse {
    access_token: string;
    refresh_token?: string;
    token_type: string;
    expires_in: number;
    id_token?: string;
    scope?: string;
}

/**
 * OAuth state stored in Redis during authorization flow
 */
export interface OAuthState {
    codeVerifier: string;
    userId: string;
    createdAt: number;
    redirectUri: string;
}

/**
 * Stored token record from database
 */
export interface StoredIRacingToken {
    id: string;
    adminUserId: string;
    iracingCustomerId: string;
    iracingDisplayName: string | null;
    tokensEncrypted: Buffer;
    encryptionIv: Buffer;
    encryptionAuthTag: Buffer;
    accessTokenExpiresAt: Date;
    refreshTokenExpiresAt: Date | null;
    scopes: string[] | null;
    isValid: boolean;
    lastRefreshAt: Date | null;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
    revokeReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Public iRacing account link info (safe to expose to frontend)
 */
export interface IRacingAccountLink {
    iracingCustomerId: string;
    iracingDisplayName: string | null;
    linkedAt: Date;
    isValid: boolean;
    lastUsedAt: Date | null;
}

/**
 * OAuth flow initiation result
 */
export interface OAuthFlowStart {
    authorizationUrl: string;
    state: string;
}

/**
 * OAuth callback result
 */
export interface OAuthCallbackResult {
    success: boolean;
    identity?: IRacingIdentity;
    error?: string;
}
