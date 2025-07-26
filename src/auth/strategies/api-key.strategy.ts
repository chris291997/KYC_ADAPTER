import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService, AuthenticatedTenant } from '../auth.service';

/**
 * API Key Strategy
 * Handles API key extraction and validation logic
 */
@Injectable()
export class ApiKeyStrategy {
  constructor(private readonly authService: AuthService) {}

  /**
   * Validate API key from request
   */
  async validate(req: Request): Promise<AuthenticatedTenant | null> {
    const apiKey = this.extractApiKey(req);

    if (!apiKey) {
      return null;
    }

    try {
      return await this.authService.validateApiKey(apiKey);
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract API key from request headers or query parameters
   */
  private extractApiKey(req: Request): string | null {
    // Check Authorization header: "Bearer kya_..."
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Only handle tenant API keys (kya_) but not admin keys (kya_admin_)
      if (token.startsWith('kya_') && !token.startsWith('kya_admin_')) {
        return token;
      }
    }

    // Check X-API-Key header
    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (apiKeyHeader && apiKeyHeader.startsWith('kya_') && !apiKeyHeader.startsWith('kya_admin_')) {
      return apiKeyHeader;
    }

    // Check query parameter (for webhook callbacks)
    const apiKeyQuery = req.query.api_key as string;
    if (apiKeyQuery && apiKeyQuery.startsWith('kya_') && !apiKeyQuery.startsWith('kya_admin_')) {
      return apiKeyQuery;
    }

    return null;
  }
}
