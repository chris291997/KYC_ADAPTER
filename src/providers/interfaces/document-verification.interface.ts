import { QualityLevel, RiskLevel } from './common.interface';

/**
 * Document verification request interface
 */
export interface DocumentVerificationRequest {
  // File information
  documentFile: Express.Multer.File;
  documentType?: DocumentType;
  country?: string;

  // Client and request metadata
  clientId: string;
  requestId: string;
  ipAddress?: string;
  userAgent?: string;

  // Verification options
  options?: DocumentVerificationOptions;

  // Provider-specific configuration
  providerConfig?: Record<string, any>;
}

/**
 * Document verification response interface (standardized)
 */
export interface DocumentVerificationResponse {
  // Basic verification result
  isValid: boolean;
  confidenceScore: number; // 0.0 to 1.0

  // Document information
  documentType: DocumentType;
  country: string;

  // Extracted data
  extractedData: ExtractedDocumentData;

  // Security checks
  securityChecks: SecurityCheckResults;

  // Metadata
  verificationId: string;
  processingTime: number;
  timestamp: Date;

  // Raw provider response
  providerResponse: any;

  // Errors and warnings
  errors?: string[];
  warnings?: string[];
}

/**
 * Document verification options
 */
export interface DocumentVerificationOptions {
  // What to verify
  verifyAuthenticity?: boolean;
  verifyIntegrity?: boolean;
  extractData?: boolean;
  detectTampering?: boolean;

  // Sensitivity settings
  confidenceThreshold?: number;
  strictMode?: boolean;

  // Output preferences
  includeImages?: boolean;
  includeCroppedPortrait?: boolean;
  includeSignature?: boolean;
}

/**
 * Extracted document data
 */
export interface ExtractedDocumentData {
  // Personal information
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;

  // Document details
  documentNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;

  // Address information
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Additional fields (document-specific)
  additionalFields?: Record<string, any>;

  // Images
  portraitImage?: string; // Base64 encoded
  signatureImage?: string; // Base64 encoded
}

/**
 * Security check results
 */
export interface SecurityCheckResults {
  // Document authenticity
  isAuthentic: boolean;
  authenticityScore: number;

  // Tampering detection
  isTampered: boolean;
  tamperingScore: number;
  tamperingIndicators?: string[];

  // Quality checks
  imageQuality: ImageQualityResults;

  // Security features
  securityFeatures: SecurityFeatureResults;

  // Overall assessment
  riskLevel: RiskLevel;
  riskFactors?: string[];
}

/**
 * Image quality assessment
 */
export interface ImageQualityResults {
  overall: QualityLevel;
  brightness: QualityLevel;
  contrast: QualityLevel;
  sharpness: QualityLevel;
  glare: QualityLevel;
  blur: QualityLevel;
  colorfulness: QualityLevel;
}

/**
 * Security features check results
 */
export interface SecurityFeatureResults {
  hologram?: boolean;
  watermark?: boolean;
  microprint?: boolean;
  uvFeatures?: boolean;
  irFeatures?: boolean;
  barcodeValidation?: boolean;
  mrzValidation?: boolean;
  chipValidation?: boolean;
}

/**
 * Supported document types
 */
export enum DocumentType {
  PASSPORT = 'passport',
  ID_CARD = 'id_card',
  DRIVER_LICENSE = 'driver_license',
  RESIDENCE_PERMIT = 'residence_permit',
  VISA = 'visa',
  BIRTH_CERTIFICATE = 'birth_certificate',
  UTILITY_BILL = 'utility_bill',
  BANK_STATEMENT = 'bank_statement',
  OTHER = 'other',
}

// Import shared enums
export { QualityLevel, RiskLevel } from './common.interface';
