import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantApiKey, ApiKeyStatus, Account, Verification } from '../database/entities';
import { ImgbbService } from '../common/services/imgbb.service';
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
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private readonly authService: AuthService,
    private readonly imgbbService: ImgbbService,
  ) {}

  /**
   * Create a new tenant
   */
  async createTenant(
    createTenantDto: CreateTenantDto,
  ): Promise<TenantResponseDto & { temporaryPassword?: string }> {
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

    // If no password provided, set temporary password to "<tenant name>123"
    let temporaryPassword: string | undefined;
    if (!tenant.password) {
      temporaryPassword = this.buildTenantNamePassword(createTenantDto.name);
      await tenant.setPassword(temporaryPassword);
    }

    const savedTenant = await this.tenantRepository.save(tenant);

    // Ensure a default virtual album prefix exists in settings
    try {
      const currentSettings = (savedTenant.settings || {}) as Record<string, any>;
      if (!currentSettings.imgbbPrefix) {
        currentSettings.imgbbPrefix = `tenant_${savedTenant.id}`;
        savedTenant.settings = currentSettings as any;
        await this.tenantRepository.save(savedTenant);
      }
    } catch (e) {
      this.logger.warn(
        `Could not set default imgbbPrefix for tenant ${savedTenant.id}: ${(e as any)?.message}`,
      );
    }

    this.logger.log(`Created new tenant: ${savedTenant.name} (${savedTenant.id})`);

    const response = await this.mapToTenantResponse(savedTenant);
    // Return temp password once if it was generated
    console.log('temporaryPassword', temporaryPassword);
    return temporaryPassword ? { ...response, temporaryPassword } : response;
  }

  private buildTenantNamePassword(tenantName: string): string {
    // Password format: "<tenant name>123". Ensure minimum length of 8 by padding if necessary.
    const base = `${tenantName}123`;
    if (base.length >= 8) return base;
    return (base + '12345678').slice(0, 8);
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
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Try hard delete with cascades first
    try {
      await this.tenantRepository.delete(tenantId);
      this.logger.log(`Hard-deleted tenant ${tenantId}`);
      return;
    } catch (error) {
      this.logger.warn(
        `Hard delete failed for tenant ${tenantId}, falling back to soft delete: ${(error as any)?.message}`,
      );
    }

    // Fallback: Soft delete by setting status to inactive and revoking keys
    tenant.status = 'inactive';
    await this.tenantRepository.save(tenant);
    await this.apiKeyRepository.update({ tenantId }, { status: 'revoked' as ApiKeyStatus });
    this.logger.log(`Soft-deleted tenant: ${tenant.name} (${tenant.id})`);
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

    // Store preview suffix (last 4-8 chars) for consistent masked display
    try {
      const suffix = apiKey.slice(-4);
      await this.apiKeyRepository.update({ id: entity.id }, { previewSuffix: suffix } as any);
    } catch {}

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
    return apiKeys.map((apiKey) => {
      const mapped = this.mapToApiKeyResponse(apiKey);
      (mapped as any).maskedKey = this.buildMaskedKeyPreview(apiKey);
      return mapped;
    });
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
   * Update API key metadata (name, expiration, status)
   */
  async updateApiKey(
    tenantId: string,
    apiKeyId: string,
    updates: { name?: string; expiresAt?: string | null; status?: ApiKeyStatus },
  ): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id: apiKeyId, tenantId } });
    if (!apiKey) {
      throw new NotFoundException('API key not found or does not belong to tenant');
    }

    if (typeof updates.name === 'string') {
      apiKey.name = updates.name;
    }
    if (updates.expiresAt === null) {
      apiKey.expiresAt = null;
    } else if (typeof updates.expiresAt === 'string') {
      apiKey.expiresAt = new Date(updates.expiresAt);
    }
    if (updates.status) {
      apiKey.status = updates.status;
    }

    const saved = await this.apiKeyRepository.save(apiKey);
    return this.mapToApiKeyResponse(saved);
  }

  // Rotation removed by product decision
  /**
   * Copy API key: creates an additional key (returns raw apiKey once). Old key remains active.
   */
  async copyApiKey(
    tenantId: string,
    apiKeyId: string,
    options: { name?: string; expiresAt?: string } = {},
  ): Promise<ApiKeyCreatedResponseDto> {
    const existing = await this.apiKeyRepository.findOne({ where: { id: apiKeyId, tenantId } });
    if (!existing) {
      throw new NotFoundException('API key not found or does not belong to tenant');
    }

    const newName = options.name ?? `${existing.name} (copy)`;
    const newExpiresAt = options.expiresAt ? new Date(options.expiresAt) : existing.expiresAt;

    const { apiKey, entity } = await this.authService.generateApiKey(
      tenantId,
      newName,
      newExpiresAt,
    );

    // Store preview suffix for maskedKey
    try {
      const suffix = apiKey.slice(-4);
      await this.apiKeyRepository.update({ id: entity.id }, { previewSuffix: suffix } as any);
    } catch {}

    return {
      ...this.mapToApiKeyResponse(entity),
      apiKey,
    };
  }

  private buildMaskedKeyPreview(apiKey: TenantApiKey): string {
    const suffix = apiKey.previewSuffix || '0000';
    return `kya_****${suffix}`;
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
    lastVerificationAt: Date | null;
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

    // Counts
    const accountCount = await this.accountRepository.count({ where: { tenantId } });

    // Verification stats (completed only)
    const verificationsCountResult = await this.tenantRepository.query(
      `SELECT COUNT(*)::int AS total, MAX(created_at) AS last_created
       FROM verifications
       WHERE tenant_id = $1`,
      [tenantId],
    );
    const totalVerifications = verificationsCountResult?.[0]?.total || 0;
    const lastVerificationAt = verificationsCountResult?.[0]?.last_created || null;

    return {
      apiKeyCount,
      activeApiKeyCount,
      accountCount,
      inquiryCount: 0, // TODO: Implement
      totalVerifications,
      lastVerificationAt,
    };
  }

  /**
   * Admin: List users (accounts) for a tenant
   */
  async listTenantUsers(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: Array<{
      id: string;
      name?: Account['name'];
      email?: string;
      phone?: string;
      birthdate?: Date;
      referenceId?: string;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [accounts, total] = await this.accountRepository.findAndCount({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      users: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        birthdate: a.birthdate,
        referenceId: a.referenceId,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Get user (account) details within a tenant
   */
  async getTenantUserById(
    tenantId: string,
    accountId: string,
  ): Promise<{
    id: string;
    name?: Account['name'];
    email?: string;
    phone?: string;
    birthdate?: Date;
    address?: Account['address'];
    referenceId?: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const account = await this.accountRepository.findOne({ where: { id: accountId, tenantId } });
    if (!account) {
      throw new NotFoundException('User not found in tenant');
    }
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      birthdate: account.birthdate,
      address: account.address,
      referenceId: account.referenceId,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Admin: Get overview of a user (account) including their verifications and aggregated image URLs
   */
  async getTenantUserOverview(
    tenantId: string,
    accountId: string,
  ): Promise<{
    user: {
      id: string;
      name?: Account['name'];
      email?: string;
      phone?: string;
      birthdate?: Date;
      address?: Account['address'];
      referenceId?: string;
      createdAt: Date;
      updatedAt: Date;
    };
    verifications: Array<{
      id: string;
      status: string;
      providerName?: string;
      createdAt: Date;
      imageUrls?: { frontUrl?: string; backUrl?: string; selfieUrl?: string };
    }>;
    images: Array<{ type: string; url: string; verificationId?: string }>;
    stats: { verificationCount: number; lastVerified?: Date | null };
  }> {
    // Validate user
    const account = await this.accountRepository.findOne({ where: { id: accountId, tenantId } });
    if (!account) {
      throw new NotFoundException('User not found in tenant');
    }

    // Fetch verifications for the account
    const verifications = await this.verificationRepository.find({
      where: { tenantId, accountId },
      order: { createdAt: 'DESC' },
      relations: ['provider'],
    });

    // Collect image URLs from result.metadata.imageUrls
    const images: Array<{ type: string; url: string; verificationId?: string }> = [];
    const mappedVerifications = verifications.map((v) => {
      const imageUrls = (v.result as any)?.metadata?.imageUrls as
        | { frontUrl?: string; backUrl?: string; selfieUrl?: string }
        | undefined;
      if (imageUrls) {
        if (imageUrls.frontUrl)
          images.push({ type: 'front', url: imageUrls.frontUrl, verificationId: v.id });
        if (imageUrls.backUrl)
          images.push({ type: 'back', url: imageUrls.backUrl, verificationId: v.id });
        if (imageUrls.selfieUrl)
          images.push({ type: 'selfie', url: imageUrls.selfieUrl, verificationId: v.id });
      }
      return {
        id: v.id,
        status: v.status,
        providerName: (v as any).provider?.name || (v as any).providerName || undefined,
        provider: v.provider
          ? { id: v.provider.id, name: v.provider.name, type: (v.provider as any).type }
          : undefined,
        createdAt: v.createdAt,
        imageUrls,
      };
    });

    const stats = {
      verificationCount: verifications.length,
      lastVerified: verifications.length ? verifications[0].createdAt : null,
    };

    return {
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        birthdate: account.birthdate,
        address: account.address,
        referenceId: account.referenceId,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
      verifications: mappedVerifications,
      images,
      stats,
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
