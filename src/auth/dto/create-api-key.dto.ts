import { IsString, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type OwnerType = 'tenant';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Name for the API key', example: 'My API Key' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Owner type', 
    enum: ['tenant'],
    example: 'tenant'
  })
  @IsEnum(['tenant'])
  ownerType: OwnerType;

  @ApiProperty({ 
    description: 'Owner ID (admin_id or tenant_id)', 
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  ownerId: string;

  @ApiPropertyOptional({ 
    description: 'Expiration date (ISO string)', 
    example: '2025-12-31T23:59:59.000Z'
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  // Optional fields for tenant keys
  @ApiPropertyOptional({ 
    description: 'Preview suffix for tenant keys', 
    example: 'abc12345'
  })
  @IsOptional()
  @IsString()
  previewSuffix?: string;
}
