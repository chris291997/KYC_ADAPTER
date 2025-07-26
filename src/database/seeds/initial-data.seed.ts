import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Client } from '../entities/client.entity';
import { ProviderCredential } from '../entities/provider-credential.entity';
import { ClientProviderConfig } from '../entities/client-provider-config.entity';

export class InitialDataSeeder {
  constructor(private dataSource: DataSource) {}

  async run(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log('🌱 Starting database seeding...');

      // 1. Create provider credentials (encrypted)
      console.log('📡 Creating provider credentials...');

      const regulaCredential = queryRunner.manager.create(ProviderCredential, {
        providerName: 'regula',
        credentialType: 'api_key',
        encryptedValue: 'regula-api-key-placeholder', // Replace with actual encrypted key
        isActive: true,
      });

      const personaCredential = queryRunner.manager.create(ProviderCredential, {
        providerName: 'persona',
        credentialType: 'api_key',
        encryptedValue: 'persona-api-key-placeholder', // Replace with actual encrypted key
        isActive: true,
      });

      await queryRunner.manager.save([regulaCredential, personaCredential]);

      // 2. Create test clients
      console.log('👥 Creating test clients...');

      // Test Client 1 (Regula)
      const testApiKey1 = 'test-api-key-regula-123';
      const hashedApiKey1 = crypto.createHash('sha256').update(testApiKey1).digest('hex');

      const testClient1 = queryRunner.manager.create(Client, {
        name: 'Test Client - Regula',
        email: 'test-regula@example.com',
        apiKey: hashedApiKey1,
        apiKeyHash: 'encrypted-hash-placeholder', // In real app, use bcrypt
        isActive: true,
        rateLimitPerMinute: 50,
        rateLimitPerHour: 500,
      });

      // Test Client 2 (Persona)
      const testApiKey2 = 'test-api-key-persona-456';
      const hashedApiKey2 = crypto.createHash('sha256').update(testApiKey2).digest('hex');

      const testClient2 = queryRunner.manager.create(Client, {
        name: 'Test Client - Persona',
        email: 'test-persona@example.com',
        apiKey: hashedApiKey2,
        apiKeyHash: 'encrypted-hash-placeholder', // In real app, use bcrypt
        isActive: true,
        rateLimitPerMinute: 100,
        rateLimitPerHour: 1000,
      });

      const clients = await queryRunner.manager.save([testClient1, testClient2]);

      // 3. Create client-provider configurations
      console.log('⚙️ Creating client-provider configurations...');

      const regulaConfig = queryRunner.manager.create(ClientProviderConfig, {
        clientId: clients[0].id,
        providerName: 'regula',
        isPrimary: true,
        configJson: {
          documentTypes: ['passport', 'id_card', 'driver_license'],
          confidenceThreshold: 0.8,
          enableLivenessCheck: true,
        },
      });

      const personaConfig = queryRunner.manager.create(ClientProviderConfig, {
        clientId: clients[1].id,
        providerName: 'persona',
        isPrimary: true,
        configJson: {
          templateId: 'itmpl_test_template',
          verificationTypes: ['document', 'selfie'],
          autoApprove: false,
        },
      });

      await queryRunner.manager.save([regulaConfig, personaConfig]);

      await queryRunner.commitTransaction();

      console.log('✅ Database seeding completed successfully!');
      console.log('');
      console.log('🔑 Test API Keys:');
      console.log(`   Regula Client: ${testApiKey1}`);
      console.log(`   Persona Client: ${testApiKey2}`);
      console.log('');
      console.log('📧 Test Client Emails:');
      console.log('   test-regula@example.com');
      console.log('   test-persona@example.com');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Error during seeding:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
