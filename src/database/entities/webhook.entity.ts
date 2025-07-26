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
import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, IsUrl } from 'class-validator';
import { Tenant } from './tenant.entity';

@Entity('webhooks')
@Index(['tenantId'])
@Index(['enabled'])
export class Webhook {
  @ApiProperty({ description: 'Unique webhook identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID this webhook belongs to' })
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ description: 'Webhook URL endpoint' })
  @Column({ type: 'text' })
  @IsUrl()
  url: string;

  @ApiProperty({ description: 'Secret for signature verification', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ description: 'Whether webhook is enabled' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Array of event types to listen for' })
  @Column({ type: 'text', array: true, default: '{}' })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiProperty({ description: 'Number of retry attempts for failed deliveries' })
  @Column({ type: 'integer', default: 3, name: 'retry_attempts' })
  @IsNumber()
  retryAttempts: number;

  @ApiProperty({ description: 'Timeout in seconds for webhook requests' })
  @Column({ type: 'integer', default: 30, name: 'timeout_seconds' })
  @IsNumber()
  timeoutSeconds: number;

  @ApiProperty({ description: 'Webhook creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.webhooks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Helper methods
  supportsEvent(eventType: string): boolean {
    return this.events.includes(eventType);
  }

  isConfigured(): boolean {
    return this.enabled && !!this.url && this.events.length > 0;
  }
}
