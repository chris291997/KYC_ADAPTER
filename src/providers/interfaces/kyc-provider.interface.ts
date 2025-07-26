import {
  DocumentVerificationRequest,
  DocumentVerificationResponse,
} from './document-verification.interface';
import {
  BiometricVerificationRequest,
  BiometricVerificationResponse,
} from './biometric-verification.interface';

/**
 * Main interface that all KYC providers must implement
 * This ensures a consistent API regardless of the underlying provider
 */
export interface IKycProvider {
  /**
   * Get the provider name (e.g., 'regula', 'persona')
   */
  getProviderName(): string;

  /**
   * Check if the provider is available and configured correctly
   */
  isAvailable(): Promise<boolean>;

  /**
   * Verify a document (passport, ID card, driver's license, etc.)
   */
  verifyDocument(request: DocumentVerificationRequest): Promise<DocumentVerificationResponse>;

  /**
   * Verify biometric data (selfie matching, liveness detection)
   */
  verifyBiometric(request: BiometricVerificationRequest): Promise<BiometricVerificationResponse>;

  /**
   * Get provider-specific configuration requirements
   */
  getConfigSchema(): Record<string, any>;

  /**
   * Validate provider-specific configuration
   */
  validateConfig(config: Record<string, any>): boolean;
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
