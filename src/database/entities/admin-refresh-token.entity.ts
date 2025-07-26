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
import { Admin } from './admin.entity';

@Entity('admin_refresh_tokens')
@Index(['adminId'])
@Index(['token'], { unique: true })
@Index(['expiresAt'])
export class AdminRefreshToken {
  @ApiProperty({ description: 'Unique refresh token identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Admin ID this refresh token belongs to' })
  @Column({ type: 'uuid', name: 'admin_id' })
  adminId: string;

  @ApiProperty({ description: 'Refresh token value' })
  @Column({ type: 'varchar', length: 255, unique: true })
  token: string;

  @ApiProperty({ description: 'Whether the token is revoked' })
  @Column({ type: 'boolean', default: false, name: 'is_revoked' })
  isRevoked: boolean;

  @ApiProperty({ description: 'Token expiration timestamp' })
  @Column({ type: 'timestamp with time zone', name: 'expires_at' })
  expiresAt: Date;

  @ApiProperty({ description: 'User agent that created this token', required: false })
  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent?: string;

  @ApiProperty({ description: 'IP address that created this token', required: false })
  @Column({ type: 'varchar', length: 45, nullable: true, name: 'ip_address' })
  ipAddress?: string;

  @ApiProperty({ description: 'Token creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Admin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}
