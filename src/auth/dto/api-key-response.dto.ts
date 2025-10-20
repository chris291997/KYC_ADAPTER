import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OwnerType } from './create-api-key.dto';

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'API Key ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Owner type', enum: ['tenant'] })
  ownerType: OwnerType;

  @ApiProperty({ description: 'Owner ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  ownerId: string;

  @ApiProperty({ description: 'API Key name', example: 'My API Key' })
  name: string;

  @ApiProperty({ description: 'API Key status', example: 'active' })
  status: string;

  @ApiPropertyOptional({ description: 'Preview suffix (tenant keys only)', example: 'abc12345' })
  previewSuffix?: string;

  @ApiPropertyOptional({ description: 'Expiration date', example: '2025-12-31T23:59:59.000Z' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Last used date', example: '2025-01-20T10:30:00.000Z' })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'Creation date', example: '2025-01-20T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date', example: '2025-01-20T10:00:00.000Z' })
  updatedAt: Date;

  // Only included in creation response
  @ApiPropertyOptional({ description: 'Full API key (only shown once on creation)' })
  key?: string;
}
