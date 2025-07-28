import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
  ApiConsumes,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { Tenant } from '../database/entities';
import { VerificationsService, CreateVerificationRequest } from './verifications.service';
import {
  CreateVerificationDto,
  VerificationResponseDto,
  VerificationStatus,
  VerificationType,
} from './dto';
import { FileProcessingService } from '../common/services/file-processing.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('Tenant - Identity Verification')
@ApiBearerAuth('tenant-auth')
@ApiSecurity('tenant-api-key')
@UseGuards(ApiKeyGuard)
@Controller('verifications')
export class VerificationsController {
  constructor(
    private readonly verificationsService: VerificationsService,
    private readonly fileProcessingService: FileProcessingService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create Identity Verification (JSON)',
    description: `
      Create identity verification with base64-encoded images in JSON format.
      
      **This is the recommended method for most integrations.**
      
      **Supported Verification Types:**
      - \`document\`: Document authenticity and data extraction
      - \`biometric\`: Liveness detection and face matching  
      - \`comprehensive\`: Complete document + biometric verification
      
      **Document Processing:**
      - Base64-encoded images with automatic format detection
      - Support for 20+ document types (passport, license, ID card, etc.)
      - Real-time OCR and data extraction
      - Advanced security feature detection
      
      **Production Features:**
      - Country-specific document validation
      - Configurable confidence thresholds
      - Comprehensive metadata collection
      - Webhook notifications
      - Geographic and device context
      
      **Compliance Ready:**
      - GDPR, CCPA compliant data handling
      - Audit trails and retention policies
      - Risk scoring and fraud detection
      - Regulatory reporting support
    `,
  })
  @ApiBody({
    type: CreateVerificationDto,
    description: 'Comprehensive verification request with production validation',
    examples: {
      basicDocumentVerification: {
        summary: 'Basic Document Verification',
        description: 'Simple document verification with minimal required fields',
        value: {
          verificationType: 'document',
          documentImages: {
            front: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
            back: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
          },
          callbackUrl: 'https://yourapp.com/webhooks/verification',
        },
      },
      comprehensiveVerification: {
        summary: 'Production-Ready Comprehensive Verification',
        description: 'Full verification with metadata, constraints, and compliance features',
        value: {
          verificationType: 'comprehensive',
          accountId: '550e8400-e29b-41d4-a716-446655440000',
          documentImages: {
            front: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
            back: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
            selfie: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
          },
          allowedDocumentTypes: ['passport', 'drivers_license'],
          expectedCountries: ['US', 'CA'],
          callbackUrl: 'https://yourapp.com/webhooks/verification',
          expiresIn: 3600,
          requireLiveness: true,
          requireAddressVerification: false,
          minimumConfidence: 85,
          metadata: {
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
            ipAddress: '192.168.1.100',
            location: {
              country: 'US',
              state: 'California',
              city: 'San Francisco',
            },
            device: {
              type: 'mobile',
              os: 'iOS 15.0',
              browser: 'Safari 15.0',
              model: 'iPhone 13 Pro',
            },
            sessionId: 'sess_1640995200_abc123',
            referrer: 'https://yourapp.com/signup',
            appVersion: '1.2.3',
          },
          customProperties: {
            kycLevel: 'enhanced',
            riskProfile: 'standard',
            complianceRegion: 'EU',
            campaignId: 'spring2024',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Verification request created successfully',
    type: VerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data - validation errors',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Validation Error' },
        message: { type: 'string', example: 'Input validation failed' },
        details: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Front image must be a valid base64-encoded image with data URL format',
            'Account ID must be a valid UUID v4',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required - invalid or missing API key',
  })
  @ApiResponse({
    status: 403,
    description: 'Tenant not active or insufficient permissions',
  })
  @ApiResponse({
    status: 422,
    description: 'Business logic error - no provider configured or quota exceeded',
  })
  async createVerification(
    @Body() createVerificationDto: CreateVerificationDto,
    @CurrentTenant() tenant: Tenant,
  ): Promise<VerificationResponseDto> {
    const request: CreateVerificationRequest = {
      tenantId: tenant.id,
      accountId: createVerificationDto.accountId,
      verificationType: createVerificationDto.verificationType as any,
      documentImages: createVerificationDto.documentImages,
      callbackUrl: createVerificationDto.callbackUrl,
      metadata: {
        ...createVerificationDto.metadata,
        ...createVerificationDto.customProperties,
        allowedDocumentTypes: createVerificationDto.allowedDocumentTypes,
        expectedCountries: createVerificationDto.expectedCountries,
        requireLiveness: createVerificationDto.requireLiveness,
        requireAddressVerification: createVerificationDto.requireAddressVerification,
        minimumConfidence: createVerificationDto.minimumConfidence,
        processingMethod: createVerificationDto.processingMethod,
        expiresIn: createVerificationDto.expiresIn,
      },
    };

    return this.verificationsService.createVerification(request);
  }

  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'front', maxCount: 1 },
      { name: 'back', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
      { name: 'additional', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create Identity Verification (File Upload)',
    description: `
      Create identity verification by uploading actual image files.
      
      **Alternative to JSON method - use for:**
      - HTML forms with file inputs
      - Direct file uploads from mobile apps
      - When you have raw image files instead of base64
      
      **Supported Files:**
      - JPEG, PNG, WebP images
      - Maximum 10MB per file
      - Automatic optimization and conversion
      
      **Form Fields:**
      - \`front\`: Front side of document (required)
      - \`back\`: Back side of document (optional)
      - \`selfie\`: Selfie photo (optional)
      - \`verificationType\`: Type of verification
      - \`callbackUrl\`: Webhook URL
      - Other metadata as form fields
    `,
  })
  @ApiBody({
    description: 'Multipart form data with files and verification details',
    schema: {
      type: 'object',
      properties: {
        front: {
          type: 'string',
          format: 'binary',
          description: 'Front side of document image',
        },
        back: {
          type: 'string',
          format: 'binary',
          description: 'Back side of document image',
        },
        selfie: {
          type: 'string',
          format: 'binary',
          description: 'Selfie photo for biometric verification',
        },
        verificationType: {
          type: 'string',
          enum: ['document', 'biometric', 'comprehensive'],
          description: 'Type of verification to perform',
        },
        callbackUrl: {
          type: 'string',
          description: 'Webhook URL for results',
        },
        metadata: {
          type: 'string',
          description:
            'JSON string with additional metadata (optional) - use {} for empty or omit entirely',
          example: '{"deviceType": "mobile", "source": "app"}',
        },
      },
      required: ['front', 'verificationType'],
    },
  })
  async createVerificationWithUpload(
    @UploadedFiles() uploadedFiles: { [fieldname: string]: Express.Multer.File[] },
    @Body() uploadDto: any,
    @CurrentTenant() tenant: Tenant,
  ): Promise<VerificationResponseDto> {
    // Validate that we have files
    if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
      throw new BadRequestException('At least one file must be uploaded');
    }

    // Files are already grouped by fieldname from FileFieldsInterceptor
    const filesByField = uploadedFiles;

    let processedFiles: { [fieldname: string]: any } = {};

    try {
      // Process uploaded files
      const processed = await this.fileProcessingService.processVerificationFiles(filesByField, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 85,
        convertToJpeg: true,
      });

      processedFiles = processed;

      // Convert processed files to document images format
      const documentImages: { [key: string]: string } = {};
      Object.entries(processed).forEach(([fieldName, file]) => {
        documentImages[fieldName] = file.base64;
      });

      // Parse metadata if provided
      let parsedMetadata: Record<string, any> = {};
      if (
        uploadDto.metadata &&
        uploadDto.metadata.trim() !== '' &&
        uploadDto.metadata !== 'string'
      ) {
        try {
          parsedMetadata = JSON.parse(uploadDto.metadata);
        } catch (error) {
          // If metadata is not valid JSON, just log a warning and continue
          console.warn('Invalid metadata JSON provided, using empty metadata:', uploadDto.metadata);
          parsedMetadata = { invalidMetadata: uploadDto.metadata };
        }
      }

      // Create verification request
      const verificationRequest: CreateVerificationRequest = {
        tenantId: tenant.id,
        accountId: uploadDto.accountId,
        verificationType: uploadDto.verificationType,
        documentImages,
        callbackUrl: uploadDto.callbackUrl,
        metadata: {
          ...parsedMetadata,
          uploadMethod: 'multipart',
          uploadedFiles: Object.entries(processed).map(([fieldName, file]) => ({
            fieldName,
            originalName: file.originalName,
            size: file.size,
            width: file.width,
            height: file.height,
            mimeType: file.mimeType,
          })),
        },
      };

      // Process verification
      const result = await this.verificationsService.createVerification(verificationRequest);

      // Cleanup temporary files
      await this.fileProcessingService.cleanupFiles(Object.values(processed));

      return result;
    } catch (error) {
      // Cleanup on error
      if (Object.keys(processedFiles).length > 0) {
        await this.fileProcessingService.cleanupFiles(Object.values(processedFiles));
      }
      throw error;
    }
  }

  /**
   * Get verified users (accounts) for the tenant
   */
  @Get('users')
  @ApiOperation({
    summary: 'Get Verified Users',
    description: `
      Retrieve all verified users (accounts) for the authenticated tenant.
      
      **What This Returns:**
      - Users who have completed successful verifications
      - Extracted personal information from documents
      - Account creation and update timestamps
      - Associated verification count
      
      **Use Cases:**
      - User management dashboard
      - Customer database
      - Re-verification tracking
      - User analytics
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of users per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Verified users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: {
                type: 'object',
                properties: {
                  first: { type: 'string' },
                  last: { type: 'string' },
                },
              },
              birthdate: { type: 'string', format: 'date' },
              referenceId: { type: 'string' },
              verificationCount: { type: 'number' },
              lastVerified: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getVerifiedUsers(
    @CurrentTenant() tenant: Tenant,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.verificationsService.getVerifiedUsers(
      tenant.id,
      page ? parseInt(page.toString(), 10) : 1,
      limit ? Math.min(parseInt(limit.toString(), 10), 100) : 20,
    );
  }

  @Get(':verificationId')
  @ApiOperation({
    summary: 'Get Verification Status',
    description: `
      Retrieve the current status and results of a verification request.
      
      **Real-time Updates:**
      - For pending verifications, checks with provider for latest status
      - Database is updated if provider status has changed
      
      **Status Values:**
      - \`pending\`: Verification submitted, awaiting processing
      - \`in_progress\`: Currently being processed
      - \`completed\`: Verification completed with results
      - \`failed\`: Verification failed (error details included)
      - \`expired\`: Verification link expired (external providers)
      - \`cancelled\`: Verification was cancelled
      
      **Results Structure:**
      - \`overall\`: Overall verification result and confidence
      - \`document\`: Document-specific results (if applicable)
      - \`biometric\`: Biometric-specific results (if applicable)
    `,
  })
  @ApiParam({
    name: 'verificationId',
    description: 'Unique verification identifier',
    example: 'ver_1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification details retrieved successfully',
    type: VerificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Verification not found',
  })
  async getVerification(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @CurrentTenant() tenant: Tenant,
  ): Promise<VerificationResponseDto> {
    return this.verificationsService.getVerification(verificationId, tenant.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List Verifications',
    description: `
      List all verification requests for your tenant with filtering and pagination.
      
      **Filtering Options:**
      - Filter by verification status
      - Filter by verification type
      - Filter by specific account ID
      
      **Pagination:**
      - Default: 20 verifications per page
      - Maximum: 100 verifications per page
      - Results ordered by creation date (newest first)
      
      **Use Cases:**
      - Dashboard showing recent verifications
      - Audit trails and compliance reporting
      - User-specific verification history
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: VerificationStatus,
    description: 'Filter by verification status',
  })
  @ApiQuery({
    name: 'verificationType',
    required: false,
    enum: VerificationType,
    description: 'Filter by verification type',
  })
  @ApiQuery({
    name: 'accountId',
    required: false,
    type: String,
    description: 'Filter by specific account ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Verifications list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        verifications: {
          type: 'array',
          items: { $ref: '#/components/schemas/VerificationResponseDto' },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        totalPages: { type: 'number', example: 8 },
      },
    },
  })
  async listVerifications(
    @CurrentTenant() tenant: Tenant,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: VerificationStatus,
    @Query('verificationType') verificationType?: VerificationType,
    @Query('accountId') accountId?: string,
  ): Promise<{
    verifications: VerificationResponseDto[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.verificationsService.listVerifications(tenant.id, {
      page: page ? parseInt(page.toString()) : undefined,
      limit: limit ? parseInt(limit.toString()) : undefined,
      status,
      verificationType,
      accountId,
    });
  }

  @Delete(':verificationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel Verification',
    description: `
      Cancel a pending or in-progress verification request.
      
      **Cancellation Rules:**
      - Only pending or in-progress verifications can be cancelled
      - Completed, failed, or expired verifications cannot be cancelled
      - Provider will be notified to stop processing
      
      **What Happens:**
      1. Request sent to provider to cancel processing
      2. Verification status updated to 'cancelled'
      3. No further processing occurs
      4. Partial results (if any) are preserved
      
      **Use Cases:**
      - User abandons verification process
      - Incorrect documents were uploaded
      - Duplicate verification request
    `,
  })
  @ApiParam({
    name: 'verificationId',
    description: 'Unique verification identifier',
    example: 'ver_1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: 'Verification cancelled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Verification cannot be cancelled (wrong status)',
  })
  @ApiResponse({
    status: 404,
    description: 'Verification not found',
  })
  async cancelVerification(
    @Param('verificationId', ParseUUIDPipe) verificationId: string,
    @CurrentTenant() tenant: Tenant,
  ): Promise<void> {
    await this.verificationsService.cancelVerification(verificationId, tenant.id);
  }
}
