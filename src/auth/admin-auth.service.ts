import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { Admin, AdminApiKey, AdminApiKeyStatus } from '../database/entities';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(AdminApiKey)
    private readonly adminApiKeyRepository: Repository<AdminApiKey>,
  ) {}

  /**
   * Validate admin API key and return admin + API key entities
   */
  async validateApiKey(apiKey: string): Promise<{ admin: Admin; apiKey: AdminApiKey } | null> {
    if (!apiKey) {
      return null;
    }

    // Hash the provided API key
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Find the API key with admin relation
    const apiKeyEntity = await this.adminApiKeyRepository.findOne({
      where: { keyHash },
      relations: ['admin'],
    });

    if (!apiKeyEntity) {
      return null;
    }

    // Check if API key is active
    if (!apiKeyEntity.isActive()) {
      this.logger.warn(`Inactive admin API key used: ${apiKeyEntity.id}`);
      return null;
    }

    // Check if admin is active
    if (!apiKeyEntity.admin.isActive()) {
      this.logger.warn(`Inactive admin tried to authenticate: ${apiKeyEntity.admin.email}`);
      return null;
    }

    // Update last used timestamp
    apiKeyEntity.updateLastUsed();
    await this.adminApiKeyRepository.save(apiKeyEntity);

    // Update admin last login
    apiKeyEntity.admin.lastLoginAt = new Date();
    await this.adminRepository.save(apiKeyEntity.admin);

    this.logger.log(`Admin authenticated: ${apiKeyEntity.admin.email} (${apiKeyEntity.admin.id})`);

    return {
      admin: apiKeyEntity.admin,
      apiKey: apiKeyEntity,
    };
  }

  /**
   * Generate new admin API key
   */
  async generateApiKey(
    adminId: string,
    name: string,
    expiresAt?: Date,
  ): Promise<{ apiKey: string; entity: AdminApiKey }> {
    // Verify admin exists
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Generate API key with admin prefix
    const apiKey = 'kya_admin_' + randomBytes(24).toString('hex');
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Create API key entity
    const apiKeyEntity = this.adminApiKeyRepository.create({
      adminId,
      name,
      keyHash,
      status: 'active',
      expiresAt,
    });

    const savedEntity = await this.adminApiKeyRepository.save(apiKeyEntity);

    this.logger.log(`Generated admin API key '${name}' for admin ${admin.email}`);

    return {
      apiKey,
      entity: savedEntity,
    };
  }

  /**
   * Get all API keys for an admin
   */
  async getAdminApiKeys(adminId: string): Promise<AdminApiKey[]> {
    return this.adminApiKeyRepository.find({
      where: { adminId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke admin API key
   */
  async revokeApiKey(apiKeyId: string): Promise<void> {
    const apiKey = await this.adminApiKeyRepository.findOne({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      throw new NotFoundException('Admin API key not found');
    }

    apiKey.status = 'revoked' as AdminApiKeyStatus;
    await this.adminApiKeyRepository.save(apiKey);

    this.logger.log(`Revoked admin API key: ${apiKey.name} (${apiKeyId})`);
  }

  /**
   * Find admin by email
   */
  async findAdminByEmail(email: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { email },
    });
  }

  /**
   * Create admin user
   */
  async createAdmin(
    name: string,
    email: string,
    role: 'super_admin' | 'admin' | 'viewer' = 'admin',
  ): Promise<Admin> {
    const admin = this.adminRepository.create({
      name,
      email,
      role,
      status: 'active',
      settings: {},
    });

    const savedAdmin = await this.adminRepository.save(admin);

    this.logger.log(`Created admin: ${savedAdmin.name} (${savedAdmin.email}) with role ${role}`);

    return savedAdmin;
  }

  /**
   * Get admin by ID
   */
  async getAdminById(adminId: string): Promise<Admin | null> {
    return this.adminRepository.findOne({
      where: { id: adminId },
    });
  }

  /**
   * Save admin entity
   */
  async saveAdmin(admin: Admin): Promise<Admin> {
    return this.adminRepository.save(admin);
  }
}
