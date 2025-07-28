import {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
  ProviderHealthResponse,
  ProviderCredentials,
  ProviderConfig,
} from '../types/provider.types';

/**
 * Interface that all KYC providers must implement
 * Provides a unified API for different verification providers
 */
export interface IKycProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Provider type (regula, persona, etc.)
   */
  readonly type: string;

  /**
   * Initialize the provider with credentials and configuration
   * @param credentials Provider-specific API credentials
   * @param config Provider configuration settings
   */
  initialize(credentials: ProviderCredentials, config?: ProviderConfig): Promise<void>;

  /**
   * Create a new verification request
   * Returns a one-time link for the user to complete verification
   * @param request Verification request details
   */
  createVerification(request: VerificationRequest): Promise<VerificationResponse>;

  /**
   * Get the current status of a verification
   * @param providerVerificationId Provider's verification ID
   */
  getVerificationStatus(providerVerificationId: string): Promise<VerificationStatusResponse>;

  /**
   * Cancel a pending verification
   * @param providerVerificationId Provider's verification ID
   */
  cancelVerification(providerVerificationId: string): Promise<boolean>;

  /**
   * Handle webhook payload from the provider
   * @param payload Raw webhook payload from provider
   * @param signature Webhook signature for verification
   */
  handleWebhook(payload: any, signature?: string): Promise<VerificationStatusResponse | null>;

  /**
   * Check if the provider is healthy and responsive
   */
  healthCheck(): Promise<ProviderHealthResponse>;

  /**
   * Validate provider credentials
   */
  validateCredentials(): Promise<boolean>;
}

/**
 * Factory interface for creating provider instances
 */
export interface IKycProviderFactory {
  /**
   * Create a provider instance
   * @param type Provider type
   * @param credentials Provider credentials
   * @param config Provider configuration
   */
  createProvider(
    type: string,
    credentials: ProviderCredentials,
    config?: ProviderConfig,
  ): Promise<IKycProvider>;

  /**
   * Get list of supported provider types
   */
  getSupportedTypes(): string[];
}

/**
 * Provider capabilities that can be checked at runtime
 */
export interface ProviderCapabilities {
  supportsDocumentVerification: boolean;
  supportsBiometricVerification: boolean;
  supportsLivenessDetection: boolean;
  supportedDocumentTypes: string[];
  supportedCountries: string[];
  maxFileSize: number;
  supportedImageFormats: string[];
}

/**
 * Provider metadata for registration and discovery
 */
export interface ProviderMetadata {
  name: string;
  displayName: string;
  version: string;
  description: string;
  website: string;
  capabilities: ProviderCapabilities;
}

/**
 * Base configuration interface that all providers extend
 */
export interface BaseProviderConfig {
  apiKey: string;
  apiUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  enableLogging?: boolean;
}

/**
 * Provider health status for monitoring
 */
export interface ProviderHealthStatus {
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  errorMessage?: string;
  apiQuotaRemaining?: number;
  rateLimitRemaining?: number;
}
