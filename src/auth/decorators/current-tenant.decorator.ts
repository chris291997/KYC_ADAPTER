import { createParamDecorator, ExecutionContext } from '@nestjs/common';
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
    const auth = request.auth as CurrentTenantInfo;

    if (!auth) {
      return null;
    }

    return data ? auth[data] : auth;
  },
);

/**
 * Decorator to get just the tenant entity
 */
export const GetTenant = createParamDecorator((data: unknown, ctx: ExecutionContext): Tenant => {
  const request = ctx.switchToHttp().getRequest();
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
