import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Admin, AdminRefreshToken, Tenant, TenantRefreshToken } from '../database/entities';

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
    @InjectRepository(AdminRefreshToken)
    private readonly adminRefreshTokenRepository: Repository<AdminRefreshToken>,
    @InjectRepository(TenantRefreshToken)
    private readonly tenantRefreshTokenRepository: Repository<TenantRefreshToken>,
  ) {}

  /**
   * Generate access and refresh token pair for admin
   */
  async generateTokens(admin: Admin, userAgent?: string, ipAddress?: string): Promise<TokenPair> {
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

    // Save refresh token to database
    const refreshToken = this.adminRefreshTokenRepository.create({
      adminId: admin.id,
      token: refreshTokenValue,
      expiresAt: refreshTokenExpiry,
      userAgent,
      ipAddress,
      isRevoked: false,
    });

    await this.adminRefreshTokenRepository.save(refreshToken);

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

    // Save refresh token to database
    const refreshToken = this.tenantRefreshTokenRepository.create({
      tenantId: tenant.id,
      token: refreshTokenValue,
      expiresAt: refreshTokenExpiry,
      userAgent,
      ipAddress,
      isRevoked: false,
    });

    await this.tenantRefreshTokenRepository.save(refreshToken);

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
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenPair> {
    // Find refresh token in admin table
    const storedToken = await this.adminRefreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['admin'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked || storedToken.isExpired()) {
      throw new UnauthorizedException('Refresh token is expired or revoked');
    }

    // Generate new tokens
    const newTokens = await this.generateTokens(storedToken.admin, userAgent, ipAddress);

    // Revoke old refresh token
    storedToken.isRevoked = true;
    await this.adminRefreshTokenRepository.save(storedToken);

    return newTokens;
  }

  /**
   * Refresh tenant access token using refresh token
   */
  async refreshTenantAccessToken(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<TokenPair> {
    // Find refresh token in tenant table
    const storedToken = await this.tenantRefreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['tenant'],
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked || storedToken.isExpired()) {
      throw new UnauthorizedException('Refresh token is expired or revoked');
    }

    // Generate new tokens
    const newTokens = await this.generateTenantTokens(storedToken.tenant, userAgent, ipAddress);

    // Revoke old refresh token
    storedToken.isRevoked = true;
    await this.tenantRefreshTokenRepository.save(storedToken);

    return newTokens;
  }

  /**
   * Revoke admin refresh token
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const storedToken = await this.adminRefreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (storedToken) {
      storedToken.isRevoked = true;
      await this.adminRefreshTokenRepository.save(storedToken);
    }
  }

  /**
   * Revoke tenant refresh token
   */
  async revokeTenantRefreshToken(refreshToken: string): Promise<void> {
    const storedToken = await this.tenantRefreshTokenRepository.findOne({
      where: { token: refreshToken },
    });

    if (storedToken) {
      storedToken.isRevoked = true;
      await this.tenantRefreshTokenRepository.save(storedToken);
    }
  }

  /**
   * Revoke all admin refresh tokens for user
   */
  async revokeAllRefreshTokens(adminId: string): Promise<void> {
    await this.adminRefreshTokenRepository.update(
      { adminId, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * Revoke all tenant refresh tokens for user
   */
  async revokeAllTenantRefreshTokens(tenantId: string): Promise<void> {
    await this.tenantRefreshTokenRepository.update(
      { tenantId, isRevoked: false },
      { isRevoked: true },
    );
  }

  /**
   * Clean up expired tokens (run as scheduled job)
   */
  async cleanupTokens(): Promise<void> {
    const now = new Date();

    // Clean admin tokens
    await this.adminRefreshTokenRepository.delete({
      expiresAt: { $lt: now } as any,
    });

    // Clean tenant tokens
    await this.tenantRefreshTokenRepository.delete({
      expiresAt: { $lt: now } as any,
    });
  }
}
