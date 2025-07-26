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
import { IsIn, IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { Tenant } from './tenant.entity';

export type ApiKeyStatus = 'active' | 'inactive' | 'expired' | 'revoked';

@Entity('tenant_api_keys')
@Index(['tenantId'])
@Index(['status'])
@Index(['expiresAt'])
@Index(['keyHash'], { unique: true })
export class TenantApiKey {
  @ApiProperty({ description: 'Unique API key identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID this API key belongs to' })
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ description: 'Human-readable name for the API key' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'SHA-256 hash of the API key', writeOnly: true })
  @Column({ type: 'varchar', length: 255, unique: true, name: 'key_hash' })
  keyHash: string;

  @ApiProperty({
    description: 'API key status',
    enum: ['active', 'inactive', 'expired', 'revoked'],
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'active',
    enum: ['active', 'inactive', 'expired', 'revoked'],
  })
  @IsIn(['active', 'inactive', 'expired', 'revoked'])
  status: ApiKeyStatus;

  @ApiProperty({ description: 'API key expiration date', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'expires_at' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiProperty({ description: 'Last time this API key was used', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'last_used_at' })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'API key creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.apiKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Helper methods
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  isActive(): boolean {
    return this.status === 'active' && !this.isExpired();
  }
}
