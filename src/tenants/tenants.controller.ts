import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
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
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { AdminOnly, RequireRole } from '../auth/guards/admin-auth.guard';
import { GetAdmin } from '../auth/decorators/current-admin.decorator';
import { Admin } from '../database/entities';
import { TenantsService } from './tenants.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  CreateApiKeyDto,
  TenantResponseDto,
  ApiKeyResponseDto,
  ApiKeyCreatedResponseDto,
} from './dto';

@ApiTags('Admin - Tenant Management')
@ApiBearerAuth('admin-auth')
@ApiSecurity('admin-api-key')
@ApiExtraModels(TenantResponseDto, ApiKeyResponseDto, ApiKeyCreatedResponseDto)
@AdminOnly() // All endpoints require admin authentication
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  @RequireRole('super_admin', 'admin')
  @ApiOperation({
    summary: 'Create New Tenant',
    description: `
      Create a new tenant organization with email and configuration settings.
      
      **Required Permissions:** super_admin or admin role
      
      **What This Creates:**
      - New tenant organization record
      - Email-based authentication capability
      - Default settings and status
      - Audit trail of creation
      
      **Next Steps After Creation:**
      1. Create API keys for the tenant
      2. Configure allowed KYC providers
      3. Set up webhooks (optional)
      4. Share credentials with tenant
    `,
  })
  @ApiBody({
    type: CreateTenantDto,
    description: 'Tenant organization details',
    examples: {
      basicTenant: {
        summary: 'Basic Tenant',
        value: {
          name: 'Example Corporation',
          email: 'admin@example.com',
          status: 'active',
        },
      },
      advancedTenant: {
        summary: 'Tenant with Settings',
        value: {
          name: 'Advanced Company Ltd',
          email: 'tech@advanced.com',
          status: 'active',
          settings: {
            maxApiKeys: 10,
            allowedProviders: ['regula', 'persona'],
            rateLimits: {
              perMinute: 50,
              perHour: 500,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
    schema: {
      $ref: getSchemaPath(TenantResponseDto),
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Tenant with this email already exists',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - requires admin or super_admin role',
  })
  async createTenant(
    @Body() createTenantDto: CreateTenantDto,
    @GetAdmin() _admin: Admin,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.createTenant(createTenantDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List All Tenants',
    description: `
      Retrieve a paginated list of all tenant organizations with optional filtering.
      
      **Features:**
      - Pagination support (page/limit)
      - Status filtering (active, inactive, suspended, pending)
      - Search by name or email
      - Sorted by creation date (newest first)
      
      **Use Cases:**
      - Admin dashboard tenant list
      - Tenant analytics and reporting
      - Bulk operations planning
      - System monitoring and audits
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
    description: 'Number of items per page (default: 10, max: 100)',
    example: 10,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    description: 'Filter tenants by status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search tenants by name or email (partial match)',
    example: 'example',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenants retrieved successfully with pagination metadata',
  })
  async getAllTenants(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.tenantsService.getAllTenants(
      page ? parseInt(page.toString(), 10) : 1,
      limit ? parseInt(limit.toString(), 10) : 10,
      status,
      search,
    );
  }

  @Get(':tenantId')
  @ApiOperation({
    summary: 'Get Tenant Details',
    description: `
      Retrieve detailed information about a specific tenant organization.
      
      **Includes:**
      - Basic tenant information (name, email, status)
      - Configuration settings
      - Creation and update timestamps
      - Related statistics (API keys count, etc.)
      
      **Use Cases:**
      - Tenant profile management
      - Configuration review
      - Support and troubleshooting
      - Audit and compliance checks
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Unique tenant identifier (UUID)',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant details retrieved successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found - Invalid tenant ID',
  })
  async getTenantById(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.getTenantById(tenantId);
  }

  @Put(':tenantId')
  @ApiOperation({
    summary: 'Update Tenant Information',
    description: `
      Update tenant organization details and configuration settings.
      
      **Updatable Fields:**
      - Name and contact information
      - Status (active, inactive, suspended, pending)
      - Configuration settings (rate limits, providers, etc.)
      
      **Business Rules:**
      - Email changes require re-verification
      - Status changes affect API access immediately
      - Settings changes apply to new requests
      
      **Audit Trail:**
      - All changes are logged with admin details
      - Previous values are preserved for compliance
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Unique tenant identifier (UUID)',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiBody({
    type: UpdateTenantDto,
    description: 'Fields to update (partial update supported)',
    examples: {
      statusUpdate: {
        summary: 'Update Status',
        value: {
          status: 'suspended',
        },
      },
      settingsUpdate: {
        summary: 'Update Settings',
        value: {
          settings: {
            maxApiKeys: 15,
            allowedProviders: ['regula'],
          },
        },
      },
      fullUpdate: {
        summary: 'Complete Update',
        value: {
          name: 'Updated Company Name',
          status: 'active',
          settings: {
            maxApiKeys: 20,
            allowedProviders: ['regula', 'persona'],
            rateLimits: {
              perMinute: 100,
              perHour: 1000,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists (if email was changed)',
  })
  async updateTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.updateTenant(tenantId, updateTenantDto);
  }

  @Delete(':tenantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete Tenant (Soft Delete)',
    description: `
      Soft delete a tenant organization, preserving data for audit purposes.
      
      **What This Does:**
      - Marks tenant as deleted (soft delete)
      - Immediately revokes all API keys
      - Stops all verification processing
      - Preserves historical data
      
      **Data Retention:**
      - Verification history is preserved
      - API usage logs are maintained
      - Billing records remain accessible
      - Audit trail is complete
      
      **Recovery:**
      - Soft-deleted tenants can be restored
      - Contact support for restoration requests
      - Hard deletion requires separate process
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Unique tenant identifier (UUID)',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiResponse({
    status: 204,
    description: 'Tenant deleted successfully (no content returned)',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async deleteTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string): Promise<void> {
    return this.tenantsService.deleteTenant(tenantId);
  }

  // ================================================
  // USERS (ACCOUNTS) - ADMIN VIEWS
  // ================================================

  @Get(':tenantId/users')
  @ApiOperation({
    summary: 'List Tenant Users',
    description: `
      List user accounts for a tenant (admin-only).
      Includes pagination and basic profile fields.
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Users listed successfully' })
  async listTenantUsers(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tenantsService.listTenantUsers(
      tenantId,
      page ? parseInt(page.toString(), 10) : 1,
      limit ? Math.min(parseInt(limit.toString(), 10), 100) : 20,
    );
  }

  @Get(':tenantId/users/:accountId')
  @ApiOperation({
    summary: 'Get Tenant User Details',
    description: `
      Get detailed information about a user account within a specific tenant.
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant ID',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiParam({
    name: 'accountId',
    description: 'Account ID (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found in tenant' })
  async getTenantUserById(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.tenantsService.getTenantUserById(tenantId, accountId);
  }

  @Get(':tenantId/users/:accountId/overview')
  @ApiOperation({
    summary: 'Get Tenant User Overview',
    description:
      'Returns user details, their verifications, and an aggregated list of all associated image URLs (front/back/selfie).',
  })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID (UUID)' })
  @ApiParam({ name: 'accountId', description: 'Account ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Overview returned successfully' })
  @ApiResponse({ status: 404, description: 'User not found in tenant' })
  async getTenantUserOverview(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    return this.tenantsService.getTenantUserOverview(tenantId, accountId);
  }

  // ================================================
  // API KEY MANAGEMENT ENDPOINTS
  // ================================================

  @Post(':tenantId/api-keys')
  @ApiOperation({
    summary: 'Create Tenant API Key',
    description: `
      Generate a new API key for tenant authentication and API access.
      
      **Generated Key Format:** kya_[64 hex characters]
      
      **Key Features:**
      - Cryptographically secure generation
      - SHA-256 hashed storage (key visible only once)
      - Optional expiration dates
      - Usage tracking and analytics
      
      **Security Notes:**
      - Store the returned API key securely
      - Keys are shown only once during creation
      - Lost keys cannot be recovered, only replaced
      - Regular rotation is recommended
      
      **Rate Limits:**
      - Tenant settings may limit total key count
      - Admin controls maximum keys per tenant
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Unique tenant identifier (UUID)',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiBody({
    type: CreateApiKeyDto,
    description: 'API key configuration',
    examples: {
      basicKey: {
        summary: 'Basic API Key',
        value: {
          name: 'Production API Key',
        },
      },
      expiringKey: {
        summary: 'Key with Expiration',
        value: {
          name: 'Temporary Development Key',
          expiresAt: '2025-12-31T23:59:59.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully - Key visible only in this response',
    type: ApiKeyCreatedResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot create API keys for inactive tenants or quota exceeded',
  })
  async createApiKey(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    return this.tenantsService.createApiKey(tenantId, createApiKeyDto);
  }

  @Get(':tenantId/api-keys')
  @ApiOperation({
    summary: 'List Tenant API Keys',
    description: `
      Retrieve all API keys for a specific tenant with usage statistics.
      
      **Information Included:**
      - Key metadata (name, status, creation date)
      - Last usage timestamp
      - Expiration status
      - Usage statistics (request counts, etc.)
      
      **Security Note:**
      - Actual key values are never returned after creation
      - Only key hashes and metadata are shown
      - Use this for key management and monitoring
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Unique tenant identifier (UUID)',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiResponse({
    status: 200,
    description: 'API keys retrieved successfully',
    type: [ApiKeyResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenantApiKeys(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<ApiKeyResponseDto[]> {
    return this.tenantsService.getTenantApiKeys(tenantId);
  }

  @Delete(':tenantId/api-keys/:apiKeyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revoke API Key',
    description: `
      Immediately revoke an API key, preventing all future usage.
      
      **Immediate Effects:**
      - Key becomes invalid for all requests
      - Ongoing requests may still complete
      - Key status changes to 'revoked'
      - Cannot be undone (must create new key)
      
      **Use Cases:**
      - Security incident response
      - Key rotation procedures
      - Access management changes
      - Tenant offboarding
      
      **Recommendations:**
      - Create replacement key before revoking (if needed)
      - Notify tenant of the revocation
      - Monitor for failed authentication attempts
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Unique tenant identifier (UUID)',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiParam({
    name: 'apiKeyId',
    description: 'Unique API key identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 204,
    description: 'API key revoked successfully (no content returned)',
  })
  @ApiResponse({
    status: 404,
    description: 'API key not found or does not belong to tenant',
  })
  async revokeApiKey(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('apiKeyId', ParseUUIDPipe) apiKeyId: string,
  ): Promise<void> {
    return this.tenantsService.revokeApiKey(tenantId, apiKeyId);
  }

  @Put(':tenantId/api-keys/:apiKeyId')
  @ApiOperation({
    summary: 'Update API Key (name, expiration, status)',
    description: `
      Update an API key's human-readable name, expiration date, or status.
      
      - To remove expiration, set expiresAt to null
      - Key value cannot be changed (never returned after creation)
    `,
  })
  @ApiParam({ name: 'tenantId', description: 'Unique tenant identifier (UUID)' })
  @ApiParam({ name: 'apiKeyId', description: 'Unique API key identifier (UUID)' })
  @ApiBody({
    description: 'Update API key payload',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        expiresAt: { type: 'string', nullable: true, example: '2026-01-01T00:00:00.000Z' },
        status: { type: 'string', enum: ['active', 'inactive', 'expired', 'revoked'] },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found or does not belong to tenant' })
  async updateApiKey(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('apiKeyId', ParseUUIDPipe) apiKeyId: string,
    @Body() body: any,
  ) {
    const { name, expiresAt, status } = body || {};
    return this.tenantsService.updateApiKey(tenantId, apiKeyId, { name, expiresAt, status });
  }

  @Post(':tenantId/api-keys/:apiKeyId/reveal')
  @ApiOperation({
    summary: 'Reveal API Key (admin re-auth recommended)',
    description: 'Returns the plaintext API key if encryption is configured.',
  })
  @ApiParam({ name: 'tenantId', description: 'Unique tenant identifier (UUID)' })
  @ApiParam({ name: 'apiKeyId', description: 'API key identifier (UUID)' })
  @ApiResponse({ status: 200, description: 'Plaintext key returned' })
  async revealApiKey(
    @Param('tenantId', ParseUUIDPipe) _tenantId: string,
    @Param('apiKeyId', ParseUUIDPipe) apiKeyId: string,
  ) {
    // Note: consider adding admin re-auth/OTP and audit logging here
    const key = await this.authService.revealApiKey(apiKeyId);
    return { apiKey: key };
  }

  @Post(':tenantId/api-keys/:apiKeyId/copy')
  @ApiOperation({
    summary: 'Copy API Key (reveal existing key)',
  })
  @ApiParam({ name: 'tenantId', description: 'Unique tenant identifier (UUID)' })
  @ApiParam({ name: 'apiKeyId', description: 'API key identifier (UUID) to copy from' })
  @ApiResponse({ status: 200, description: 'Existing API key returned (if encryption enabled)' })
  async copyApiKey(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('apiKeyId', ParseUUIDPipe) apiKeyId: string,
  ) {
    // Alias to reveal; does NOT create a new key
    const apiKey = await this.authService.revealApiKey(apiKeyId);
    return { apiKey };
  }

  @Get(':tenantId/stats')
  @ApiOperation({
    summary: 'Get Tenant Statistics',
    description: `
      Retrieve comprehensive analytics and usage statistics for a tenant.
      
      **Metrics Included:**
      - API key counts (total, active, expired)
      - Verification request statistics
      - Usage trends and patterns
      - Performance metrics
      
      **Use Cases:**
      - Tenant health monitoring
      - Usage analytics and reporting
      - Capacity planning
      - Billing and quota management
      - Support and troubleshooting
      
      **Data Freshness:**
      - Real-time for key counts
      - Near real-time for usage metrics
      - Cached for performance optimization
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Unique tenant identifier (UUID)',
    example: '77815e4c-a3e8-41fb-90c5-ed3aeb79f859',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant statistics retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found',
  })
  async getTenantStats(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.tenantsService.getTenantStats(tenantId);
  }
}
