import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TenantStatus } from '../../database/entities';

export class UpdateTenantDto {
  @ApiProperty({ description: 'Tenant organization name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Primary email address', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Tenant status',
    enum: ['active', 'inactive', 'suspended', 'pending'],
    required: false,
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended', 'pending'])
  status?: TenantStatus;

  @ApiProperty({
    description: 'Tenant configuration settings',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  settings?: Record<string, any>;
}
