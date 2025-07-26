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
import { IsString, IsNotEmpty, IsBoolean, IsDateString, IsOptional } from 'class-validator';
import { Tenant } from './tenant.entity';

@Entity('tenant_refresh_tokens')
@Index(['tenantId'])
@Index(['token'], { unique: true })
@Index(['expiresAt'])
@Index(['tenantId', 'isRevoked'])
export class TenantRefreshToken {
  @ApiProperty({ description: 'Unique refresh token identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID this token belongs to' })
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ description: 'Refresh token value' })
  @Column({ type: 'varchar', length: 255, unique: true })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Whether the token has been revoked' })
  @Column({ type: 'boolean', default: false, name: 'is_revoked' })
  @IsBoolean()
  isRevoked: boolean;

  @ApiProperty({ description: 'Token expiration timestamp' })
  @Column({ type: 'timestamp with time zone', name: 'expires_at' })
  @IsDateString()
  expiresAt: Date;

  @ApiProperty({ description: 'User agent string', required: false })
  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'IP address', required: false })
  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'Token creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}
