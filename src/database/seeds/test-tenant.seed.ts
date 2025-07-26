import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { Tenant, TenantApiKey } from '../entities';

export class TestTenantSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const tenantRepository = dataSource.getRepository(Tenant);
    const apiKeyRepository = dataSource.getRepository(TenantApiKey);

    console.log('🌱 Seeding test tenant and API key...');

    // Check if test tenant already exists
    const existingTenant = await tenantRepository.findOne({
      where: { email: 'test@example.com' },
    });

    if (existingTenant) {
      console.log('✅ Test tenant already exists');
      // Check if API key exists
      const existingApiKey = await apiKeyRepository.findOne({
        where: { tenantId: existingTenant.id, name: 'Test API Key' },
      });

      if (existingApiKey) {
        console.log('✅ Test API key already exists');
        return;
      }
    }

    // Create test tenant
    const tenant =
      existingTenant ||
      tenantRepository.create({
        name: 'Test Tenant',
        email: 'test@example.com',
        status: 'active',
        settings: {
          webhookUrl: 'https://example.com/webhook',
          allowedDocumentTypes: ['passport', 'driver_license', 'id_card'],
        },
      });

    if (!existingTenant) {
      await tenantRepository.save(tenant);
      console.log('✅ Created test tenant');
    }

    // Generate test API key
    const testApiKey = 'kya_test_' + randomBytes(24).toString('hex');
    const keyHash = createHash('sha256').update(testApiKey).digest('hex');

    // Create API key
    const apiKey = apiKeyRepository.create({
      tenantId: tenant.id,
      name: 'Test API Key',
      keyHash,
      status: 'active',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    });

    await apiKeyRepository.save(apiKey);

    console.log('✅ Created test API key');
    console.log('🔑 TEST API KEY:', testApiKey);
    console.log('📧 TEST TENANT EMAIL:', tenant.email);
    console.log('🆔 TEST TENANT ID:', tenant.id);
    console.log('');
    console.log('🧪 Test the authentication with:');
    console.log(`   curl -H "Authorization: Bearer ${testApiKey}" http://localhost:3000/auth-test`);
    console.log(`   curl -H "X-API-Key: ${testApiKey}" http://localhost:3000/auth-test`);
    console.log('');
  }
}
