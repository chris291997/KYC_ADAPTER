import { Injectable, Logger } from '@nestjs/common';
import {
  IKycProvider,
  BaseProviderConfig,
  ProviderHealthStatus,
  DocumentVerificationRequest,
  DocumentVerificationResponse,
  BiometricVerificationRequest,
  BiometricVerificationResponse,
  KycError,
  KycErrorFactory,
} from '../interfaces';

/**
 * Abstract base class for all KYC providers
 * Provides common functionality and enforces the interface contract
 */
@Injectable()
export abstract class BaseKycProvider implements IKycProvider {
  protected readonly logger: Logger;
  protected config: BaseProviderConfig;
  protected lastHealthCheck?: ProviderHealthStatus;

  constructor(
    protected readonly providerName: string,
    config: BaseProviderConfig,
  ) {
    this.logger = new Logger(`${providerName}Provider`);
    this.config = config;
  }

  // Abstract methods that must be implemented by each provider
  abstract verifyDocument(
    request: DocumentVerificationRequest,
  ): Promise<DocumentVerificationResponse>;
  abstract verifyBiometric(
    request: BiometricVerificationRequest,
  ): Promise<BiometricVerificationResponse>;
  abstract getConfigSchema(): Record<string, any>;
  abstract validateConfig(config: Record<string, any>): boolean;

  /**
   * Get the provider name
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Check if the provider is available and configured correctly
   */
  async isAvailable(): Promise<boolean> {
    try {
      const healthStatus = await this.checkHealth();
      return healthStatus.isHealthy;
    } catch (error) {
      this.logger.error(`Health check failed for ${this.providerName}:`, error);
      return false;
    }
  }

  /**
   * Perform a health check on the provider
   */
  async checkHealth(): Promise<ProviderHealthStatus> {
    const startTime = Date.now();

    try {
      // Attempt a lightweight API call to check provider availability
      const isHealthy = await this.performHealthCheck();
      const responseTime = Date.now() - startTime;

      this.lastHealthCheck = {
        isHealthy,
        responseTime,
        lastChecked: new Date(),
      };

      if (isHealthy) {
        this.logger.debug(`Health check passed for ${this.providerName} (${responseTime}ms)`);
      } else {
        this.logger.warn(`Health check failed for ${this.providerName}`);
      }

      return this.lastHealthCheck;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.lastHealthCheck = {
        isHealthy: false,
        responseTime,
        lastChecked: new Date(),
        errorMessage: error.message,
      };

      this.logger.error(`Health check error for ${this.providerName}:`, error);
      return this.lastHealthCheck;
    }
  }

  /**
   * Get the last health check result
   */
  getLastHealthCheck(): ProviderHealthStatus | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Validate file input for verification requests
   */
  protected validateFile(file: Express.Multer.File, maxSize?: number): void {
    if (!file) {
      throw KycErrorFactory.createValidationError('File is required');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw KycErrorFactory.createFileError(
        'UNSUPPORTED_FILE_TYPE',
        `File type ${file.mimetype} is not supported. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    const fileSizeLimit = maxSize || this.getMaxFileSize();
    if (file.size > fileSizeLimit) {
      throw KycErrorFactory.createFileError(
        'FILE_TOO_LARGE',
        `File size ${file.size} exceeds maximum allowed size of ${fileSizeLimit} bytes`,
      );
    }
  }

  /**
   * Get maximum allowed file size for this provider
   */
  protected getMaxFileSize(): number {
    return 10 * 1024 * 1024; // 10MB default
  }

  /**
   * Transform provider-specific error to standardized KYC error
   */
  protected transformProviderError(error: any, requestId?: string): KycError {
    // Default implementation - providers can override for specific error handling
    return KycErrorFactory.createProviderError(
      error.message || 'Provider API error',
      error,
      requestId,
      this.isRetryableError(error),
    );
  }

  /**
   * Determine if an error is retryable
   */
  protected isRetryableError(error: any): boolean {
    // Common retryable error patterns
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'temporary',
      'rate limit',
      '500',
      '502',
      '503',
      '504',
    ];

    const errorString = (error.message || error.toString()).toLowerCase();
    return retryablePatterns.some((pattern) => errorString.includes(pattern));
  }

  /**
   * Execute API call with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    requestId?: string,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !this.isRetryableError(error)) {
          break;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        this.logger.warn(
          `${this.providerName} API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`,
          error.message,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw this.transformProviderError(lastError, requestId);
  }

  /**
   * Log verification request for monitoring and debugging
   */
  protected logRequest(requestType: string, requestId: string, clientId: string): void {
    this.logger.log(`${requestType} verification request started`, {
      requestId,
      clientId,
      provider: this.providerName,
    });
  }

  /**
   * Log verification response for monitoring and debugging
   */
  protected logResponse(
    requestType: string,
    requestId: string,
    success: boolean,
    processingTime: number,
  ): void {
    this.logger.log(`${requestType} verification ${success ? 'completed' : 'failed'}`, {
      requestId,
      provider: this.providerName,
      processingTime,
      success,
    });
  }

  /**
   * Abstract method for provider-specific health check
   * Each provider implements this to check their specific API
   */
  protected abstract performHealthCheck(): Promise<boolean>;

  /**
   * Generate a unique verification ID
   */
  protected generateVerificationId(): string {
    return `${this.providerName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current timestamp
   */
  protected getCurrentTimestamp(): Date {
    return new Date();
  }

  /**
   * Calculate processing time
   */
  protected calculateProcessingTime(startTime: number): number {
    return Date.now() - startTime;
  }
}
