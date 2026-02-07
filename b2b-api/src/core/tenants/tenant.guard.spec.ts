import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  let guard: TenantGuard;

  beforeEach(() => {
    guard = new TenantGuard();
  });

  const createMockContext = (tenant?: object, tenantId?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          tenant,
          tenantId,
        }),
      }),
    }) as ExecutionContext;

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when tenant context is present', () => {
    const context = createMockContext({ id: 'tenant-123' }, 'tenant-123');

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException when tenant is missing', () => {
    const context = createMockContext(undefined, 'tenant-123');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when tenantId is missing', () => {
    const context = createMockContext({ id: 'tenant-123' }, undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when both are missing', () => {
    const context = createMockContext(undefined, undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
