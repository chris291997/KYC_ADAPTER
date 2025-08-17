import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TenantStatus } from '../../database/entities';

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant organization name', example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Primary email address', example: 'admin@acmecorp.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Tenant status',
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'active',
    required: false,
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended', 'pending'])
  status?: TenantStatus;

  @ApiProperty({
    description: 'Tenant configuration settings',
    example: {
      webhookUrl: 'https://api.acmecorp.com/kyc/webhook',
      allowedDocumentTypes: ['passport', 'driver_license'],
      autoApprovalEnabled: false,
    },
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  settings?: Record<string, any>;

  @ApiProperty({
    description:
      'Initial password (min 8 characters); if omitted, a temporary password will be generated and returned only once',
    required: false,
    minLength: 8,
    writeOnly: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
