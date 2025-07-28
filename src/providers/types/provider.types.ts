export enum ProviderType {
  REGULA = 'regula',
  PERSONA = 'persona',
}

export enum ProcessingMethod {
  DIRECT = 'direct', // Direct document processing (like Regula)
  EXTERNAL_LINK = 'external_link', // One-time verification links (like Persona)
}

export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum VerificationType {
  DOCUMENT = 'document',
  BIOMETRIC = 'biometric',
  COMPREHENSIVE = 'comprehensive', // Document + Biometric
}

export enum DocumentType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  NATIONAL_ID = 'national_id',
  RESIDENCE_PERMIT = 'residence_permit',
  VOTER_ID = 'voter_id',
}

// Regula-specific enums and types
export enum RegulaLightSource {
  WHITE = 'white',
  UV = 'uv',
  IR = 'ir',
  COAXIAL = 'coaxial',
}

export enum RegulaSecurityFeature {
  MRZ = 'mrz',
  RFID = 'rfid',
  BARCODE = 'barcode',
  HOLOGRAM = 'hologram',
  UV_FIBERS = 'uv_fibers',
  IR_VISIBILITY = 'ir_visibility',
  OVI = 'ovi',
  MLI = 'mli',
}

export interface ProviderCredentials {
  apiKey?: string;
  secretKey?: string;
  baseUrl?: string;
  webhookSecret?: string;
  [key: string]: any;
}

export interface ProviderConfig {
  processingMethod: ProcessingMethod;
  maxVerificationsPerDay?: number;
  allowedDocumentTypes?: DocumentType[];
  requireBiometric?: boolean;
  webhookUrl?: string;
  customSettings?: Record<string, any>;
}

// Base verification request interface
export interface BaseVerificationRequest {
  tenantId: string;
  accountId?: string;
  verificationType: VerificationType;
  processingMethod: ProcessingMethod;
  callbackUrl?: string;
  expiresIn?: number; // seconds
  metadata?: Record<string, any>;
}

// Direct processing request (Regula style)
export interface DirectVerificationRequest extends BaseVerificationRequest {
  processingMethod: ProcessingMethod.DIRECT;
  documentImages: {
    front: string; // base64 or file path
    back?: string;
    selfie?: string;
  };
  allowedDocumentTypes?: DocumentType[];
  enabledSecurityFeatures?: RegulaSecurityFeature[];
  lightSources?: RegulaLightSource[];
}

// External link request (Persona style)
export interface ExternalLinkVerificationRequest extends BaseVerificationRequest {
  processingMethod: ProcessingMethod.EXTERNAL_LINK;
  allowedDocumentTypes?: DocumentType[];
  requireLiveness?: boolean;
}

export type VerificationRequest = DirectVerificationRequest | ExternalLinkVerificationRequest;

// Provider response for verification creation
export interface VerificationResponse {
  id: string; // Our internal verification ID
  providerVerificationId: string; // Provider's verification ID
  status: VerificationStatus;
  processingMethod: ProcessingMethod;

  // For external link processing
  verificationLink?: string;
  expiresAt?: Date;

  // For direct processing
  result?: VerificationResult;

  metadata?: Record<string, any>;
}

// Verification status response
export interface VerificationStatusResponse {
  id: string;
  providerVerificationId: string;
  status: VerificationStatus;
  processingMethod: ProcessingMethod;
  result?: VerificationResult;
  updatedAt: Date;
}

// Detailed verification result
export interface VerificationResult {
  overall: {
    status: 'passed' | 'failed' | 'pending';
    confidence: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high';
  };
  document?: DocumentResult;
  biometric?: BiometricResult;
  regula?: RegulaSpecificResult; // Regula-specific results
  risks?: {
    type: string;
    level: 'low' | 'medium' | 'high';
    description: string;
  }[];
  metadata?: Record<string, any>;
}

// Regula-specific result structure
export interface RegulaSpecificResult {
  documentType?: {
    country: string;
    type: string;
    series?: string;
  };
  mrz?: {
    parsed: Record<string, any>;
    validity: 'valid' | 'invalid';
    checkDigits: 'passed' | 'failed';
  };
  rfid?: {
    chipPresent: boolean;
    dataGroups: string[];
    authentication: {
      passive: 'passed' | 'failed' | 'not_performed';
      active: 'passed' | 'failed' | 'not_performed';
      chip: 'passed' | 'failed' | 'not_performed';
    };
  };
  securityFeatures?: {
    [feature in RegulaSecurityFeature]?: {
      present: boolean;
      authentic: boolean;
      details?: any;
    };
  };
  lightSourceChecks?: {
    [light in RegulaLightSource]?: {
      performed: boolean;
      result: 'passed' | 'failed' | 'warning';
      details?: any;
    };
  };
}

export interface DocumentResult {
  extracted: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    nationality?: string;
    documentNumber?: string;
    expiryDate?: string;
    issuingCountry?: string;
  };
  checks: {
    authenticity: 'passed' | 'failed' | 'warning';
    validity: 'passed' | 'failed' | 'warning';
    dataConsistency: 'passed' | 'failed' | 'warning';
  };
  confidence: number;
}

export interface BiometricResult {
  livenessCheck: 'passed' | 'failed' | 'not_performed';
  faceMatch: 'passed' | 'failed' | 'not_performed';
  confidence: number;
}

// Provider health check response
export interface ProviderHealthResponse {
  isHealthy: boolean;
  latency?: number; // milliseconds
  lastChecked: Date;
  error?: string;
}
