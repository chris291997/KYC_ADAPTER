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
import { IsIn, IsString, IsOptional, IsDateString } from 'class-validator';
import { Tenant } from './tenant.entity';
import { Account } from './account.entity';

export type InquiryStatus =
  | 'created'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'cancelled';

@Entity('inquiries')
@Index(['tenantId'])
@Index(['accountId'])
@Index(['templateId'])
@Index(['status'])
@Index(['tenantId', 'referenceId'])
@Index(['createdAt'])
export class Inquiry {
  @ApiProperty({ description: 'Unique inquiry identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID this inquiry belongs to' })
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ description: 'Account ID being verified' })
  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @ApiProperty({ description: 'Template used for this inquiry' })
  @Column({ type: 'uuid', name: 'template_id' })
  templateId: string;

  @ApiProperty({
    description: 'Inquiry status',
    enum: [
      'created',
      'pending',
      'in_progress',
      'completed',
      'approved',
      'declined',
      'expired',
      'cancelled',
    ],
  })
  @Column({
    type: 'varchar',
    length: 50,
    default: 'created',
    enum: [
      'created',
      'pending',
      'in_progress',
      'completed',
      'approved',
      'declined',
      'expired',
      'cancelled',
    ],
  })
  @IsIn([
    'created',
    'pending',
    'in_progress',
    'completed',
    'approved',
    'declined',
    'expired',
    'cancelled',
  ])
  status: InquiryStatus;

  @ApiProperty({ description: 'Tenant internal reference ID', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reference_id' })
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty({ description: 'Additional notes or context', required: false })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'When the inquiry was started', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'started_at' })
  @IsOptional()
  @IsDateString()
  startedAt?: Date;

  @ApiProperty({ description: 'When the inquiry was completed', required: false })
  @Column({ type: 'timestamp with time zone', nullable: true, name: 'completed_at' })
  @IsOptional()
  @IsDateString()
  completedAt?: Date;

  @ApiProperty({ description: 'Inquiry creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.inquiries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Account, (account) => account.inquiries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
