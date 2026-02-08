import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@infrastructure/database';
import { Organization } from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const tenantId = 'tenant-id-123';

  const mockOrganization: Organization = {
    id: 'org-id-123',
    name: 'Engineering',
    code: 'ENG',
    description: 'Engineering department',
    isActive: true,
    parentId: null,
    tenantId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockChildOrg: Organization = {
    id: 'org-id-456',
    name: 'Frontend Team',
    code: 'ENG-FE',
    description: 'Frontend developers',
    isActive: true,
    parentId: 'org-id-123',
    tenantId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: {
            organization: {
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

    service = module.get<OrganizationsService>(OrganizationsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new organization', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.organization.create as jest.Mock).mockResolvedValue(mockOrganization);

      const result = await service.create(tenantId, {
        name: 'Engineering',
        code: 'ENG',
        description: 'Engineering department',
      });

      expect(result).toEqual(mockOrganization);
      expect(prismaService.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Engineering',
          code: 'ENG',
          description: 'Engineering department',
          parentId: undefined,
          tenantId,
        },
      });
    });

    it('should throw ConflictException if code already exists', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrganization);

      await expect(
        service.create(tenantId, {
          name: 'Engineering',
          code: 'ENG',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create organization with parent', async () => {
      (prismaService.organization.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // Code check
        .mockResolvedValueOnce(mockOrganization); // Parent check
      (prismaService.organization.create as jest.Mock).mockResolvedValue(mockChildOrg);

      const result = await service.create(tenantId, {
        name: 'Frontend Team',
        code: 'ENG-FE',
        parentId: 'org-id-123',
      });

      expect(result.parentId).toBe('org-id-123');
    });

    it('should throw NotFoundException if parent does not exist', async () => {
      (prismaService.organization.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // Code check
        .mockResolvedValueOnce(null); // Parent check

      await expect(
        service.create(tenantId, {
          name: 'Frontend Team',
          code: 'ENG-FE',
          parentId: 'non-existent-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated organizations', async () => {
      const organizations = [mockOrganization];
      (prismaService.organization.findMany as jest.Mock).mockResolvedValue(organizations);
      (prismaService.organization.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(tenantId, { page: 1, limit: 20 });

      expect(result).toEqual({
        data: organizations,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by search term', async () => {
      (prismaService.organization.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.organization.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(tenantId, { search: 'eng' });

      expect(prismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'eng', mode: 'insensitive' } },
              { code: { contains: 'eng', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by parent ID', async () => {
      (prismaService.organization.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.organization.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(tenantId, { parentId: 'org-id-123' });

      expect(prismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            parentId: 'org-id-123',
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an organization by id', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrganization);

      const result = await service.findOne(tenantId, 'org-id-123');

      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return an organization by code', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrganization);

      const result = await service.findByCode(tenantId, 'ENG');

      expect(result).toEqual(mockOrganization);
    });

    it('should throw NotFoundException if organization not found', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findByCode(tenantId, 'NON-EXISTENT')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an organization', async () => {
      const updatedOrg = { ...mockOrganization, name: 'Updated Engineering' };
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrganization);
      (prismaService.organization.update as jest.Mock).mockResolvedValue(updatedOrg);

      const result = await service.update(tenantId, 'org-id-123', {
        name: 'Updated Engineering',
      });

      expect(result.name).toBe('Updated Engineering');
    });

    it('should throw NotFoundException if organization not found', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'non-existent-id', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updating to existing code', async () => {
      const existingOrg = { ...mockOrganization, id: 'other-org-id' };
      (prismaService.organization.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockOrganization) // findOne
        .mockResolvedValueOnce(existingOrg); // Code check

      await expect(service.update(tenantId, 'org-id-123', { code: 'EXISTING' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if setting self as parent', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrganization);

      await expect(
        service.update(tenantId, 'org-id-123', { parentId: 'org-id-123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if new parent does not exist', async () => {
      (prismaService.organization.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockOrganization) // findOne
        .mockResolvedValueOnce(null); // Parent check

      await expect(
        service.update(tenantId, 'org-id-123', { parentId: 'non-existent-id' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an organization', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrganization);
      (prismaService.organization.count as jest.Mock).mockResolvedValue(0);
      (prismaService.organization.update as jest.Mock).mockResolvedValue({
        ...mockOrganization,
        deletedAt: new Date(),
      });

      await service.remove(tenantId, 'org-id-123');

      expect(prismaService.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-id-123' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove(tenantId, 'non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if organization has children', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrganization);
      (prismaService.organization.count as jest.Mock).mockResolvedValue(1);

      await expect(service.remove(tenantId, 'org-id-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted organization', async () => {
      const deletedOrg = { ...mockOrganization, deletedAt: new Date() };
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(deletedOrg);
      (prismaService.organization.update as jest.Mock).mockResolvedValue({
        ...mockOrganization,
        deletedAt: null,
      });

      const result = await service.restore(tenantId, 'org-id-123');

      expect(result.deletedAt).toBeNull();
    });

    it('should throw NotFoundException if organization not found', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.restore(tenantId, 'non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if organization is not deleted', async () => {
      (prismaService.organization.findFirst as jest.Mock).mockResolvedValue(mockOrganization);

      await expect(service.restore(tenantId, 'org-id-123')).rejects.toThrow(ConflictException);
    });
  });

  describe('getHierarchy', () => {
    it('should return hierarchy tree', async () => {
      (prismaService.organization.findMany as jest.Mock).mockResolvedValue([
        mockOrganization,
        mockChildOrg,
      ]);

      const result = await service.getHierarchy(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('org-id-123');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('org-id-456');
    });

    it('should return subtree when rootId is provided', async () => {
      (prismaService.organization.findMany as jest.Mock).mockResolvedValue([
        mockOrganization,
        mockChildOrg,
      ]);

      const result = await service.getHierarchy(tenantId, 'org-id-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('org-id-123');
    });

    it('should throw NotFoundException if rootId not found', async () => {
      (prismaService.organization.findMany as jest.Mock).mockResolvedValue([mockOrganization]);

      await expect(service.getHierarchy(tenantId, 'non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
