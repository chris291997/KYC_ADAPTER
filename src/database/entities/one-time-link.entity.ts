import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsDateString, IsUrl } from 'class-validator';

@Entity('one_time_links')
@Index(['inquirySessionId'])
@Index(['token'], { unique: true })
@Index(['expiresAt'])
@Index(['used', 'expiresAt'])
export class OneTimeLink {
  @ApiProperty({ description: 'Unique link identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Inquiry session ID this link belongs to' })
  @Column({ type: 'uuid', name: 'inquiry_session_id' })
  inquirySessionId: string;

  @ApiProperty({ description: 'Full verification URL' })
  @Column({ type: 'text', unique: true, name: 'verification_url' })
  @IsUrl()
  verificationUrl: string;

  @ApiProperty({ description: 'URL-safe verification token' })
  @Column({ type: 'varchar', length: 255, unique: true })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Whether this is a one-time use link' })
  @Column({ type: 'boolean', default: true, name: 'one_time_use' })
  @IsBoolean()
  oneTimeUse: boolean;

  @ApiProperty({ description: 'Whether the link has been used' })
  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  used: boolean;

  @ApiProperty({ description: 'Link expiration time' })
  @Column({
    type: 'timestamp with time zone',
    name: 'expires_at',
    default: () => "CURRENT_TIMESTAMP + INTERVAL '24 hours'",
  })
  @IsDateString()
  expiresAt: Date;

  @ApiProperty({ description: 'When the link was used', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'used_at' })
  @IsOptional()
  @IsDateString()
  usedAt?: Date;

  @ApiProperty({ description: 'Link creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    if (this.isExpired()) return false;
    if (this.oneTimeUse && this.used) return false;
    return true;
  }

  markAsUsed(): void {
    this.used = true;
    this.usedAt = new Date();
  }
}
