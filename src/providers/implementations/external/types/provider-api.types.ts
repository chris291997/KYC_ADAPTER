/**
 * Type definitions for IDmeta KYC provider API
 * Based on official IDmeta API documentation v1 and v2
 * Base URL: https://<subdomain>.idmetagroup.com/api
 */

export interface ProviderCredentials {
  apiKey: string; // Bearer token
  apiSecret?: string;
  webhookSecret: string;
  baseUrl: string; // e.g., https://integrate.idmetagroup.com/api
  apiVersion?: string; // 'v1' or 'v2'
}

export interface ProviderConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * ============================================
 * VERIFICATION WORKFLOW TYPES
 * ============================================
 * IDmeta uses a multi-step verification process:
 * 1. Create verification session
 * 2. Execute verification steps (document, face, AML, etc.)
 * 3. Finalize verification
 * 4. Get results
 */

// ============================================
// 1. CREATE VERIFICATION (v1)
// ============================================
export interface ProviderCreateVerificationRequest {
  template_id: string;
  verification_id: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface ProviderCreateVerificationResponse {
  verification_id: string;
  template_id: string;
  status: string;
  created_at: string;
  message?: string;
}

// ============================================
// 2. VERIFICATION EXECUTION TYPES
// ============================================

// 2.1 Document Verification
export interface ProviderDocumentVerificationRequest {
  verification_id: string;
  document_type:
    | 'passport'
    | 'driver_license'
    | 'national_id'
    | 'birth_certificate'
    | 'prc_id'
    | 'police_clearance';
  document_image_front: string; // Base64
  document_image_back?: string; // Base64 (for 2-sided documents)
  document_number?: string;
  full_name?: string;
  date_of_birth?: string;
  country?: string;
}

export interface ProviderDocumentVerificationResponse {
  verification_id: string;
  status: string;
  extracted_data?: {
    document_number?: string;
    full_name?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    date_of_birth?: string;
    expiry_date?: string;
    issue_date?: string;
    country?: string;
    document_type?: string;
    gender?: string;
    address?: string;
  };
  validation_checks?: {
    mrz_valid?: boolean;
    image_quality?: string;
    tamper_detection?: boolean;
    document_authentic?: boolean;
  };
  confidence_score?: number;
  message?: string;
}

// 2.2 ID-Based Verification (Government Database Check)
export interface ProviderIdVerificationRequest {
  verification_id: string;
  id_type: 'nbi_clearance' | 'drivers_license' | 'prc_id' | 'police_clearance' | 'social_security';
  id_number: string;
  full_name?: string;
  date_of_birth?: string;
}

export interface ProviderIdVerificationResponse {
  verification_id: string;
  status: string;
  match_result?: {
    is_match: boolean;
    match_score?: number;
    verified_data?: {
      full_name?: string;
      date_of_birth?: string;
      id_number?: string;
      is_valid?: boolean;
      issue_date?: string;
      expiry_date?: string;
    };
  };
  message?: string;
}

// 2.3 Face Verification
export interface ProviderFaceVerificationRequest {
  verification_id: string;
  face_image: string; // Base64
  reference_image?: string; // Base64 (from document or registration)
  liveness_check?: boolean;
}

export interface ProviderFaceVerificationResponse {
  verification_id: string;
  status: string;
  face_match?: {
    is_match: boolean;
    match_score?: number;
  };
  liveness?: {
    is_live: boolean;
    liveness_score?: number;
  };
  message?: string;
}

// 2.4 Face Registration
export interface ProviderFaceRegistrationRequest {
  verification_id: string;
  face_image: string; // Base64
}

export interface ProviderFaceRegistrationResponse {
  verification_id: string;
  status: string;
  face_id?: string;
  message?: string;
}

// 2.5 Face Comparison
export interface ProviderFaceComparisonRequest {
  verification_id: string;
  face_image_1: string; // Base64
  face_image_2: string; // Base64
}

export interface ProviderFaceComparisonResponse {
  verification_id: string;
  status: string;
  match_result?: {
    is_match: boolean;
    match_score: number;
    confidence_score?: number;
  };
  message?: string;
}

// 2.6 OTP Verification
export interface ProviderSendOtpRequest {
  verification_id: string;
  phone?: string;
  email?: string;
  otp_type: 'sms' | 'email';
}

export interface ProviderSendOtpResponse {
  verification_id: string;
  status: string;
  otp_sent: boolean;
  expires_at?: string;
  message?: string;
}

export interface ProviderVerifyOtpRequest {
  verification_id: string;
  otp_code: string;
  otp_type: 'sms' | 'email';
}

export interface ProviderVerifyOtpResponse {
  verification_id: string;
  status: string;
  is_verified: boolean;
  message?: string;
}

// 2.7 AML Check
export interface ProviderAmlCheckRequest {
  verification_id: string;
  full_name: string;
  date_of_birth?: string;
  nationality?: string;
  country_of_residence?: string;
}

export interface ProviderAmlCheckResponse {
  verification_id: string;
  status: string;
  aml_result?: {
    risk_level: 'low' | 'medium' | 'high';
    sanctions_match?: boolean;
    pep_match?: boolean;
    watchlist_match?: boolean;
    matches?: Array<{
      list_name: string;
      match_type: 'sanctions' | 'pep' | 'watchlist';
      match_score: number;
      entity_name: string;
      entity_details?: Record<string, any>;
    }>;
  };
  message?: string;
}

// ============================================
// 3. FINALIZE VERIFICATION (v1)
// ============================================
export interface ProviderFinalizeVerificationRequest {
  verification_id: string;
  notes?: string;
}

export interface ProviderFinalizeVerificationResponse {
  verification_id: string;
  status: string;
  finalized_at: string;
  message?: string;
}

// ============================================
// 4. GET RESULTS (v2)
// ============================================
export interface ProviderGetResultsRequest {
  verification_id: string;
}

export interface ProviderGetResultsResponse {
  verification_id: string;
  template_id: string;
  status: ProviderVerificationStatus;
  result?: ProviderVerificationResult;
  steps_completed?: Array<{
    step_type: string;
    status: string;
    completed_at: string;
    data?: Record<string, any>;
  }>;
  created_at: string;
  updated_at: string;
  finalized_at?: string;
  metadata?: Record<string, any>;
}

// ============================================
// STATUS & RESULT TYPES
// ============================================
export type ProviderVerificationStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'declined'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'finalized';

export interface ProviderVerificationResult {
  // Overall result
  decision: 'approved' | 'rejected' | 'manual_review';
  confidence_score?: number;
  risk_level?: 'low' | 'medium' | 'high';

