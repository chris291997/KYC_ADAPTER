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
    it('should map complete internal request to provider format', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        accountId: 'account-456',
        verificationType: 'document_verification',
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        nationality: 'US',
        countryOfResidence: 'US',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
        documentType: 'passport',
        documentNumber: 'P1234567',
        documentCountry: 'US',
        callbackUrl: 'https://example.com/callback',
        webhookUrl: 'https://example.com/webhook',
        redirectUrl: 'https://example.com/redirect',
        referenceId: 'ref-789',
        metadata: {
          custom_field: 'custom_value',
        },
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      const expected: ProviderCreateVerificationRequest = {
        client_id: 'tenant-123',
        reference_id: 'ref-789',
        first_name: 'John',
        middle_name: 'Michael',
        last_name: 'Doe',
        full_name: 'John Michael Doe',
        date_of_birth: '1990-01-01',
        nationality: 'US',
        country_of_residence: 'US',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
        },
        document_type: 'passport',
        document_number: 'P1234567',
        document_country: 'US',
        verification_type: 'document',
        callback_url: 'https://example.com/callback',
        webhook_url: 'https://example.com/webhook',
        redirect_url: 'https://example.com/redirect',
        metadata: {
          custom_field: 'custom_value',
          tenant_id: 'tenant-123',
          account_id: 'account-456',
        },
      };

      expect(result).toEqual(expected);
    });

    it('should map minimal internal request to provider format', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result).toEqual({
        client_id: 'tenant-123',
        first_name: 'Jane',
        last_name: 'Smith',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        verification_type: 'document',
        metadata: {
          tenant_id: 'tenant-123',
        },
      });
    });

    it('should use fullName if provided', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        fullName: 'Dr. John Michael Doe Jr.',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.full_name).toBe('Dr. John Michael Doe Jr.');
    });

    it('should build full name from parts when not provided', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        firstName: 'John',
        middleName: 'Michael',
        lastName: 'Doe',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.full_name).toBe('John Michael Doe');
    });

    it('should handle missing middle name', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.full_name).toBe('John Doe');
    });

    it('should remove undefined values', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        firstName: 'John',
        lastName: 'Doe',
        middleName: undefined,
        email: undefined,
        phone: undefined,
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.middle_name).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect('middle_name' in result).toBe(false);
      expect('email' in result).toBe(false);
      expect('phone' in result).toBe(false);
    });

    it('should map verification types correctly', () => {
      const verificationTypes = [
        { internal: 'document_verification', expected: 'document' },
        { internal: 'document', expected: 'document' },
        { internal: 'id_verification', expected: 'id' },
        { internal: 'id', expected: 'id' },
        { internal: 'biometric_verification', expected: 'biometric' },
        { internal: 'biometric', expected: 'biometric' },
        { internal: 'face_verification', expected: 'face' },
        { internal: 'face', expected: 'face' },
        { internal: 'liveness_check', expected: 'liveness' },
        { internal: 'liveness', expected: 'liveness' },
        { internal: 'UNKNOWN_TYPE', expected: 'document' }, // defaults to document
      ];

      verificationTypes.forEach(({ internal, expected }) => {
        const internalRequest: InternalVerificationRequest = {
          tenantId: 'tenant-123',
          verificationType: internal,
          firstName: 'John',
          lastName: 'Doe',
        };

        const result = mapper.toProviderCreateRequest(internalRequest);

        expect(result.verification_type).toBe(expected);
      });
    });

    it('should handle address with missing fields', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        firstName: 'John',
        lastName: 'Doe',
        address: {
          city: 'New York',
          country: 'US',
        },
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.address).toEqual({
        city: 'New York',
        country: 'US',
      });
      expect('street' in result.address!).toBe(false);
      expect('state' in result.address!).toBe(false);
    });

    it('should not include address if empty', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        firstName: 'John',
        lastName: 'Doe',
        address: {},
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect('address' in result).toBe(false);
    });

    it('should use referenceId over accountId for reference_id', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        accountId: 'account-456',
        verificationType: 'document',
        firstName: 'John',
        lastName: 'Doe',
        referenceId: 'custom-ref-789',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.reference_id).toBe('custom-ref-789');
    });

    it('should use accountId for reference_id if referenceId not provided', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        accountId: 'account-456',
        verificationType: 'document',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.reference_id).toBe('account-456');
    });

    it('should include tenantId and accountId in metadata', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        accountId: 'account-456',
        verificationType: 'document',
        firstName: 'John',
        lastName: 'Doe',
        metadata: {
          custom_field: 'custom_value',
        },
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.metadata).toEqual({
        custom_field: 'custom_value',
        tenant_id: 'tenant-123',
        account_id: 'account-456',
      });
    });

    it('should handle empty metadata', () => {
      const internalRequest: InternalVerificationRequest = {
        tenantId: 'tenant-123',
        verificationType: 'document',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = mapper.toProviderCreateRequest(internalRequest);

      expect(result.metadata).toEqual({
        tenant_id: 'tenant-123',
      });
    });
  });
});

