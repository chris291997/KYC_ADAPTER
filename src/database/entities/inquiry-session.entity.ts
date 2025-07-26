import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsDateString, IsIP } from 'class-validator';

export type SessionStatus = 'active' | 'expired' | 'completed';

@Entity('inquiry_sessions')
@Index(['inquiryId'])
@Index(['status'])
@Index(['expiresAt'])
export class InquirySession {
  @ApiProperty({ description: 'Unique session identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Inquiry ID this session belongs to' })
  @Column({ type: 'uuid', name: 'inquiry_id' })
  inquiryId: string;

  @ApiProperty({ description: 'Session status', enum: ['active', 'expired', 'completed'] })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'active',
    enum: ['active', 'expired', 'completed'],
  })
  @IsIn(['active', 'expired', 'completed'])
  status: SessionStatus;

  @ApiProperty({ description: 'IP address of the session', required: false })
  @Column({ type: 'inet', nullable: true, name: 'ip_address' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiProperty({ description: 'User agent string', required: false })
  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  @IsOptional()
  userAgent?: string;

  @ApiProperty({ description: 'Session expiration time' })
  @Column({
    type: 'timestamp with time zone',
    name: 'expires_at',
    default: () => "CURRENT_TIMESTAMP + INTERVAL '24 hours'",
  })
  @IsDateString()
  expiresAt: Date;

  @ApiProperty({ description: 'Session creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isActive(): boolean {
    return this.status === 'active' && !this.isExpired();
  }
}
