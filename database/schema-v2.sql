-- =============================================
-- KYC Adapter Database Schema v2.0
-- Based on comprehensive tenant-account-inquiry model
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- TENANT MANAGEMENT
-- =============================================

-- Tenants (formerly clients) - Multi-tenant KYC platform
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    email VARCHAR(255) NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tenant API Keys - Multiple keys per tenant with expiration
CREATE TABLE tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Production", "Staging", "Development"
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- SHA-256 hashed API key
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- END USER ACCOUNTS
-- =============================================

-- Accounts - End users who undergo verification
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference_id VARCHAR(255), -- Tenant's internal reference
    name JSONB, -- { "first": "John", "middle": "", "last": "Doe" }
    email VARCHAR(255),
    phone VARCHAR(50),
    birthdate DATE,
    address JSONB, -- { "street": "", "city": "", "state": "", "country": "", "postal_code": "" }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INQUIRY SYSTEM
-- =============================================

-- Inquiry Templates - Configurable verification flows per tenant
CREATE TABLE inquiry_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    configuration JSONB NOT NULL DEFAULT '{}', -- Verification requirements, document types, etc.
    ui_settings JSONB DEFAULT '{}', -- Branding, styling, flow customization
    business_rules JSONB DEFAULT '{}', -- Auto-approval rules, risk thresholds, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inquiries - Verification processes for accounts
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES inquiry_templates(id),
    status VARCHAR(50) NOT NULL DEFAULT 'created' CHECK (status IN (
        'created', 'pending', 'in_progress', 'completed', 'approved', 'declined', 'expired', 'cancelled'
    )),
    reference_id VARCHAR(255), -- Tenant's internal reference
    note TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inquiry Sessions - Active sessions within inquiries
CREATE TABLE inquiry_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed')),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- One-time verification links
CREATE TABLE one_time_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_session_id UUID NOT NULL REFERENCES inquiry_sessions(id) ON DELETE CASCADE,
    verification_url TEXT NOT NULL UNIQUE,
    token VARCHAR(255) NOT NULL UNIQUE, -- URL-safe token
    one_time_use BOOLEAN DEFAULT true,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- VERIFICATION RESULTS
-- =============================================

-- Verifications - Individual verification attempts
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'passed', 'failed', 'requires_review', 'cancelled'
    )),
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN (
        'document', 'biometric', 'address', 'phone', 'email', 'database'
    )),
    provider_name VARCHAR(50), -- e.g., 'regula', 'persona'
    provider_verification_id VARCHAR(255), -- Provider's internal ID
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    result_data JSONB DEFAULT '{}', -- Structured verification results
    raw_provider_response JSONB, -- Raw provider response for debugging
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- DOCUMENT STORAGE
-- =============================================

-- Documents - Uploaded files for verification
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    verification_id UUID REFERENCES verifications(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded' CHECK (status IN (
        'uploaded', 'processing', 'processed', 'approved', 'rejected', 'deleted'
    )),
    kind VARCHAR(50) NOT NULL, -- 'passport', 'driver_license', 'selfie', etc.
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_path TEXT, -- Storage path or URL
    byte_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64), -- File integrity check
    extracted_data JSONB, -- OCR/extracted information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- WEBHOOK SYSTEM
-- =============================================

-- Webhook configurations per tenant
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255), -- For signature verification
    enabled BOOLEAN DEFAULT true,
    events TEXT[] NOT NULL DEFAULT '{}', -- ['inquiry.completed', 'verification.passed', etc.]
    retry_attempts INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhook delivery logs
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    response_status_code INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- PROVIDER CONFIGURATION (from v1)
-- =============================================

-- Provider credentials (encrypted)
CREATE TABLE provider_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(100) NOT NULL UNIQUE,
    api_key_encrypted TEXT NOT NULL,
    api_url VARCHAR(500),
    additional_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tenant-specific provider configurations
CREATE TABLE tenant_provider_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_name VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    configuration JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, provider_name)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Tenant indexes
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_email ON tenants(email);

