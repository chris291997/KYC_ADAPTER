import { ApiProperty } from '@nestjs/swagger';
import { TenantStatus, ApiKeyStatus } from '../../database/entities';

export class TenantResponseDto {
  @ApiProperty({ description: 'Unique tenant identifier' })
  id: string;

  @ApiProperty({ description: 'Tenant organization name' })
  name: string;

  @ApiProperty({ description: 'Primary email address' })
  email: string;

  @ApiProperty({
    description: 'Tenant status',
    enum: ['active', 'inactive', 'suspended', 'pending'],
  })
  status: TenantStatus;

  @ApiProperty({ description: 'Tenant configuration settings' })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Number of API keys', required: false })
  apiKeyCount?: number;

  @ApiProperty({ description: 'Number of accounts', required: false })
  accountCount?: number;

  @ApiProperty({ description: 'Number of inquiries', required: false })
  inquiryCount?: number;
}

export class ApiKeyResponseDto {
  @ApiProperty({ description: 'Unique API key identifier' })
  id: string;

  @ApiProperty({ description: 'Tenant ID this API key belongs to' })
  tenantId: string;

  @ApiProperty({ description: 'Human-readable name for the API key' })
  name: string;

  @ApiProperty({
    description: 'API key status',
    enum: ['active', 'inactive', 'expired', 'revoked'],
  })
  status: ApiKeyStatus;

  @ApiProperty({ description: 'API key expiration date', required: false })
  expiresAt?: Date;

  @ApiProperty({ description: 'Last time this API key was used', required: false })
  lastUsedAt?: Date;

  @ApiProperty({ description: 'API key creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Whether the API key is currently active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether the API key is expired' })
  isExpired: boolean;
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    description: 'The actual API key value (only shown once upon creation)',
    example: 'kya_abc123...',
  })
  apiKey: string;
}
