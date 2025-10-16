import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { Provider } from './provider.entity';
import { ProviderVerificationSession } from './provider-verification-session.entity';

@Entity('provider_templates')
@Index(['providerId'])
@Index(['externalTemplateId'])
@Index(['isActive'])
@Index(['category'])
export class ProviderTemplate {
  @ApiProperty({ description: 'Unique template identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Provider this template belongs to' })
  @Column({ type: 'uuid', name: 'provider_id' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'External template ID from the provider API' })
  @Column({ type: 'varchar', length: 255, name: 'external_template_id' })
  @IsString()
  @IsNotEmpty()
  externalTemplateId: string;

  @ApiProperty({ description: 'Template name' })
  @Column({ type: 'varchar', length: 255 })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Template description', required: false })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Template category (e.g., "document", "biometric", "id_verification")',
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Ordered list of verification steps', type: 'array' })
  @Column({ type: 'jsonb', default: [] })
  @IsOptional()
  steps: Array<{
    order: number;
    type: string;
    name: string;
    required: boolean;
    config?: Record<string, any>;
  }>;

  @ApiProperty({ description: 'Number of steps in the template' })
  @Column({ type: 'integer', name: 'step_count', default: 0 })
  @IsNumber()
  stepCount: number;

  @ApiProperty({ description: 'Whether this template is active' })
  @Column({ type: 'boolean', name: 'is_active', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Template metadata from provider' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Template creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @OneToMany(() => ProviderVerificationSession, (session) => session.template)
  sessions: ProviderVerificationSession[];

  // Helper methods
  getTotalSteps(): number {
    return this.stepCount || this.steps?.length || 0;
  }

  getStepByOrder(order: number) {
    return this.steps?.find((step) => step.order === order);
  }

  isCompleteTemplate(): boolean {
    return this.isActive && this.steps && this.steps.length > 0;
  }
}
