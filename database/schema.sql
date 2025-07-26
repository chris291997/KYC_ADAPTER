-- KYC Adapter Database Schema
-- PostgreSQL optimized for high-performance API key lookups and verification requests

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clients table - stores client information and API keys
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    api_key VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of actual API key
    api_key_hash VARCHAR(128) NOT NULL, -- Additional security layer
    is_active BOOLEAN NOT NULL DEFAULT true,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 100,
    rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Provider credentials table - stores encrypted API credentials for KYC providers
CREATE TABLE provider_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(50) NOT NULL, -- 'regula', 'persona', etc.
    credential_type VARCHAR(50) NOT NULL, -- 'api_key', 'client_secret', etc.
    encrypted_value TEXT NOT NULL, -- PGP encrypted credential
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(provider_name, credential_type)
);

-- Client provider configurations - maps clients to their assigned providers
CREATE TABLE client_provider_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    config_json JSONB, -- Provider-specific configuration (thresholds, etc.)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, provider_name)
);

-- Verification requests - audit log of all verification requests
CREATE TABLE verification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id),
    request_type VARCHAR(50) NOT NULL, -- 'document', 'biometric'
    provider_name VARCHAR(50) NOT NULL,
    provider_request_id VARCHAR(255), -- Provider's internal request ID
    status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    request_metadata JSONB, -- Original request data (sanitized)
    file_paths TEXT[], -- Paths to uploaded files (for cleanup)
    client_ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    processing_time_ms INTEGER
);

-- Verification results - stores results for audit and compliance
CREATE TABLE verification_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
    provider_response JSONB NOT NULL, -- Raw provider response
    standardized_result JSONB NOT NULL, -- Our standardized response format
    confidence_score DECIMAL(5,4), -- 0.0000 to 1.0000
    is_verified BOOLEAN,
    failure_reasons TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Rate limiting tracking - for API rate limiting per client
CREATE TABLE rate_limit_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_type VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day'
    request_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, window_start, window_type)
);

-- Performance Indexes --

-- Primary performance index: API key lookups (most frequent operation)
CREATE UNIQUE INDEX idx_clients_api_key ON clients(api_key);
CREATE INDEX idx_clients_api_key_active ON clients(api_key, is_active) WHERE is_active = true;

-- Client lookups and management
CREATE INDEX idx_clients_active ON clients(is_active) WHERE is_active = true;
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_last_used ON clients(last_used_at DESC);

-- Provider configuration lookups
CREATE INDEX idx_client_provider_configs_client ON client_provider_configs(client_id);
CREATE INDEX idx_client_provider_configs_provider ON client_provider_configs(provider_name);
CREATE INDEX idx_client_provider_configs_primary ON client_provider_configs(client_id, is_primary) WHERE is_primary = true;

-- Provider credentials lookups
CREATE INDEX idx_provider_credentials_provider ON provider_credentials(provider_name, is_active) WHERE is_active = true;

-- Verification requests - critical for performance and auditing
CREATE INDEX idx_verification_requests_client ON verification_requests(client_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_requests_created ON verification_requests(created_at DESC);
CREATE INDEX idx_verification_requests_client_created ON verification_requests(client_id, created_at DESC);
CREATE INDEX idx_verification_requests_provider ON verification_requests(provider_name);
CREATE INDEX idx_verification_requests_type ON verification_requests(request_type);

-- Composite index for common queries (client + status + time)
CREATE INDEX idx_verification_requests_composite ON verification_requests(client_id, status, created_at DESC);

-- Verification results lookups
CREATE INDEX idx_verification_results_request ON verification_results(request_id);
CREATE INDEX idx_verification_results_verified ON verification_results(is_verified);
CREATE INDEX idx_verification_results_confidence ON verification_results(confidence_score DESC);

-- Rate limiting indexes (critical for performance)
CREATE INDEX idx_rate_limit_client_window ON rate_limit_tracking(client_id, window_type, window_start DESC);
CREATE INDEX idx_rate_limit_cleanup ON rate_limit_tracking(window_start) WHERE window_start < NOW() - INTERVAL '24 hours';

-- Partial indexes for common filtered queries
CREATE INDEX idx_verification_requests_recent ON verification_requests(created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '30 days';

CREATE INDEX idx_verification_requests_failed ON verification_requests(client_id, created_at DESC) 
    WHERE status = 'failed';

-- Functions and Triggers --

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at timestamps
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_credentials_updated_at BEFORE UPDATE ON provider_credentials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_provider_configs_updated_at BEFORE UPDATE ON client_provider_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old rate limiting records
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limit_tracking 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ language 'plpgsql';

-- Sample data for testing (optional - remove in production)
-- INSERT INTO provider_credentials (provider_name, credential_type, encrypted_value) VALUES
-- ('regula', 'api_key', crypt('your-regula-api-key', gen_salt('bf')));

-- Performance optimization settings (add to postgresql.conf)
-- shared_preload_libraries = 'pg_stat_statements'
-- max_connections = 200
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100 