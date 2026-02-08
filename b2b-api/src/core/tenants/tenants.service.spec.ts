import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '@infrastructure/database';
import { Tenant } from '@prisma/client';

describe('TenantsService', () => {
  let service: TenantsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenant: Tenant = {
    id: 'tenant-id-123',
    name: 'Test Tenant',
    slug: 'test-tenant',
    config: { theme: 'dark' },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new tenant', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.tenant.create as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
        config: { theme: 'dark' },
      });

      expect(result).toEqual(mockTenant);
      expect(prismaService.tenant.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Tenant',
          slug: 'test-tenant',
          config: { theme: 'dark' },
        },
      });
    });

    it('should throw ConflictException if slug already exists', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      await expect(
        service.create({
          name: 'Test Tenant',
          slug: 'test-tenant',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should use empty object for config if not provided', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.tenant.create as jest.Mock).mockResolvedValue(mockTenant);

      await service.create({
        name: 'Test Tenant',
        slug: 'test-tenant',
      });

      expect(prismaService.tenant.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Tenant',
          slug: 'test-tenant',
          config: {},
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated tenants', async () => {
      const tenants = [mockTenant];
      (prismaService.tenant.findMany as jest.Mock).mockResolvedValue(tenants);
      (prismaService.tenant.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: tenants,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by search term', async () => {
      (prismaService.tenant.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.tenant.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ search: 'test' });

      expect(prismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { slug: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by active status', async () => {
      (prismaService.tenant.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.tenant.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ isActive: true });

      expect(prismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('should exclude soft-deleted tenants by default', async () => {
      (prismaService.tenant.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.tenant.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({});

      expect(prismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });

    it('should include soft-deleted tenants when requested', async () => {
      (prismaService.tenant.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.tenant.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ includeDeleted: true });

      expect(prismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a tenant by id', async () => {
      (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.findOne('tenant-id-123');

      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('should return a tenant by slug', async () => {
      (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.findBySlug('test-tenant');

      expect(result).toEqual(mockTenant);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a tenant', async () => {
      const updatedTenant = { ...mockTenant, name: 'Updated Tenant' };
      (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
      (prismaService.tenant.update as jest.Mock).mockResolvedValue(updatedTenant);

      const result = await service.update('tenant-id-123', { name: 'Updated Tenant' });

      expect(result.name).toBe('Updated Tenant');
    });

    it('should throw NotFoundException if tenant not found', async () => {
      (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.update('non-existent-id', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if updating to existing slug', async () => {
      const existingTenant = { ...mockTenant, id: 'other-tenant-id' };
      (prismaService.tenant.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockTenant) // First call for findOne
        .mockResolvedValueOnce(existingTenant); // Second call for slug check

      await expect(service.update('tenant-id-123', { slug: 'existing-slug' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow updating to same slug (no conflict)', async () => {
      (prismaService.tenant.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockTenant) // First call for findOne
        .mockResolvedValueOnce(null); // No conflicting tenant
      (prismaService.tenant.update as jest.Mock).mockResolvedValue(mockTenant);

      const result = await service.update('tenant-id-123', { slug: 'new-slug' });

      expect(result).toEqual(mockTenant);
    });
  });

  describe('remove', () => {
    it('should soft delete a tenant', async () => {
      (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(mockTenant);
      (prismaService.tenant.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        deletedAt: new Date(),
      });

      await service.remove('tenant-id-123');

      expect(prismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-id-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      (prismaService.tenant.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted tenant', async () => {
      const deletedTenant = { ...mockTenant, deletedAt: new Date() };
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(deletedTenant);
      (prismaService.tenant.update as jest.Mock).mockResolvedValue({
        ...mockTenant,
        deletedAt: null,
      });

      const result = await service.restore('tenant-id-123');

      expect(result.deletedAt).toBeNull();
    });

    it('should throw NotFoundException if tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.restore('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if tenant is not deleted', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);

      await expect(service.restore('tenant-id-123')).rejects.toThrow(ConflictException);
    });
  });
});
