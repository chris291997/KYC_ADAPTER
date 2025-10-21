import { Injectable, Logger } from '@nestjs/common';
import { IKycProvider } from '../../interfaces/kyc-provider.interface';
import {
  VerificationRequest,
  VerificationResponse,
  VerificationStatusResponse,
  ProviderHealthResponse,
  ProviderCredentials,
  ProviderConfig,
  ProcessingMethod,
} from '../../types/provider.types';
import {
  ProcessingMode,
  VerificationMethod,
  TemplateStepType,
} from '../../types/async-provider.types';
import { ExternalHttpClient } from './external-http.client';
import { ExternalRequestMapper, InternalVerificationRequest } from './mappers/request.mapper';
import { ExternalResponseMapper } from './mappers/response.mapper';
import { ProviderWebhookPayload } from './types/provider-api.types';
import * as crypto from 'crypto';

/**
 * IDmeta KYC Provider Implementation
 * Implements multi-step verification workflow:
 * 1. Create verification session (POST /api/v1/verification/create-verification)
 * 2. Execute verification steps (document, face, ID, AML, etc.)
 * 3. Finalize verification (POST /api/v1/verification/finalize-verification)
 * 4. Get results (GET /api/v2/verification/get-verification/{id})
 */
@Injectable()
export class ExternalProvider implements IKycProvider {
  private readonly logger = new Logger(ExternalProvider.name);
  private isInitialized = false;
  private webhookSecret?: string;

  readonly name = 'IDmeta KYC Provider';
  readonly type = 'external';
  readonly processingMode = ProcessingMode.ASYNC_WEBHOOK;

  readonly capabilities = {
    supportsTemplates: true,
    supportsIdBasedVerification: true,
    supportsAsync: true,
    processingMode: ProcessingMode.ASYNC_WEBHOOK,
    supportedVerificationMethods: [
      VerificationMethod.DOCUMENT,
      VerificationMethod.ID_BASED,
      VerificationMethod.BIOMETRIC,
      VerificationMethod.AML,
      VerificationMethod.COMPREHENSIVE,
    ],
    supportedTemplateSteps: [
      TemplateStepType.DOCUMENT_UPLOAD,
      TemplateStepType.FACE_VERIFICATION,
      TemplateStepType.ID_VERIFICATION,
      TemplateStepType.LIVENESS_CHECK,
      TemplateStepType.AML_CHECK,
      TemplateStepType.OTP_VERIFICATION,
    ],
    averageProcessingTime: 60, // 60 seconds average
  };

  constructor(
    private readonly httpClient: ExternalHttpClient,
    private readonly requestMapper: ExternalRequestMapper,
    private readonly responseMapper: ExternalResponseMapper,
  ) {}

  /**
   * Initialize provider with credentials
   */
  async initialize(credentials: ProviderCredentials, config?: ProviderConfig): Promise<void> {
    try {
      this.logger.log('Initializing IDmeta KYC Provider...');

      if (!credentials.apiKey) {
        throw new Error('API key is required for IDmeta KYC Provider');
      }

      if (!credentials.baseUrl) {
        throw new Error('Base URL is required for IDmeta KYC Provider');
      }

      // Store webhook secret for signature verification
      this.webhookSecret = credentials.webhookSecret;

      // Configure HTTP client
      this.httpClient.configure(
        {
          apiKey: credentials.apiKey,
          apiSecret: credentials.secretKey,
          webhookSecret: credentials.webhookSecret,
          baseUrl: credentials.baseUrl,
        },
        {
          timeout: config?.customSettings?.timeout || 30000,
          retryAttempts: config?.customSettings?.retryAttempts || 3,
          retryDelay: config?.customSettings?.retryDelay || 1000,
        },
      );

      // Validate credentials by performing a health check
      const health = await this.healthCheck();
      if (!health.isHealthy) {
        throw new Error('Provider health check failed during initialization');
      }

      this.isInitialized = true;
      this.logger.log('IDmeta KYC Provider initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize IDmeta KYC Provider:', error);
      throw error;
    }
  }

