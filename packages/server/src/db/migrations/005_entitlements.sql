-- =====================================================================
-- Migration 005: Entitlements
-- Tracks paid access from Squarespace subscriptions/orders
-- =====================================================================

CREATE TABLE IF NOT EXISTS entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner (user-level or org-level entitlement)
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES orgs(id) ON DELETE SET NULL,
    
    -- Product/bundle being entitled
    product VARCHAR(50) NOT NULL CHECK (product IN ('blackbox', 'controlbox', 'bundle')),
    
    -- Status of entitlement
    status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'trial', 'past_due', 'canceled', 'expired', 'pending')),
    
    -- Time boundaries
    start_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    renewed_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    
    -- External billing source
    source VARCHAR(50) NOT NULL DEFAULT 'squarespace',
    external_customer_id VARCHAR(255),
    external_subscription_id VARCHAR(255),
    external_order_id VARCHAR(255),
    external_customer_email VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure at least one owner
    CONSTRAINT entitlement_has_owner CHECK (user_id IS NOT NULL OR org_id IS NOT NULL)
);

-- Indexes for lookup
CREATE INDEX IF NOT EXISTS idx_entitlements_user_id ON entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_org_id ON entitlements(org_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_status ON entitlements(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_product ON entitlements(product);
CREATE INDEX IF NOT EXISTS idx_entitlements_external_email ON entitlements(external_customer_email);
CREATE INDEX IF NOT EXISTS idx_entitlements_external_order ON entitlements(external_order_id);

-- =====================================================================
-- Migration 005b: Entitlement Audit Log
-- Tracks all changes to entitlements with source payload
-- =====================================================================

CREATE TABLE IF NOT EXISTS entitlement_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What changed
    entitlement_id UUID REFERENCES entitlements(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- created, activated, renewed, canceled, expired, manual_override
    
    -- Who/what triggered
    triggered_by VARCHAR(50) NOT NULL, -- webhook, poll, admin, system
    triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Previous and new state
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    
    -- External reference for debugging
    webhook_payload_id VARCHAR(255),
    external_order_id VARCHAR(255),
    
    -- Full context
    metadata JSONB,
    
    -- When
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entitlement_audit_entitlement_id ON entitlement_audit_log(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_action ON entitlement_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_entitlement_audit_created_at ON entitlement_audit_log(created_at);

-- =====================================================================
-- Migration 005c: Pending Entitlements (identity linking failures)
-- Records purchases where we couldn't match a user
-- =====================================================================

CREATE TABLE IF NOT EXISTS pending_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What product was purchased
    product VARCHAR(50) NOT NULL,
    
    -- External billing info
    external_customer_email VARCHAR(255) NOT NULL,
    external_customer_id VARCHAR(255),
    external_order_id VARCHAR(255) NOT NULL,
    external_subscription_id VARCHAR(255),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'linked', 'expired', 'manual')),
    
    -- Attempted user match
    attempted_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pending_entitlements_email ON pending_entitlements(external_customer_email);
CREATE INDEX IF NOT EXISTS idx_pending_entitlements_status ON pending_entitlements(status);
