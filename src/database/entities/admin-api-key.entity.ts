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
import { IsString, IsNotEmpty, IsIn, IsOptional, IsDateString } from 'class-validator';
import { Admin } from './admin.entity';

export type AdminApiKeyStatus = 'active' | 'inactive' | 'expired' | 'revoked';

@Entity('admin_api_keys')
@Index(['adminId'])
@Index(['keyHash'], { unique: true })
@Index(['status'])
@Index(['adminId', 'status'])
@Index(['expiresAt'])
export class AdminApiKey {
  @ApiProperty({ description: 'Unique API key identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Admin ID this API key belongs to' })
  @Column({ type: 'uuid', name: 'admin_id' })
  adminId: string;

  @ApiProperty({ description: 'Human-readable name for the API key' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Hashed API key value' })
  @Column({ type: 'varchar', length: 64, unique: true, name: 'key_hash' })
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
  status: AdminApiKeyStatus;

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
  @ManyToOne(() => Admin, (admin) => admin.apiKeys, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  // Helper methods
  isActive(): boolean {
    return this.status === 'active' && !this.isExpired();
  }

  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  updateLastUsed(): void {
    this.lastUsedAt = new Date();
  }
}
