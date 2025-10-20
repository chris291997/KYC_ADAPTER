import { Test, TestingModule } from '@nestjs/testing';
import { ExternalResponseMapper } from './response.mapper';
import {
  ProviderCreateVerificationResponse,
  ProviderGetVerificationStatusResponse,
  ProviderWebhookPayload,
  ProviderVerificationResult,
} from '../types/provider-api.types';
import { VerificationStatus } from '../../../types';

describe('ExternalResponseMapper', () => {
  let mapper: ExternalResponseMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalResponseMapper],
    }).compile();

    mapper = module.get<ExternalResponseMapper>(ExternalResponseMapper);
  });

  describe('toInternalCreateResponse', () => {
    it('should map provider create response to internal format', () => {
      const providerResponse: ProviderCreateVerificationResponse = {
        verification_id: 'ver_123',
        status: 'pending',
        workflow_url: 'https://verify.example.com/ver_123',
        hosted_url: 'https://hosted.example.com/ver_123',
        expires_at: '2025-01-01T12:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        metadata: {
          custom_field: 'custom_value',
        },
      };

      const result = mapper.toInternalCreateResponse(providerResponse, 'internal-123');

      expect(result.verificationId).toBe('internal-123');
      expect(result.externalVerificationId).toBe('ver_123');
      expect(result.status).toBe(VerificationStatus.PENDING);
      expect(result.workflowUrl).toBe('https://verify.example.com/ver_123');
      expect(result.hostedUrl).toBe('https://hosted.example.com/ver_123');
      expect(result.expiresAt).toEqual(new Date('2025-01-01T12:00:00Z'));
      expect(result.createdAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      expect(result.metadata).toEqual({ custom_field: 'custom_value' });
    });

    it('should use workflow_url when hosted_url not provided', () => {
      const providerResponse: ProviderCreateVerificationResponse = {
        verification_id: 'ver_123',
        status: 'pending',
        workflow_url: 'https://verify.example.com/ver_123',
        created_at: '2025-01-01T00:00:00Z',
      };

      const result = mapper.toInternalCreateResponse(providerResponse, 'internal-123');

      expect(result.workflowUrl).toBe('https://verify.example.com/ver_123');
    });

    it('should handle missing optional fields', () => {
      const providerResponse: ProviderCreateVerificationResponse = {
        verification_id: 'ver_123',
        status: 'pending',
        created_at: '2025-01-01T00:00:00Z',
      };

      const result = mapper.toInternalCreateResponse(providerResponse, 'internal-123');

      expect(result.workflowUrl).toBeUndefined();
      expect(result.hostedUrl).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('toInternalStatusResponse', () => {
    it('should map provider status response with result', () => {
      const providerResult: ProviderVerificationResult = {
        decision: 'approved',
        confidence_score: 0.95,
        risk_level: 'low',
        personal_info: {
          first_name: 'John',
          middle_name: 'Michael',
          last_name: 'Doe',
          full_name: 'John Michael Doe',
          date_of_birth: '1990-01-01',
          nationality: 'US',
          gender: 'M',
        },
        document: {
          type: 'passport',
          number: 'P1234567',
          country: 'US',
          issue_date: '2020-01-01',
          expiry_date: '2030-01-01',
          is_valid: true,
          is_expired: false,
          validation_checks: {
            mrz_valid: true,
            chip_valid: true,
            image_quality: true,
            tamper_detection: false,
          },
        },
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
          is_verified: true,
        },
        biometric: {
          face_match: true,
          face_match_score: 0.98,
          liveness_check: true,
          liveness_score: 0.96,
        },
        checks: {
          watchlist: {
            is_match: false,
            matches: [],
          },
          sanctions: {
            is_match: false,
            matches: [],
          },
          pep: {
            is_match: false,
            matches: [],
          },
        },
        flags: [
          {
            type: 'document_quality',
            severity: 'low',
            message: 'Image resolution slightly below optimal',
          },
        ],
        raw_data: {
          provider_specific_field: 'value',
        },
      };

      const providerResponse: ProviderGetVerificationStatusResponse = {
        verification_id: 'ver_123',
        status: 'completed',
        result: providerResult,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:05:00Z',
        completed_at: '2025-01-01T00:05:00Z',
        metadata: { custom_field: 'value' },
      };

      const result = mapper.toInternalStatusResponse(providerResponse, 'internal-123');

      expect(result.verificationId).toBe('internal-123');
      expect(result.externalVerificationId).toBe('ver_123');
      expect(result.status).toBe(VerificationStatus.COMPLETED);
      expect(result.result).toBeDefined();
      expect(result.result?.decision).toBe('approved');
      expect(result.result?.confidenceScore).toBe(0.95);
      expect(result.result?.riskLevel).toBe('low');
      expect(result.result?.validatedData?.firstName).toBe('John');
      expect(result.result?.validatedData?.middleName).toBe('Michael');
      expect(result.result?.validatedData?.lastName).toBe('Doe');
      expect(result.result?.validatedData?.fullName).toBe('John Michael Doe');
      expect(result.result?.validatedData?.dateOfBirth).toBe('1990-01-01');
      expect(result.result?.validatedData?.nationality).toBe('US');
      expect(result.result?.validatedData?.gender).toBe('M');
      expect(result.result?.validatedData?.address?.street).toBe('123 Main St');
      expect(result.result?.validatedData?.address?.isVerified).toBe(true);
      expect(result.result?.documentValidation?.type).toBe('passport');
      expect(result.result?.documentValidation?.number).toBe('P1234567');
      expect(result.result?.documentValidation?.isValid).toBe(true);
      expect(result.result?.documentValidation?.isExpired).toBe(false);
      expect(result.result?.documentValidation?.checks?.mrzValid).toBe(true);
      expect(result.result?.biometricValidation?.faceMatch).toBe(true);
      expect(result.result?.biometricValidation?.faceMatchScore).toBe(0.98);
      expect(result.result?.additionalChecks?.watchlist?.isMatch).toBe(false);
      expect(result.result?.flags).toHaveLength(1);
      expect(result.result?.flags?.[0].type).toBe('document_quality');
      expect(result.result?.rawProviderData).toEqual({ provider_specific_field: 'value' });
      expect(result.createdAt).toEqual(new Date('2025-01-01T00:00:00Z'));
      expect(result.updatedAt).toEqual(new Date('2025-01-01T00:05:00Z'));
      expect(result.completedAt).toEqual(new Date('2025-01-01T00:05:00Z'));
    });

    it('should handle status response without result', () => {
      const providerResponse: ProviderGetVerificationStatusResponse = {
        verification_id: 'ver_123',
        status: 'processing',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:01:00Z',
      };

      const result = mapper.toInternalStatusResponse(providerResponse, 'internal-123');

      expect(result.status).toBe(VerificationStatus.IN_PROGRESS);
      expect(result.result).toBeUndefined();
    });
  });

  describe('fromWebhookPayload', () => {
    it('should map webhook payload for completed verification', () => {
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
          metadata: { custom_field: 'value' },
        },
      };

      const result = mapper.fromWebhookPayload(webhookPayload, 'internal-123');

      expect(result.verificationId).toBe('internal-123');
      expect(result.externalVerificationId).toBe('ver_123');
      expect(result.status).toBe(VerificationStatus.COMPLETED);
      expect(result.result?.decision).toBe('approved');
      expect(result.result?.confidenceScore).toBe(0.95);
      expect(result.completedAt).toEqual(new Date('2025-01-01T00:05:00Z'));
    });

    it('should map webhook payload for approved verification', () => {
      const webhookPayload: ProviderWebhookPayload = {
        event_type: 'verification.approved',
        verification_id: 'ver_123',
        timestamp: '2025-01-01T00:05:00Z',
        data: {
          status: 'approved',
        },
      };

      const result = mapper.fromWebhookPayload(webhookPayload, 'internal-123');

      expect(result.status).toBe(VerificationStatus.COMPLETED);
      expect(result.completedAt).toEqual(new Date('2025-01-01T00:05:00Z'));
    });

    it('should map webhook payload for rejected verification', () => {
      const webhookPayload: ProviderWebhookPayload = {
        event_type: 'verification.rejected',
        verification_id: 'ver_123',
        timestamp: '2025-01-01T00:05:00Z',
        data: {
          status: 'rejected',
          result: {
            decision: 'rejected',
            risk_level: 'high',
          },
        },
      };

      const result = mapper.fromWebhookPayload(webhookPayload, 'internal-123');

      expect(result.status).toBe(VerificationStatus.FAILED);
      expect(result.result?.decision).toBe('rejected');
      expect(result.completedAt).toEqual(new Date('2025-01-01T00:05:00Z'));
    });

    it('should map webhook payload for processing verification', () => {
      const webhookPayload: ProviderWebhookPayload = {
        event_type: 'verification.processing',
        verification_id: 'ver_123',
        timestamp: '2025-01-01T00:02:00Z',
        data: {
          status: 'processing',
        },
      };

      const result = mapper.fromWebhookPayload(webhookPayload, 'internal-123');

      expect(result.status).toBe(VerificationStatus.IN_PROGRESS);
      expect(result.completedAt).toBeUndefined();
    });
  });

  describe('mapProviderStatus', () => {
    it('should map all provider statuses correctly', () => {
      const statusMappings = [
        { provider: 'pending' as const, expected: VerificationStatus.PENDING },
        { provider: 'processing' as const, expected: VerificationStatus.IN_PROGRESS },
        { provider: 'in_progress' as const, expected: VerificationStatus.IN_PROGRESS },
        { provider: 'completed' as const, expected: VerificationStatus.COMPLETED },
        { provider: 'approved' as const, expected: VerificationStatus.COMPLETED },
        { provider: 'rejected' as const, expected: VerificationStatus.FAILED },
        { provider: 'declined' as const, expected: VerificationStatus.FAILED },
        { provider: 'failed' as const, expected: VerificationStatus.FAILED },
        { provider: 'expired' as const, expected: VerificationStatus.EXPIRED },
        { provider: 'cancelled' as const, expected: VerificationStatus.CANCELLED },
      ];

      statusMappings.forEach(({ provider, expected }) => {
        const providerResponse: ProviderCreateVerificationResponse = {
          verification_id: 'ver_123',
          status: provider,
          created_at: '2025-01-01T00:00:00Z',
        };

        const result = mapper.toInternalCreateResponse(providerResponse, 'internal-123');

        expect(result.status).toBe(expected);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle partial personal info', () => {
      const providerResponse: ProviderGetVerificationStatusResponse = {
        verification_id: 'ver_123',
        status: 'completed',
        result: {
          decision: 'approved',
          personal_info: {
            first_name: 'John',
            last_name: 'Doe',
            // Missing middle_name, full_name, etc.
          },
        },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:05:00Z',
      };

      const result = mapper.toInternalStatusResponse(providerResponse, 'internal-123');

      expect(result.result?.validatedData?.firstName).toBe('John');
      expect(result.result?.validatedData?.lastName).toBe('Doe');
      expect(result.result?.validatedData?.middleName).toBeUndefined();
    });

    it('should handle empty checks', () => {
      const providerResponse: ProviderGetVerificationStatusResponse = {
        verification_id: 'ver_123',
        status: 'completed',
        result: {
          decision: 'approved',
          checks: {},
        },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:05:00Z',
      };

      const result = mapper.toInternalStatusResponse(providerResponse, 'internal-123');

      expect(result.result?.additionalChecks?.watchlist).toBeUndefined();
      expect(result.result?.additionalChecks?.sanctions).toBeUndefined();
      expect(result.result?.additionalChecks?.pep).toBeUndefined();
    });

    it('should handle matches in checks', () => {
      const providerResponse: ProviderGetVerificationStatusResponse = {
        verification_id: 'ver_123',
        status: 'completed',
        result: {
          decision: 'manual_review',
          checks: {
            pep: {
              is_match: true,
              matches: [
                { name: 'John Doe', match_score: 0.85 },
                { name: 'Jonathan Doe', match_score: 0.72 },
              ],
            },
          },
        },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:05:00Z',
      };

      const result = mapper.toInternalStatusResponse(providerResponse, 'internal-123');

      expect(result.result?.additionalChecks?.pep?.isMatch).toBe(true);
      expect(result.result?.additionalChecks?.pep?.matches).toHaveLength(2);
      expect(result.result?.additionalChecks?.pep?.matches?.[0].name).toBe('John Doe');
      expect(result.result?.additionalChecks?.pep?.matches?.[0].matchScore).toBe(0.85);
    });
  });
});

