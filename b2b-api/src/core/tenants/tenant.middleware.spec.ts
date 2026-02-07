import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TenantMiddleware, TenantRequest } from './tenant.middleware';
import { PrismaService } from '@infrastructure/database';
import { Response } from 'express';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenant = {
    id: 'tenant-id-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    config: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantMiddleware,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should pass through when no tenant ID is provided', async () => {
    const req = { headers: {} } as TenantRequest;
    const res = {} as Response;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenant).toBeUndefined();
  });

  it('should set tenant context from x-tenant-id header', async () => {
    (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);

    const req = { headers: { 'x-tenant-id': 'tenant-id-123' } } as unknown as TenantRequest;
    const res = {} as Response;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenant).toEqual(mockTenant);
    expect(req.tenantId).toBe('tenant-id-123');
  });

  it('should set tenant context from slug', async () => {
    (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);

    const req = { headers: { 'x-tenant-id': 'test-tenant' } } as unknown as TenantRequest;
    const res = {} as Response;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenant).toEqual(mockTenant);
  });

  it('should throw UnauthorizedException for invalid tenant', async () => {
    (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(null);

    const req = { headers: { 'x-tenant-id': 'invalid-tenant' } } as unknown as TenantRequest;
    const res = {} as Response;
    const next = jest.fn();

    await expect(middleware.use(req, res, next)).rejects.toThrow(UnauthorizedException);
    expect(next).not.toHaveBeenCalled();
  });

  it('should extract tenant from subdomain', async () => {
    (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);

    const req = { headers: { host: 'test-tenant.example.com' } } as unknown as TenantRequest;
    const res = {} as Response;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenant).toEqual(mockTenant);
  });
});
