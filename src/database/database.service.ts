import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

import { Client } from './entities/client.entity';
import { ProviderCredential } from './entities/provider-credential.entity';
import { ClientProviderConfig } from './entities/client-provider-config.entity';
import { VerificationRequest } from './entities/verification-request.entity';
import { VerificationResult } from './entities/verification-result.entity';
import { RateLimitTracking, WindowType } from './entities/rate-limit-tracking.entity';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(ProviderCredential)
    private readonly providerCredentialRepository: Repository<ProviderCredential>,
    @InjectRepository(ClientProviderConfig)
    private readonly clientProviderConfigRepository: Repository<ClientProviderConfig>,
    @InjectRepository(VerificationRequest)
    private readonly verificationRequestRepository: Repository<VerificationRequest>,
    @InjectRepository(VerificationResult)
    private readonly verificationResultRepository: Repository<VerificationResult>,
    @InjectRepository(RateLimitTracking)
    private readonly rateLimitTrackingRepository: Repository<RateLimitTracking>,
  ) {}

  /**
   * Find client by API key
   */
  async findClientByApiKey(apiKey: string): Promise<Client | null> {
    const hashedApiKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    return this.clientRepository.findOne({
      where: {
        apiKey: hashedApiKey,
        isActive: true,
      },
      relations: ['providerConfigs'],
    });
  }

  /**
   * Get provider configuration for a client
   */
  async getClientProviderConfig(clientId: string): Promise<ClientProviderConfig | null> {
    return this.clientProviderConfigRepository.findOne({
      where: {
        clientId,
        isPrimary: true,
      },
    });
  }

  /**
   * Get encrypted provider credentials
   */
  async getProviderCredentials(providerName: string): Promise<ProviderCredential[]> {
    return this.providerCredentialRepository.find({
      where: {
        providerName,
        isActive: true,
      },
    });
  }

  /**
   * Create a new verification request
   */
  async createVerificationRequest(
    data: Partial<VerificationRequest>,
  ): Promise<VerificationRequest> {
    const request = this.verificationRequestRepository.create(data);
    return this.verificationRequestRepository.save(request);
  }

  /**
   * Update verification request status
   */
  async updateVerificationRequest(
    id: string,
    updates: Partial<VerificationRequest>,
  ): Promise<void> {
    await this.verificationRequestRepository.update(id, updates);
  }

  /**
   * Create verification result
   */
  async createVerificationResult(data: Partial<VerificationResult>): Promise<VerificationResult> {
    const result = this.verificationResultRepository.create(data);
    return this.verificationResultRepository.save(result);
  }

  /**
   * Check and increment rate limit
   */
  async checkRateLimit(clientId: string, windowType: WindowType, limit: number): Promise<boolean> {
    const now = new Date();
    let windowStart: Date;

    // Calculate window start based on type
    switch (windowType) {
      case WindowType.MINUTE:
        windowStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          now.getMinutes(),
        );
        break;
      case WindowType.HOUR:
        windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        break;
      case WindowType.DAY:
        windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
    }

    // Try to find existing tracking record
    let tracking = await this.rateLimitTrackingRepository.findOne({
      where: { clientId, windowType, windowStart },
    });

    if (!tracking) {
      // Create new tracking record
      tracking = this.rateLimitTrackingRepository.create({
        clientId,
        windowType,
        windowStart,
        requestCount: 1,
      });
      await this.rateLimitTrackingRepository.save(tracking);
      return true; // First request in window
    }

    // Check if limit exceeded
    if (tracking.requestCount >= limit) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    await this.rateLimitTrackingRepository.increment({ id: tracking.id }, 'requestCount', 1);

    return true; // Request allowed
  }

  /**
   * Update client last used timestamp
   */
  async updateClientLastUsed(clientId: string): Promise<void> {
    await this.clientRepository.update(clientId, { lastUsedAt: new Date() });
  }

  /**
   * Clean up old rate limit records
   */
  async cleanupOldRateLimits(): Promise<number> {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const result = await this.rateLimitTrackingRepository
      .createQueryBuilder()
      .delete()
      .where('window_start < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} old rate limit records`);
    return result.affected || 0;
  }

  /**
   * Get verification request statistics for a client
   */
  async getClientStats(clientId: string, days: number = 30): Promise<any> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.verificationRequestRepository
      .createQueryBuilder('vr')
      .select([
        'COUNT(*) as total_requests',
        "COUNT(CASE WHEN vr.status = 'completed' THEN 1 END) as completed_requests",
        "COUNT(CASE WHEN vr.status = 'failed' THEN 1 END) as failed_requests",
        'AVG(vr.processing_time_ms) as avg_processing_time',
      ])
      .where('vr.client_id = :clientId', { clientId })
      .andWhere('vr.created_at >= :cutoffDate', { cutoffDate })
      .getRawOne();

    return stats;
  }
}
