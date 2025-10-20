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
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsUUID, IsNumber } from 'class-validator';
import { Provider } from './provider.entity';

@Entity('provider_plans')
@Index(['providerId'])
@Index(['planCode'])
@Index(['isActive'])
@Index(['category'])
export class ProviderPlan {
  @ApiProperty({ description: 'Unique plan identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Provider this plan belongs to' })
  @Column({ type: 'uuid', name: 'provider_id' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Plan code from the provider' })
  @Column({ type: 'varchar', length: 100, name: 'plan_code' })
  @IsString()
  @IsNotEmpty()
  planCode: string;

  @ApiProperty({ description: 'Plan name' })
  @Column({ type: 'varchar', length: 255, name: 'plan_name' })
  @IsString()
  @IsNotEmpty()
  planName: string;

  @ApiProperty({ description: 'Plan category (e.g., "background_check", "identity_verification")' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Plan description', required: false })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Pricing information' })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  pricing?: {
    amount?: number;
    currency?: string;
    billing_type?: string; // 'per_verification' | 'subscription' | 'credits'
  };

  @ApiProperty({ description: 'Plan features and capabilities' })
  @Column({ type: 'jsonb', default: [] })
  @IsOptional()
  features: string[];

  @ApiProperty({ description: 'Whether this plan is active' })
  @Column({ type: 'boolean', name: 'is_active', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Processing time estimate in seconds', required: false })
  @Column({ type: 'integer', name: 'processing_time_seconds', nullable: true })
  @IsOptional()
  @IsNumber()
  processingTimeSeconds?: number;

  @ApiProperty({ description: 'Plan metadata from provider' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Plan creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Provider, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  // Helper methods
  getEstimatedDuration(): string {
    if (!this.processingTimeSeconds) return 'Unknown';

    const minutes = Math.floor(this.processingTimeSeconds / 60);
    const seconds = this.processingTimeSeconds % 60;

    if (minutes === 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  }

  hasFeature(feature: string): boolean {
    return this.features?.includes(feature) || false;
  }

  getPriceDisplay(): string {
    if (!this.pricing?.amount || !this.pricing?.currency) return 'Contact for pricing';
    return `${this.pricing.currency} ${this.pricing.amount.toFixed(2)}`;
  }
}
