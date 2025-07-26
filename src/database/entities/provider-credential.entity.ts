import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean } from 'class-validator';

@Entity('provider_credentials')
@Unique(['providerName', 'credentialType'])
@Index('idx_provider_credentials_provider', ['providerName', 'isActive'])
export class ProviderCredential {
  @ApiProperty({
    description: 'Unique identifier for the provider credential',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'KYC provider name (regula, persona, etc.)',
    maxLength: 50,
  })
  @Column({ name: 'provider_name', length: 50 })
  @IsString()
  providerName: string;

  @ApiProperty({
    description: 'Type of credential (api_key, client_secret, etc.)',
    maxLength: 50,
  })
  @Column({ name: 'credential_type', length: 50 })
  @IsString()
  credentialType: string;

  @ApiProperty({
    description: 'Encrypted credential value',
  })
  @Column({ name: 'encrypted_value', type: 'text' })
  @IsString()
  encryptedValue: string;

  @ApiProperty({
    description: 'Whether the credential is active',
    default: true,
  })
  @Column({ name: 'is_active', default: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    description: 'When the credential was created',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({
    description: 'When the credential was last updated',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
