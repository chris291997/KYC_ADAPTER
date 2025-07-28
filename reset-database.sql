-- Manual Database Reset Script
-- Run this in your PostgreSQL query tool (pgAdmin, DBeaver, etc.)

-- Drop all tables in dependency order
DROP TABLE IF EXISTS "webhooks" CASCADE;
DROP TABLE IF EXISTS "documents" CASCADE;
DROP TABLE IF EXISTS "inquiries" CASCADE;
DROP TABLE IF EXISTS "inquiry_templates" CASCADE;
DROP TABLE IF EXISTS "verifications" CASCADE;
DROP TABLE IF EXISTS "accounts" CASCADE;
DROP TABLE IF EXISTS "tenant_provider_configs" CASCADE;
DROP TABLE IF EXISTS "providers" CASCADE;
DROP TABLE IF EXISTS "tenant_refresh_tokens" CASCADE;
DROP TABLE IF EXISTS "tenant_api_keys" CASCADE;
DROP TABLE IF EXISTS "tenants" CASCADE;
DROP TABLE IF EXISTS "admin_refresh_tokens" CASCADE;
DROP TABLE IF EXISTS "admin_api_keys" CASCADE;
DROP TABLE IF EXISTS "admins" CASCADE;

-- Drop legacy tables if they exist
DROP TABLE IF EXISTS "client_provider_configs" CASCADE;
DROP TABLE IF EXISTS "clients" CASCADE;
DROP TABLE IF EXISTS "provider_credentials" CASCADE;
DROP TABLE IF EXISTS "verification_requests" CASCADE;
DROP TABLE IF EXISTS "verification_results" CASCADE;

-- Drop additional tables visible in your database
DROP TABLE IF EXISTS "inquiry_sessions" CASCADE;
DROP TABLE IF EXISTS "one_time_links" CASCADE;
DROP TABLE IF EXISTS "provider_configs" CASCADE;
DROP TABLE IF EXISTS "rate_limit_tracking" CASCADE;
DROP TABLE IF EXISTS "webhook_deliveries" CASCADE;

-- Clean up any remaining tables from migrations
DROP TABLE IF EXISTS "migrations" CASCADE;
DROP TABLE IF EXISTS "typeorm_metadata" CASCADE;

-- Reset sequences if needed
DROP SEQUENCE IF EXISTS admins_id_seq CASCADE;
DROP SEQUENCE IF EXISTS tenants_id_seq CASCADE;

SELECT 'Database reset complete - all tables dropped' as result; 