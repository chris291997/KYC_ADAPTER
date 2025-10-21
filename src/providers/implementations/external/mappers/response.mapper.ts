import { Injectable } from '@nestjs/common';
import {
  ProviderCreateVerificationResponse,
  ProviderGetResultsResponse,
  ProviderVerificationStatus,
  ProviderVerificationResult,
  ProviderWebhookPayload,
} from '../types/provider-api.types';
import { VerificationStatus } from '../../../types';

/**
 * Internal verification response type
 * This represents our KYC Adapter's format
 */
export interface InternalVerificationResponse {
  verificationId: string;
  externalVerificationId: string;
  status: VerificationStatus;
  workflowUrl?: string;
  hostedUrl?: string;
  result?: InternalVerificationResult;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface InternalVerificationResult {
  decision?: 'approved' | 'rejected' | 'manual_review';
  confidenceScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  validatedData?: ValidatedUserData;
  documentValidation?: DocumentValidation;
  biometricValidation?: BiometricValidation;
  additionalChecks?: AdditionalChecks;
  flags?: ValidationFlag[];
  rawProviderData?: Record<string, any>;
}

export interface ValidatedUserData {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  gender?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    isVerified?: boolean;
  };
}

export interface DocumentValidation {
  type?: string;
  number?: string;
  country?: string;
  issueDate?: string;
  expiryDate?: string;
  isValid?: boolean;
  isExpired?: boolean;
  checks?: {
    mrzValid?: boolean;
    chipValid?: boolean;
    imageQuality?: boolean;
    tamperDetection?: boolean;
  };
}

export interface BiometricValidation {
  faceMatch?: boolean;
  faceMatchScore?: number;
  livenessCheck?: boolean;
  livenessScore?: number;
}

export interface AdditionalChecks {
  watchlist?: {
    isMatch?: boolean;
    matches?: Array<{ listName: string; matchScore: number }>;
  };
  sanctions?: {
    isMatch?: boolean;
    matches?: Array<{ listName: string; matchScore: number }>;
  };
  pep?: {
    isMatch?: boolean;
    matches?: Array<{ name: string; matchScore: number }>;
  };
}

export interface ValidationFlag {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

/**
 * Response Mapper
 * Maps between the external provider's format and our internal format
 */
@Injectable()
export class ExternalResponseMapper {
  /**
   * Convert provider create verification response to internal format
   */
  toInternalCreateResponse(
    providerResponse: ProviderCreateVerificationResponse,
    internalVerificationId: string,
  ): InternalVerificationResponse {
    return {
      verificationId: internalVerificationId,
      externalVerificationId: providerResponse.verification_id,
      status: this.mapProviderStatus(providerResponse.status as ProviderVerificationStatus),
      workflowUrl: undefined,
      hostedUrl: undefined,
      expiresAt: undefined,
      createdAt: new Date(providerResponse.created_at),
      metadata: {
        template_id: providerResponse.template_id,
        message: providerResponse.message,
      },
    };
  }

  /**
   * Convert provider results response to internal format
   */
  toInternalStatusResponse(
    providerResponse: ProviderGetResultsResponse,
    internalVerificationId: string,
  ): InternalVerificationResponse {
    return {
      verificationId: internalVerificationId,
      externalVerificationId: providerResponse.verification_id,
      status: this.mapProviderStatus(providerResponse.status),
      result: providerResponse.result ? this.mapProviderResult(providerResponse.result) : undefined,
      createdAt: new Date(providerResponse.created_at),
      updatedAt: new Date(providerResponse.updated_at),
      completedAt: providerResponse.finalized_at
        ? new Date(providerResponse.finalized_at)
        : undefined,
      metadata: providerResponse.metadata,
    };
  }

  /**
   * Convert provider webhook payload to internal format
   */
  fromWebhookPayload(
    webhookPayload: ProviderWebhookPayload,
    internalVerificationId: string,
  ): InternalVerificationResponse {
    return {
      verificationId: internalVerificationId,
      externalVerificationId: webhookPayload.verification_id,
      status: this.mapProviderStatus(webhookPayload.data.status),
      result: webhookPayload.data.result
        ? this.mapProviderResult(webhookPayload.data.result)
        : undefined,
      createdAt: new Date(webhookPayload.timestamp),
      updatedAt: new Date(webhookPayload.timestamp),
      completedAt:
        webhookPayload.event_type === 'verification.completed' ||
        webhookPayload.event_type === 'verification.approved' ||
        webhookPayload.event_type === 'verification.rejected'
          ? new Date(webhookPayload.timestamp)
          : undefined,
      metadata: webhookPayload.data.metadata,
    };
  }

