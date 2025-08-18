import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Tenant, TenantApiKey } from '../../database/entities';

export interface CurrentTenantInfo {
  tenant: Tenant;
  apiKey: TenantApiKey;
}

/**
 * Decorator to get the current authenticated tenant from the request
 */
export const CurrentTenant = createParamDecorator(
  (data: keyof CurrentTenantInfo | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // Check if we have tenant directly on request (from ApiKeyGuard)
    if (request.tenant) {
      return request.tenant;
    }

    // Fallback to auth structure
    const auth = request.auth as CurrentTenantInfo;
    if (!auth || !auth.tenant) {
      throw new UnauthorizedException(
        'Tenant authentication required - valid API key or JWT token needed',
      );
    }

    return data ? auth[data] : auth.tenant;
  },
);

/**
 * Decorator to get just the tenant entity
 */
export const GetTenant = createParamDecorator((data: unknown, ctx: ExecutionContext): Tenant => {
  const request = ctx.switchToHttp().getRequest();
  if (!request.tenant) {
    throw new UnauthorizedException(
      'Tenant authentication required - valid API key or JWT token needed',
    );
  }
  return request.tenant;
});

/**
 * Decorator to get just the API key entity
 */
export const GetApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantApiKey => {
    const request = ctx.switchToHttp().getRequest();
    return request.apiKey;
  },
);
