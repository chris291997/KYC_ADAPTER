# KYC Adapter Database Schema

## Overview
This PostgreSQL database schema is optimized for high-performance KYC verification requests with proper audit trails and compliance requirements.

## Core Tables

### `clients`
- **Purpose**: Store client information and API keys
- **Key Features**: 
  - SHA-256 hashed API keys for security
  - Built-in rate limiting configuration per client
  - Activity tracking with `last_used_at`
- **Performance**: Primary unique index on `api_key` for ultra-fast lookups

### `provider_credentials`
- **Purpose**: Store encrypted KYC provider API credentials (Regula, Persona)
- **Key Features**:
  - PGP encryption of sensitive credentials
  - Support for multiple credential types per provider
  - Active/inactive credential management
- **Security**: All credentials are encrypted at rest

### `client_provider_configs`
- **Purpose**: Map clients to their assigned KYC providers
- **Key Features**:
  - One provider per client (your business model)
  - JSONB config for provider-specific settings
  - Support for future multi-provider scenarios
- **Performance**: Indexed on client_id for fast provider lookups

### `verification_requests`
- **Purpose**: Audit log of all verification requests
- **Key Features**:
  - Complete request lifecycle tracking
  - Performance metrics (`processing_time_ms`)
  - File path tracking for cleanup
  - IP and user agent logging for security
- **Performance**: Multiple indexes for client, status, and time-based queries

### `verification_results`
- **Purpose**: Store verification results for compliance
- **Key Features**:
  - Both raw provider response and standardized format
  - Confidence scoring for ML-based decisions
  - Failure reason tracking
- **Compliance**: Required for KYC audit trails

### `rate_limit_tracking`
- **Purpose**: Real-time rate limiting per client
- **Key Features**:
  - Sliding window rate limiting
  - Multiple time windows (minute, hour, day)
  - Automatic cleanup of old records
- **Performance**: Optimized for high-frequency updates

## Performance Optimizations

### Critical Indexes
1. **API Key Lookups** - Most frequent operation
   ```sql
   CREATE UNIQUE INDEX idx_clients_api_key ON clients(api_key);
   ```

2. **Client Provider Lookups** - Second most frequent
   ```sql
   CREATE INDEX idx_client_provider_configs_client ON client_provider_configs(client_id);
   ```

3. **Verification History** - For dashboards and analytics
   ```sql
   CREATE INDEX idx_verification_requests_composite ON verification_requests(client_id, status, created_at DESC);
   ```

### Partial Indexes
- **Recent Requests**: Only index last 30 days for faster queries
- **Failed Requests**: Separate index for error analysis
- **Active Clients**: Filter inactive clients from common queries

### Query Optimization Features
- **JSONB columns** for flexible provider configurations
- **Composite indexes** for multi-column queries
- **Partial indexes** for filtered queries
- **Automatic timestamp updates** via triggers

## Security Features

### Data Protection
- **Encrypted credentials** using PostgreSQL's `pgcrypto`
- **Hashed API keys** with additional security layer
- **IP address logging** for security audit trails
- **File path tracking** for secure cleanup

### Access Control
- **Foreign key constraints** ensure data integrity
- **Unique constraints** prevent duplicate configurations
- **Check constraints** (can be added) for data validation

## Setup Instructions

### 1. Create Database
```bash
createdb kyc_adapter
```

### 2. Run Schema
```bash
psql -d kyc_adapter -f database/schema.sql
```

### 3. Verify Installation
```sql
-- Check tables
\dt

-- Check indexes
\di

-- Verify extensions
\dx
```

### 4. Initial Provider Setup
```sql
-- Add Regula credentials (replace with your actual credentials)
INSERT INTO provider_credentials (provider_name, credential_type, encrypted_value) 
VALUES ('regula', 'api_key', crypt('your-regula-api-key', gen_salt('bf')));

-- Add Persona credentials (for future use)
INSERT INTO provider_credentials (provider_name, credential_type, encrypted_value) 
VALUES ('persona', 'api_key', crypt('your-persona-api-key', gen_salt('bf')));
```

### 5. Create Test Client
```sql
-- Create a test client
INSERT INTO clients (name, email, api_key, api_key_hash) 
VALUES (
    'Test Client',
    'test@example.com',
    encode(sha256('test-api-key-12345'::bytea), 'hex'),
    crypt('test-api-key-12345', gen_salt('bf'))
);

-- Get the client ID
SELECT id FROM clients WHERE email = 'test@example.com';

-- Assign Regula provider to test client (use the ID from above)
INSERT INTO client_provider_configs (client_id, provider_name) 
VALUES ('[CLIENT-ID-FROM-ABOVE]', 'regula');
```

## Maintenance

### Regular Cleanup
```sql
-- Clean up old rate limit records (run daily)
SELECT cleanup_old_rate_limits();

-- Clean up old verification requests (optional - adjust retention period)
DELETE FROM verification_requests 
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Performance Monitoring
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

## Expected Query Performance

With proper indexing, expect:
- **API key validation**: < 1ms
- **Client provider lookup**: < 1ms  
- **Verification request logging**: < 5ms
- **Rate limit checking**: < 2ms
- **Historical queries**: < 50ms (last 30 days)

## Scaling Considerations

### Connection Pooling
- Use **PgBouncer** or similar for connection pooling
- Recommended: 100-200 connections max

### Read Replicas
- Consider read replicas for analytics queries
- Keep verification writes on primary

### Partitioning
- **Time-based partitioning** for `verification_requests` if volume > 1M/month
- **Hash partitioning** for `rate_limit_tracking` if needed

### Archival
- Archive old verification data to cold storage
- Keep recent data (6-12 months) for performance 