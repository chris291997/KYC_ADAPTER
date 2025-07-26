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
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Tenant } from './tenant.entity';

@Entity('inquiry_templates')
@Index(['tenantId'])
export class InquiryTemplate {
  @ApiProperty({ description: 'Unique template identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID this template belongs to' })
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ description: 'Template name' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Template version number' })
  @Column({ type: 'integer', default: 1 })
  @IsNumber()
  version: number;

  @ApiProperty({ description: 'Verification configuration and requirements' })
  @Column({ type: 'jsonb', default: {} })
  configuration: Record<string, any>;

  @ApiProperty({ description: 'UI customization settings', required: false })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  uiSettings: Record<string, any>;

  @ApiProperty({ description: 'Business rules and auto-approval settings', required: false })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  businessRules: Record<string, any>;

  @ApiProperty({ description: 'Whether this template is active' })
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Template creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.inquiryTemplates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
