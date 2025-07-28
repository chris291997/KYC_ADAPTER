import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export class SeedInitialData1753650000000 implements MigrationInterface {
  name = 'SeedInitialData1753650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // CREATE ADMIN USER
    // ============================================================================

    // Generate bcrypt hash for admin password
    const adminPasswordHash = await bcrypt.hash('admin123', 12);

    await queryRunner.query(
      `
      INSERT INTO "admins" (
        id, name, email, password, role, status, last_login_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'System Administrator',
        'admin@kyc-adapter.dev',
        $1,
        'super_admin',
        'active',
        null,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP;
    `,
      [adminPasswordHash],
    );

    // ============================================================================
    // CREATE TEST TENANT
    // ============================================================================

    // Generate bcrypt hash for tenant password
    const tenantPasswordHash = await bcrypt.hash('tenant123', 12);

    await queryRunner.query(
      `
      INSERT INTO "tenants" (
        id, name, email, password, status, settings, created_at, updated_at
      ) VALUES (
        '4aca9a70-0012-48b2-9f22-137f8c7a2bd4',
        'Test Tenant Company',
        'test@kyc-adapter.dev',
        $1,
        'active',
        '{"maxApiKeys": 10, "allowedProviders": ["regula-mock", "persona-mock"], "rateLimits": {"perMinute": 50, "perHour": 500}}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        status = EXCLUDED.status,
        settings = EXCLUDED.settings,
        updated_at = CURRENT_TIMESTAMP;
    `,
      [tenantPasswordHash],
    );

    // ============================================================================
    // CREATE KYC PROVIDERS
    // ============================================================================

    // Create Regula Mock Provider
    await queryRunner.query(`
      INSERT INTO "providers" (
        id, name, type, description, credentials, default_config,
        is_active, api_url, webhook_url, max_daily_verifications,
        priority, metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'regula-mock',
        'document_verification',
        'Mock implementation of Regula ForensicsReader SDK with realistic document verification responses',
        '{"apiKey": "mock_regula_key_dev", "endpoint": "https://api.regulaforensics.com/mock", "version": "1.0"}',
        '{"processingMethod": "direct", "supportedDocumentTypes": ["passport", "drivers_license", "id_card"], "confidenceThreshold": 0.8, "enableSecurityFeatures": true}',
        true,
        'https://api.regulaforensics.com/mock',
        null,
        10000,
        1,
        '{"displayName": "Regula ForensicsReader (Mock)", "version": "1.0.0", "website": "https://regulaforensics.com", "capabilities": {"supportsDocumentVerification": true, "supportsBiometricVerification": false, "supportsLivenessDetection": false, "supportedDocumentTypes": ["passport", "drivers_license", "id_card"], "supportedCountries": ["US", "EU", "Global"], "maxFileSize": 10485760, "supportedImageFormats": ["jpeg", "png", "pdf"]}}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        default_config = EXCLUDED.default_config,
        is_active = EXCLUDED.is_active,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP;
    `);

    // Create Persona Mock Provider
    await queryRunner.query(`
      INSERT INTO "providers" (
        id, name, type, description, credentials, default_config,
        is_active, api_url, webhook_url, max_daily_verifications,
        priority, metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        'persona-mock',
        'comprehensive_verification',
        'Mock implementation of Persona identity verification with external link workflow',
        '{"apiKey": "mock_persona_key_dev", "templateId": "itmpl_mock_123", "environment": "sandbox"}',
        '{"processingMethod": "external_link", "supportedDocumentTypes": ["passport", "drivers_license", "id_card", "utility_bill"], "linkExpirationMinutes": 60, "webhookEvents": ["inquiry.completed", "inquiry.failed"]}',
        true,
        'https://withpersona.com/api/v1',
        'https://withpersona.com/webhooks/mock',
        5000,
        2,
        '{"displayName": "Persona Identity Verification (Mock)", "version": "1.0.0", "website": "https://withpersona.com", "capabilities": {"supportsDocumentVerification": true, "supportsBiometricVerification": true, "supportsLivenessDetection": true, "supportedDocumentTypes": ["passport", "drivers_license", "id_card", "utility_bill"], "supportedCountries": ["US", "CA", "EU"], "maxFileSize": 20971520, "supportedImageFormats": ["jpeg", "png", "heic"]}}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        default_config = EXCLUDED.default_config,
        is_active = EXCLUDED.is_active,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP;
    `);

    // ============================================================================
    // ASSIGN PROVIDERS TO TEST TENANT
    // ============================================================================

    // Assign Regula provider to test tenant (primary)
    await queryRunner.query(`
      INSERT INTO "tenant_provider_configs" (
        id, tenant_id, provider_id, is_enabled, config, priority,
        max_daily_verifications, webhook_url, metadata, created_at, updated_at
      )
      SELECT 
        gen_random_uuid(),
        '4aca9a70-0012-48b2-9f22-137f8c7a2bd4',
        p.id,
        true,
        '{"processingMethod": "direct", "supportedDocumentTypes": ["passport", "drivers_license", "id_card"], "maxDailyVerifications": 1000, "webhookUrl": null, "confidenceThreshold": 0.85}',
        1,
        1000,
        null,
                 ('{"assignedAt": "' || CURRENT_TIMESTAMP || '", "assignedBy": "system", "notes": "Primary provider for direct document processing"}')::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "providers" p
      WHERE p.name = 'regula-mock'
      ON CONFLICT (tenant_id, provider_id) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        config = EXCLUDED.config,
        priority = EXCLUDED.priority,
        updated_at = CURRENT_TIMESTAMP;
    `);

    // Assign Persona provider to test tenant (secondary)
    await queryRunner.query(`
      INSERT INTO "tenant_provider_configs" (
        id, tenant_id, provider_id, is_enabled, config, priority,
        max_daily_verifications, webhook_url, metadata, created_at, updated_at
      )
      SELECT 
        gen_random_uuid(),
        '4aca9a70-0012-48b2-9f22-137f8c7a2bd4',
        p.id,
        true,
        '{"processingMethod": "external_link", "supportedDocumentTypes": ["passport", "drivers_license", "id_card", "utility_bill"], "linkExpirationMinutes": 60, "webhookUrl": "https://your-app.com/webhooks/persona", "templateId": "itmpl_mock_123"}',
        2,
        500,
        'https://your-app.com/webhooks/persona',
                 ('{"assignedAt": "' || CURRENT_TIMESTAMP || '", "assignedBy": "system", "notes": "Secondary provider for comprehensive verification with external links"}')::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM "providers" p
      WHERE p.name = 'persona-mock'
      ON CONFLICT (tenant_id, provider_id) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        config = EXCLUDED.config,
        priority = EXCLUDED.priority,
        updated_at = CURRENT_TIMESTAMP;
    `);

    // ============================================================================
    // CREATE SAMPLE ACCOUNT FOR TESTING
    // ============================================================================

    await queryRunner.query(`
      INSERT INTO "accounts" (
        id, tenant_id, reference_id, name, email, phone, birthdate, address, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        '4aca9a70-0012-48b2-9f22-137f8c7a2bd4',
        'test-user-001',
        '{"first": "John", "last": "Doe"}',
        'john.doe@example.com',
        '+1-555-123-4567',
        '1990-01-15',
        '{"street": "123 Main St", "city": "San Francisco", "state": "CA", "country": "US", "postalCode": "94102"}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded data in reverse order
    await queryRunner.query(
      `DELETE FROM "accounts" WHERE tenant_id = '4aca9a70-0012-48b2-9f22-137f8c7a2bd4'`,
    );
    await queryRunner.query(
      `DELETE FROM "tenant_provider_configs" WHERE tenant_id = '4aca9a70-0012-48b2-9f22-137f8c7a2bd4'`,
    );
    await queryRunner.query(
      `DELETE FROM "providers" WHERE name IN ('regula-mock', 'persona-mock')`,
    );
    await queryRunner.query(`DELETE FROM "tenants" WHERE email = 'test@kyc-adapter.dev'`);
    await queryRunner.query(`DELETE FROM "admins" WHERE email = 'admin@kyc-adapter.dev'`);
  }
}
