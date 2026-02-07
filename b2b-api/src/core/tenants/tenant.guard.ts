import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantRequest } from './tenant.middleware';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<TenantRequest>();

    if (!request.tenant || !request.tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    return true;
  }
}
