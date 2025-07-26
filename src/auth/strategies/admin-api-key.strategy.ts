import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { AdminAuthService } from '../admin-auth.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Strategy } = require('passport-custom');

@Injectable()
export class AdminApiKeyStrategy extends PassportStrategy(Strategy, 'admin-api-key') {
  constructor(private readonly adminAuthService: AdminAuthService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const apiKey = this.extractApiKey(req);

    if (!apiKey) {
      throw new UnauthorizedException('Admin API key is required');
    }

    // Validate API key
    const authResult = await this.adminAuthService.validateApiKey(apiKey);

    if (!authResult) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    // Return admin and API key info for use in guards/decorators
    return {
      admin: authResult.admin,
      apiKey: authResult.apiKey,
      type: 'admin',
    };
  }

  private extractApiKey(request: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Only accept admin API keys (they start with kya_admin_)
      if (token.startsWith('kya_admin_')) {
        return token;
      }
    }

    // Check X-Admin-API-Key header
    const adminApiKeyHeader = request.headers['x-admin-api-key'] as string;
    if (adminApiKeyHeader && adminApiKeyHeader.startsWith('kya_admin_')) {
      return adminApiKeyHeader;
    }

    // Check query parameter
    const apiKeyQuery = request.query.admin_api_key as string;
    if (apiKeyQuery && apiKeyQuery.startsWith('kya_admin_')) {
      return apiKeyQuery;
    }

    return null;
  }
}
