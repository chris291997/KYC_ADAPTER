import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsUrl,
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsObject,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentImagesDto } from './document-images.dto';
import { VerificationMetadataDto } from './verification-metadata.dto';

export enum VerificationType {
  DOCUMENT = 'document',
  BIOMETRIC = 'biometric',
  COMPREHENSIVE = 'comprehensive',
}

export enum DocumentType {
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  ID_CARD = 'id_card',
  VISA = 'visa',
  RESIDENCE_PERMIT = 'residence_permit',
  OTHER = 'other',
}

export enum ProcessingMethod {
  DIRECT = 'direct',
  EXTERNAL_LINK = 'external_link',
}

/**
 * Production-ready verification request DTO
 * Comprehensive input validation for identity verification
 */
export class CreateVerificationDto {
  @ApiProperty({
    description: 'Type of verification to perform',
    enum: VerificationType,
    example: VerificationType.DOCUMENT,
  })
  @IsNotEmpty()
  @IsEnum(VerificationType)
  verificationType: VerificationType;

  @ApiProperty({
    description:
      'Account ID to associate with this verification (optional for anonymous verifications)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Account ID must be a valid UUID v4' })
  accountId?: string;

  @ApiProperty({
    description: 'Document images for verification (required for document and comprehensive types)',
    type: DocumentImagesDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentImagesDto)
  documentImages?: DocumentImagesDto;

  @ApiProperty({
    description: 'Allowed document types for this verification',
    type: [String],
    enum: DocumentType,
    example: [DocumentType.PASSPORT, DocumentType.DRIVERS_LICENSE],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DocumentType, { each: true })
  allowedDocumentTypes?: DocumentType[];

  @ApiProperty({
    description: 'Expected country codes for documents (ISO 3166-1 alpha-2)',
    type: [String],
    example: ['US', 'CA', 'GB'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expectedCountries?: string[];

  @ApiProperty({
    description: 'Callback URL to receive verification completion webhook',
    example: 'https://yourapp.com/webhooks/verification-complete',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Callback URL must be a valid HTTPS URL' })
  callbackUrl?: string;

  @ApiProperty({
    description: 'Verification expiration time in seconds (300-86400)',
    example: 3600,
    minimum: 300,
    maximum: 86400,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(300, { message: 'Verification must be valid for at least 5 minutes' })
  @Max(86400, { message: 'Verification cannot be valid for more than 24 hours' })
  expiresIn?: number;

  @ApiProperty({
    description: 'Require liveness detection for biometric verification',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  requireLiveness?: boolean;

  @ApiProperty({
    description: 'Require address verification from document',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  requireAddressVerification?: boolean;

  @ApiProperty({
    description: 'Minimum confidence score required (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumConfidence?: number;

  @ApiProperty({
    description: 'Processing method preference',
    enum: ProcessingMethod,
    example: ProcessingMethod.DIRECT,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProcessingMethod)
  processingMethod?: ProcessingMethod;

  @ApiProperty({
    description: 'Comprehensive verification metadata',
    type: VerificationMetadataDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VerificationMetadataDto)
  metadata?: VerificationMetadataDto;

  @ApiProperty({
    description: 'Additional custom properties for specific use cases',
    example: {
      kycLevel: 'enhanced',
      riskProfile: 'standard',
      complianceRegion: 'EU',
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  customProperties?: Record<string, any>;
}
