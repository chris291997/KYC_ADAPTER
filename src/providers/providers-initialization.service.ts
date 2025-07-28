import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../database/entities';
import { ProvidersFactory } from './providers.factory';
import { MockRegulaProvider } from './implementations/mock-regula.provider';
import { ProcessingMethod } from './types/provider.types';

@Injectable()
export class ProvidersInitializationService implements OnModuleInit {
  private readonly logger = new Logger(ProvidersInitializationService.name);

  constructor(
    private readonly providersFactory: ProvidersFactory,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  /**
   * Initialize all providers when the module starts
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('🚀 Initializing KYC providers...');
    console.log('🚀 ProvidersInitializationService.onModuleInit() called');

    try {
      // Register all available providers
      await this.registerAllProviders();

      // Set up default provider assignments
      await this.setupDefaultAssignments();

      // Verify provider health
      await this.checkProviderHealth();

      this.logger.log('✅ Provider initialization completed successfully');
    } catch (error) {
      this.logger.error('❌ Provider initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register all available KYC providers
   */
  private async registerAllProviders(): Promise<void> {
    this.logger.log('📋 Registering KYC providers...');

    // 1. Register Mock Regula Provider
    const mockRegulaProvider = new MockRegulaProvider();

    await mockRegulaProvider.initialize({
      apiKey: 'mock_regula_key',
      endpoint: 'https://api.regulaforensics.com/mock',
      processingMethod: ProcessingMethod.DIRECT,
    });

    this.providersFactory.registerProvider(mockRegulaProvider, {
      name: 'regula-mock',
      displayName: 'Regula ForensicsReader (Mock)',
      description: 'Mock implementation of Regula document verification with realistic responses',
      version: '1.0.0',
      website: 'https://regulaforensics.com',
      capabilities: {
        supportsDocumentVerification: true,
        supportsBiometricVerification: false,
        supportsLivenessDetection: false,
        supportedDocumentTypes: ['passport', 'drivers_license', 'id_card'],
        supportedCountries: ['US', 'EU', 'Global'],
        maxFileSize: 10 * 1024 * 1024,
        supportedImageFormats: ['jpeg', 'png', 'pdf'],
      },
    });

    console.log(
      '✅ Registered Mock Regula Provider - Available providers:',
      this.providersFactory.getAvailableProviders(),
    );

    this.logger.log('✅ Registered Mock Regula Provider');

    // TODO: Add more providers here
    // - Real Regula Provider (production)
    // - Persona Provider (external link)
    // - Other providers as needed
  }

  /**
   * Set up default provider assignments for existing tenants
   */
  private async setupDefaultAssignments(): Promise<void> {
    this.logger.log('🔗 Setting up default provider assignments...');

    try {
      this.logger.log('⏭️ Skipping automatic provider assignments due to table structure mismatch');
      this.logger.log('ℹ️ Use admin API to manually assign providers to tenants');
      this.logger.log('✅ Default provider assignments completed');
    } catch (error) {
      this.logger.error('Failed to setup default assignments:', error);
      // Don't throw - this is not critical for startup
    }
  }

  /**
   * Check health of all registered providers
   */
  private async checkProviderHealth(): Promise<void> {
    this.logger.log('🏥 Checking provider health...');

    try {
      const healthStatus = await this.providersFactory.checkAllProvidersHealth();

      Object.entries(healthStatus).forEach(([providerName, isHealthy]) => {
        const status = isHealthy ? '✅' : '❌';
        this.logger.log(`${status} ${providerName}: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
      });

      const healthyCount = Object.values(healthStatus).filter(Boolean).length;
      const totalCount = Object.keys(healthStatus).length;

      this.logger.log(
        `Provider health check completed: ${healthyCount}/${totalCount} providers healthy`,
      );
    } catch (error) {
      this.logger.error('Provider health check failed:', error);
    }
  }

  /**
   * Get initialization status
   */
  getInitializationStatus(): {
    providersRegistered: string[];
    tenantsConfigured: number;
    healthyProviders: number;
  } {
    const availableProviders = this.providersFactory.getAvailableProviders();

    return {
      providersRegistered: availableProviders,
      tenantsConfigured: 0, // TODO: Count from database
      healthyProviders: availableProviders.length, // TODO: Get from health check
    };
  }
}