  // Validated personal information (from document/ID)
  personal_info?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    full_name?: string;
    date_of_birth?: string;
    nationality?: string;
    gender?: string;
    address?: string;
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
      image_quality?: boolean;
      tamper_detection?: boolean;
      document_authentic?: boolean;
    };
  };

  // ID verification (government database)
  id_verification?: {
    id_type?: string;
    id_number?: string;
    is_match?: boolean;
    match_score?: number;
    is_valid?: boolean;
  };

  // Biometric verification
  biometric?: {
    face_match?: boolean;
    face_match_score?: number;
    liveness_check?: boolean;
    liveness_score?: number;
  };

  // AML checks
  aml?: {
    risk_level?: 'low' | 'medium' | 'high';
    sanctions_match?: boolean;
    pep_match?: boolean;
    watchlist_match?: boolean;
    matches?: Array<{
      list_name: string;
      match_type: string;
      match_score: number;
      entity_name: string;
    }>;
  };

  // OTP verification
  otp?: {
    phone_verified?: boolean;
    email_verified?: boolean;
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

// ============================================
// WEBHOOK TYPES
// ============================================
export interface ProviderWebhookPayload {
  event_type: ProviderWebhookEventType;
  verification_id: string;
  timestamp: string;
  data: {
    status: ProviderVerificationStatus;
    step_type?: string; // e.g., 'document', 'face', 'aml'
    step_status?: string;
    result?: ProviderVerificationResult;
    metadata?: Record<string, any>;
  };
  signature?: string; // HMAC signature
}

export type ProviderWebhookEventType =
  | 'verification.created'
  | 'verification.step_completed'
  | 'verification.processing'
  | 'verification.completed'
  | 'verification.finalized'
  | 'verification.approved'
  | 'verification.rejected'
  | 'verification.failed'
  | 'verification.expired'
  | 'verification.cancelled';

// ============================================
// TEMPLATES & PLANS
// ============================================
export interface ProviderTemplate {
  template_id: string;
  name: string;
  description?: string;
  steps: Array<{
    step_type: 'document' | 'face' | 'id_verification' | 'aml' | 'otp';
    is_required: boolean;
    configuration?: Record<string, any>;
  }>;
  metadata?: Record<string, any>;
}

export interface ProviderPlan {
  plan_id: string;
  name: string;
  templates: string[]; // template_ids
  features?: string[];
  limits?: {
    verifications_per_month?: number;
    api_calls_per_minute?: number;
  };
}

// ============================================
// ERROR & HEALTH CHECK
// ============================================
export interface ProviderErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  request_id?: string;
  timestamp: string;
}

export interface ProviderHealthCheckResponse {
  status: 'operational' | 'degraded' | 'down';
  version: string;
  timestamp: string;
}

// ============================================
// CANCEL VERIFICATION
// ============================================
export interface ProviderCancelVerificationRequest {
  verification_id: string;
  reason?: string;
}

export interface ProviderCancelVerificationResponse {
  verification_id: string;
  status: ProviderVerificationStatus;
  cancelled_at: string;
}
