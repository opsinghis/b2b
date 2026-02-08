import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { PrismaService } from '@infrastructure/database';

describe('DiscountsService', () => {
  let service: DiscountsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockAdminId = 'admin-123';
  const mockTierId = 'tier-123';

  const mockTier = {
    id: mockTierId,
    tenantId: mockTenantId,
    name: 'Gold',
    code: 'GOLD',
    description: 'Gold tier',
    level: 2,
    discountPercent: 10,
    minSpend: 1000,
    minOrders: 10,
    isActive: true,
    color: '#FFD700',
    icon: 'star',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserTier = {
    id: 'user-tier-123',
    tenantId: mockTenantId,
    userId: mockUserId,
    discountTierId: mockTierId,
    assignedAt: new Date(),
    expiresAt: null,
    reason: 'Loyalty reward',
    totalSpend: 500,
    totalOrders: 5,
    totalSavings: 50,
    assignedById: mockAdminId,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    discountTier: mockTier,
  };

  const mockUser = {
    id: mockUserId,
    tenantId: mockTenantId,
    email: 'test@test.com',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscountsService,
        {
          provide: PrismaService,
          useValue: {
            discountTier: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            userDiscountTier: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DiscountsService>(DiscountsService);
    prismaService = module.get(PrismaService);
  });

  describe('getUserTier', () => {
    it('should return user tier', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(mockUserTier);

      const result = await service.getUserTier(mockTenantId, mockUserId);

      expect(result).not.toBeNull();
      expect(result!.tier.name).toBe('Gold');
    });

    it('should return null if user has no tier', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.getUserTier(mockTenantId, mockUserId);

      expect(result).toBeNull();
    });

    it('should return null if tier is expired', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue({
        ...mockUserTier,
        expiresAt: new Date('2020-01-01'),
      });

      const result = await service.getUserTier(mockTenantId, mockUserId);

      expect(result).toBeNull();
    });

    it('should return null if wrong tenant', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue({
        ...mockUserTier,
        tenantId: 'other-tenant',
      });

      const result = await service.getUserTier(mockTenantId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getUserSavings', () => {
    it('should return savings with current and next tier', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(mockUserTier);
      prismaService.discountTier.findMany = jest
        .fn()
        .mockResolvedValue([
          { ...mockTier, level: 1, code: 'SILVER', minSpend: 500 },
          mockTier,
          { ...mockTier, level: 3, code: 'PLATINUM', minSpend: 2000 },
        ]);

      const result = await service.getUserSavings(mockTenantId, mockUserId);

      expect(result.currentTier!.code).toBe('GOLD');
      expect(result.nextTier!.code).toBe('PLATINUM');
      expect(result.totalSpend).toBe(500);
    });

    it('should return savings without current tier for new user', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.discountTier.findMany = jest
        .fn()
        .mockResolvedValue([{ ...mockTier, level: 1, code: 'BRONZE', minSpend: 100 }]);

      const result = await service.getUserSavings(mockTenantId, mockUserId);

      expect(result.currentTier).toBeNull();
      expect(result.nextTier!.code).toBe('BRONZE');
      expect(result.totalSpend).toBe(0);
    });
  });

  describe('getDiscountForUser', () => {
    it('should return discount percentage', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(mockUserTier);

      const result = await service.getDiscountForUser(mockTenantId, mockUserId);

      expect(result).toBe(10);
    });

    it('should return 0 if no tier', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.getDiscountForUser(mockTenantId, mockUserId);

      expect(result).toBe(0);
    });

    it('should return 0 if tier is inactive', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue({
        ...mockUserTier,
        discountTier: { ...mockTier, isActive: false },
      });

      const result = await service.getDiscountForUser(mockTenantId, mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('recordPurchase', () => {
    it('should update user totals', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(mockUserTier);
      prismaService.userDiscountTier.update = jest.fn().mockResolvedValue(mockUserTier);

      await service.recordPurchase(mockTenantId, mockUserId, 100, 10);

      expect(prismaService.userDiscountTier.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          totalSpend: { increment: 100 },
          totalOrders: { increment: 1 },
          totalSavings: { increment: 10 },
        },
      });
    });

    it('should do nothing if user has no tier', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(null);

      await service.recordPurchase(mockTenantId, mockUserId, 100, 10);

      expect(prismaService.userDiscountTier.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all tiers', async () => {
      prismaService.discountTier.findMany = jest.fn().mockResolvedValue([mockTier]);
      prismaService.discountTier.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {});

      expect(result.tiers).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by isActive', async () => {
      prismaService.discountTier.findMany = jest.fn().mockResolvedValue([]);
      prismaService.discountTier.count = jest.fn().mockResolvedValue(0);

      await service.findAll(mockTenantId, { isActive: true });

      expect(prismaService.discountTier.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, isActive: true },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return tier', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(mockTier);

      const result = await service.findOne(mockTenantId, mockTierId);

      expect(result.name).toBe('Gold');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findOne(mockTenantId, 'not-found')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if wrong tenant', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue({
        ...mockTier,
        tenantId: 'other-tenant',
      });

      await expect(service.findOne(mockTenantId, mockTierId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create tier', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.discountTier.create = jest.fn().mockResolvedValue(mockTier);

      const result = await service.create(mockTenantId, {
        name: 'Gold',
        code: 'GOLD',
        discountPercent: 10,
      });

      expect(result.name).toBe('Gold');
    });

    it('should throw ConflictException if code exists', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(mockTier);

      await expect(
        service.create(mockTenantId, {
          name: 'Gold',
          code: 'GOLD',
          discountPercent: 10,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update tier', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(mockTier);
      prismaService.discountTier.update = jest.fn().mockResolvedValue({
        ...mockTier,
        name: 'Updated Gold',
      });

      const result = await service.update(mockTenantId, mockTierId, { name: 'Updated Gold' });

      expect(result.name).toBe('Updated Gold');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.update(mockTenantId, 'not-found', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete tier', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue({
        ...mockTier,
        _count: { userAssignments: 0 },
      });
      prismaService.discountTier.delete = jest.fn().mockResolvedValue(mockTier);

      await service.delete(mockTenantId, mockTierId);

      expect(prismaService.discountTier.delete).toHaveBeenCalledWith({
        where: { id: mockTierId },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.delete(mockTenantId, 'not-found')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if has assignments', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue({
        ...mockTier,
        _count: { userAssignments: 5 },
      });

      await expect(service.delete(mockTenantId, mockTierId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignTier', () => {
    it('should assign tier to user', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(mockTier);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.userDiscountTier.create = jest.fn().mockResolvedValue(mockUserTier);

      const result = await service.assignTier(
        mockTenantId,
        mockTierId,
        { userId: mockUserId },
        mockAdminId,
      );

      expect(result.tier.name).toBe('Gold');
    });

    it('should update existing assignment', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(mockTier);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(mockUser);
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(mockUserTier);
      prismaService.userDiscountTier.update = jest.fn().mockResolvedValue(mockUserTier);

      const result = await service.assignTier(
        mockTenantId,
        mockTierId,
        { userId: mockUserId },
        mockAdminId,
      );

      expect(result.tier.name).toBe('Gold');
      expect(prismaService.userDiscountTier.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tier not found', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.assignTier(mockTenantId, 'not-found', { userId: mockUserId }, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if tier is inactive', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue({
        ...mockTier,
        isActive: false,
      });

      await expect(
        service.assignTier(mockTenantId, mockTierId, { userId: mockUserId }, mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(mockTier);
      prismaService.user.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.assignTier(mockTenantId, mockTierId, { userId: 'not-found' }, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unassignTier', () => {
    it('should unassign tier from user', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(mockUserTier);
      prismaService.userDiscountTier.delete = jest.fn().mockResolvedValue(mockUserTier);

      await service.unassignTier(mockTenantId, mockUserId);

      expect(prismaService.userDiscountTier.delete).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should throw NotFoundException if assignment not found', async () => {
      prismaService.userDiscountTier.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.unassignTier(mockTenantId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTierAssignments', () => {
    it('should return tier assignments', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(mockTier);
      prismaService.userDiscountTier.findMany = jest.fn().mockResolvedValue([mockUserTier]);
      prismaService.userDiscountTier.count = jest.fn().mockResolvedValue(1);

      const result = await service.getTierAssignments(mockTenantId, mockTierId);

      expect(result.assignments).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException if tier not found', async () => {
      prismaService.discountTier.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getTierAssignments(mockTenantId, 'not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
