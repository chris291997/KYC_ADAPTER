import { Injectable } from '@nestjs/common';
import {
  ProviderCreateVerificationRequest,
  ProviderDocumentVerificationRequest,
  ProviderIdVerificationRequest,
  ProviderFaceVerificationRequest,
  ProviderFaceRegistrationRequest,
  ProviderFaceComparisonRequest,
  ProviderSendOtpRequest,
  ProviderVerifyOtpRequest,
  ProviderAmlCheckRequest,
  ProviderFinalizeVerificationRequest,
} from '../types/provider-api.types';

/**
 * Internal verification request type
 * This represents our KYC Adapter's format
 */
export interface InternalVerificationRequest {
  tenantId: string;
  accountId?: string;
  verificationType: string;

  // IDmeta-specific fields
  templateId?: string; // Required by IDmeta
  verificationId?: string; // Can be pre-generated or auto-generated

  // Personal information
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  countryOfResidence?: string;

  // Contact information
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Document information
  documentType?: string;
  documentNumber?: string;
  documentCountry?: string;
  documentImageFront?: string; // Base64
  documentImageBack?: string; // Base64

  // Biometric information
  faceImage?: string; // Base64
  referenceImage?: string; // Base64
  livenessCheck?: boolean;

  // ID verification
  idType?: string;
  idNumber?: string;

  // OTP information
  otpType?: 'sms' | 'email';
  otpCode?: string;

  // Callback settings
  callbackUrl?: string;
  webhookUrl?: string;
  redirectUrl?: string;

  // Additional data
  referenceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Request Mapper
 * Maps between our internal format and the IDmeta provider's format
 */
@Injectable()
export class ExternalRequestMapper {
  /**
   * Convert internal verification request to IDmeta create verification format
   * POST /api/v1/verification/create-verification
   */
  toProviderCreateRequest(
    internalRequest: InternalVerificationRequest,
  ): ProviderCreateVerificationRequest {
    return {
      template_id: internalRequest.templateId || 'default_template',
      verification_id: internalRequest.verificationId || this.generateVerificationId(),
      callback_url: internalRequest.callbackUrl || internalRequest.webhookUrl,
      metadata: {
        ...internalRequest.metadata,
        tenant_id: internalRequest.tenantId,
        account_id: internalRequest.accountId,
        reference_id: internalRequest.referenceId,
      },
    };
  }

  /**
   * Convert to document verification request
   * POST /api/v1/verification/document-verification
   */
  toDocumentVerificationRequest(
    internalRequest: InternalVerificationRequest,
  ): ProviderDocumentVerificationRequest {
    return {
      verification_id: internalRequest.verificationId!,
      document_type: this.mapDocumentType(internalRequest.documentType),
      document_image_front: internalRequest.documentImageFront!,
      document_image_back: internalRequest.documentImageBack,
      document_number: internalRequest.documentNumber,
      full_name:
        internalRequest.fullName ||
        this.buildFullName(
          internalRequest.firstName,
          internalRequest.middleName,
          internalRequest.lastName,
        ),
      date_of_birth: internalRequest.dateOfBirth,
      country: internalRequest.documentCountry || internalRequest.nationality,
    };
  }

  /**
   * Convert to ID-based verification request
   * POST /api/v1/verification/id-verification
   */
  toIdVerificationRequest(
    internalRequest: InternalVerificationRequest,
  ): ProviderIdVerificationRequest {
    return {
      verification_id: internalRequest.verificationId!,
      id_type: this.mapIdType(internalRequest.idType),
      id_number: internalRequest.idNumber!,
      full_name:
        internalRequest.fullName ||
        this.buildFullName(
          internalRequest.firstName,
          internalRequest.middleName,
          internalRequest.lastName,
        ),
      date_of_birth: internalRequest.dateOfBirth,
    };
  }

  /**
   * Convert to face verification request
   * POST /api/v1/verification/face-verification
   */
  toFaceVerificationRequest(
    internalRequest: InternalVerificationRequest,
  ): ProviderFaceVerificationRequest {
    return {
      verification_id: internalRequest.verificationId!,
      face_image: internalRequest.faceImage!,
      reference_image: internalRequest.referenceImage,
      liveness_check: internalRequest.livenessCheck,
    };
  }

