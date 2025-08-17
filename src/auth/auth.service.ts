import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { Tenant, TenantApiKey, ApiKeyStatus } from '../database/entities';

export interface AuthenticatedTenant {
  tenant: Tenant;
  apiKey: TenantApiKey;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantApiKey)
    private readonly apiKeyRepository: Repository<TenantApiKey>,
  ) {}

  // KMS/ENV: symmetric key for encrypting API keys (32 bytes for AES-256-GCM)
  private getEncryptionKey(): Buffer {
    const key = process.env.API_KEY_ENC_KEY || '';
    if (key.length !== 64) {
      // Expect hex-encoded 32-byte key
      throw new Error('API_KEY_ENC_KEY must be 64 hex chars (32 bytes)');
    }
    return Buffer.from(key, 'hex');
  }

  private encryptApiKey(plain: string): { ciphertextB64: string; ivB64: string } {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([ciphertext, tag]).toString('base64');
    return { ciphertextB64: payload, ivB64: iv.toString('base64') };
  }

  private decryptApiKey(ciphertextB64: string, ivB64: string): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64');
    const data = Buffer.from(ciphertextB64, 'base64');
    const ciphertext = data.slice(0, -16);
    const tag = data.slice(-16);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return plain;
  }

  /**
   * Validate API key and return authenticated tenant
   */
  async validateApiKey(apiKey: string): Promise<AuthenticatedTenant> {
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Hash the provided API key for comparison
    const keyHash = this.hashApiKey(apiKey);

    // Find the API key with tenant data
    const apiKeyEntity = await this.apiKeyRepository
      .createQueryBuilder('api_key')
      .leftJoinAndSelect('api_key.tenant', 'tenant')
      .where('api_key.keyHash = :keyHash', { keyHash })
      .getOne();

    if (!apiKeyEntity) {
      this.logger.warn(`Invalid API key attempted: ${apiKey.substring(0, 8)}...`);
      throw new UnauthorizedException('Invalid API key');
    }

    // Check if API key is active
    if (!apiKeyEntity.isActive()) {
      this.logger.warn(
        `Inactive API key used: ${apiKeyEntity.name} for tenant ${apiKeyEntity.tenant.name}`,
      );
      throw new UnauthorizedException('API key is inactive or expired');
    }

    // Check if tenant is active
    if (apiKeyEntity.tenant.status !== 'active') {
      this.logger.warn(`Inactive tenant attempted access: ${apiKeyEntity.tenant.name}`);
      throw new UnauthorizedException('Tenant account is not active');
    }

    // Update last used timestamp
    await this.updateApiKeyLastUsed(apiKeyEntity.id);

    this.logger.log(`Successful authentication for tenant: ${apiKeyEntity.tenant.name}`);

    return {
      tenant: apiKeyEntity.tenant,
      apiKey: apiKeyEntity,
    };
  }

  /**
   * Generate a new API key for a tenant
   */
  async generateApiKey(
    tenantId: string,
    name: string,
    expiresAt?: Date,
  ): Promise<{ apiKey: string; entity: TenantApiKey }> {
    // Generate a secure random API key
    const apiKey = `kya_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hashApiKey(apiKey);

    // Create the API key entity
    const apiKeyEntity = this.apiKeyRepository.create({
      tenantId,
      name,
      keyHash,
      expiresAt,
      status: 'active' as ApiKeyStatus,
    });

    // Encrypt and store
    try {
      const enc = this.encryptApiKey(apiKey);
      apiKeyEntity.keyEncrypted = enc.ciphertextB64;
      apiKeyEntity.keyIv = enc.ivB64;
    } catch (e) {
      this.logger.warn('API key encryption not configured; set API_KEY_ENC_KEY for reveal support');
    }

    await this.apiKeyRepository.save(apiKeyEntity);

    this.logger.log(`Generated new API key '${name}' for tenant ${tenantId}`);

    return {
      apiKey, // Return the raw API key (only time it's available)
      entity: apiKeyEntity,
    };
  }

  /**
   * Reveal stored API key (requires encryption key)
   */
  async revealApiKey(apiKeyId: string): Promise<string> {
    const record = await this.apiKeyRepository.findOne({ where: { id: apiKeyId } });
    if (!record || !record.keyEncrypted || !record.keyIv) {
      throw new UnauthorizedException('API key cannot be revealed (not stored encrypted)');
    }
    try {
      return this.decryptApiKey(record.keyEncrypted, record.keyIv);
    } catch (e) {
      throw new UnauthorizedException('API key reveal failed');
    }
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(apiKeyId: string): Promise<void> {
    const result = await this.apiKeyRepository.update(
      { id: apiKeyId },
      { status: 'revoked' as ApiKeyStatus },
    );

    if (result.affected === 0) {
      throw new UnauthorizedException('API key not found');
    }

    this.logger.log(`Revoked API key: ${apiKeyId}`);
  }

  /**
   * Get all API keys for a tenant
   */
  async getTenantApiKeys(tenantId: string): Promise<TenantApiKey[]> {
    return this.apiKeyRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find tenant by email (for login)
   */
  async findTenantByEmail(email: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { email },
    });
  }

  /**
   * Save tenant entity
   */
  async saveTenant(tenant: Tenant): Promise<Tenant> {
    return this.tenantRepository.save(tenant);
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Hash API key using SHA-256
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Update API key last used timestamp
   */
  private async updateApiKeyLastUsed(apiKeyId: string): Promise<void> {
    await this.apiKeyRepository.update({ id: apiKeyId }, { lastUsedAt: new Date() });
  }
}
