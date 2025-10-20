import {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
  ProviderHealthResponse,
  ProviderCredentials,
  ProviderConfig,
} from '../types/provider.types';
import {
  ProcessingMode,
  ProviderTemplate,
  ProviderPlan,
  CreateTemplateSessionRequest,
  CreateSessionResponse,
  IdBasedVerificationRequest,
  AsyncJobResponse,
  AsyncProviderCapabilities,
} from '../types/async-provider.types';

/**
 * Interface that all KYC providers must implement
 * Provides a unified API for different verification providers
 * Extended to support async, multi-step, and template-based workflows
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
   * Provider processing mode
   */
  readonly processingMode: ProcessingMode;

  /**
   * Provider capabilities (optional - for runtime capability checks)
   */
  readonly capabilities?: AsyncProviderCapabilities;

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

  // ===== Async & Multi-Step Methods (Optional - implement if supported) =====

  /**
   * Get available templates for template-based verification
   * @returns List of available templates
   */
  getTemplates?(): Promise<ProviderTemplate[]>;

  /**
   * Get available verification plans
   * @returns List of available plans
   */
  getPlans?(): Promise<ProviderPlan[]>;

  /**
   * Create a template-based verification session
   * @param request Session creation request
   * @returns Session details
   */
  createTemplateSession?(request: CreateTemplateSessionRequest): Promise<CreateSessionResponse>;

  /**
   * Execute a verification step in a multi-step workflow
   * @param sessionId Provider session ID
   * @param stepType Step to execute
   * @param stepData Data for the step
   * @returns Step execution result
   */
  executeStep?(sessionId: string, stepType: string, stepData: any): Promise<any>;

  /**
   * Finalize a multi-step verification session
   * @param sessionId Provider session ID
   * @returns Final verification result
   */
  finalizeSession?(sessionId: string): Promise<VerificationStatusResponse>;

  /**
   * Perform ID-based verification without document upload
   * @param request ID verification request
   * @returns Verification result
   */
  verifyById?(request: IdBasedVerificationRequest): Promise<VerificationResponse>;

  /**
   * Create an async verification job
   * @param request Verification request
   * @returns Job details with status URL
   */
  createAsyncVerification?(request: VerificationRequest): Promise<AsyncJobResponse>;

  /**
   * Get job status for async verification
   * @param jobId Job identifier
   * @returns Current job status
   */
  getJobStatus?(jobId: string): Promise<AsyncJobResponse>;
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
