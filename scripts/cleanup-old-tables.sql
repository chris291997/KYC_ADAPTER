-- Manual Cleanup Script
-- Removes Day 1-3 event-driven tables that are no longer needed

-- This script removes:
-- 1. provider_plans
-- 2. provider_templates  
-- 3. provider_verification_sessions
-- 4. Migration #5 from typeorm_migrations

BEGIN;

-- Drop event-driven tables
DROP TABLE IF EXISTS provider_verification_sessions CASCADE;
DROP TABLE IF EXISTS provider_plans CASCADE;
DROP TABLE IF EXISTS provider_templates CASCADE;

-- Remove the migration record for AddEventDrivenArchitecture
DELETE FROM typeorm_migrations WHERE name = 'AddEventDrivenArchitecture1753700000000';

-- Verify cleanup
SELECT 'Remaining tables:' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

SELECT 'Remaining migrations:' as status;
SELECT id, timestamp, name FROM typeorm_migrations ORDER BY id;

COMMIT;

-- Expected result:
-- Tables should NOT include:
--   - provider_plans
--   - provider_templates
--   - provider_verification_sessions
--
-- Migrations should only show (4 total):
--   1. CreateCleanSchema1753640000000
--   2. SeedInitialData1753650000000
--   3. AddApiKeyPreviewSuffix1753660000000
--   4. AddApiKeyEncryptionColumns1753660001000

