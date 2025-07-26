import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsBoolean, IsInt, Min } from 'class-validator';

import { ClientProviderConfig } from './client-provider-config.entity';
import { VerificationRequest } from './verification-request.entity';
import { RateLimitTracking } from './rate-limit-tracking.entity';

@Entity('clients')
@Index('idx_clients_api_key', ['apiKey'], { unique: true })
@Index('idx_clients_api_key_active', ['apiKey', 'isActive'])
@Index('idx_clients_active', ['isActive'])
@Index('idx_clients_email', ['email'])
@Index('idx_clients_last_used', ['lastUsedAt'])
export class Client {
  @ApiProperty({
    description: 'Unique identifier for the client',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Client organization name',
    maxLength: 255,
  })
  @Column({ length: 255 })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Client contact email',
    format: 'email',
    maxLength: 255,
  })
  @Column({ length: 255 })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Hashed API key for authentication',
    maxLength: 64,
  })
  @Column({ name: 'api_key', length: 64, unique: true })
  @IsString()
  apiKey: string;

  @ApiProperty({
    description: 'Additional hash for API key verification',
    maxLength: 128,
  })
  @Column({ name: 'api_key_hash', length: 128 })
  @IsString()
  apiKeyHash: string;

  @ApiProperty({
    description: 'Whether the client is active',
    default: true,
  })
  @Column({ name: 'is_active', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    description: 'Rate limit per minute',
    default: 100,
    minimum: 1,
  })
  @Column({ name: 'rate_limit_per_minute', default: 100 })
  @IsInt()
  @Min(1)
  rateLimitPerMinute: number;

  @ApiProperty({
    description: 'Rate limit per hour',
    default: 1000,
    minimum: 1,
  })
  @Column({ name: 'rate_limit_per_hour', default: 1000 })
  @IsInt()
  @Min(1)
  rateLimitPerHour: number;

  @ApiProperty({
    description: 'When the client was created',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({
    description: 'When the client was last updated',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ApiProperty({
    description: 'When the client last made a request',
    required: false,
  })
  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  // Relationships
  @OneToMany(() => ClientProviderConfig, (config) => config.client)
  providerConfigs: ClientProviderConfig[];

  @OneToMany(() => VerificationRequest, (request) => request.client)
  verificationRequests: VerificationRequest[];

  @OneToMany(() => RateLimitTracking, (tracking) => tracking.client)
  rateLimitTracking: RateLimitTracking[];
}
