import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsArray, IsInt, IsOptional, IsIP } from 'class-validator';

import { Client } from './client.entity';
import { VerificationResult } from './verification-result.entity';

export enum RequestType {
  DOCUMENT = 'document',
  BIOMETRIC = 'biometric',
}

export enum RequestStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('verification_requests')
@Index('idx_verification_requests_client', ['clientId'])
@Index('idx_verification_requests_status', ['status'])
@Index('idx_verification_requests_created', ['createdAt'])
@Index('idx_verification_requests_client_created', ['clientId', 'createdAt'])
@Index('idx_verification_requests_provider', ['providerName'])
@Index('idx_verification_requests_type', ['requestType'])
@Index('idx_verification_requests_composite', ['clientId', 'status', 'createdAt'])
@Index('idx_verification_requests_recent', ['createdAt'])
@Index('idx_verification_requests_failed', ['clientId', 'createdAt'])
export class VerificationRequest {
  @ApiProperty({
    description: 'Unique identifier for the verification request',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Client ID that made the request',
    format: 'uuid',
  })
  @Column({ name: 'client_id' })
  @IsString()
  clientId: string;

  @ApiProperty({
    description: 'Type of verification request',
    enum: RequestType,
  })
  @Column({ name: 'request_type', type: 'varchar', length: 50 })
  @IsString()
  requestType: RequestType;

  @ApiProperty({
    description: 'KYC provider used for this request',
    maxLength: 50,
  })
  @Column({ name: 'provider_name', length: 50 })
  @IsString()
  providerName: string;

  @ApiProperty({
    description: 'Provider internal request ID',
    maxLength: 255,
    required: false,
  })
  @Column({ name: 'provider_request_id', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  providerRequestId: string | null;

  @ApiProperty({
    description: 'Current status of the request',
    enum: RequestStatus,
  })
  @Column({ name: 'status', type: 'varchar', length: 50 })
  @IsString()
  status: RequestStatus;

  @ApiProperty({
    description: 'Sanitized request metadata',
    required: false,
  })
  @Column({ name: 'request_metadata', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  requestMetadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Paths to uploaded files for cleanup',
    required: false,
  })
  @Column({ name: 'file_paths', type: 'text', array: true, nullable: true })
  @IsOptional()
  @IsArray()
  filePaths: string[] | null;

  @ApiProperty({
    description: 'Client IP address',
    required: false,
  })
  @Column({ name: 'client_ip_address', type: 'inet', nullable: true })
  @IsOptional()
  @IsIP()
  clientIpAddress: string | null;

  @ApiProperty({
    description: 'Client user agent',
    required: false,
  })
  @Column({ name: 'user_agent', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  userAgent: string | null;

  @ApiProperty({
    description: 'When the request was created',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({
    description: 'When the request was completed',
    required: false,
  })
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  @IsOptional()
  completedAt: Date | null;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    required: false,
  })
  @Column({ name: 'processing_time_ms', nullable: true })
  @IsOptional()
  @IsInt()
  processingTimeMs: number | null;

  // Relationships
  @ManyToOne(() => Client, (client) => client.verificationRequests)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @OneToMany(() => VerificationResult, (result) => result.request)
  results: VerificationResult[];
}
