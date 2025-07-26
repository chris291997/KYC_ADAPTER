import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsObject, IsOptional } from 'class-validator';

import { Client } from './client.entity';

@Entity('client_provider_configs')
@Unique(['clientId', 'providerName'])
@Index('idx_client_provider_configs_client', ['clientId'])
@Index('idx_client_provider_configs_provider', ['providerName'])
@Index('idx_client_provider_configs_primary', ['clientId', 'isPrimary'])
export class ClientProviderConfig {
  @ApiProperty({
    description: 'Unique identifier for the client provider configuration',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Client ID this configuration belongs to',
    format: 'uuid',
  })
  @Column({ name: 'client_id' })
  @IsString()
  clientId: string;

  @ApiProperty({
    description: 'KYC provider name (regula, persona, etc.)',
    maxLength: 50,
  })
  @Column({ name: 'provider_name', length: 50 })
  @IsString()
  providerName: string;

  @ApiProperty({
    description: 'Whether this is the primary provider for the client',
    default: true,
  })
  @Column({ name: 'is_primary', default: true })
  @IsBoolean()
  isPrimary: boolean;

  @ApiProperty({
    description: 'Provider-specific configuration (thresholds, settings, etc.)',
    required: false,
  })
  @Column({ name: 'config_json', type: 'jsonb', nullable: true })
  @IsOptional()
  @IsObject()
  configJson: Record<string, any> | null;

  @ApiProperty({
    description: 'When the configuration was created',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({
    description: 'When the configuration was last updated',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Client, (client) => client.providerConfigs)
  @JoinColumn({ name: 'client_id' })
  client: Client;
}
