import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AdminAuthService } from '../admin-auth.service';
import { JwtService } from '../jwt.service';

// Metadata key for admin-only routes
export const IS_ADMIN_ROUTE_KEY = 'isAdminRoute';

// Decorator to mark routes as admin-only
export const AdminOnly = () => SetMetadata(IS_ADMIN_ROUTE_KEY, true);

// Admin roles for permission checking
export const ADMIN_ROLES_KEY = 'adminRoles';
export const RequireRole = (...roles: string[]) => SetMetadata(ADMIN_ROLES_KEY, roles);

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private adminAuthService: AdminAuthService,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if this route requires admin authentication
    const isAdminRoute = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdminRoute) {
      return true; // Not an admin route, allow access
    }

    // Perform admin authentication (try JWT first, then API key)
    const request = context.switchToHttp().getRequest<Request>();

    try {
      let adminAuth: any = null;

      // Try JWT authentication first
      const jwtToken = this.extractJwtToken(request);
      if (jwtToken) {
        try {
          const jwtPayload = await this.jwtService.validateAccessToken(jwtToken);
          const admin = await this.adminAuthService.getAdminById(jwtPayload.sub);

          if (admin && admin.isActive()) {
            adminAuth = {
              admin,
              type: 'admin_jwt',
              jwtPayload,
            };
          }
        } catch (jwtError) {
          // JWT validation failed, continue to API key authentication
        }
      }

      // If JWT failed, try API key authentication
      if (!adminAuth) {
        const apiKey = this.extractApiKey(request);
        if (apiKey) {
          const authResult = await this.adminAuthService.validateApiKey(apiKey);
          if (authResult) {
            adminAuth = {
              admin: authResult.admin,
              apiKey: authResult.apiKey,
              type: 'admin_api_key',
            };
          }
        }
      }

      if (!adminAuth) {
        throw new UnauthorizedException('Admin authentication required');
      }

      // Add admin info to request
      (request as any).user = adminAuth;

      if (!adminAuth || !adminAuth.type.startsWith('admin')) {
        throw new UnauthorizedException('Admin access required');
      }

      // Check role-based permissions
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(ADMIN_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = requiredRoles.includes(adminAuth.admin.role);
        if (!hasRole) {
          throw new UnauthorizedException(`Required role: ${requiredRoles.join(' or ')}`);
        }
      }

      return true;
    } catch (error) {
      throw error instanceof UnauthorizedException
        ? error
        : new UnauthorizedException('Admin authentication failed');
    }
  }

  /**
   * Extract admin API key from request
   */
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

  /**
   * Extract JWT token from request
   */
  private extractJwtToken(request: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Only accept JWT tokens (they don't start with kya_)
      if (!token.startsWith('kya_')) {
        return token;
      }
    }

    return null;
  }
}
