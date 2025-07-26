import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional, IsIn, ValidateNested } from 'class-validator';
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
}
