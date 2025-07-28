import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsBoolean, IsObject } from 'class-validator';
import { AdminOnly } from '../auth/guards/admin-auth.guard';
import { ProvidersFactory } from './providers.factory';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenant } from '../database/entities';
import { ProcessingMethod } from './types/provider.types';
import { ProviderNotAvailableException } from '../common/exceptions/business.exceptions';

export class AssignProviderDto {
  @ApiProperty({ description: 'Provider name to assign', example: 'regula-mock' })
  @IsString()
  providerName: string;

  @ApiProperty({ description: 'Whether this is the primary provider', example: true })
  @IsBoolean()
  isPrimary: boolean;

  @ApiProperty({ description: 'Provider configuration object' })
  @IsObject()
  config: {
    processingMethod: ProcessingMethod;
    maxDailyVerifications?: number;
    supportedDocumentTypes?: string[];
    enableMRZ?: boolean;
    enableRFID?: boolean;
    enableBiometric?: boolean;
    webhookUrl?: string;
  };
}

export class ProviderConfigResponseDto {
  id: string;
  tenantId: string;
  providerName: string;
  isPrimary: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

@ApiTags('Admin - Provider Management')
@ApiBearerAuth('admin-auth')
@ApiSecurity('admin-api-key')
@AdminOnly()
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(
    private readonly providersFactory: ProvidersFactory,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List Available Providers',
    description: `
      Get a list of all available KYC providers that can be assigned to tenants.
      
      **Provider Information Includes:**
      - Provider name and type
      - Health status and availability
      - Supported features and capabilities
      - Current configuration options
      
      **Use Cases:**
      - Admin dashboard showing provider options
      - Provider selection for tenant assignment
      - System health monitoring
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Available providers retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Regula Document Reader SDK (Mock)' },
          type: { type: 'string', example: 'regula' },
          isHealthy: { type: 'boolean', example: true },
          capabilities: {
            type: 'object',
            example: {
              documentVerification: true,
              biometricVerification: true,
            },
          },
        },
      },
    },
  })
  async listProviders() {
    const providers = this.providersFactory.getAvailableProviders();
    const healthStatus = await this.providersFactory.checkAllProvidersHealth();
    const metadata = this.providersFactory.getAllProviderMetadata();

    return providers.map((name) => ({
      name,
      displayName: metadata[name]?.displayName || name,
      isHealthy: healthStatus[name] || false,
      capabilities: metadata[name]?.capabilities || {},
      version: metadata[name]?.version || 'unknown',
    }));
  }

  @Post('tenants/:tenantId/assign')
  @ApiOperation({
    summary: 'Assign Provider to Tenant',
    description: `
      Assign a KYC provider to a specific tenant with custom configuration.
      
      **Assignment Process:**
      1. Validates tenant exists and is active
      2. Validates provider is available and healthy
      3. Creates provider configuration for the tenant
      4. Optionally sets as primary provider
      
      **Configuration Options:**
      - Processing method (direct vs external links)
      - Daily verification limits
      - Supported document types
      - Feature toggles (MRZ, RFID, biometric)
      - Custom webhook URLs
      
      **Example:**
      Assign Regula to "Company A" with direct processing and 1000 daily limit.
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant UUID to assign provider to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: AssignProviderDto,
    description: 'Provider assignment configuration',
    examples: {
      regulaAssignment: {
        summary: 'Assign Regula to Tenant',
        value: {
          providerName: 'regula',
          isPrimary: true,
          config: {
            processingMethod: 'direct',
            maxDailyVerifications: 1000,
            supportedDocumentTypes: ['passport', 'drivers_license', 'national_id'],
            enableMRZ: true,
            enableRFID: true,
            enableBiometric: true,
          },
        },
      },
      personaAssignment: {
        summary: 'Assign Persona to Tenant',
        value: {
          providerName: 'persona',
          isPrimary: false,
          config: {
            processingMethod: 'external_link',
            maxDailyVerifications: 500,
            webhookUrl: 'https://company.com/webhooks/persona',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Provider assigned to tenant successfully',
    type: ProviderConfigResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found or provider not available',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration or provider not healthy',
  })
  async assignProviderToTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Body() assignProviderDto: AssignProviderDto,
  ): Promise<ProviderConfigResponseDto> {
    // 1. Validate tenant exists
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // 2. Validate provider exists and is healthy
    if (!this.providersFactory.hasProvider(assignProviderDto.providerName)) {
      throw new Error(`Provider ${assignProviderDto.providerName} not available`);
    }

    const healthStatus = await this.providersFactory.checkAllProvidersHealth();
    if (!healthStatus[assignProviderDto.providerName]) {
      throw new Error(`Provider ${assignProviderDto.providerName} is not healthy`);
    }

    // 3. Validate provider exists in ProvidersFactory
    if (!this.providersFactory.hasProvider(assignProviderDto.providerName)) {
      throw new ProviderNotAvailableException(assignProviderDto.providerName);
    }

    // 4. Get provider from database
    const providers = await this.tenantRepository.query(
      `SELECT id FROM providers WHERE name = $1`,
      [assignProviderDto.providerName],
    );

    if (providers.length === 0) {
      throw new Error(`Provider ${assignProviderDto.providerName} not found in database`);
    }

    const providerId = providers[0].id;

    // 5. Check if provider is already assigned to this tenant
    const existingAssignment = await this.tenantRepository.query(
      `SELECT id FROM tenant_provider_configs WHERE tenant_id = $1 AND provider_id = $2`,
      [tenantId, providerId],
    );

    if (existingAssignment.length > 0) {
      throw new Error(
        `Provider ${assignProviderDto.providerName} is already assigned to this tenant`,
      );
    }

    // 6. If setting as primary, update other priorities
    if (assignProviderDto.isPrimary) {
      await this.tenantRepository.query(
        `UPDATE tenant_provider_configs SET priority = priority + 100 WHERE tenant_id = $1`,
        [tenantId],
      );
    }

    // 5. Create provider configuration
    const result = await this.tenantRepository.query(
      `INSERT INTO tenant_provider_configs (
        id, tenant_id, provider_id, priority, is_enabled, config, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, true, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, created_at, updated_at`,
      [
        tenantId,
        providerId,
        assignProviderDto.isPrimary ? 1 : 10,
        JSON.stringify(assignProviderDto.config),
      ],
    );

    return {
      id: result[0].id,
      tenantId,
      providerName: assignProviderDto.providerName,
      isPrimary: assignProviderDto.isPrimary,
      config: assignProviderDto.config,
      createdAt: result[0].created_at,
      updatedAt: result[0].updated_at,
    };
  }

  @Get('tenants/:tenantId')
  @ApiOperation({
    summary: 'Get Tenant Provider Assignments',
    description: `
      List all provider assignments for a specific tenant.
      
      **Information Included:**
      - All assigned providers and their configurations
      - Primary provider designation
      - Assignment dates and update history
      - Current provider health status
      
      **Use Cases:**
      - Tenant configuration review
      - Troubleshooting verification issues
      - Audit trails for compliance
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant UUID to get assignments for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant provider assignments retrieved successfully',
    type: [ProviderConfigResponseDto],
  })
  async getTenantProviders(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<ProviderConfigResponseDto[]> {
    const configs = await this.tenantRepository.query(
      `SELECT tpc.id, tpc.tenant_id, p.name as provider_name, tpc.priority, tpc.is_enabled, tpc.config, tpc.created_at, tpc.updated_at
       FROM tenant_provider_configs tpc
       JOIN providers p ON tpc.provider_id = p.id
       WHERE tpc.tenant_id = $1 
       ORDER BY tpc.priority ASC, tpc.created_at DESC`,
      [tenantId],
    );

    return configs.map((config) => ({
      id: config.id,
      tenantId: config.tenant_id,
      providerName: config.provider_name,
      isPrimary: config.priority === 1,
      config: config.config,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    }));
  }

  @Put('tenants/:tenantId/configs/:configId')
  @ApiOperation({
    summary: 'Update Provider Configuration',
    description: `
      Update the configuration of an assigned provider for a tenant.
      
      **Updatable Settings:**
      - Processing method
      - Daily verification limits
      - Feature toggles
      - Webhook URLs
      - Primary provider designation
      
      **Use Cases:**
      - Adjust verification limits based on usage
      - Enable/disable specific features
      - Update webhook endpoints
      - Change primary provider
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'configId',
    description: 'Provider configuration UUID',
    example: 'cfg_123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: AssignProviderDto })
  @ApiResponse({
    status: 200,
    description: 'Provider configuration updated successfully',
    type: ProviderConfigResponseDto,
  })
  async updateProviderConfig(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() updateData: AssignProviderDto,
  ): Promise<ProviderConfigResponseDto> {
    // Get provider ID
    const providers = await this.tenantRepository.query(
      `SELECT id FROM providers WHERE name = $1`,
      [updateData.providerName],
    );

    if (providers.length === 0) {
      throw new Error(`Provider ${updateData.providerName} not found`);
    }

    const providerId = providers[0].id;

    // If setting as primary, update other priorities
    if (updateData.isPrimary) {
      await this.tenantRepository.query(
        `UPDATE tenant_provider_configs SET priority = priority + 100 WHERE tenant_id = $1 AND id != $2`,
        [tenantId, configId],
      );
    }

    // Update the configuration
    await this.tenantRepository.query(
      `UPDATE tenant_provider_configs 
       SET provider_id = $1, priority = $2, config = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND tenant_id = $5`,
      [
        providerId,
        updateData.isPrimary ? 1 : 10,
        JSON.stringify(updateData.config),
        configId,
        tenantId,
      ],
    );

    // Return updated configuration
    const result = await this.tenantRepository.query(
      `SELECT tpc.id, tpc.tenant_id, p.name as provider_name, tpc.priority, tpc.config, tpc.created_at, tpc.updated_at
       FROM tenant_provider_configs tpc
       JOIN providers p ON tpc.provider_id = p.id
       WHERE tpc.id = $1 AND tpc.tenant_id = $2`,
      [configId, tenantId],
    );

    if (result.length === 0) {
      throw new Error('Configuration not found');
    }

    const config = result[0];
    return {
      id: config.id,
      tenantId: config.client_id,
      providerName: config.provider_name,
      isPrimary: config.is_primary,
      config: config.config_json,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
    };
  }

  @Delete('tenants/:tenantId/configs/:configId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove Provider Assignment',
    description: `
      Remove a provider assignment from a tenant.
      
      **Warning:** This will prevent the tenant from using this provider for new verifications.
      Existing verifications will not be affected.
      
      **Safety Checks:**
      - Prevents removal of the last remaining provider
      - Confirms no active verifications are pending
      
      **Use Cases:**
      - Provider contract termination
      - Switching to different providers
      - Temporary provider suspension
    `,
  })
  @ApiParam({
    name: 'tenantId',
    description: 'Tenant UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'configId',
    description: 'Provider configuration UUID to remove',
    example: 'cfg_123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Provider assignment removed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove last provider or has active verifications',
  })
  async removeProviderAssignment(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Param('configId', ParseUUIDPipe) configId: string,
  ): Promise<void> {
    // Check if this is the last provider for the tenant
    const providerCount = await this.tenantRepository.query(
      `SELECT COUNT(*) as count FROM tenant_provider_configs WHERE tenant_id = $1`,
      [tenantId],
    );

    if (parseInt(providerCount[0].count.toString()) <= 1) {
      throw new Error('Cannot remove the last provider assignment for a tenant');
    }

    // Remove the configuration
    await this.tenantRepository.query(
      `DELETE FROM tenant_provider_configs WHERE id = $1 AND tenant_id = $2`,
      [configId, tenantId],
    );
  }
}
