/**
 * Type definitions for external KYC provider API
 * These types represent the provider's API contract
 */

export interface ProviderCredentials {
  apiKey: string;
  apiSecret?: string;
  webhookSecret: string;
  baseUrl: string;
  apiVersion?: string;
}

export interface ProviderConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Provider API Request Types
 */
export interface ProviderCreateVerificationRequest {
  // Client information
  client_id?: string;
  reference_id?: string;

  // Personal information
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  full_name?: string;
  date_of_birth?: string;
  nationality?: string;
  country_of_residence?: string;

  // Contact information
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };

  // Document information
  document_type?: string;
  document_number?: string;
  document_country?: string;

  // Verification settings
  verification_type?: 'document' | 'id' | 'biometric' | 'face' | 'liveness';
  callback_url?: string;
  webhook_url?: string;
  redirect_url?: string;

  // Additional metadata
  metadata?: Record<string, any>;
}

export interface ProviderCreateVerificationResponse {
  verification_id: string;
  status: ProviderVerificationStatus;
  workflow_url?: string;
  hosted_url?: string;
  expires_at?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ProviderGetVerificationStatusRequest {
  verification_id: string;
}

export interface ProviderGetVerificationStatusResponse {
  verification_id: string;
  status: ProviderVerificationStatus;
  result?: ProviderVerificationResult;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
}

export interface ProviderCancelVerificationRequest {
  verification_id: string;
  reason?: string;
}

export interface ProviderCancelVerificationResponse {
  verification_id: string;
  status: ProviderVerificationStatus;
  cancelled_at: string;
}

/**
 * Provider Verification Status
 */
export type ProviderVerificationStatus =
  | 'pending'
  | 'processing'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'declined'
  | 'failed'
  | 'expired'
  | 'cancelled';

/**
 * Provider Verification Result
 */
export interface ProviderVerificationResult {
  // Overall result
  decision: 'approved' | 'rejected' | 'manual_review';
  confidence_score?: number;
  risk_level?: 'low' | 'medium' | 'high';

  // Validated personal information
  personal_info?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    full_name?: string;
    date_of_birth?: string;
    nationality?: string;
    gender?: string;
  };

  // Document verification
  document?: {
    type?: string;
    number?: string;
    country?: string;
    issue_date?: string;
    expiry_date?: string;
    is_valid?: boolean;
    is_expired?: boolean;
    validation_checks?: {
      mrz_valid?: boolean;
      chip_valid?: boolean;
      image_quality?: boolean;
      tamper_detection?: boolean;
    };
  };

  // Address verification
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    is_verified?: boolean;
  };

  // Face/biometric verification
  biometric?: {
    face_match?: boolean;
    face_match_score?: number;
    liveness_check?: boolean;
    liveness_score?: number;
  };

  // Additional checks
  checks?: {
    watchlist?: {
      is_match?: boolean;
      matches?: Array<{
        list_name: string;
        match_score: number;
      }>;
    };
    sanctions?: {
      is_match?: boolean;
      matches?: Array<{
        list_name: string;
        match_score: number;
      }>;
    };
    pep?: {
      is_match?: boolean;
      matches?: Array<{
        name: string;
        match_score: number;
      }>;
    };
  };

  // Validation flags
  flags?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;

  // Raw provider data
  raw_data?: Record<string, any>;
}

/**
 * Provider Webhook Payload
 */
export interface ProviderWebhookPayload {
  event_type: ProviderWebhookEventType;
  verification_id: string;
  timestamp: string;
  data: {
    status: ProviderVerificationStatus;
    result?: ProviderVerificationResult;
    metadata?: Record<string, any>;
  };
}

export type ProviderWebhookEventType =
  | 'verification.created'
  | 'verification.processing'
  | 'verification.completed'
  | 'verification.approved'
  | 'verification.rejected'
  | 'verification.failed'
  | 'verification.expired'
  | 'verification.cancelled';

/**
 * Provider Error Response
 */
export interface ProviderErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  request_id?: string;
  timestamp: string;
}

/**
 * Provider Health Check Response
 */
export interface ProviderHealthCheckResponse {
  status: 'operational' | 'degraded' | 'down';
  version: string;
  timestamp: string;
}
