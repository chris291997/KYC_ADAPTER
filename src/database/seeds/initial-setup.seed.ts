import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export class InitialSetupSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('🌱 Running initial setup seed...');

    try {
      await this.createAdmin();
      await this.createTestTenant();
      await this.createMockRegulaProvider();
      await this.assignProviderToTenant();

      console.log('✅ Initial setup seed completed successfully');
    } catch (error) {
      console.error('❌ Initial setup seed failed:', error);
      throw error;
    }
  }

  /**
   * Create default admin user
   */
  private async createAdmin(): Promise<string> {
    console.log('👤 Creating default admin...');

    const adminId = 'admin-' + crypto.randomUUID();
    const hashedPassword = await bcrypt.hash('admin123', 12);

    await this.dataSource.query(
      `
      INSERT INTO admins (id, name, email, password, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        adminId,
        'System Administrator',
        'admin@kyc-adapter.dev',
        hashedPassword,
        'super_admin',
        'active',
      ],
    );

    console.log('✅ Admin created: admin@kyc-adapter.dev / admin123');
    return adminId;
  }

  /**
   * Create test tenant
   */
  private async createTestTenant(): Promise<string> {
    console.log('🏢 Creating test tenant...');

    const tenantId = '4aca9a70-0012-48b2-9f22-137f8c7a2bd4'; // Fixed ID for consistency
    const hashedPassword = await bcrypt.hash('tenant123', 12);

    await this.dataSource.query(
      `
      INSERT INTO tenants (id, name, email, password, status, settings, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        password = EXCLUDED.password,
        status = EXCLUDED.status,
        settings = EXCLUDED.settings,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        tenantId,
        'Test Tenant Company',
        'test@kyc-adapter.dev',
        hashedPassword,
        'active',
        JSON.stringify({
          maxApiKeys: 10,
          allowedProviders: ['regula-mock'],
          rateLimits: {
            perMinute: 50,
            perHour: 500,
          },
        }),
      ],
    );

    console.log('✅ Tenant created: test@kyc-adapter.dev / tenant123');
    return tenantId;
  }

  /**
   * Create Mock Regula provider
   */
  private async createMockRegulaProvider(): Promise<string> {
    console.log('🔧 Creating Mock Regula provider...');

    const providerId = 'regula-mock-' + crypto.randomUUID();

    await this.dataSource.query(
      `
      INSERT INTO providers (
        id, name, type, description, credentials, default_config, 
        is_active, api_url, webhook_url, max_daily_verifications, 
        priority, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        default_config = EXCLUDED.default_config,
        is_active = EXCLUDED.is_active,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        providerId,
        'regula-mock',
        'document_verification',
        'Mock implementation of Regula document verification with realistic responses',
        JSON.stringify({
          apiKey: 'mock_regula_key_' + crypto.randomBytes(16).toString('hex'),
          endpoint: 'https://api.regulaforensics.com/mock',
        }),
        JSON.stringify({
          processingMethod: 'direct',
          supportedDocumentTypes: ['passport', 'drivers_license', 'id_card'],
          confidenceThreshold: 0.8,
          enableSecurityFeatures: true,
        }),
        true,
        'https://api.regulaforensics.com/mock',
        null,
        10000,
        1,
        JSON.stringify({
          displayName: 'Regula ForensicsReader (Mock)',
          version: '1.0.0',
          website: 'https://regulaforensics.com',
          capabilities: {
            supportsDocumentVerification: true,
            supportsBiometricVerification: false,
            supportsLivenessDetection: false,
            supportedDocumentTypes: ['passport', 'drivers_license', 'id_card'],
            supportedCountries: ['US', 'EU', 'Global'],
            maxFileSize: 10485760,
            supportedImageFormats: ['jpeg', 'png', 'pdf'],
          },
        }),
      ],
    );

    console.log('✅ Mock Regula provider created');
    return providerId;
  }

  /**
   * Assign provider to test tenant
   */
  private async assignProviderToTenant(): Promise<void> {
    console.log('🔗 Assigning provider to test tenant...');

    // Get provider and tenant IDs
    const providerResult = await this.dataSource.query(
      `SELECT id FROM providers WHERE name = 'regula-mock' LIMIT 1`,
    );
    const tenantResult = await this.dataSource.query(
      `SELECT id FROM tenants WHERE email = 'test@kyc-adapter.dev' LIMIT 1`,
    );

    if (providerResult.length === 0 || tenantResult.length === 0) {
      throw new Error('Provider or tenant not found for assignment');
    }

    const providerId = providerResult[0].id;
    const tenantId = tenantResult[0].id;

    await this.dataSource.query(
      `
      INSERT INTO tenant_provider_configs (
        id, tenant_id, provider_id, is_enabled, config, priority,
        max_daily_verifications, webhook_url, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id, provider_id) DO UPDATE SET
        is_enabled = EXCLUDED.is_enabled,
        config = EXCLUDED.config,
        priority = EXCLUDED.priority,
        max_daily_verifications = EXCLUDED.max_daily_verifications,
        updated_at = CURRENT_TIMESTAMP
    `,
      [
        crypto.randomUUID(),
        tenantId,
        providerId,
        true,
        JSON.stringify({
          processingMethod: 'direct',
          supportedDocumentTypes: ['passport', 'drivers_license', 'id_card'],
          maxDailyVerifications: 1000,
          webhookUrl: null,
          confidenceThreshold: 0.85,
        }),
        1,
        1000,
        null,
        JSON.stringify({
          assignedAt: new Date().toISOString(),
          assignedBy: 'system',
          notes: 'Default assignment for testing',
        }),
      ],
    );

    console.log('✅ Provider assigned to tenant successfully');
  }
}