  /**
   * Create a new verification
   * This initiates a verification session with IDmeta
   *
   * Note: This only creates the session. The actual verification steps
   * (document, face, AML, etc.) should be executed separately via the
   * HTTP client's individual methods, then finalized.
   */
  async createVerification(request: VerificationRequest): Promise<VerificationResponse> {
    this.ensureInitialized();

    try {
      this.logger.log('Creating verification session...');

      // Map internal request to provider format
      const internalRequest: InternalVerificationRequest = {
        tenantId: request.tenantId,
        accountId: request.accountId,
        verificationType: this.mapVerificationType(request.verificationType),
        templateId: request.metadata?.templateId || 'default_template',
        verificationId: request.metadata?.verificationId || this.generateVerificationId(),
        callbackUrl: request.callbackUrl,
        metadata: request.metadata,
      };

      const providerRequest = this.requestMapper.toProviderCreateRequest(internalRequest);

      // Call provider API to create verification session
      const providerResponse = await this.httpClient.createVerification(providerRequest);

      // Map provider response to internal format
      const internalResponse = this.responseMapper.toInternalCreateResponse(
        providerResponse,
        internalRequest.verificationId!,
      );

      // Convert to VerificationResponse format
      const response: VerificationResponse = {
        id: internalResponse.verificationId,
        providerVerificationId: internalResponse.externalVerificationId,
        status: internalResponse.status,
        processingMethod: ProcessingMethod.EXTERNAL_LINK,
        verificationLink: undefined, // IDmeta doesn't provide hosted URL in create response
        expiresAt: internalResponse.expiresAt,
        metadata: {
          ...internalResponse.metadata,
          createdAt: internalResponse.createdAt?.toISOString(),
          verification_id: internalResponse.externalVerificationId,
          template_id: providerRequest.template_id,
          message:
            'Verification session created. Execute verification steps (document, face, etc.) then finalize.',
        },
      };

      this.logger.log(`Verification session created: ${response.providerVerificationId}`);
      return response;
    } catch (error) {
      this.logger.error('Failed to create verification:', error);
      throw error;
    }
  }

  /**
   * Get verification status/results
   * GET /api/v2/verification/get-verification/{verification_id}
   */
  async getVerificationStatus(providerVerificationId: string): Promise<VerificationStatusResponse> {
    this.ensureInitialized();

    try {
      this.logger.log(`Getting verification results: ${providerVerificationId}`);

      // Call provider API to get results (v2 endpoint)
      const providerResponse = await this.httpClient.getResults({
        verification_id: providerVerificationId,
      });

      // Map provider response to internal format
      const internalResponse = this.responseMapper.toInternalStatusResponse(
        providerResponse,
        providerVerificationId,
      );

      // Convert to VerificationStatusResponse format
      const response: VerificationStatusResponse = {
        id: internalResponse.verificationId,
        providerVerificationId: internalResponse.externalVerificationId,
        status: internalResponse.status,
        processingMethod: ProcessingMethod.EXTERNAL_LINK,
        result: internalResponse.result
          ? {
              overall: {
                status:
                  internalResponse.result.decision === 'approved'
                    ? 'passed'
                    : internalResponse.result.decision === 'rejected'
                      ? 'failed'
                      : 'pending',
                confidence: (internalResponse.result.confidenceScore || 0) * 100,
                riskLevel: internalResponse.result.riskLevel || 'low',
              },
              document: internalResponse.result.documentValidation
                ? {
                    extracted: {
                      firstName: internalResponse.result.validatedData?.firstName,
                      lastName: internalResponse.result.validatedData?.lastName,
                      dateOfBirth: internalResponse.result.validatedData?.dateOfBirth,
                      nationality: internalResponse.result.validatedData?.nationality,
                      documentNumber: internalResponse.result.documentValidation.number,
                      expiryDate: internalResponse.result.documentValidation.expiryDate,
                      issuingCountry: internalResponse.result.documentValidation.country,
                    },
                    checks: {
                      authenticity: internalResponse.result.documentValidation.isValid
                        ? 'passed'
                        : 'failed',
                      validity: internalResponse.result.documentValidation.isExpired
                        ? 'failed'
                        : 'passed',
                      dataConsistency: 'passed',
                    },
                    confidence: (internalResponse.result.confidenceScore || 0) * 100,
                  }
                : undefined,
              biometric: internalResponse.result.biometricValidation
                ? {
                    livenessCheck: internalResponse.result.biometricValidation.livenessCheck
                      ? 'passed'
                      : 'not_performed',
                    faceMatch: internalResponse.result.biometricValidation.faceMatch
                      ? 'passed'
                      : 'failed',
                    confidence:
                      (internalResponse.result.biometricValidation.faceMatchScore || 0) * 100,
                  }
                : undefined,
              metadata: {
                ...internalResponse.result.rawProviderData,
                steps_completed: providerResponse.steps_completed,
                template_id: providerResponse.template_id,
              },
            }
          : undefined,
        updatedAt: internalResponse.updatedAt || new Date(),
      };

      return response;
    } catch (error) {
      this.logger.error(`Failed to get verification status: ${providerVerificationId}`, error);
      throw error;
    }
  }

