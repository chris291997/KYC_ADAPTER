import { Injectable } from '@nestjs/common';
import { ProviderCreateVerificationRequest } from '../types/provider-api.types';

/**
 * Internal verification request type
 * This represents our KYC Adapter's format
 */
export interface InternalVerificationRequest {
  tenantId: string;
  accountId?: string;
  verificationType: string;
  
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
 * Maps between our internal format and the external provider's format
 */
@Injectable()
export class ExternalRequestMapper {
  /**
   * Convert internal verification request to provider format
   */
  toProviderCreateRequest(
    internalRequest: InternalVerificationRequest,
  ): ProviderCreateVerificationRequest {
    const providerRequest: ProviderCreateVerificationRequest = {
      // Reference information
      client_id: internalRequest.tenantId,
      reference_id: internalRequest.referenceId || internalRequest.accountId,

      // Personal information
      first_name: internalRequest.firstName,
      middle_name: internalRequest.middleName,
      last_name: internalRequest.lastName,
      full_name:
        internalRequest.fullName ||
        this.buildFullName(
          internalRequest.firstName,
          internalRequest.middleName,
          internalRequest.lastName,
        ),
      date_of_birth: internalRequest.dateOfBirth,
      nationality: internalRequest.nationality,
      country_of_residence: internalRequest.countryOfResidence,

      // Contact information
      email: internalRequest.email,
      phone: internalRequest.phone,
      address: internalRequest.address
        ? {
            street: internalRequest.address.street,
            city: internalRequest.address.city,
            state: internalRequest.address.state,
            postal_code: internalRequest.address.postalCode,
            country: internalRequest.address.country,
          }
        : undefined,

      // Document information
      document_type: internalRequest.documentType,
      document_number: internalRequest.documentNumber,
      document_country: internalRequest.documentCountry,

      // Verification settings
      verification_type: this.mapVerificationType(
        internalRequest.verificationType,
      ),
      callback_url: internalRequest.callbackUrl,
      webhook_url: internalRequest.webhookUrl,
      redirect_url: internalRequest.redirectUrl,

      // Metadata
      metadata: {
        ...internalRequest.metadata,
        tenant_id: internalRequest.tenantId,
        account_id: internalRequest.accountId,
      },
    };

    // Remove undefined values
    return this.removeUndefinedValues(providerRequest);
  }

  /**
   * Map internal verification type to provider verification type
   */
  private mapVerificationType(
    internalType: string,
  ): 'document' | 'id' | 'biometric' | 'face' | 'liveness' {
    const typeMap: Record<string, 'document' | 'id' | 'biometric' | 'face' | 'liveness'> = {
      document_verification: 'document',
      document: 'document',
      id_verification: 'id',
      id: 'id',
      biometric_verification: 'biometric',
      biometric: 'biometric',
      face_verification: 'face',
      face: 'face',
      liveness_check: 'liveness',
      liveness: 'liveness',
    };

    return typeMap[internalType.toLowerCase()] || 'document';
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
   * Remove undefined values from object
   */
  private removeUndefinedValues<T extends Record<string, any>>(obj: T): T {
    const cleaned: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const cleanedNested = this.removeUndefinedValues(value);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    }

    return cleaned as T;
  }
}

