import { Test, TestingModule } from '@nestjs/testing';
import { ExternalHttpClient } from './external-http.client';
import axios, { AxiosError } from 'axios';
import {
  ProviderCreateVerificationRequest,
  ProviderCreateVerificationResponse,
  ProviderGetResultsResponse,
  ProviderCancelVerificationResponse,
  ProviderHealthCheckResponse,
} from './types/provider-api.types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ExternalHttpClient', () => {
  let client: ExternalHttpClient;
  let axiosInstance: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    axiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(axiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalHttpClient],
    }).compile();

    client = module.get<ExternalHttpClient>(ExternalHttpClient);
  });

  describe('configure', () => {
    it('should configure the HTTP client with credentials', () => {
      const credentials = {
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
        apiVersion: 'v1',
      };

      client.configure(credentials);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: credentials.baseUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${credentials.apiKey}`,
        },
      });
    });

    it('should use default timeout and retry settings', () => {
      const credentials = {
        apiKey: 'test-api-key',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      };

      client.configure(credentials);

      const config = client.getConfig();
      expect(config.config.timeout).toBe(30000);
      expect(config.config.retryAttempts).toBe(3);
      expect(config.config.retryDelay).toBe(1000);
    });

    it('should use custom timeout and retry settings', () => {
      const credentials = {
        apiKey: 'test-api-key',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      };

      const config = {
        timeout: 60000,
        retryAttempts: 5,
        retryDelay: 2000,
      };

      client.configure(credentials, config);

      const clientConfig = client.getConfig();
      expect(clientConfig.config.timeout).toBe(60000);
      expect(clientConfig.config.retryAttempts).toBe(5);
      expect(clientConfig.config.retryDelay).toBe(2000);
    });
  });

  describe('createVerification', () => {
    beforeEach(() => {
      client.configure({
        apiKey: 'test-api-key',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      });
    });

    it('should create verification successfully', async () => {
      const request: ProviderCreateVerificationRequest = {
        template_id: 'template-123',
        verification_id: 'VER-123',
        callback_url: 'https://example.com/callback',
        metadata: { custom: 'value' },
      };

      const response: ProviderCreateVerificationResponse = {
        verification_id: 'VER-123',
        template_id: 'template-123',
        status: 'created',
        created_at: '2025-01-01T00:00:00Z',
        message: 'Verification session created',
      };

      axiosInstance.post.mockResolvedValue({ data: response });

      const result = await client.createVerification(request);

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/v1/verification/create-verification',
        request,
      );
      expect(result).toEqual(response);
    });

    it('should retry on 5xx errors', async () => {
      const request: ProviderCreateVerificationRequest = {
        template_id: 'template-123',
        verification_id: 'VER-123',
      };

      const response: ProviderCreateVerificationResponse = {
        verification_id: 'VER-123',
        template_id: 'template-123',
        status: 'created',
        created_at: '2025-01-01T00:00:00Z',
      };

      // Fail twice, succeed on third attempt
      axiosInstance.post
        .mockRejectedValueOnce({
          response: { status: 503, data: { error: { message: 'Service Unavailable' } } },
        })
        .mockRejectedValueOnce({
          response: { status: 500, data: { error: { message: 'Internal Server Error' } } },
        })
        .mockResolvedValueOnce({ data: response });

      const result = await client.createVerification(request);

      expect(axiosInstance.post).toHaveBeenCalledTimes(3);
      expect(result).toEqual(response);
    });

    it('should not retry on 4xx errors', async () => {
      const request: ProviderCreateVerificationRequest = {
        template_id: 'template-123',
        verification_id: 'VER-123',
      };

      axiosInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid request',
            },
          },
        },
      } as AxiosError);

      await expect(client.createVerification(request)).rejects.toThrow('Provider API Error');

      expect(axiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries', async () => {
      const request: ProviderCreateVerificationRequest = {
        template_id: 'template-123',
        verification_id: 'VER-123',
      };

      axiosInstance.post.mockRejectedValue({
        response: {
          status: 503,
          data: {
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Service unavailable',
            },
          },
        },
      } as AxiosError);

      await expect(client.createVerification(request)).rejects.toThrow();

      expect(axiosInstance.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('getResults', () => {
    beforeEach(() => {
      client.configure({
        apiKey: 'test-api-key',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      });
    });

    it('should get verification results successfully', async () => {
      const response: ProviderGetResultsResponse = {
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

      axiosInstance.get.mockResolvedValue({ data: response });

      const result = await client.getResults({
        verification_id: 'VER-123',
      });

      expect(axiosInstance.get).toHaveBeenCalledWith('/v2/verification/get-verification/VER-123');
      expect(result).toEqual(response);
    });
  });

  describe('cancelVerification', () => {
    beforeEach(() => {
      client.configure({
        apiKey: 'test-api-key',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      });
    });

    it('should cancel verification successfully', async () => {
      const response: ProviderCancelVerificationResponse = {
        verification_id: 'ver_123',
        status: 'cancelled',
        cancelled_at: '2025-01-01T00:05:00Z',
      };

      axiosInstance.post.mockResolvedValue({ data: response });

      const result = await client.cancelVerification({
        verification_id: 'ver_123',
        reason: 'User requested cancellation',
      });

      expect(axiosInstance.post).toHaveBeenCalledWith('/v1/verification/cancel-verification', {
        verification_id: 'ver_123',
        reason: 'User requested cancellation',
      });
      expect(result).toEqual(response);
    });
  });

  describe('healthCheck', () => {
    beforeEach(() => {
      client.configure({
        apiKey: 'test-api-key',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      });
    });

    it('should return operational status on success', async () => {
      const response: ProviderHealthCheckResponse = {
        status: 'operational',
        version: '1.0.0',
        timestamp: '2025-01-01T00:00:00Z',
      };

      axiosInstance.get.mockResolvedValue({ data: response });

      const result = await client.healthCheck();

      expect(axiosInstance.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(response);
    });

    it('should return down status on error', async () => {
      axiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await client.healthCheck();

      expect(result.status).toBe('down');
      expect(result.version).toBe('unknown');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      client.configure({
        apiKey: 'test-api-key',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      });
    });

    it('should handle network errors', async () => {
      axiosInstance.post.mockRejectedValue({
        request: {},
        message: 'Network Error',
      } as AxiosError);

      await expect(
        client.createVerification({
          template_id: 'template-123',
          verification_id: 'VER-123',
        }),
      ).rejects.toThrow('Provider API Network Error');
    });

    it('should transform provider errors correctly', async () => {
      axiosInstance.post.mockRejectedValue({
        response: {
          status: 400,
          data: {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid template_id',
              details: { field: 'template_id' },
            },
          },
        },
      } as AxiosError);

      try {
        await client.createVerification({
          template_id: '',
          verification_id: 'VER-123',
        });
      } catch (error: any) {
        expect(error.message).toContain('Invalid template_id');
        expect(error.code).toBe('INVALID_REQUEST');
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual({ field: 'template_id' });
      }
    });
  });

  describe('getConfig', () => {
    it('should redact sensitive information in config', () => {
      client.configure({
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        webhookSecret: 'test-webhook-secret',
        baseUrl: 'https://integrate.idmetagroup.com/api',
      });

      const config = client.getConfig();

      expect(config.credentials.apiKey).toBe('***REDACTED***');
      expect(config.credentials.apiSecret).toBe('***REDACTED***');
      expect(config.credentials.webhookSecret).toBe('***REDACTED***');
      expect(config.credentials.baseUrl).toBe('https://integrate.idmetagroup.com/api');
    });
  });
});
