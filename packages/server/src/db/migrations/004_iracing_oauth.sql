-- =====================================================================
-- iRacing OAuth Integration Migration
-- Migration: 004_iracing_oauth.sql
-- =====================================================================

-- ========================
-- iRacing OAuth Tokens Table
-- ========================
-- Stores encrypted OAuth tokens for iRacing Data API access
-- Each Ok,Box Box user can link exactly one iRacing account

CREATE TABLE IF NOT EXISTS iracing_oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    
    -- iRacing identity (from id_token or member/info endpoint)
    iracing_customer_id VARCHAR(50) NOT NULL,
    iracing_display_name VARCHAR(255),
    
    -- Encrypted tokens (AES-256-GCM)
    -- We store access + refresh together, encrypted as a single blob
    tokens_encrypted BYTEA NOT NULL,
    encryption_iv BYTEA NOT NULL,        -- Unique IV per encryption
    encryption_auth_tag BYTEA NOT NULL,  -- GCM authentication tag
    
    -- Token metadata (stored unencrypted for query efficiency)
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token_expires_at TIMESTAMPTZ,  -- May be null if not provided
    scopes TEXT[],  -- Granted scopes
    
    -- Status tracking
    is_valid BOOLEAN DEFAULT true,
    last_refresh_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    -- Each Ok,Box Box user can only link one iRacing account
    UNIQUE(admin_user_id),
    -- Each iRacing account can only be linked to one Ok,Box Box user
    UNIQUE(iracing_customer_id)
);

-- Update iracing_account_links to add OAuth-related fields
-- (This table already exists from 003_licensing_auth.sql)
ALTER TABLE iracing_account_links 
    ADD COLUMN IF NOT EXISTS oauth_token_id UUID REFERENCES iracing_oauth_tokens(id) ON DELETE SET NULL;

-- ========================
-- Indexes
-- ========================

CREATE INDEX IF NOT EXISTS idx_iracing_oauth_user 
    ON iracing_oauth_tokens(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_iracing_oauth_customer 
    ON iracing_oauth_tokens(iracing_customer_id);

CREATE INDEX IF NOT EXISTS idx_iracing_oauth_expires 
    ON iracing_oauth_tokens(access_token_expires_at) 
    WHERE is_valid = true;

CREATE INDEX IF NOT EXISTS idx_iracing_oauth_valid 
    ON iracing_oauth_tokens(is_valid);

-- Note: Partial index for tokens needing refresh removed
-- NOW() is not immutable so can't be used in index predicates
-- Use application-level queries with current timestamp instead

-- ========================
-- Functions
-- ========================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_iracing_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_iracing_oauth_updated_at ON iracing_oauth_tokens;
CREATE TRIGGER trigger_iracing_oauth_updated_at
    BEFORE UPDATE ON iracing_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_iracing_oauth_updated_at();

-- ========================
-- Comments
-- ========================

COMMENT ON TABLE iracing_oauth_tokens IS 
    'Stores encrypted OAuth tokens for iRacing Data API access';

COMMENT ON COLUMN iracing_oauth_tokens.tokens_encrypted IS 
    'AES-256-GCM encrypted JSON containing access_token and refresh_token';

COMMENT ON COLUMN iracing_oauth_tokens.encryption_iv IS 
    '16-byte initialization vector, unique per row, generated at encryption time';

COMMENT ON COLUMN iracing_oauth_tokens.encryption_auth_tag IS 
    'GCM authentication tag for integrity verification';

COMMENT ON COLUMN iracing_oauth_tokens.is_valid IS 
    'Set to false when tokens are revoked or refresh fails';
