import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export type VerificationStatus =
  | 'pending'
  | 'processing'
  | 'passed'
  | 'failed'
  | 'requires_review'
  | 'cancelled';
export type VerificationType =
  | 'document'
  | 'biometric'
  | 'address'
  | 'phone'
  | 'email'
  | 'database';

@Entity('verifications')
@Index(['inquiryId'])
@Index(['accountId'])
@Index(['status'])
@Index(['verificationType'])
@Index(['providerName'])
@Index(['completedAt'])
export class Verification {
  @ApiProperty({ description: 'Unique verification identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Inquiry ID this verification belongs to' })
  @Column({ type: 'uuid', name: 'inquiry_id' })
  inquiryId: string;

  @ApiProperty({ description: 'Account ID being verified' })
  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @ApiProperty({
    description: 'Verification status',
    enum: ['pending', 'processing', 'passed', 'failed', 'requires_review', 'cancelled'],
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
    enum: ['pending', 'processing', 'passed', 'failed', 'requires_review', 'cancelled'],
  })
  @IsIn(['pending', 'processing', 'passed', 'failed', 'requires_review', 'cancelled'])
  status: VerificationStatus;

  @ApiProperty({
    description: 'Type of verification',
    enum: ['document', 'biometric', 'address', 'phone', 'email', 'database'],
  })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'verification_type',
    enum: ['document', 'biometric', 'address', 'phone', 'email', 'database'],
  })
  @IsIn(['document', 'biometric', 'address', 'phone', 'email', 'database'])
  verificationType: VerificationType;

  @ApiProperty({ description: 'KYC provider used', required: false })
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'provider_name' })
  @IsOptional()
  @IsString()
  providerName?: string;

  @ApiProperty({ description: 'Provider internal verification ID', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_verification_id' })
  @IsOptional()
  @IsString()
  providerVerificationId?: string;

  @ApiProperty({ description: 'Confidence score (0.00 to 1.00)', required: false })
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, name: 'confidence_score' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  confidenceScore?: number;

  @ApiProperty({ description: 'Structured verification results' })
  @Column({ type: 'jsonb', default: {}, name: 'result_data' })
  resultData: Record<string, any>;

  @ApiProperty({ description: 'Raw provider response for debugging', required: false })
  @Column({ type: 'jsonb', nullable: true, name: 'raw_provider_response' })
  @IsOptional()
  rawProviderResponse?: Record<string, any>;

  @ApiProperty({ description: 'When verification was submitted' })
  @Column({
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'submitted_at',
  })
  @IsDateString()
  submittedAt: Date;

  @ApiProperty({ description: 'When verification was completed', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'completed_at' })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  @ApiProperty({ description: 'Verification creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isCompleted(): boolean {
    return ['passed', 'failed', 'requires_review', 'cancelled'].includes(this.status);
  }

  isPassed(): boolean {
    return this.status === 'passed';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }
}
