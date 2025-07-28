import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches, IsNotEmpty } from 'class-validator';

/**
 * Document images for verification processing
 * Supports base64-encoded images with proper format validation
 */
export class DocumentImagesDto {
  @ApiProperty({
    description: 'Front side of the document (base64-encoded image)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,/, {
    message: 'Front image must be a valid base64-encoded image with data URL format',
  })
  front: string;

  @ApiProperty({
    description: 'Back side of the document (base64-encoded image)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,/, {
    message: 'Back image must be a valid base64-encoded image with data URL format',
  })
  back?: string;

  @ApiProperty({
    description: 'Selfie photo for biometric verification (base64-encoded image)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,/, {
    message: 'Selfie image must be a valid base64-encoded image with data URL format',
  })
  selfie?: string;

  @ApiProperty({
    description: 'Additional document image (e.g., signature page)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^data:image\/(jpeg|jpg|png|webp);base64,/, {
    message: 'Additional image must be a valid base64-encoded image with data URL format',
  })
  additional?: string;
}
