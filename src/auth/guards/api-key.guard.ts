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
import { JwtService } from '../jwt.service';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * API Key Guard
 * Protects routes by validating API keys and adding tenant context to request
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly adminAuthService: AdminAuthService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this is a public route
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Try JWT authentication first (for tenant login flow)
    const jwtToken = this.extractJwtToken(request);
    if (jwtToken) {
      try {
        const jwtPayload = await this.jwtService.validateAccessToken(jwtToken);

        // For tenant JWT tokens
        if (jwtPayload.type === 'tenant') {
          const tenant = await this.authService.getTenantById(jwtPayload.sub);
          if (tenant && tenant.isActive()) {
            // Add tenant context to request
            (request as any).tenant = tenant;
            (request as any).auth = { tenant, type: 'tenant_jwt' };
            (request as any).authType = 'tenant';
            return true;
          }
        }

        // For admin JWT tokens
        if (jwtPayload.type === 'admin') {
          const admin = await this.adminAuthService.getAdminById(jwtPayload.sub);
          if (admin && admin.isActive()) {
            // Add admin context to request (formatted like tenant auth for compatibility)
            (request as any).admin = admin;
            (request as any).auth = { admin, type: 'admin_jwt' };
            (request as any).authType = 'admin';

            // Optional: act-as-tenant support for admins via header/query
            const overrideTenantId = this.getTenantOverride(request);
            if (overrideTenantId) {
              const tenant = await this.authService.getTenantById(overrideTenantId);
              if (tenant && tenant.isActive()) {
                (request as any).tenant = tenant;
              }
            }
            return true;
          }
        }
      } catch (jwtError) {
        // JWT validation failed, continue to API key authentication
      }
    }

    // Try API key authentication
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException('Authentication required - provide JWT token or API key');
    }

    try {
      // Tenant API keys only
      const authenticatedTenant = await this.authService.validateApiKey(apiKey);
      (request as any).tenant = authenticatedTenant.tenant;
      (request as any).apiKey = authenticatedTenant.apiKey;
      (request as any).auth = authenticatedTenant;
      (request as any).authType = 'tenant';
      return true;
    } catch {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  /**
   * Extract JWT token from Authorization header
   */
  private extractJwtToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // JWT tokens don't start with 'kya_'
      if (!token.startsWith('kya_')) {
        return token;
      }
    }
    return null;
  }

  /**
   * Extract API key from request
   */
  private extractApiKey(request: Request): string | null {
    // Check Authorization header: "Bearer kya_..." (tenant keys only)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('kya_')) {
        return token;
      }
    }

    // Check X-API-Key header (tenant keys only)
    const apiKeyHeader = request.headers['x-api-key'] as string;
    if (apiKeyHeader && apiKeyHeader.startsWith('kya_')) {
      return apiKeyHeader;
    }

    // Check query parameter (for webhook callbacks)
    const apiKeyQuery = request.query.api_key as string;
    if (apiKeyQuery && apiKeyQuery.startsWith('kya_')) {
      return apiKeyQuery;
    }

    return null;
  }

  /**
   * For admins, allow acting as a tenant by specifying tenant ID
   * via header 'X-Tenant-Id' or query parameters 'tenantId' | 'tenant_id'
   */
  private getTenantOverride(request: Request): string | null {
    const headerTenantId = (request.headers['x-tenant-id'] as string) || null;
    const queryTenantId =
      (request.query['tenantId'] as string) || (request.query['tenant_id'] as string) || null;
    return headerTenantId || queryTenantId || null;
  }
}
