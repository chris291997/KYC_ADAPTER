import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantApiKey, ApiKeyStatus } from '../database/entities';
import { AuthService } from '../auth/auth.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  CreateApiKeyDto,
  TenantResponseDto,
  ApiKeyResponseDto,
  ApiKeyCreatedResponseDto,
} from './dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantApiKey)
    private readonly apiKeyRepository: Repository<TenantApiKey>,
    private readonly authService: AuthService,
  ) {}

  /**
   * Create a new tenant
   */
  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    // Check if email already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: { email: createTenantDto.email },
    });

    if (existingTenant) {
      throw new ConflictException('A tenant with this email already exists');
    }

    // Create tenant
    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      status: createTenantDto.status || 'active',
      settings: createTenantDto.settings || {},
    });

    const savedTenant = await this.tenantRepository.save(tenant);

    this.logger.log(`Created new tenant: ${savedTenant.name} (${savedTenant.id})`);

    return this.mapToTenantResponse(savedTenant);
  }

  /**
   * Get all tenants with optional filtering
   */
  async getAllTenants(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ): Promise<{ tenants: TenantResponseDto[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');

    // Add status filter
    if (status) {
      queryBuilder.where('tenant.status = :status', { status });
    }

    // Add search filter
    if (search) {
      queryBuilder.andWhere('(tenant.name ILIKE :search OR tenant.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Add pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Add ordering
    queryBuilder.orderBy('tenant.createdAt', 'DESC');

    // Execute query
    const [tenants, total] = await queryBuilder.getManyAndCount();

    // Map to response DTOs
    const tenantResponses = await Promise.all(
      tenants.map((tenant) => this.mapToTenantResponse(tenant, true)),
    );

    return {
      tenants: tenantResponses,
      total,
      page,
      limit,
    };
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mapToTenantResponse(tenant, true);
  }

  /**
   * Update tenant
   */
  async updateTenant(
    tenantId: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check email uniqueness if email is being updated
    if (updateTenantDto.email && updateTenantDto.email !== tenant.email) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { email: updateTenantDto.email },
      });

      if (existingTenant) {
        throw new ConflictException('A tenant with this email already exists');
      }
    }

    // Update tenant
    Object.assign(tenant, updateTenantDto);
    const updatedTenant = await this.tenantRepository.save(tenant);

    this.logger.log(`Updated tenant: ${updatedTenant.name} (${updatedTenant.id})`);

    return this.mapToTenantResponse(updatedTenant, true);
  }

  /**
   * Delete tenant (soft delete by setting status to inactive)
   */
  async deleteTenant(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Soft delete by setting status to inactive
    tenant.status = 'inactive';
    await this.tenantRepository.save(tenant);

    // Revoke all API keys
    await this.apiKeyRepository.update({ tenantId }, { status: 'revoked' as ApiKeyStatus });

    this.logger.log(`Deleted tenant: ${tenant.name} (${tenant.id})`);
  }

  /**
   * Create API key for tenant
   */
  async createApiKey(
    tenantId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.status !== 'active') {
      throw new BadRequestException('Cannot create API keys for inactive tenants');
    }

    // Parse expiration date if provided
    const expiresAt = createApiKeyDto.expiresAt ? new Date(createApiKeyDto.expiresAt) : undefined;

    // Generate API key using AuthService
    const { apiKey, entity } = await this.authService.generateApiKey(
      tenantId,
      createApiKeyDto.name,
      expiresAt,
    );

    this.logger.log(`Created API key '${createApiKeyDto.name}' for tenant ${tenant.name}`);

    return {
      ...this.mapToApiKeyResponse(entity),
      apiKey, // Include the actual API key value
    };
  }

  /**
   * Get all API keys for a tenant
   */
  async getTenantApiKeys(tenantId: string): Promise<ApiKeyResponseDto[]> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const apiKeys = await this.authService.getTenantApiKeys(tenantId);

    return apiKeys.map((apiKey) => this.mapToApiKeyResponse(apiKey));
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(tenantId: string, apiKeyId: string): Promise<void> {
    // Verify the API key belongs to the tenant
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, tenantId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.authService.revokeApiKey(apiKeyId);

    this.logger.log(`Revoked API key '${apiKey.name}' for tenant ${tenantId}`);
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(tenantId: string): Promise<{
    apiKeyCount: number;
    activeApiKeyCount: number;
    accountCount: number;
    inquiryCount: number;
    totalVerifications: number;
  }> {
    // Verify tenant exists
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get counts from related tables
    const [apiKeyCount, activeApiKeyCount] = await Promise.all([
      this.apiKeyRepository.count({ where: { tenantId } }),
      this.apiKeyRepository.count({ where: { tenantId, status: 'active' } }),
    ]);

    // TODO: Add account and inquiry counts when those services are built
    return {
      apiKeyCount,
      activeApiKeyCount,
      accountCount: 0, // TODO: Implement
      inquiryCount: 0, // TODO: Implement
      totalVerifications: 0, // TODO: Implement
    };
  }

  /**
   * Map tenant entity to response DTO
   */
  private async mapToTenantResponse(
    tenant: Tenant,
    includeCounts = false,
  ): Promise<TenantResponseDto> {
    const response: TenantResponseDto = {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      status: tenant.status,
      settings: tenant.settings,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };

    if (includeCounts) {
      const stats = await this.getTenantStats(tenant.id);
      response.apiKeyCount = stats.apiKeyCount;
      response.accountCount = stats.accountCount;
      response.inquiryCount = stats.inquiryCount;
    }

    return response;
  }

  /**
   * Map API key entity to response DTO
   */
  private mapToApiKeyResponse(apiKey: TenantApiKey): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      tenantId: apiKey.tenantId,
      name: apiKey.name,
      status: apiKey.status,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      isActive: apiKey.isActive(),
      isExpired: apiKey.isExpired(),
    };
  }
}
