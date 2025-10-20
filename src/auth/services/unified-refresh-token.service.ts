import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../../database/entities/refresh-token.entity';
import type { OwnerType } from '../../database/entities/api-key.entity';
import { RefreshTokenResponseDto } from '../dto/refresh-token-response.dto';
import * as crypto from 'crypto';

@Injectable()
export class UnifiedRefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Create a new refresh token
   */
  async createRefreshToken(
    ownerType: OwnerType,
    ownerId: string,
    userAgent?: string,
    ipAddress?: string,
    expiresInDays: number = 7,
  ): Promise<RefreshTokenResponseDto> {
    const token = this.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const refreshToken = this.refreshTokenRepository.create({
      ownerType,
      ownerId,
      token,
      expiresAt,
      userAgent,
      ipAddress,
    });

    const savedToken = await this.refreshTokenRepository.save(refreshToken);
    return this.toResponseDto(savedToken);
  }

  /**
   * Find refresh token by token value
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    return this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['admin', 'tenant'],
    });
  }

  /**
   * Find refresh tokens by owner
   */
  async findByOwner(ownerType: OwnerType, ownerId: string): Promise<RefreshTokenResponseDto[]> {
    const tokens = await this.refreshTokenRepository.find({
      where: { ownerType, ownerId },
      order: { createdAt: 'DESC' },
    });

    return tokens.map((token) => this.toResponseDto(token));
  }

  /**
   * Revoke refresh token
   */
  async revokeToken(token: string): Promise<void> {
    const result = await this.refreshTokenRepository.update({ token }, { isRevoked: true });

    if (result.affected === 0) {
      throw new NotFoundException('Refresh token not found');
    }
  }

  /**
   * Revoke all tokens for an owner
   */
  async revokeAllTokensForOwner(ownerType: OwnerType, ownerId: string): Promise<number> {
    const result = await this.refreshTokenRepository.update(
      { ownerType, ownerId },
      { isRevoked: true },
    );

    return result.affected || 0;
  }

  /**
   * Delete refresh token
   */
  async deleteToken(id: string): Promise<void> {
    const result = await this.refreshTokenRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Refresh token not found');
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();

    return result.affected || 0;
  }

  /**
   * Clean up revoked tokens older than specified days
   */
  async cleanupRevokedTokens(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('is_revoked = true AND created_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }

  /**
   * Generate a new refresh token
   */
  private generateRefreshToken(): string {
    // Generate 32 random bytes and encode as base64url
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString('base64url');
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(refreshToken: RefreshToken): RefreshTokenResponseDto {
    return {
      id: refreshToken.id,
      ownerType: refreshToken.ownerType,
      ownerId: refreshToken.ownerId,
      token: refreshToken.token,
      isRevoked: refreshToken.isRevoked,
      expiresAt: refreshToken.expiresAt,
      userAgent: refreshToken.userAgent,
      ipAddress: refreshToken.ipAddress,
      createdAt: refreshToken.createdAt,
    };
  }
}
