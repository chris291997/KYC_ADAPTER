import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Tenant } from '../../database/entities';

export class TenantLoginDto {
  @ApiProperty({ description: 'Tenant email address', example: 'tenant@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Tenant password', example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}

export class TenantRefreshTokenDto {
  @ApiProperty({ description: 'Refresh token for generating new access token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class TenantLoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token for token renewal' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Authenticated tenant information' })
  tenant: Partial<Tenant>;
}

export class TenantRefreshResponseDto {
  @ApiProperty({ description: 'New JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'New refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: string;
}

export class TenantLogoutResponseDto {
  @ApiProperty({ description: 'Logout confirmation message' })
  message: string;

  @ApiProperty({ description: 'Response timestamp', required: false })
  timestamp?: string;
}