  /**
   * Map provider status to internal status
   */
  private mapProviderStatus(providerStatus: ProviderVerificationStatus): VerificationStatus {
    const statusMap: Record<ProviderVerificationStatus, VerificationStatus> = {
      created: VerificationStatus.PENDING,
      pending: VerificationStatus.PENDING,
      processing: VerificationStatus.IN_PROGRESS,
      in_progress: VerificationStatus.IN_PROGRESS,
      completed: VerificationStatus.COMPLETED,
      finalized: VerificationStatus.COMPLETED,
      approved: VerificationStatus.COMPLETED,
      rejected: VerificationStatus.FAILED,
      declined: VerificationStatus.FAILED,
      failed: VerificationStatus.FAILED,
      expired: VerificationStatus.EXPIRED,
      cancelled: VerificationStatus.CANCELLED,
    };

    return statusMap[providerStatus] || VerificationStatus.PENDING;
  }

  /**
   * Map provider verification result to internal format
   */
  private mapProviderResult(
    providerResult: ProviderVerificationResult,
  ): InternalVerificationResult {
    return {
      decision: providerResult.decision,
      confidenceScore: providerResult.confidence_score,
      riskLevel: providerResult.risk_level,
      validatedData: providerResult.personal_info
        ? {
            firstName: providerResult.personal_info.first_name,
            middleName: providerResult.personal_info.middle_name,
            lastName: providerResult.personal_info.last_name,
            fullName: providerResult.personal_info.full_name,
            dateOfBirth: providerResult.personal_info.date_of_birth,
            nationality: providerResult.personal_info.nationality,
            gender: providerResult.personal_info.gender,
            address: providerResult.personal_info.address
              ? {
                  street: undefined,
                  city: undefined,
                  state: undefined,
                  postalCode: undefined,
                  country: undefined,
                  isVerified: false,
                }
              : undefined,
          }
        : undefined,
      documentValidation: providerResult.document
        ? {
            type: providerResult.document.type,
            number: providerResult.document.number,
            country: providerResult.document.country,
            issueDate: providerResult.document.issue_date,
            expiryDate: providerResult.document.expiry_date,
            isValid: providerResult.document.is_valid,
            isExpired: providerResult.document.is_expired,
            checks: providerResult.document.validation_checks
              ? {
                  mrzValid: providerResult.document.validation_checks.mrz_valid,
                  chipValid: undefined,
                  imageQuality: providerResult.document.validation_checks.image_quality,
                  tamperDetection: providerResult.document.validation_checks.tamper_detection,
                }
              : undefined,
          }
        : undefined,
      biometricValidation: providerResult.biometric
        ? {
            faceMatch: providerResult.biometric.face_match,
            faceMatchScore: providerResult.biometric.face_match_score,
            livenessCheck: providerResult.biometric.liveness_check,
            livenessScore: providerResult.biometric.liveness_score,
          }
        : undefined,
      additionalChecks: providerResult.aml
        ? {
            watchlist: providerResult.aml.watchlist_match
              ? {
                  isMatch: providerResult.aml.watchlist_match,
                  matches: providerResult.aml.matches
                    ?.filter((m) => m.match_type === 'watchlist')
                    ?.map((m) => ({
                      listName: m.list_name,
                      matchScore: m.match_score,
                    })),
                }
              : undefined,
            sanctions: providerResult.aml.sanctions_match
              ? {
                  isMatch: providerResult.aml.sanctions_match,
                  matches: providerResult.aml.matches
                    ?.filter((m) => m.match_type === 'sanctions')
                    ?.map((m) => ({
                      listName: m.list_name,
                      matchScore: m.match_score,
                    })),
                }
              : undefined,
            pep: providerResult.aml.pep_match
              ? {
                  isMatch: providerResult.aml.pep_match,
                  matches: providerResult.aml.matches
                    ?.filter((m) => m.match_type === 'pep')
                    ?.map((m) => ({
                      name: m.entity_name,
                      matchScore: m.match_score,
                    })),
                }
              : undefined,
          }
        : undefined,
      flags: providerResult.flags?.map((flag) => ({
        type: flag.type,
        severity: flag.severity,
        message: flag.message,
      })),
      rawProviderData: providerResult.raw_data,
    };
  }
}
