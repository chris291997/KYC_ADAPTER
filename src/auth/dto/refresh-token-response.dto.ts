import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OwnerType } from './create-api-key.dto';

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'Refresh token ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Owner type', enum: ['tenant'] })
  ownerType: OwnerType;

  @ApiProperty({ description: 'Owner ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  ownerId: string;

  @ApiProperty({ description: 'Refresh token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token: string;

  @ApiProperty({ description: 'Is token revoked', example: false })
  isRevoked: boolean;

  @ApiProperty({ description: 'Expiration date', example: '2025-01-27T10:00:00.000Z' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'User agent', example: 'Mozilla/5.0...' })
  userAgent?: string;

  @ApiPropertyOptional({ description: 'IP address', example: '192.168.1.1' })
  ipAddress?: string;

  @ApiProperty({ description: 'Creation date', example: '2025-01-20T10:00:00.000Z' })
  createdAt: Date;
}
