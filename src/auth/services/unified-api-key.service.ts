import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, OwnerType } from '../../database/entities/api-key.entity';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { ApiKeyResponseDto } from '../dto/api-key-response.dto';
import * as crypto from 'crypto';

@Injectable()
export class UnifiedApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  /**
   * Create a new API key
   */
  async createApiKey(createDto: CreateApiKeyDto): Promise<ApiKeyResponseDto & { key: string }> {
    // Generate API key
    const key = this.generateApiKey();
    const keyHash = this.hashApiKey(key);

    // Check if key hash already exists (very unlikely but possible)
    const existingKey = await this.apiKeyRepository.findOne({ where: { keyHash } });
    if (existingKey) {
      throw new ConflictException('API key collision detected. Please try again.');
    }

    // Create API key entity
    const apiKey = this.apiKeyRepository.create({
      ownerType: createDto.ownerType,
      ownerId: createDto.ownerId,
      name: createDto.name,
      keyHash,
      status: 'active',
      previewSuffix: createDto.previewSuffix,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
    });

    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    return {
      ...this.toResponseDto(savedApiKey),
      key, // Only returned once on creation
    };
  }

  /**
   * Find API key by hash (for authentication)
   */
  async findByHash(keyHash: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({ 
      where: { keyHash },
      relations: ['admin', 'tenant']
    });
  }

  /**
   * Find API keys by owner
   */
  async findByOwner(ownerType: OwnerType, ownerId: string): Promise<ApiKeyResponseDto[]> {
    const apiKeys = await this.apiKeyRepository.find({
      where: { ownerType, ownerId },
      order: { createdAt: 'DESC' }
    });

    return apiKeys.map(key => this.toResponseDto(key));
  }

  /**
   * Find API key by ID
   */
  async findById(id: string): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyRepository.findOne({ 
      where: { id },
      relations: ['admin', 'tenant']
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return this.toResponseDto(apiKey);
  }

  /**
   * Update API key
   */
  async updateApiKey(id: string, updates: Partial<CreateApiKeyDto>): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    // Update allowed fields
    if (updates.name) apiKey.name = updates.name;
    if (updates.expiresAt) apiKey.expiresAt = new Date(updates.expiresAt);
    if (updates.previewSuffix) apiKey.previewSuffix = updates.previewSuffix;

    const savedApiKey = await this.apiKeyRepository.save(apiKey);
    return this.toResponseDto(savedApiKey);
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(id: string): Promise<ApiKeyResponseDto> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    apiKey.status = 'revoked';
    const savedApiKey = await this.apiKeyRepository.save(apiKey);
    return this.toResponseDto(savedApiKey);
  }

  /**
   * Delete API key
   */
  async deleteApiKey(id: string): Promise<void> {
    const result = await this.apiKeyRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('API key not found');
    }
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: string): Promise<void> {
    await this.apiKeyRepository.update(id, { lastUsedAt: new Date() });
  }

  /**
   * Clean up expired API keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const result = await this.apiKeyRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  /**
   * Generate a new API key
   */
  private generateApiKey(): string {
    // Generate 32 random bytes and encode as base64
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('base64').replace(/[+/=]/g, (char) => {
      switch (char) {
        case '+': return '-';
        case '/': return '_';
        case '=': return '';
        default: return char;
      }
    });
  }

  /**
   * Hash API key for storage
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(apiKey: ApiKey): ApiKeyResponseDto {
    return {
      id: apiKey.id,
      ownerType: apiKey.ownerType,
      ownerId: apiKey.ownerId,
      name: apiKey.name,
      status: apiKey.status,
      previewSuffix: apiKey.previewSuffix,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
    };
  }
}
