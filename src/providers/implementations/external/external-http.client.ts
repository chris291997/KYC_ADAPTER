import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ProviderCredentials,
  ProviderConfig,
  ProviderCreateVerificationRequest,
  ProviderCreateVerificationResponse,
  ProviderGetVerificationStatusRequest,
  ProviderGetVerificationStatusResponse,
  ProviderCancelVerificationRequest,
  ProviderCancelVerificationResponse,
  ProviderHealthCheckResponse,
  ProviderErrorResponse,
} from './types/provider-api.types';

/**
 * HTTP Client for external KYC provider API
 * Handles all API communication with retry logic, error handling, and logging
 */
@Injectable()
export class ExternalHttpClient {
  private readonly logger = new Logger(ExternalHttpClient.name);
  private axiosInstance: AxiosInstance;
  private credentials: ProviderCredentials;
  private config: ProviderConfig;

  /**
   * Configure the HTTP client with provider credentials and settings
   */
  configure(credentials: ProviderCredentials, config?: ProviderConfig): void {
    this.credentials = credentials;
    this.config = {
      timeout: config?.timeout || 30000, // 30 seconds
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000, // 1 second
    };

    this.axiosInstance = axios.create({
      baseURL: credentials.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${credentials.apiKey}`,
        'X-API-Version': credentials.apiVersion || 'v1',
      },
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const correlationId = this.generateCorrelationId();
        config.headers['X-Correlation-ID'] = correlationId;

        this.logger.log(`[${correlationId}] ${config.method?.toUpperCase()} ${config.url}`);

        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const correlationId = response.config.headers['X-Correlation-ID'];
        this.logger.log(
          `[${correlationId}] Response ${response.status} from ${response.config.url}`,
        );
        return response;
      },
      (error) => {
        const correlationId = error.config?.headers?.['X-Correlation-ID'];
        this.logger.error(
          `[${correlationId}] Error response: ${error.response?.status} - ${error.message}`,
        );
        return Promise.reject(error);
      },
    );

    this.logger.log('ExternalHttpClient configured successfully');
  }

  /**
   * Create a new verification
   */
  async createVerification(
    request: ProviderCreateVerificationRequest,
  ): Promise<ProviderCreateVerificationResponse> {
    return this.executeWithRetry<ProviderCreateVerificationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderCreateVerificationResponse>(
        '/verifications',
        request,
      );
      return response.data;
    }, 'createVerification');
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(
    request: ProviderGetVerificationStatusRequest,
  ): Promise<ProviderGetVerificationStatusResponse> {
    return this.executeWithRetry<ProviderGetVerificationStatusResponse>(async () => {
      const response = await this.axiosInstance.get<ProviderGetVerificationStatusResponse>(
        `/verifications/${request.verification_id}`,
      );
      return response.data;
    }, 'getVerificationStatus');
  }

  /**
   * Cancel verification
   */
  async cancelVerification(
    request: ProviderCancelVerificationRequest,
  ): Promise<ProviderCancelVerificationResponse> {
    return this.executeWithRetry<ProviderCancelVerificationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderCancelVerificationResponse>(
        `/verifications/${request.verification_id}/cancel`,
        { reason: request.reason },
      );
      return response.data;
    }, 'cancelVerification');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ProviderHealthCheckResponse> {
    try {
      const response = await this.axiosInstance.get<ProviderHealthCheckResponse>('/health');
      return response.data;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'down',
        version: 'unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(request: () => Promise<T>, operation: string): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await request();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error as AxiosError)) {
          this.logger.error(`[${operation}] Non-retryable error on attempt ${attempt}:`, error);
          throw this.transformError(error as AxiosError);
        }

        // Check if we should retry
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          this.logger.warn(`[${operation}] Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await this.sleep(delay);
        } else {
          this.logger.error(`[${operation}] All ${this.config.retryAttempts} attempts failed`);
        }
      }
    }

    throw this.transformError(lastError as AxiosError);
  }

  /**
   * Check if error is retryable (5xx errors or network errors)
   */
  private isRetryableError(error: AxiosError): boolean {
    // Network errors (no response)
    if (!error.response) {
      return true;
    }

    // 5xx server errors
    const status = error.response.status;
    return status >= 500 && status < 600;
  }

  /**
   * Transform axios error to provider error
   */
  private transformError(error: AxiosError): Error {
    if (error.response) {
      const providerError = error.response.data as ProviderErrorResponse;
      const message = providerError?.error?.message || error.message;
      const code = providerError?.error?.code || 'PROVIDER_ERROR';

      const transformedError = new Error(`Provider API Error [${code}]: ${message}`);
      (transformedError as any).code = code;
      (transformedError as any).statusCode = error.response.status;
      (transformedError as any).details = providerError?.error?.details;

      return transformedError;
    }

    if (error.request) {
      return new Error(`Provider API Network Error: No response received`);
    }

    return new Error(`Provider API Error: ${error.message}`);
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current configuration (for testing/debugging)
   */
  getConfig(): { credentials: ProviderCredentials; config: ProviderConfig } {
    return {
      credentials: {
        ...this.credentials,
        apiKey: '***REDACTED***',
        apiSecret: '***REDACTED***',
        webhookSecret: '***REDACTED***',
      },
      config: this.config,
    };
  }
}
