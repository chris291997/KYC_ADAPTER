import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Admin, AdminApiKey } from '../../database/entities';

/**
 * Decorator to get the current authenticated admin and API key
 */
export const CurrentAdmin = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user; // Contains { admin: Admin, apiKey: AdminApiKey, type: 'admin' }
});

/**
 * Decorator to get just the admin entity
 */
export const GetAdmin = createParamDecorator((data: unknown, ctx: ExecutionContext): Admin => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.admin;
});

/**
 * Decorator to get just the admin API key entity
 */
export const GetAdminApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AdminApiKey => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.apiKey;
  },
);
