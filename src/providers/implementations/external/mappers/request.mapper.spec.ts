import { Test, TestingModule } from '@nestjs/testing';
import { ExternalRequestMapper, InternalVerificationRequest } from './request.mapper';
import { ProviderCreateVerificationRequest } from '../types/provider-api.types';

describe('ExternalRequestMapper', () => {
  let mapper: ExternalRequestMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalRequestMapper],
    }).compile();

    mapper = module.get<ExternalRequestMapper>(ExternalRequestMapper);
  });

  describe('toProviderCreateRequest', () => {
    it('should map internal request to IDmeta create verification format', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        accountId: 'account-456',
        verificationType: 'document_verification',
        templateId: 'template-123',
        verificationId: 'VER-123',
        callbackUrl: 'https://example.com/callback',
        metadata: {
          custom_field: 'custom_value',
        },
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      const expected: ProviderCreateVerificationRequest = {
        template_id: 'template-123',
        verification_id: 'VER-123',
        callback_url: 'https://example.com/callback',
        metadata: {
          custom_field: 'custom_value',
          tenant_id: 'tenant-123',
          account_id: 'account-456',
          reference_id: undefined,
        },
      };

      expect(result).toEqual(expected);
    });

    it('should generate verification ID if not provided', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.template_id).toBe('default_template');
      expect(result.verification_id).toMatch(/^VER-\d+-[a-z0-9]+$/);
      expect(result.metadata.tenant_id).toBe('tenant-123');
    });

    it('should use default template if not provided', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        verificationId: 'VER-123',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.template_id).toBe('default_template');
      expect(result.verification_id).toBe('VER-123');
    });

    it('should use callback_url if no webhookUrl provided', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        callbackUrl: 'https://example.com/callback',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.callback_url).toBe('https://example.com/callback');
    });

    it('should prefer callbackUrl over webhookUrl', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        templateId: 'template-123',
        verificationId: 'VER-123',
        callbackUrl: 'https://example.com/callback',
        webhookUrl: 'https://example.com/webhook',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.callback_url).toBe('https://example.com/callback');
    });

    it('should include reference_id in metadata if provided', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        referenceId: 'ref-789',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.metadata.reference_id).toBe('ref-789');
    });
  });

  describe('toDocumentVerificationRequest', () => {
    it('should map document verification request', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        verificationId: 'VER-123',
        documentType: 'passport',
        documentImageFront: 'base64_front_image',
        documentImageBack: 'base64_back_image',
        documentNumber: 'P1234567',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        documentCountry: 'US',
      };

      const result = mapper.toDocumentVerificationRequest(internalRequest);

      expect(result.verification_id).toBe('VER-123');
      expect(result.document_type).toBe('passport');
      expect(result.document_image_front).toBe('base64_front_image');
      expect(result.document_image_back).toBe('base64_back_image');
      expect(result.document_number).toBe('P1234567');
      expect(result.full_name).toBe('John Doe');
      expect(result.date_of_birth).toBe('1990-01-01');
      expect(result.country).toBe('US');
    });

    it('should build full name from parts', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        verificationId: 'VER-123',
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
        documentImageFront: 'base64_image',
      };

      const result = mapper.toDocumentVerificationRequest(internalRequest);

      expect(result.full_name).toBe('John Michael Doe');
    });
  });

  describe('toIdVerificationRequest', () => {
    it('should map ID verification request', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'id',
        verificationId: 'VER-123',
        idType: 'nbi_clearance',
        idNumber: '12345678',
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01',
      };

      const result = mapper.toIdVerificationRequest(internalRequest);

      expect(result.verification_id).toBe('VER-123');
      expect(result.id_type).toBe('nbi_clearance');
      expect(result.id_number).toBe('12345678');
      expect(result.full_name).toBe('John Doe');
      expect(result.date_of_birth).toBe('1990-01-01');
    });

    it('should map various ID types correctly', () => {
      const testCases = [
        { input: 'nbi', expected: 'nbi_clearance' },
        { input: 'prc', expected: 'prc_id' },
        { input: 'drivers_license', expected: 'drivers_license' },
        { input: 'police_clearance', expected: 'police_clearance' },
        { input: 'sss', expected: 'social_security' },
      ];

      testCases.forEach(({ input, expected }) => {
        const internalRequest: InternalVerificationRequest = {
          tenantId: 'tenant-123',
          verificationType: 'id',
          verificationId: 'VER-123',
          idType: input,
          idNumber: '12345678',
        };

        const result = mapper.toIdVerificationRequest(internalRequest);
        expect(result.id_type).toBe(expected);
      });
    });
  });

  describe('toFaceVerificationRequest', () => {
    it('should map face verification request', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'face',
        verificationId: 'VER-123',
        faceImage: 'base64_face_image',
        referenceImage: 'base64_reference_image',
        livenessCheck: true,
      };

      const result = mapper.toFaceVerificationRequest(internalRequest);

      expect(result.verification_id).toBe('VER-123');
      expect(result.face_image).toBe('base64_face_image');
      expect(result.reference_image).toBe('base64_reference_image');
      expect(result.liveness_check).toBe(true);
    });
  });

  describe('toAmlCheckRequest', () => {
    it('should map AML check request', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'aml',
        verificationId: 'VER-123',
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        countryOfResidence: 'US',
      };

      const result = mapper.toAmlCheckRequest(internalRequest);

      expect(result.verification_id).toBe('VER-123');
      expect(result.full_name).toBe('John Doe');
      expect(result.date_of_birth).toBe('1990-01-01');
      expect(result.nationality).toBe('US');
      expect(result.country_of_residence).toBe('US');
    });
  });

  describe('toFinalizeVerificationRequest', () => {
    it('should map finalize verification request', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        verificationId: 'VER-123',
        metadata: {
          notes: 'All steps completed',
        },
      };

      const result = mapper.toFinalizeVerificationRequest(internalRequest);

      expect(result.verification_id).toBe('VER-123');
      expect(result.notes).toBe('All steps completed');
    });
  });
});
