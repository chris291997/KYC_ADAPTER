import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsUUID,
  IsUrl,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  VerificationType,
  DocumentType,
  VerificationStatus,
  VerificationResult,
  ProcessingMethod,
  RegulaSecurityFeature,
  RegulaLightSource,
} from '../types/provider.types';

// ================================
// REQUEST DTOs
// ================================

export class CreateVerificationDto {
  @ApiProperty({
    description: 'Type of verification to perform',
    enum: VerificationType,
    example: VerificationType.DOCUMENT,
  })
  @IsIn(Object.values(VerificationType))
  verificationType: VerificationType;

  @ApiProperty({
    description: 'Processing method for verification',
    enum: ProcessingMethod,
    example: ProcessingMethod.DIRECT,
  })
  @IsIn(Object.values(ProcessingMethod))
  processingMethod: ProcessingMethod;

  @ApiProperty({
    description: 'Account ID to associate with this verification',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({
    description: 'Callback URL to receive verification results',
    required: false,
    example: 'https://your-app.com/webhooks/verification',
  })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;

  @ApiProperty({
    description: 'Verification link expiration time in seconds (for external link processing)',
    required: false,
    minimum: 300,
    maximum: 86400,
    default: 3600,
    example: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(300) // 5 minutes minimum
  @Max(86400) // 24 hours maximum
  expiresIn?: number;

  @ApiProperty({
    description: 'Allowed document types for verification',
    type: [String],
    enum: DocumentType,
    required: false,
    example: [DocumentType.PASSPORT, DocumentType.DRIVERS_LICENSE],
  })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(DocumentType), { each: true })
  allowedDocumentTypes?: DocumentType[];

  @ApiProperty({
    description: 'Whether to require liveness detection for biometric verification',
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  requireLiveness?: boolean;

  @ApiProperty({
    description: 'Additional metadata for the verification request',
    required: false,
    example: { source: 'mobile_app', version: '1.2.3' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// Document images DTO
export class DocumentImagesDto {
  @ApiProperty({
    description: 'Front side of document (base64 encoded)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
  })
  @IsString()
  front: string;

  @ApiProperty({
    description: 'Back side of document (base64 encoded)',
    required: false,
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
  })
  @IsOptional()
  @IsString()
  back?: string;

  @ApiProperty({
    description: 'Selfie image (base64 encoded)',
    required: false,
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
  })
  @IsOptional()
  @IsString()
  selfie?: string;
}

// Direct processing specific DTO (for Regula)
export class DirectVerificationDto extends CreateVerificationDto {
  @ApiProperty({
    description: 'Processing method must be direct',
    enum: [ProcessingMethod.DIRECT],
    example: ProcessingMethod.DIRECT,
  })
  processingMethod: ProcessingMethod.DIRECT;

  @ApiProperty({
    description: 'Document images for processing',
    type: 'object',
    properties: {
      front: { type: 'string', format: 'base64', description: 'Front side of document (base64)' },
      back: { type: 'string', format: 'base64', description: 'Back side of document (base64)' },
      selfie: { type: 'string', format: 'base64', description: 'Selfie image (base64)' },
    },
    example: {
      front: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
      back: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
      selfie: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...',
    },
  })
  @ValidateNested()
  @Type(() => DocumentImagesDto)
  documentImages: DocumentImagesDto;

  @ApiProperty({
    description: 'Enabled security features for Regula processing',
    type: [String],
    enum: RegulaSecurityFeature,
    required: false,
    example: [
      RegulaSecurityFeature.MRZ,
      RegulaSecurityFeature.RFID,
      RegulaSecurityFeature.HOLOGRAM,
    ],
  })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(RegulaSecurityFeature), { each: true })
  enabledSecurityFeatures?: RegulaSecurityFeature[];

  @ApiProperty({
    description: 'Light sources for document analysis',
    type: [String],
    enum: RegulaLightSource,
    required: false,
    example: [RegulaLightSource.WHITE, RegulaLightSource.UV, RegulaLightSource.IR],
  })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(RegulaLightSource), { each: true })
  lightSources?: RegulaLightSource[];
}

// External link processing DTO (for Persona)
export class ExternalLinkVerificationDto extends CreateVerificationDto {
  @ApiProperty({
    description: 'Processing method must be external link',
    enum: [ProcessingMethod.EXTERNAL_LINK],
    example: ProcessingMethod.EXTERNAL_LINK,
  })
  processingMethod: ProcessingMethod.EXTERNAL_LINK;
}

export class ProviderConfigDto {
  @ApiProperty({
    description: 'Provider ID to use for verification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  providerId: string;

  @ApiProperty({
    description: 'Processing method supported by this provider',
    enum: ProcessingMethod,
    example: ProcessingMethod.DIRECT,
  })
  @IsIn(Object.values(ProcessingMethod))
  processingMethod: ProcessingMethod;

  @ApiProperty({
    description: 'Whether this provider is enabled for the tenant',
    default: true,
    example: true,
  })
  @IsOptional()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Provider-specific configuration settings',
    required: false,
    example: { maxDailyVerifications: 100, webhookUrl: 'https://tenant.com/webhook' },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({
    description: 'Provider priority for selection (lower = higher priority)',
    required: false,
    default: 100,
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

// ================================
// RESPONSE DTOs
// ================================

export class VerificationResponseDto {
  @ApiProperty({
    description: 'Internal verification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Provider-specific verification ID',
    example: 'regula_1640995200_abc123',
  })
  providerVerificationId: string;

  @ApiProperty({
    description: 'Current verification status',
    enum: VerificationStatus,
    example: VerificationStatus.COMPLETED,
  })
  status: VerificationStatus;

  @ApiProperty({
    description: 'Processing method used',
    enum: ProcessingMethod,
    example: ProcessingMethod.DIRECT,
  })
  processingMethod: ProcessingMethod;

  @ApiProperty({
    description: 'One-time verification link (for external link processing)',
    required: false,
    example: 'https://verify.persona.com/verify?id=persona_1640995200_abc123',
  })
  verificationLink?: string;

  @ApiProperty({
    description: 'Link expiration timestamp (for external link processing)',
    required: false,
    example: '2024-12-31T23:59:59Z',
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Verification result (for direct processing)',
    required: false,
    type: 'object',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  result?: VerificationResult;

  @ApiProperty({
    description: 'Additional metadata from the provider',
    required: false,
    example: { provider: 'regula', processingTime: 2500 },
  })
  metadata?: Record<string, any>;
}

export class VerificationStatusDto {
  @ApiProperty({
    description: 'Internal verification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Provider-specific verification ID',
    example: 'regula_1640995200_abc123',
  })
  providerVerificationId: string;

  @ApiProperty({
    description: 'Current verification status',
    enum: VerificationStatus,
    example: VerificationStatus.COMPLETED,
  })
  status: VerificationStatus;

  @ApiProperty({
    description: 'Processing method used',
    enum: ProcessingMethod,
    example: ProcessingMethod.DIRECT,
  })
  processingMethod: ProcessingMethod;

  @ApiProperty({
    description: 'Detailed verification result (available when completed)',
    required: false,
    type: 'object',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  result?: VerificationResult;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-12-31T23:59:59Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Processing time in milliseconds (when completed)',
    required: false,
    example: 2500,
  })
  @IsOptional()
  processingTime?: number;
}

export class ProviderHealthDto {
  @ApiProperty({
    description: 'Provider name',
    example: 'Regula Document Reader SDK',
  })
  name: string;

  @ApiProperty({
    description: 'Provider type',
    example: 'regula',
  })
  type: string;

  @ApiProperty({
    description: 'Processing method supported',
    enum: ProcessingMethod,
    example: ProcessingMethod.DIRECT,
  })
  processingMethod: ProcessingMethod;

  @ApiProperty({
    description: 'Whether the provider is healthy',
    example: true,
  })
  isHealthy: boolean;

  @ApiProperty({
    description: 'Response latency in milliseconds',
    required: false,
    example: 150,
  })
  latency?: number;

  @ApiProperty({
    description: 'Last health check timestamp',
    example: '2024-12-31T23:59:59Z',
  })
  lastChecked: Date;

  @ApiProperty({
    description: 'Error message if unhealthy',
    required: false,
    example: 'Connection timeout',
  })
  error?: string;
}

// ================================
// REGULA-SPECIFIC RESULT DTOs
// ================================

export class RegulaDocumentResultDto {
  @ApiProperty({
    description: 'Detected document type',
    example: { country: 'USA', type: 'passport', series: 'ePassport' },
  })
  documentType: {
    country: string;
    type: string;
    series?: string;
  };

  @ApiProperty({
    description: 'MRZ processing results',
    example: {
      parsed: { documentType: 'P', issuingCountry: 'USA', surname: 'DOE' },
      validity: 'valid',
      checkDigits: 'passed',
    },
  })
  mrz: {
    parsed: Record<string, any>;
    validity: 'valid' | 'invalid';
    checkDigits: 'passed' | 'failed';
  };

  @ApiProperty({
    description: 'RFID chip processing results',
    example: {
      chipPresent: true,
      dataGroups: ['DG1', 'DG2'],
      authentication: { passive: 'passed' },
    },
  })
  rfid: {
    chipPresent: boolean;
    dataGroups: string[];
    authentication: {
      passive: 'passed' | 'failed' | 'not_performed';
      active: 'passed' | 'failed' | 'not_performed';
      chip: 'passed' | 'failed' | 'not_performed';
    };
  };

  @ApiProperty({
    description: 'Security features check results',
    example: {
      hologram: { present: true, authentic: true },
      uv_fibers: { present: true, authentic: true },
    },
  })
  securityFeatures: Record<string, { present: boolean; authentic: boolean; details?: any }>;

  @ApiProperty({
    description: 'Light source analysis results',
    example: {
      white: { performed: true, result: 'passed' },
      uv: { performed: true, result: 'passed' },
    },
  })
  lightSourceChecks: Record<string, { performed: boolean; result: string; details?: any }>;
}
