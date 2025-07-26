import { Injectable, Logger } from '@nestjs/common';
import { IKycProvider, ProviderMetadata } from './interfaces';

/**
 * Factory service for managing KYC provider instances
 * Provides centralized access to all available providers
 */
@Injectable()
export class ProvidersFactory {
  private readonly logger = new Logger(ProvidersFactory.name);
  private readonly providers = new Map<string, IKycProvider>();
  private readonly metadata = new Map<string, ProviderMetadata>();

  /**
   * Register a provider with the factory
   */
  registerProvider(provider: IKycProvider, metadata: ProviderMetadata): void {
    const name = provider.getProviderName();

    this.logger.log(`Registering KYC provider: ${name}`);

    this.providers.set(name, provider);
    this.metadata.set(name, metadata);
  }

  /**
   * Get a provider instance by name
   */
  getProvider(providerName: string): IKycProvider {
    const provider = this.providers.get(providerName);

    if (!provider) {
      const availableProviders = Array.from(this.providers.keys()).join(', ');
      throw new Error(
        `KYC provider '${providerName}' not found. Available providers: ${availableProviders}`,
      );
    }

    return provider;
  }

  /**
   * Get all registered provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider metadata
   */
  getProviderMetadata(providerName: string): ProviderMetadata | undefined {
    return this.metadata.get(providerName);
  }

  /**
   * Get all provider metadata
   */
  getAllProviderMetadata(): Record<string, ProviderMetadata> {
    const result: Record<string, ProviderMetadata> = {};

    for (const [name, metadata] of this.metadata.entries()) {
      result[name] = metadata;
    }

    return result;
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Get provider by client configuration
   * This will look up the client's assigned provider from the database
   */
  async getProviderForClient(_clientId: string): Promise<IKycProvider> {
    // TODO: This will be implemented when we create the client service
    // For now, we'll throw an error to remind us to implement it
    throw new Error('getProviderForClient not yet implemented - requires client service');
  }

  /**
   * Check health status of all providers
   */
  async checkAllProvidersHealth(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        healthStatus[name] = await provider.isAvailable();
      } catch (error) {
        this.logger.error(`Health check failed for provider ${name}:`, error);
        healthStatus[name] = false;
      }
    }

    return healthStatus;
  }

  /**
   * Get providers that support a specific capability
   */
  getProvidersByCapability(
    capability: keyof import('./interfaces').ProviderCapabilities,
  ): string[] {
    const supportingProviders: string[] = [];

    for (const [name, metadata] of this.metadata.entries()) {
      if (metadata.capabilities[capability]) {
        supportingProviders.push(name);
      }
    }

    return supportingProviders;
  }

  /**
   * Get detailed information about all providers
   */
  getProvidersInfo(): Array<{
    name: string;
    metadata: ProviderMetadata;
    isRegistered: boolean;
    lastHealthCheck?: import('./interfaces').ProviderHealthStatus;
  }> {
    const providersInfo: Array<{
      name: string;
      metadata: ProviderMetadata;
      isRegistered: boolean;
      lastHealthCheck?: import('./interfaces').ProviderHealthStatus;
    }> = [];

    for (const [name, metadata] of this.metadata.entries()) {
      const provider = this.providers.get(name);

      providersInfo.push({
        name,
        metadata,
        isRegistered: !!provider,
        lastHealthCheck: provider?.['getLastHealthCheck']?.(),
      });
    }

    return providersInfo;
  }
}
