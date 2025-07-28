import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIP,
  IsUrl,
  IsObject,
  ValidateNested,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Geographic location information
 */
export class LocationDto {
  @ApiProperty({
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'US',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    description: 'State or province',
    example: 'California',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    description: 'City name',
    example: 'San Francisco',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 37.7749,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -122.4194,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

/**
 * Device information for verification context
 */
export class DeviceInfoDto {
  @ApiProperty({
    description: 'Device type',
    enum: ['mobile', 'tablet', 'desktop', 'other'],
    example: 'mobile',
    required: false,
  })
  @IsOptional()
  @IsEnum(['mobile', 'tablet', 'desktop', 'other'])
  type?: string;

  @ApiProperty({
    description: 'Operating system',
    example: 'iOS 15.0',
    required: false,
  })
  @IsOptional()
  @IsString()
  os?: string;

  @ApiProperty({
    description: 'Browser name and version',
    example: 'Safari 15.0',
    required: false,
  })
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiProperty({
    description: 'Device model or brand',
    example: 'iPhone 13 Pro',
    required: false,
  })
  @IsOptional()
  @IsString()
  model?: string;
}

/**
 * Comprehensive metadata for verification requests
 */
export class VerificationMetadataDto {
  @ApiProperty({
    description: 'User agent string from the client',
    example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    required: false,
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({
    description: 'Client IP address',
    example: '192.168.1.100',
    required: false,
  })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiProperty({
    description: 'Geographic location information',
    type: LocationDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiProperty({
    description: 'Device information',
    type: DeviceInfoDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;

  @ApiProperty({
    description: 'Session identifier',
    example: 'sess_1640995200_abc123',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'Referrer URL',
    example: 'https://yourapp.com/signup',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  referrer?: string;

  @ApiProperty({
    description: 'Timestamp when verification was initiated on client',
    example: '2024-01-01T12:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  initiatedAt?: string;

  @ApiProperty({
    description: 'Application version that initiated the verification',
    example: '1.2.3',
    required: false,
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiProperty({
    description: 'Additional custom metadata',
    example: { campaignId: 'spring2024', source: 'social_media' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  custom?: Record<string, any>;
}