-- API Key indexes
CREATE INDEX idx_tenant_api_keys_tenant_id ON tenant_api_keys(tenant_id);
CREATE INDEX idx_tenant_api_keys_status ON tenant_api_keys(status);
CREATE INDEX idx_tenant_api_keys_expires_at ON tenant_api_keys(expires_at);
CREATE UNIQUE INDEX idx_tenant_api_keys_key_hash ON tenant_api_keys(key_hash);

-- Account indexes
CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX idx_accounts_reference_id ON accounts(tenant_id, reference_id);
CREATE INDEX idx_accounts_email ON accounts(tenant_id, email);

-- Inquiry indexes
CREATE INDEX idx_inquiries_tenant_id ON inquiries(tenant_id);
CREATE INDEX idx_inquiries_account_id ON inquiries(account_id);
CREATE INDEX idx_inquiries_template_id ON inquiries(template_id);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_reference_id ON inquiries(tenant_id, reference_id);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at);

-- Session indexes
CREATE INDEX idx_inquiry_sessions_inquiry_id ON inquiry_sessions(inquiry_id);
CREATE INDEX idx_inquiry_sessions_status ON inquiry_sessions(status);
CREATE INDEX idx_inquiry_sessions_expires_at ON inquiry_sessions(expires_at);

-- One-time link indexes
CREATE INDEX idx_one_time_links_session_id ON one_time_links(inquiry_session_id);
CREATE INDEX idx_one_time_links_token ON one_time_links(token);
CREATE INDEX idx_one_time_links_expires_at ON one_time_links(expires_at);
CREATE INDEX idx_one_time_links_used ON one_time_links(used, expires_at);

-- Verification indexes
CREATE INDEX idx_verifications_inquiry_id ON verifications(inquiry_id);
CREATE INDEX idx_verifications_account_id ON verifications(account_id);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_type ON verifications(verification_type);
CREATE INDEX idx_verifications_provider ON verifications(provider_name);
CREATE INDEX idx_verifications_completed_at ON verifications(completed_at);

-- Document indexes
CREATE INDEX idx_documents_account_id ON documents(account_id);
CREATE INDEX idx_documents_inquiry_id ON documents(inquiry_id);
CREATE INDEX idx_documents_verification_id ON documents(verification_id);
CREATE INDEX idx_documents_kind ON documents(kind);
CREATE INDEX idx_documents_status ON documents(status);

-- Webhook indexes
CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_enabled ON webhooks(enabled);
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_api_keys_updated_at BEFORE UPDATE ON tenant_api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inquiry_templates_updated_at BEFORE UPDATE ON inquiry_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inquiry_sessions_updated_at BEFORE UPDATE ON inquiry_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verifications_updated_at BEFORE UPDATE ON verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_credentials_updated_at BEFORE UPDATE ON provider_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_provider_configs_updated_at BEFORE UPDATE ON tenant_provider_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Function to cleanup expired sessions and links
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired sessions and their links
    WITH deleted AS (
        DELETE FROM inquiry_sessions 
        WHERE status = 'active' AND expires_at < CURRENT_TIMESTAMP
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;
    
    -- Delete expired one-time links
    DELETE FROM one_time_links 
    WHERE expires_at < CURRENT_TIMESTAMP AND used = false;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE tenants IS 'Multi-tenant organizations using the KYC platform';
COMMENT ON TABLE tenant_api_keys IS 'API keys for tenant authentication with expiration support';
COMMENT ON TABLE accounts IS 'End users who undergo verification processes';
COMMENT ON TABLE inquiry_templates IS 'Configurable verification workflows per tenant';
COMMENT ON TABLE inquiries IS 'Verification processes for accounts based on templates';
COMMENT ON TABLE inquiry_sessions IS 'Active sessions for one-time link access';
COMMENT ON TABLE one_time_links IS 'Secure one-time verification links for end users';
COMMENT ON TABLE verifications IS 'Individual verification attempts and results';
COMMENT ON TABLE documents IS 'Uploaded documents for verification';
COMMENT ON TABLE webhooks IS 'Webhook configurations for tenant notifications';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and status'; 