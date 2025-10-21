import { Test, TestingModule } from '@nestjs/testing';
import { ExternalProvider } from './external.provider';
import { ExternalHttpClient } from './external-http.client';
import { ExternalRequestMapper } from './mappers/request.mapper';
import { ExternalResponseMapper } from './mappers/response.mapper';
import {
  VerificationRequest,
  VerificationType,
  ProcessingMethod,
  VerificationStatus,
} from '../../types/provider.types';
import {
  ProviderCreateVerificationResponse,
  ProviderGetResultsResponse,
  ProviderCancelVerificationResponse,
  ProviderHealthCheckResponse,
  ProviderWebhookPayload,
} from './types/provider-api.types';

describe('ExternalProvider', () => {
  let provider: ExternalProvider;
  let httpClient: jest.Mocked<ExternalHttpClient>;
  let requestMapper: jest.Mocked<ExternalRequestMapper>;
  let responseMapper: jest.Mocked<ExternalResponseMapper>;

  beforeEach(async () => {
    // Create mocks
    const mockHttpClient = {
      configure: jest.fn(),
      createVerification: jest.fn(),
      getResults: jest.fn(),
      cancelVerification: jest.fn(),
      healthCheck: jest.fn(),
    };

    const mockRequestMapper = {
      toProviderCreateRequest: jest.fn(),
    };

    const mockResponseMapper = {
      toInternalCreateResponse: jest.fn(),
      toInternalStatusResponse: jest.fn(),
      fromWebhookPayload: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalProvider,
        { provide: ExternalHttpClient, useValue: mockHttpClient },
        { provide: ExternalRequestMapper, useValue: mockRequestMapper },
        { provide: ExternalResponseMapper, useValue: mockResponseMapper },
      ],
    }).compile();

    provider = module.get<ExternalProvider>(ExternalProvider);
    httpClient = module.get(ExternalHttpClient);
    requestMapper = module.get(ExternalRequestMapper);
    responseMapper = module.get(ExternalResponseMapper);
  });

  describe('Provider Metadata', () => {
    it('should have correct provider metadata', () => {
      expect(provider.name).toBe('IDmeta KYC Provider');
      expect(provider.type).toBe('external');
      expect(provider.processingMode).toBe('async_webhook');
    });

    it('should have correct capabilities', () => {
      expect(provider.capabilities).toBeDefined();
      expect(provider.capabilities.supportsTemplates).toBe(true);
      expect(provider.capabilities.supportsIdBasedVerification).toBe(true);
      expect(provider.capabilities.supportsAsync).toBe(true);
      expect(provider.capabilities.supportedVerificationMethods).toContain('document');
      expect(provider.capabilities.supportedVerificationMethods).toContain('id_based');
      expect(provider.capabilities.supportedVerificationMethods).toContain('biometric');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      const credentials = {
        apiKey: 'test-api-key',
        baseUrl: 'https://integrate.idmetagroup.com/api',
        webhookSecret: 'webhook-secret',
      };

      httpClient.healthCheck.mockResolvedValue({
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });

      await provider.initialize(credentials);

      expect(httpClient.configure).toHaveBeenCalledWith(
        {
          apiKey: credentials.apiKey,
          apiSecret: undefined,
          webhookSecret: credentials.webhookSecret,
          baseUrl: credentials.baseUrl,
        },
        expect.objectContaining({
          timeout: 30000,
          retryAttempts: 3,
          retryDelay: 1000,
        }),
      );
      expect(httpClient.healthCheck).toHaveBeenCalled();
    });

    it('should throw error if API key is missing', async () => {
      const credentials = {
        baseUrl: 'https://integrate.idmetagroup.com/api',
      };

      await expect(provider.initialize(credentials)).rejects.toThrow('API key is required');
    });

    it('should throw error if base URL is missing', async () => {
      const credentials = {
        apiKey: 'test-api-key',
      };

      await expect(provider.initialize(credentials)).rejects.toThrow('Base URL is required');
    });

    it('should throw error if health check fails', async () => {
      const credentials = {
        apiKey: 'test-api-key',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      };

      httpClient.healthCheck.mockResolvedValue({
        status: 'down',
        version: 'unknown',
        timestamp: new Date().toISOString(),
      });

      await expect(provider.initialize(credentials)).rejects.toThrow('health check failed');
    });

    it('should use custom timeout and retry settings', async () => {
      const credentials = {
        apiKey: 'test-api-key',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      };

      const config = {
        processingMethod: ProcessingMethod.EXTERNAL_LINK,
        customSettings: {
          timeout: 60000,
          retryAttempts: 5,
          retryDelay: 2000,
        },
      };

      httpClient.healthCheck.mockResolvedValue({
        status: 'operational',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      });

      await provider.initialize(credentials, config);

      expect(httpClient.configure).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          timeout: 60000,
          retryAttempts: 5,
          retryDelay: 2000,
        }),
      );
    });
  });

  describe('createVerification', () => {
    beforeEach(async () => {
      await initializeProvider();
    });

    it('should create verification successfully', async () => {
      const request: VerificationRequest = {
        tenantId: 'tenant-123',
        accountId: 'account-456',
        verificationType: VerificationType.DOCUMENT,
        processingMethod: ProcessingMethod.EXTERNAL_LINK,
        callbackUrl: 'https://example.com/callback',
        metadata: { custom: 'value' },
      };

      const providerResponse: ProviderCreateVerificationResponse = {
        verification_id: 'VER-123',
        template_id: 'template-123',
        status: 'created',
        created_at: '2025-01-01T00:00:00Z',
        message: 'Verification session created',
      };

      const mappedResponse = {
        verificationId: 'VER-123',
        externalVerificationId: 'VER-123',
        status: VerificationStatus.PENDING,
        workflowUrl: undefined,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        metadata: { template_id: 'template-123', message: 'Verification session created' },
      };

      requestMapper.toProviderCreateRequest.mockReturnValue({
        template_id: 'template-123',
        verification_id: 'VER-123',
        callback_url: 'https://example.com/callback',
        metadata: { custom: 'value', tenant_id: 'tenant-123', account_id: 'account-456' },
      });

      httpClient.createVerification.mockResolvedValue(providerResponse);
      responseMapper.toInternalCreateResponse.mockReturnValue(mappedResponse);

      const result = await provider.createVerification(request);

      expect(requestMapper.toProviderCreateRequest).toHaveBeenCalled();
      expect(httpClient.createVerification).toHaveBeenCalled();
      expect(responseMapper.toInternalCreateResponse).toHaveBeenCalled();
      expect(result.providerVerificationId).toBe('VER-123');
      expect(result.status).toBe(VerificationStatus.PENDING);
      expect(result.verificationLink).toBeUndefined();
      expect(result.metadata?.template_id).toBe('template-123');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedProvider = new ExternalProvider(httpClient, requestMapper, responseMapper);

      const request: VerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: VerificationType.DOCUMENT,
        processingMethod: ProcessingMethod.EXTERNAL_LINK,
      };

      await expect(uninitializedProvider.createVerification(request)).rejects.toThrow(
        'not initialized',
      );
    });

    it('should handle API errors gracefully', async () => {
      const request: VerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: VerificationType.DOCUMENT,
        processingMethod: ProcessingMethod.EXTERNAL_LINK,
      };

      requestMapper.toProviderCreateRequest.mockReturnValue({
        template_id: 'template-123',
        verification_id: 'VER-123',
      });

      httpClient.createVerification.mockRejectedValue(new Error('API Error: Invalid request'));

      await expect(provider.createVerification(request)).rejects.toThrow('API Error');
    });
  });

  describe('getVerificationStatus', () => {
    beforeEach(async () => {
      await initializeProvider();
    });

    it('should get verification status successfully', async () => {
      const providerResponse: ProviderGetResultsResponse = {
        verification_id: 'VER-123',
        template_id: 'template-123',
        status: 'finalized',
        result: {
          decision: 'approved',
          confidence_score: 0.95,
          risk_level: 'low',
        },
        steps_completed: [
          {
            step_type: 'document',
            status: 'completed',
            completed_at: '2025-01-01T00:03:00Z',
          },
        ],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:05:00Z',
        finalized_at: '2025-01-01T00:05:00Z',
      };

      const mappedResponse = {
        verificationId: 'VER-123',
        externalVerificationId: 'VER-123',
        status: VerificationStatus.COMPLETED,
        result: {
          decision: 'approved' as const,
          confidenceScore: 0.95,
          riskLevel: 'low' as const,
        },
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:05:00Z'),
      };

      httpClient.getResults.mockResolvedValue(providerResponse);
      responseMapper.toInternalStatusResponse.mockReturnValue(mappedResponse);

      const result = await provider.getVerificationStatus('VER-123');

      expect(httpClient.getResults).toHaveBeenCalledWith({
        verification_id: 'VER-123',
      });
      expect(result.status).toBe(VerificationStatus.COMPLETED);
      expect(result.result).toBeDefined();
      expect(result.result?.overall.status).toBe('passed');
      expect(result.result?.overall.confidence).toBe(95);
    });

    it('should handle pending status', async () => {
      const providerResponse: ProviderGetResultsResponse = {
        verification_id: 'VER-123',
        template_id: 'template-123',
        status: 'processing',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:01:00Z',
      };

      const mappedResponse = {
        verificationId: 'VER-123',
        externalVerificationId: 'VER-123',
        status: VerificationStatus.IN_PROGRESS,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:01:00Z'),
      };

      httpClient.getResults.mockResolvedValue(providerResponse);
      responseMapper.toInternalStatusResponse.mockReturnValue(mappedResponse);

      const result = await provider.getVerificationStatus('VER-123');

      expect(result.status).toBe(VerificationStatus.IN_PROGRESS);
      expect(result.result).toBeUndefined();
    });
  });

  describe('cancelVerification', () => {
    beforeEach(async () => {
      await initializeProvider();
    });

    it('should cancel verification successfully', async () => {
      const response: ProviderCancelVerificationResponse = {
        verification_id: 'ver_123',
        status: 'cancelled',
        cancelled_at: '2025-01-01T00:05:00Z',
      };

      httpClient.cancelVerification.mockResolvedValue(response);

      const result = await provider.cancelVerification('ver_123');

      expect(httpClient.cancelVerification).toHaveBeenCalledWith({
        verification_id: 'ver_123',
        reason: 'Cancelled by user',
      });
      expect(result).toBe(true);
    });

    it('should return false if cancellation fails', async () => {
      httpClient.cancelVerification.mockRejectedValue(new Error('Cancellation failed'));

      const result = await provider.cancelVerification('ver_123');

      expect(result).toBe(false);
    });
  });

  describe('handleWebhook', () => {
    beforeEach(async () => {
      await initializeProvider();
    });

    it('should process webhook successfully', async () => {
      const webhookPayload: ProviderWebhookPayload = {
        event_type: 'verification.completed',
        verification_id: 'ver_123',
        timestamp: '2025-01-01T00:05:00Z',
        data: {
          status: 'completed',
          result: {
            decision: 'approved',
            confidence_score: 0.95,
          },
        },
      };

      const mappedResponse = {
        verificationId: 'ver_123',
        externalVerificationId: 'ver_123',
        status: VerificationStatus.COMPLETED,
        result: {
          decision: 'approved' as const,
          confidenceScore: 0.95,
          riskLevel: 'low' as const,
        },
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:05:00Z'),
      };

      responseMapper.fromWebhookPayload.mockReturnValue(mappedResponse);

      const result = await provider.handleWebhook(webhookPayload);

      expect(responseMapper.fromWebhookPayload).toHaveBeenCalledWith(webhookPayload, 'ver_123');
      expect(result).toBeDefined();
      expect(result?.status).toBe(VerificationStatus.COMPLETED);
    });

    it('should return null if webhook processing fails', async () => {
      const webhookPayload = { invalid: 'payload' };

      responseMapper.fromWebhookPayload.mockImplementation(() => {
        throw new Error('Invalid payload');
      });

      const result = await provider.handleWebhook(webhookPayload);

      expect(result).toBeNull();
    });

    it('should verify webhook signature if provided', async () => {
      const webhookPayload: ProviderWebhookPayload = {
        event_type: 'verification.completed',
        verification_id: 'ver_123',
        timestamp: '2025-01-01T00:05:00Z',
        data: { status: 'completed' },
      };

      const signature = 'sha256=invalid_signature';

      responseMapper.fromWebhookPayload.mockReturnValue({
        verificationId: 'ver_123',
        externalVerificationId: 'ver_123',
        status: VerificationStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Should still process even with invalid signature (logs warning)
      const result = await provider.handleWebhook(webhookPayload, signature);

      expect(result).toBeDefined();
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      await initializeProvider();
    });

    it('should return healthy status', async () => {
      const response: ProviderHealthCheckResponse = {
        status: 'operational',
        version: '1.0.0',
        timestamp: '2025-01-01T00:00:00Z',
      };

      httpClient.healthCheck.mockResolvedValue(response);

      const result = await provider.healthCheck();

      expect(result.isHealthy).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.lastChecked).toBeInstanceOf(Date);
    });

    it('should return unhealthy status on error', async () => {
      httpClient.healthCheck.mockRejectedValue(new Error('Network error'));

      const result = await provider.healthCheck();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateCredentials', () => {
    beforeEach(async () => {
      await initializeProvider();
    });

    it('should validate credentials successfully', async () => {
      httpClient.healthCheck.mockResolvedValue({
        status: 'operational',
        version: '1.0.0',
        timestamp: '2025-01-01T00:00:00Z',
      });

      const result = await provider.validateCredentials();

      expect(result).toBe(true);
    });

    it('should return false for invalid credentials', async () => {
      httpClient.healthCheck.mockRejectedValue(new Error('Unauthorized'));

      const result = await provider.validateCredentials();

      expect(result).toBe(false);
    });
  });

  // Helper function to initialize provider
  async function initializeProvider() {
    const credentials = {
      apiKey: 'test-api-key',
      baseUrl: 'https://integrate.idmetagroup.com/api',
      webhookSecret: 'webhook-secret',
    };

    httpClient.healthCheck.mockResolvedValue({
      status: 'operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });

    await provider.initialize(credentials);
  }
});
