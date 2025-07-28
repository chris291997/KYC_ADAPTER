import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsUUID,
  IsUrl,
  IsDateString,
} from 'class-validator';
import {
  VerificationStatus,
  VerificationType,
  VerificationResult,
} from '../../providers/types/provider.types';
import { Tenant } from './tenant.entity';
import { Account } from './account.entity';
import { Provider } from './provider.entity';
import { ProviderConfig } from './provider-config.entity';

@Entity('verifications')
@Index(['tenantId'])
@Index(['accountId'])
@Index(['providerId'])
@Index(['providerConfigId'])
@Index(['status'])
@Index(['verificationType'])
@Index(['providerVerificationId'])
@Index(['expiresAt'])
@Index(['createdAt'])
export class Verification {
  @ApiProperty({ description: 'Unique verification identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID this verification belongs to' })
  @Column({ type: 'uuid', name: 'tenant_id' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Account ID this verification is for', required: false })
  @Column({ type: 'uuid', nullable: true, name: 'account_id' })
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @ApiProperty({ description: 'Provider ID used for this verification' })
  @Column({ type: 'uuid', name: 'provider_id' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Provider configuration ID used for this verification' })
  @Column({ type: 'uuid', name: 'provider_config_id' })
  @IsUUID()
  providerConfigId: string;

  @ApiProperty({ description: 'Provider-specific verification ID' })
  @Column({ type: 'varchar', length: 255, name: 'provider_verification_id' })
  @IsString()
  @IsNotEmpty()
  providerVerificationId: string;

  @ApiProperty({
    description: 'Type of verification',
    enum: VerificationType,
  })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'verification_type',
    enum: Object.values(VerificationType),
  })
  @IsIn(Object.values(VerificationType))
  verificationType: VerificationType;

  @ApiProperty({
    description: 'Current verification status',
    enum: VerificationStatus,
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: VerificationStatus.PENDING,
    enum: Object.values(VerificationStatus),
  })
  @IsIn(Object.values(VerificationStatus))
  status: VerificationStatus;

  @ApiProperty({ description: 'One-time verification link provided by the provider' })
  @Column({ type: 'text', name: 'verification_link' })
  @IsUrl()
  verificationLink: string;

  @ApiProperty({ description: 'Tenant callback URL for verification completion', required: false })
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'callback_url' })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;

  @ApiProperty({ description: 'Verification link expiration timestamp' })
  @Column({ type: 'timestamp with time zone', name: 'expires_at' })
  @IsDateString()
  expiresAt: Date;

  @ApiProperty({ description: 'Detailed verification result from provider', required: false })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  result?: VerificationResult;

  @ApiProperty({ description: 'Request metadata and additional information' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  requestMetadata: Record<string, any>;

  @ApiProperty({ description: 'Response metadata from provider' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  responseMetadata: Record<string, any>;

  @ApiProperty({ description: 'Error details if verification failed' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  errorDetails?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };

  @ApiProperty({ description: 'Verification creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Verification completion timestamp', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'completed_at' })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.verifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Account, (account) => account.verifications, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'account_id' })
  account?: Account;

  @ManyToOne(() => Provider, (provider) => provider.verifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @ManyToOne(() => ProviderConfig, (config) => config.verifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_config_id' })
  providerConfig: ProviderConfig;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isCompleted(): boolean {
    return this.status === VerificationStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === VerificationStatus.FAILED;
  }

  isPending(): boolean {
    return (
      this.status === VerificationStatus.PENDING || this.status === VerificationStatus.IN_PROGRESS
    );
  }

  canBeAccessed(): boolean {
    return !this.isExpired() && this.isPending();
  }

  getProcessingTime(): number | null {
    if (!this.completedAt) return null;
    return this.completedAt.getTime() - this.createdAt.getTime();
  }

  markCompleted(result: VerificationResult): void {
    this.status = VerificationStatus.COMPLETED;
    this.result = result;
    this.completedAt = new Date();
  }

  markFailed(error: { code: string; message: string; details?: Record<string, any> }): void {
    this.status = VerificationStatus.FAILED;
    this.errorDetails = error;
    this.completedAt = new Date();
  }
}
