import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ProviderCredentials,
  ProviderConfig,
  ProviderCreateVerificationRequest,
  ProviderCreateVerificationResponse,
  ProviderDocumentVerificationRequest,
  ProviderDocumentVerificationResponse,
  ProviderIdVerificationRequest,
  ProviderIdVerificationResponse,
  ProviderFaceVerificationRequest,
  ProviderFaceVerificationResponse,
  ProviderFaceRegistrationRequest,
  ProviderFaceRegistrationResponse,
  ProviderFaceComparisonRequest,
  ProviderFaceComparisonResponse,
  ProviderSendOtpRequest,
  ProviderSendOtpResponse,
  ProviderVerifyOtpRequest,
  ProviderVerifyOtpResponse,
  ProviderAmlCheckRequest,
  ProviderAmlCheckResponse,
  ProviderFinalizeVerificationRequest,
  ProviderFinalizeVerificationResponse,
  ProviderGetResultsRequest,
  ProviderGetResultsResponse,
  ProviderCancelVerificationRequest,
  ProviderCancelVerificationResponse,
  ProviderHealthCheckResponse,
  ProviderErrorResponse,
} from './types/provider-api.types';

/**
 * HTTP Client for IDmeta KYC provider API
 * Handles all API communication with retry logic, error handling, and logging
 *
 * API Structure:
 * - Base URL: https://<subdomain>.idmetagroup.com/api
 * - v1 endpoints: /api/v1/verification/*
 * - v2 endpoints: /api/v2/verification/*
 * - Authentication: Bearer token
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

  // ============================================
  // 1. CREATE VERIFICATION (v1)
  // ============================================

  /**
   * Create a new verification session
   * POST /api/v1/verification/create-verification
   */
  async createVerification(
    request: ProviderCreateVerificationRequest,
  ): Promise<ProviderCreateVerificationResponse> {
    return this.executeWithRetry<ProviderCreateVerificationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderCreateVerificationResponse>(
        '/v1/verification/create-verification',
        request,
      );
      return response.data;
    }, 'createVerification');
  }

  // ============================================
  // 2. VERIFICATION EXECUTION ENDPOINTS (v1)
  // ============================================

  /**
   * Execute document verification
   * POST /api/v1/verification/document-verification
   */
  async documentVerification(
    request: ProviderDocumentVerificationRequest,
  ): Promise<ProviderDocumentVerificationResponse> {
    return this.executeWithRetry<ProviderDocumentVerificationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderDocumentVerificationResponse>(
        '/v1/verification/document-verification',
        request,
      );
      return response.data;
    }, 'documentVerification');
  }

  /**
   * Execute ID-based verification (government database check)
   * POST /api/v1/verification/id-verification
   */
  async idVerification(
    request: ProviderIdVerificationRequest,
  ): Promise<ProviderIdVerificationResponse> {
    return this.executeWithRetry<ProviderIdVerificationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderIdVerificationResponse>(
        '/v1/verification/id-verification',
        request,
      );
      return response.data;
    }, 'idVerification');
  }

  /**
   * Execute face verification (compare with reference)
   * POST /api/v1/verification/face-verification
   */
  async faceVerification(
    request: ProviderFaceVerificationRequest,
  ): Promise<ProviderFaceVerificationResponse> {
    return this.executeWithRetry<ProviderFaceVerificationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderFaceVerificationResponse>(
        '/v1/verification/face-verification',
        request,
      );
      return response.data;
    }, 'faceVerification');
  }

  /**
   * Register a face for future verification
   * POST /api/v1/verification/face-registration
   */
  async faceRegistration(
    request: ProviderFaceRegistrationRequest,
  ): Promise<ProviderFaceRegistrationResponse> {
    return this.executeWithRetry<ProviderFaceRegistrationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderFaceRegistrationResponse>(
        '/v1/verification/face-registration',
        request,
      );
      return response.data;
    }, 'faceRegistration');
  }

  /**
   * Compare two face images
   * POST /api/v1/verification/face-comparison
   */
  async faceComparison(
    request: ProviderFaceComparisonRequest,
  ): Promise<ProviderFaceComparisonResponse> {
    return this.executeWithRetry<ProviderFaceComparisonResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderFaceComparisonResponse>(
        '/v1/verification/face-comparison',
        request,
      );
      return response.data;
    }, 'faceComparison');
  }

  /**
   * Send OTP (SMS or Email)
   * POST /api/v1/verification/send-otp
   */
  async sendOtp(request: ProviderSendOtpRequest): Promise<ProviderSendOtpResponse> {
    return this.executeWithRetry<ProviderSendOtpResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderSendOtpResponse>(
        '/v1/verification/send-otp',
        request,
      );
      return response.data;
    }, 'sendOtp');
  }

  /**
   * Verify OTP code
   * POST /api/v1/verification/verify-otp
   */
  async verifyOtp(request: ProviderVerifyOtpRequest): Promise<ProviderVerifyOtpResponse> {
    return this.executeWithRetry<ProviderVerifyOtpResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderVerifyOtpResponse>(
        '/v1/verification/verify-otp',
        request,
      );
      return response.data;
    }, 'verifyOtp');
  }

  /**
   * Execute AML check (sanctions, PEP, watchlist)
   * POST /api/v1/verification/aml-check
   */
  async amlCheck(request: ProviderAmlCheckRequest): Promise<ProviderAmlCheckResponse> {
    return this.executeWithRetry<ProviderAmlCheckResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderAmlCheckResponse>(
        '/v1/verification/aml-check',
        request,
      );
      return response.data;
    }, 'amlCheck');
  }

  // ============================================
  // 3. FINALIZE VERIFICATION (v1)
  // ============================================

  /**
   * Finalize verification session
   * POST /api/v1/verification/finalize-verification
   */
  async finalizeVerification(
    request: ProviderFinalizeVerificationRequest,
  ): Promise<ProviderFinalizeVerificationResponse> {
    return this.executeWithRetry<ProviderFinalizeVerificationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderFinalizeVerificationResponse>(
        '/v1/verification/finalize-verification',
        request,
      );
      return response.data;
    }, 'finalizeVerification');
  }

  // ============================================
  // 4. GET RESULTS (v2)
  // ============================================

  /**
   * Get verification results
   * GET /api/v2/verification/get-verification/{verification_id}
   */
  async getResults(request: ProviderGetResultsRequest): Promise<ProviderGetResultsResponse> {
    return this.executeWithRetry<ProviderGetResultsResponse>(async () => {
      const response = await this.axiosInstance.get<ProviderGetResultsResponse>(
        `/v2/verification/get-verification/${request.verification_id}`,
      );
      return response.data;
    }, 'getResults');
  }

  // ============================================
  // 5. CANCEL VERIFICATION
  // ============================================

  /**
   * Cancel verification
   * POST /api/v1/verification/cancel-verification
   */
  async cancelVerification(
    request: ProviderCancelVerificationRequest,
  ): Promise<ProviderCancelVerificationResponse> {
    return this.executeWithRetry<ProviderCancelVerificationResponse>(async () => {
      const response = await this.axiosInstance.post<ProviderCancelVerificationResponse>(
        '/v1/verification/cancel-verification',
        { verification_id: request.verification_id, reason: request.reason },
      );
      return response.data;
    }, 'cancelVerification');
  }

  // ============================================
  // 6. HEALTH CHECK
  // ============================================

  /**
   * Health check
   * GET /api/health or /api/v1/health
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

  // ============================================
  // UTILITY METHODS
  // ============================================

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
