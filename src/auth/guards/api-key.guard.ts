import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AdminAuthService } from '../admin-auth.service';
import { IS_ADMIN_ROUTE_KEY } from './admin-auth.guard';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * API Key Guard
 * Protects routes by validating API keys and adding tenant context to request
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly adminAuthService: AdminAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if route is marked as admin-only (let AdminAuthGuard handle it)
    const isAdminRoute = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isAdminRoute) {
      return true; // Skip tenant auth for admin routes
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    try {
      // First try tenant authentication
      const authenticatedTenant = await this.authService.validateApiKey(apiKey);
      // Add tenant context to request
      (request as any).tenant = authenticatedTenant.tenant;
      (request as any).apiKey = authenticatedTenant.apiKey;
      (request as any).auth = authenticatedTenant;
      (request as any).authType = 'tenant';

      return true;
    } catch (tenantError) {
      // If tenant auth fails, try admin authentication (admins can access tenant APIs)
      try {
        const adminAuth = await this.adminAuthService.validateApiKey(apiKey);
        if (adminAuth) {
          // Add admin context to request (formatted like tenant auth for compatibility)
          (request as any).admin = adminAuth.admin;
          (request as any).apiKey = adminAuth.apiKey;
          (request as any).auth = {
            admin: adminAuth.admin,
            apiKey: adminAuth.apiKey,
            type: 'admin',
          };
          (request as any).authType = 'admin';

          return true;
        }
      } catch (adminError) {
        // Both authentication methods failed
      }

      throw new UnauthorizedException('Invalid API key');
    }
  }

  /**
   * Extract API key from request
   */
  private extractApiKey(request: Request): string | null {
    // Check Authorization header: "Bearer kya_..." (now accepts both tenant and admin keys)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Accept both tenant (kya_) and admin keys (kya_admin_)
      if (token.startsWith('kya_')) {
        return token;
      }
    }

    // Check X-API-Key header (accepts both tenant and admin keys)
    const apiKeyHeader = request.headers['x-api-key'] as string;
    if (apiKeyHeader && apiKeyHeader.startsWith('kya_')) {
      return apiKeyHeader;
    }

    // Check X-Admin-API-Key header (for admin keys)
    const adminApiKeyHeader = request.headers['x-admin-api-key'] as string;
    if (adminApiKeyHeader && adminApiKeyHeader.startsWith('kya_admin_')) {
      return adminApiKeyHeader;
    }

    // Check query parameter (for webhook callbacks)
    const apiKeyQuery = request.query.api_key as string;
    if (apiKeyQuery && apiKeyQuery.startsWith('kya_')) {
      return apiKeyQuery;
    }

    // Check admin query parameter
    const adminApiKeyQuery = request.query.admin_api_key as string;
    if (adminApiKeyQuery && adminApiKeyQuery.startsWith('kya_admin_')) {
      return adminApiKeyQuery;
    }

    return null;
  }
}
