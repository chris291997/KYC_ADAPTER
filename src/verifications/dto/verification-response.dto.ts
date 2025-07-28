import { ApiProperty } from '@nestjs/swagger';
import { VerificationType, ProcessingMethod } from './create-verification.dto';

export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Verification response DTO for API responses
 */
export class VerificationResponseDto {
  @ApiProperty({
    description: 'Unique verification identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Provider-specific verification ID',
    example: 'regula_1640995200_abc123',
  })
  providerVerificationId: string;

  @ApiProperty({
    description: 'Name of the KYC provider used',
    example: 'regula',
  })
  providerName: string;

  @ApiProperty({
    description: 'Current verification status',
    enum: VerificationStatus,
    example: VerificationStatus.COMPLETED,
  })
  status: VerificationStatus;

  @ApiProperty({
    description: 'Type of verification performed',
    enum: VerificationType,
    example: VerificationType.DOCUMENT,
  })
  verificationType: VerificationType;

  @ApiProperty({
    description: 'Processing method used',
    enum: ProcessingMethod,
    example: ProcessingMethod.DIRECT,
  })
  processingMethod: ProcessingMethod;

  @ApiProperty({
    description: 'One-time verification link (for external link processing)',
    example: 'https://verify.persona.com/verify?id=persona_1640995200_abc123',
    required: false,
  })
  verificationLink?: string;

  @ApiProperty({
    description: 'Verification expiration timestamp',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Verification result details',
    type: 'object',
    required: false,
    example: {
      overall: {
        status: 'passed',
        confidence: 92,
        riskLevel: 'low',
      },
      document: {
        extracted: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-15',
          nationality: 'US',
        },
        checks: {
          authenticity: 'passed',
          validity: 'passed',
          dataConsistency: 'passed',
        },
      },
    },
  })
  result?: any;

  @ApiProperty({
    description: 'Account ID associated with this verification',
    example: '550e8400-e29b-41d4-a716-446655440000',
    required: false,
  })
  accountId?: string;

  @ApiProperty({
    description: 'Verification creation timestamp',
    example: '2024-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T12:05:00Z',
  })
  updatedAt: Date;
}
