import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Admin } from '../../database/entities';

/**
 * Decorator to get the current authenticated admin and API key
 */
export const CurrentAdmin = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user; // Contains { admin: Admin, type: 'admin_jwt' }
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
// Admin API keys are no longer supported
