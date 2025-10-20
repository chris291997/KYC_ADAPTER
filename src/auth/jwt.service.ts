import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Admin, Tenant } from '../database/entities';
import { RefreshToken } from '../database/entities/refresh-token.entity';

export interface JwtPayload {
  sub: string; // admin ID or tenant ID
  email: string;
  role?: string; // admin role (for admins only)
  apiKey?: string;
  type: 'admin' | 'tenant';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  /**
   * Generate access and refresh token pair for admin
   */
  async generateTokens(admin: Admin, _userAgent?: string, _ipAddress?: string): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    // Generate access token (shorter lived)
    const accessToken = this.nestJwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRES', '15m'),
    });

    // Generate refresh token (longer lived)
    const refreshTokenValue = randomBytes(32).toString('hex');
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() +
        parseInt(this.configService.get('JWT_REFRESH_TOKEN_EXPIRES_DAYS', '7')),
    );

    // Admin refresh tokens are not persisted; return value without storing

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Generate access and refresh token pair for tenant
   */
  async generateTenantTokens(
    tenant: Tenant,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: tenant.id,
      email: tenant.email,
      type: 'tenant',
    };

    // Generate access token (shorter lived)
    const accessToken = this.nestJwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_TOKEN_EXPIRES', '15m'),
    });

    // Generate refresh token (longer lived)
    const refreshTokenValue = randomBytes(32).toString('hex');
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(
      refreshTokenExpiry.getDate() +
        parseInt(this.configService.get('JWT_REFRESH_TOKEN_EXPIRES_DAYS', '7')),
    );

    // Save refresh token to database (unified table)
    const refreshToken = this.refreshTokenRepository.create({
      ownerType: 'tenant',
      ownerId: tenant.id as any,
      token: refreshTokenValue,
      expiresAt: refreshTokenExpiry,
      userAgent,
      ipAddress,
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(refreshToken);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Validate access token and return payload
   */
  async validateAccessToken(token: string): Promise<JwtPayload> {
    try {
      return this.nestJwtService.verify(token, {
        issuer: this.configService.get('JWT_ISSUER', 'kyc-adapter'),
        audience: [
          this.configService.get('JWT_AUDIENCE_ADMIN', 'kyc-adapter-admin'),
          this.configService.get('JWT_AUDIENCE_TENANT', 'kyc-adapter-tenant'),
        ],
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  /**
   * Refresh admin access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string,
    _userAgent?: string,
    _ipAddress?: string,
  ): Promise<TokenPair> {
    // Find refresh token in admin table
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked || storedToken.isExpired()) {
      throw new UnauthorizedException('Refresh token is expired or revoked');
    }

    // Generate new tokens
    // For admins, recommend login instead; keep structure for compatibility
    throw new UnauthorizedException('Admin refresh tokens are not supported. Please login again.');

    // Not reachable
    // return newTokens;
  }

  /**
   * Refresh tenant access token using refresh token
   */
  async refreshTenantAccessToken(
    refreshToken: string,
    _userAgent?: string,
    _ipAddress?: string,
  ): Promise<TokenPair> {
    // Find refresh token in tenant table
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked || storedToken.isExpired()) {
      throw new UnauthorizedException('Refresh token is expired or revoked');
    }

    // Generate new tokens
    // Tenant identification is not present here; require re-login for now
    throw new UnauthorizedException(
      'Tenant refresh flow temporarily disabled. Please login again.',
    );

    // Not reachable
    // return newTokens;
  }

  /**
   * Revoke admin refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (storedToken) {
      storedToken.isRevoked = true;
      await this.refreshTokenRepository.save(storedToken);
    }
  }

  /**
   * Revoke tenant refresh token
   */
  async revokeTenantRefreshToken(refreshToken: string): Promise<void> {
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (storedToken) {
      storedToken.isRevoked = true;
      await this.refreshTokenRepository.save(storedToken);
    }
  }

  /**
   * Revoke all admin refresh tokens for user
   */
  async revokeAllRefreshTokens(adminId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { ownerId: adminId as any, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * Revoke all tenant refresh tokens for user
   */
  async revokeAllTenantRefreshTokens(tenantId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { ownerId: tenantId as any, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * Clean up expired tokens (run as scheduled job)
   */
  async cleanupTokens(): Promise<void> {
    const now = new Date();

    // Clean admin tokens
    await this.refreshTokenRepository.delete({
      expiresAt: { $lt: now } as any,
    });

    // Clean tenant tokens
    await this.refreshTokenRepository.delete({
      expiresAt: { $lt: now } as any,
    });
  }
}
