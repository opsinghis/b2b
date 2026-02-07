import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantRequest } from './tenant.middleware';

export const TenantContext = createParamDecorator(
  (data: 'tenant' | 'tenantId' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();

    if (!request.tenant) {
      throw new UnauthorizedException('Tenant context not available');
    }

    if (data === 'tenant') {
      return request.tenant;
    }

    if (data === 'tenantId') {
      return request.tenantId;
    }

    return request.tenant;
  },
);

export const CurrentTenant = () => TenantContext('tenant');
export const CurrentTenantId = () => TenantContext('tenantId');
