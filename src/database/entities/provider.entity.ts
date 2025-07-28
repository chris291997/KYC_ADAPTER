import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsBoolean, IsOptional } from 'class-validator';
import { Exclude } from 'class-transformer';
import { ProviderType, ProviderCredentials } from '../../providers/types/provider.types';
import { ProviderConfig } from './provider-config.entity';
import { Verification } from './verification.entity';

@Entity('providers')
@Index(['type'])
@Index(['isActive'])
@Index(['name'], { unique: true })
export class Provider {
  @ApiProperty({ description: 'Unique provider identifier' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Provider display name' })
  @Column({ type: 'varchar', length: 255, unique: true })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Provider type',
    enum: ProviderType,
  })
  @Column({
    type: 'varchar',
    length: 50,
    enum: Object.values(ProviderType),
  })
  @IsIn(Object.values(ProviderType))
  type: ProviderType;

  @ApiProperty({ description: 'Provider description', required: false })
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Provider API credentials (encrypted)', writeOnly: true })
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @Exclude({ toPlainOnly: true }) // Never expose credentials in API responses
  credentials?: ProviderCredentials;

  @ApiProperty({ description: 'Provider default configuration settings' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  defaultConfig: Record<string, any>;

  @ApiProperty({ description: 'Whether this provider is active and available for use' })
  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Provider API endpoint URL', required: false })
  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  apiUrl?: string;

  @ApiProperty({ description: 'Provider webhook endpoint URL', required: false })
  @Column({ type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @ApiProperty({ description: 'Maximum daily verifications allowed', required: false })
  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  maxDailyVerifications?: number;

  @ApiProperty({ description: 'Provider priority for selection (lower = higher priority)' })
  @Column({ type: 'integer', default: 100 })
  priority: number;

  @ApiProperty({ description: 'Provider metadata and additional settings' })
  @Column({ type: 'jsonb', default: {} })
  @IsOptional()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Provider creation timestamp' })
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => ProviderConfig, (config) => config.provider)
  tenantConfigs: ProviderConfig[];

  @OneToMany(() => Verification, (verification) => verification.provider)
  verifications: Verification[];

  // Helper methods
  isAvailable(): boolean {
    return this.isActive && !!this.credentials;
  }

  hasValidCredentials(): boolean {
    return !!this.credentials && Object.keys(this.credentials).length > 0;
  }

  getDisplayName(): string {
    return this.name || this.type;
  }

  // Get provider config merged with default config
  getMergedConfig(tenantConfig?: Record<string, any>): Record<string, any> {
    return {
      ...this.defaultConfig,
      ...tenantConfig,
    };
  }
}
