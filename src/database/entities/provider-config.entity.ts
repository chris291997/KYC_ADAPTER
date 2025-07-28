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
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { Provider } from './provider.entity';
import { Tenant } from './tenant.entity';
import { Verification } from './verification.entity';

@Entity('provider_configs')
@Index(['tenantId', 'providerId'], { unique: true })
@Index(['tenantId'])
@Index(['providerId'])
@Index(['isEnabled'])
export class ProviderConfig {
  @ApiProperty({ description: 'Unique provider config identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID this config belongs to' })
  @Column({ type: 'uuid', name: 'tenant_id' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ description: 'Provider ID this config is for' })
  @Column({ type: 'uuid', name: 'provider_id' })
  @IsUUID()
  providerId: string;

  @ApiProperty({ description: 'Whether this provider is enabled for the tenant' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isEnabled: boolean;

  @ApiProperty({ description: 'Tenant-specific provider configuration' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  config: Record<string, any>;

  @ApiProperty({ description: 'Provider priority for this tenant (lower = higher priority)' })
  @Column({ type: 'integer', default: 100 })
  priority: number;

  @ApiProperty({ description: 'Maximum daily verifications for this tenant-provider combo' })
  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  maxDailyVerifications?: number;

  @ApiProperty({ description: 'Tenant-specific webhook URL for this provider' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  webhookUrl?: string;

  @ApiProperty({ description: 'Configuration metadata' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Configuration creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Tenant, (tenant) => tenant.providerConfigs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Provider, (provider) => provider.tenantConfigs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Provider;

  @OneToMany(() => Verification, (verification) => verification.providerConfig)
  verifications: Verification[];

  // Helper methods
  isActive(): boolean {
    return this.isEnabled && this.provider?.isActive;
  }

  getMergedConfig(): Record<string, any> {
    return this.provider?.getMergedConfig(this.config) || this.config;
  }

  hasReachedDailyLimit(todayCount: number): boolean {
    if (!this.maxDailyVerifications) return false;
    return todayCount >= this.maxDailyVerifications;
  }
}