  /**
   * Cancel verification
   * POST /api/v1/verification/cancel-verification
   */
  async cancelVerification(providerVerificationId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      this.logger.log(`Cancelling verification: ${providerVerificationId}`);

      const response = await this.httpClient.cancelVerification({
        verification_id: providerVerificationId,
        reason: 'Cancelled by user',
      });

      return response.status === 'cancelled';
    } catch (error) {
      this.logger.error(`Failed to cancel verification: ${providerVerificationId}`, error);
      return false;
    }
  }

  /**
   * Handle webhook payload from IDmeta
   * Processes verification status updates sent by IDmeta
   */
  async handleWebhook(
    payload: any,
    signature?: string,
  ): Promise<VerificationStatusResponse | null> {
    this.ensureInitialized();

    try {
      this.logger.log('Processing webhook payload...');

      // Verify webhook signature if provided
      if (signature && this.webhookSecret) {
        const isValid = this.verifyWebhookSignature(payload, signature);
        if (!isValid) {
          this.logger.warn('Invalid webhook signature');
          throw new Error('Invalid webhook signature');
        }
      }

      // Parse webhook payload
      const webhookPayload = payload as ProviderWebhookPayload;

      // Map webhook to internal response
      const internalResponse = this.responseMapper.fromWebhookPayload(
        webhookPayload,
        webhookPayload.verification_id,
      );

      // Convert to VerificationStatusResponse format
      const response: VerificationStatusResponse = {
        id: internalResponse.verificationId,
        providerVerificationId: internalResponse.externalVerificationId,
        status: internalResponse.status,
        processingMethod: ProcessingMethod.EXTERNAL_LINK,
        result: internalResponse.result
          ? {
              overall: {
                status:
                  internalResponse.result.decision === 'approved'
                    ? 'passed'
                    : internalResponse.result.decision === 'rejected'
                      ? 'failed'
                      : 'pending',
                confidence: (internalResponse.result.confidenceScore || 0) * 100,
                riskLevel: internalResponse.result.riskLevel || 'low',
              },
              metadata: {
                ...internalResponse.result.rawProviderData,
                webhook_event_type: webhookPayload.event_type,
                step_type: webhookPayload.data.step_type,
                step_status: webhookPayload.data.step_status,
              },
            }
          : undefined,
        updatedAt: internalResponse.updatedAt || new Date(),
      };

      this.logger.log(`Webhook processed for verification: ${response.providerVerificationId}`);
      return response;
    } catch (error) {
      this.logger.error('Failed to process webhook:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ProviderHealthResponse> {
    try {
      const startTime = Date.now();
      const response = await this.httpClient.healthCheck();
      const latency = Date.now() - startTime;

      return {
        isHealthy: response.status === 'operational',
        latency,
        lastChecked: new Date(),
        error: response.status !== 'operational' ? 'Provider is down' : undefined,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        isHealthy: false,
        latency: 0,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.isHealthy;
    } catch (error) {
      this.logger.error('Credential validation failed:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature using HMAC SHA256
   */
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString)
        .digest('hex');

      // Support both "sha256=signature" and "signature" formats
      const actualSignature = signature.startsWith('sha256=') ? signature.substring(7) : signature;

      return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(actualSignature));
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Map internal verification type to provider format
   */
  private mapVerificationType(type: string): string {
    const typeMap: Record<string, string> = {
      document: 'document',
      biometric: 'biometric',
      comprehensive: 'document', // Default to document for comprehensive
    };

    return typeMap[type.toLowerCase()] || 'document';
  }

  /**
   * Generate a unique verification ID
   */
  private generateVerificationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `VER-${timestamp}-${random}`;
  }

  /**
   * Ensure provider is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
  }
}
