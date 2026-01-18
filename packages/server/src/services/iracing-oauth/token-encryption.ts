// =====================================================================
// Token Encryption Utilities
// AES-256-GCM encryption for iRacing OAuth tokens at rest
// =====================================================================

import crypto from 'crypto';
import { IRacingTokens, EncryptedTokenBundle } from './types';

// Environment variable for encryption key (32 bytes hex = 64 chars)
const ENCRYPTION_KEY_HEX = process.env.IRACING_TOKEN_ENCRYPTION_KEY;

// AES-256-GCM constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;  // 128 bits

/**
 * Get the encryption key from environment, with validation
 */
function getEncryptionKey(): Buffer {
    if (!ENCRYPTION_KEY_HEX) {
        throw new Error(
            'IRACING_TOKEN_ENCRYPTION_KEY environment variable is not set. ' +
            'Generate with: openssl rand -hex 32'
        );
    }

    if (ENCRYPTION_KEY_HEX.length !== 64) {
        throw new Error(
            'IRACING_TOKEN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
            'Generate with: openssl rand -hex 32'
        );
    }

    return Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
}

/**
 * Encrypt OAuth tokens for database storage
 * Uses AES-256-GCM with a unique IV per encryption
 * 
 * @param tokens - The access and refresh tokens to encrypt
 * @returns Encrypted bundle with ciphertext, IV, and auth tag
 */
export function encryptTokens(tokens: IRacingTokens): EncryptedTokenBundle {
    const key = getEncryptionKey();

    // Generate a unique IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Serialize tokens to JSON
    const plaintext = JSON.stringify({
        access: tokens.accessToken,
        refresh: tokens.refreshToken
    });

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
        encrypted,
        iv,
        authTag
    };
}

/**
 * Decrypt OAuth tokens from database storage
 * 
 * @param bundle - The encrypted bundle from database
 * @returns Decrypted tokens
 * @throws Error if decryption fails (invalid key, tampered data, etc.)
 */
export function decryptTokens(bundle: EncryptedTokenBundle): IRacingTokens {
    const key = getEncryptionKey();

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, bundle.iv);
    decipher.setAuthTag(bundle.authTag);

    // Decrypt
    const decrypted = Buffer.concat([
        decipher.update(bundle.encrypted),
        decipher.final()
    ]).toString('utf8');

    // Parse JSON
    const parsed = JSON.parse(decrypted);

    return {
        accessToken: parsed.access,
        refreshToken: parsed.refresh
    };
}

/**
 * Decrypt tokens from individual database columns
 * Convenience wrapper for decryptTokens
 */
export function decryptTokensFromDB(
    encrypted: Buffer,
    iv: Buffer,
    authTag: Buffer
): IRacingTokens {
    return decryptTokens({ encrypted, iv, authTag });
}

/**
 * Verify the encryption key is properly configured
 * Call during application startup to fail fast
 */
export function verifyEncryptionKeyConfigured(): void {
    try {
        getEncryptionKey();
    } catch (error) {
        console.error('[IRacing OAuth] Encryption key validation failed:', error);
        throw error;
    }
}

/**
 * Generate a new encryption key (for documentation/setup purposes)
 * NOT for runtime use - use the environment variable
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}