  /**
   * Convert to face registration request
   * POST /api/v1/verification/face-registration
   */
  toFaceRegistrationRequest(
    internalRequest: InternalVerificationRequest,
  ): ProviderFaceRegistrationRequest {
    return {
      verification_id: internalRequest.verificationId!,
      face_image: internalRequest.faceImage!,
    };
  }

  /**
   * Convert to face comparison request
   * POST /api/v1/verification/face-comparison
   */
  toFaceComparisonRequest(
    internalRequest: InternalVerificationRequest,
  ): ProviderFaceComparisonRequest {
    return {
      verification_id: internalRequest.verificationId!,
      face_image_1: internalRequest.faceImage!,
      face_image_2: internalRequest.referenceImage!,
    };
  }

  /**
   * Convert to send OTP request
   * POST /api/v1/verification/send-otp
   */
  toSendOtpRequest(internalRequest: InternalVerificationRequest): ProviderSendOtpRequest {
    return {
      verification_id: internalRequest.verificationId!,
      phone: internalRequest.phone,
      email: internalRequest.email,
      otp_type: internalRequest.otpType || 'sms',
    };
  }

  /**
   * Convert to verify OTP request
   * POST /api/v1/verification/verify-otp
   */
  toVerifyOtpRequest(internalRequest: InternalVerificationRequest): ProviderVerifyOtpRequest {
    return {
      verification_id: internalRequest.verificationId!,
      otp_code: internalRequest.otpCode!,
      otp_type: internalRequest.otpType || 'sms',
    };
  }

  /**
   * Convert to AML check request
   * POST /api/v1/verification/aml-check
   */
  toAmlCheckRequest(internalRequest: InternalVerificationRequest): ProviderAmlCheckRequest {
    return {
      verification_id: internalRequest.verificationId!,
      full_name:
        internalRequest.fullName ||
        this.buildFullName(
          internalRequest.firstName,
          internalRequest.middleName,
          internalRequest.lastName,
        )!,
      date_of_birth: internalRequest.dateOfBirth,
      nationality: internalRequest.nationality,
      country_of_residence: internalRequest.countryOfResidence,
    };
  }

  /**
   * Convert to finalize verification request
   * POST /api/v1/verification/finalize-verification
   */
  toFinalizeVerificationRequest(
    internalRequest: InternalVerificationRequest,
  ): ProviderFinalizeVerificationRequest {
    return {
      verification_id: internalRequest.verificationId!,
      notes: internalRequest.metadata?.notes,
    };
  }

  /**
   * Map internal document type to IDmeta document type
   */
  private mapDocumentType(
    internalType?: string,
  ):
    | 'passport'
    | 'driver_license'
    | 'national_id'
    | 'birth_certificate'
    | 'prc_id'
    | 'police_clearance' {
    const typeMap: Record<
      string,
      | 'passport'
      | 'driver_license'
      | 'national_id'
      | 'birth_certificate'
      | 'prc_id'
      | 'police_clearance'
    > = {
      passport: 'passport',
      drivers_license: 'driver_license',
      driver_license: 'driver_license',
      national_id: 'national_id',
      birth_certificate: 'birth_certificate',
      prc_id: 'prc_id',
      prc: 'prc_id',
      police_clearance: 'police_clearance',
    };

    return typeMap[internalType?.toLowerCase() || 'national_id'] || 'national_id';
  }

  /**
   * Map internal ID type to IDmeta ID type
   */
  private mapIdType(
    internalType?: string,
  ): 'nbi_clearance' | 'drivers_license' | 'prc_id' | 'police_clearance' | 'social_security' {
    const typeMap: Record<
      string,
      'nbi_clearance' | 'drivers_license' | 'prc_id' | 'police_clearance' | 'social_security'
    > = {
      nbi: 'nbi_clearance',
      nbi_clearance: 'nbi_clearance',
      drivers_license: 'drivers_license',
      driver_license: 'drivers_license',
      prc: 'prc_id',
      prc_id: 'prc_id',
      police_clearance: 'police_clearance',
      sss: 'social_security',
      social_security: 'social_security',
    };

    return typeMap[internalType?.toLowerCase() || 'nbi_clearance'] || 'nbi_clearance';
  }

  /**
   * Build full name from parts
   */
  private buildFullName(
    firstName?: string,
    middleName?: string,
    lastName?: string,
  ): string | undefined {
    const parts = [firstName, middleName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  /**
   * Generate a unique verification ID
   */
  private generateVerificationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `VER-${timestamp}-${random}`;
  }
}
