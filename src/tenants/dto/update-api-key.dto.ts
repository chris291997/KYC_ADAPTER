import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class UpdateApiKeyDto {
  @ApiProperty({ description: 'New human-readable name for the API key', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'New expiration date (ISO 8601). Set to null to remove expiration',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Optionally change status',
    required: false,
    enum: ['active', 'inactive', 'expired', 'revoked'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'expired', 'revoked'])
  status?: 'active' | 'inactive' | 'expired' | 'revoked';
}
