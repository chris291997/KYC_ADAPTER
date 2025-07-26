import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsNumber, IsBoolean, IsArray, IsOptional } from 'class-validator';

import { VerificationRequest } from './verification-request.entity';

@Entity('verification_results')
@Index('idx_verification_results_request', ['requestId'])
@Index('idx_verification_results_verified', ['isVerified'])
@Index('idx_verification_results_confidence', ['confidenceScore'])
export class VerificationResult {
  @ApiProperty({
    description: 'Unique identifier for the verification result',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Verification request ID this result belongs to',
    format: 'uuid',
  })
  @Column({ name: 'request_id' })
  @IsString()
  requestId: string;

  @ApiProperty({
    description: 'Raw provider response data',
  })
  @Column({ name: 'provider_response', type: 'jsonb' })
  @IsObject()
  providerResponse: Record<string, any>;

  @ApiProperty({
    description: 'Standardized result format',
  })
  @Column({ name: 'standardized_result', type: 'jsonb' })
  @IsObject()
  standardizedResult: Record<string, any>;

  @ApiProperty({
    description: 'Confidence score from 0.0000 to 1.0000',
    minimum: 0,
    maximum: 1,
    required: false,
  })
  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  @IsOptional()
  @IsNumber()
  confidenceScore: number | null;

  @ApiProperty({
    description: 'Whether the verification was successful',
    required: false,
  })
  @Column({ name: 'is_verified', nullable: true })
  @IsOptional()
  @IsBoolean()
  isVerified: boolean | null;

  @ApiProperty({
    description: 'Reasons for verification failure',
    required: false,
  })
  @Column({ name: 'failure_reasons', type: 'text', array: true, nullable: true })
  @IsOptional()
  @IsArray()
  failureReasons: string[] | null;

  @ApiProperty({
    description: 'When the result was created',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => VerificationRequest, (request) => request.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: VerificationRequest;
}
