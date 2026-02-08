import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '@infrastructure/database';
import { PromotionType, DiscountType, UserRole } from '@prisma/client';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockAdminId = 'admin-123';
  const mockPromotionId = 'promotion-123';
  const mockCouponId = 'coupon-123';

  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  const mockPromotion = {
    id: mockPromotionId,
    tenantId: mockTenantId,
    name: 'Summer Sale',
    code: 'SUMMER20',
    description: 'Summer discount',
    type: PromotionType.PERCENTAGE,
    discountValue: 20,
    discountType: DiscountType.PERCENTAGE,
    minOrderAmount: 100,
    maxDiscount: 50,
    usageLimit: 100,
    usageCount: 10,
    perUserLimit: 2,
    startDate: pastDate,
    endDate: futureDate,
    isActive: true,
    targetUserRoles: [],
    conditions: {},
    metadata: {},
    createdById: mockAdminId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCoupon = {
    id: mockCouponId,
    tenantId: mockTenantId,
    promotionId: mockPromotionId,
    code: 'SUMMER20-ABC123',
    isActive: true,
    usageLimit: 1,
    usageCount: 0,
    expiresAt: null,
    assignedToId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    promotion: mockPromotion,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionsService,
        {
          provide: PrismaService,
          useValue: {
            promotion: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            coupon: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            promotionUsage: {
              create: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    prismaService = module.get(PrismaService);
  });

  describe('getAvailablePromotions', () => {
    it('should return available promotions', async () => {
      prismaService.promotion.findMany = jest.fn().mockResolvedValue([mockPromotion]);
      prismaService.promotionUsage.count = jest.fn().mockResolvedValue(0);

      const result = await service.getAvailablePromotions(mockTenantId, mockUserId, UserRole.USER);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('SUMMER20');
    });

    it('should filter out promotions at usage limit', async () => {
      prismaService.promotion.findMany = jest.fn().mockResolvedValue([
        { ...mockPromotion, usageCount: 100 }, // At limit
      ]);

      const result = await service.getAvailablePromotions(mockTenantId, mockUserId, UserRole.USER);

      expect(result).toHaveLength(0);
    });

    it('should filter out promotions where user reached per-user limit', async () => {
      prismaService.promotion.findMany = jest.fn().mockResolvedValue([mockPromotion]);
      prismaService.promotionUsage.count = jest.fn().mockResolvedValue(2); // At per-user limit

      const result = await service.getAvailablePromotions(mockTenantId, mockUserId, UserRole.USER);

      expect(result).toHaveLength(0);
    });
  });

  describe('validateCoupon', () => {
    it('should validate a promotion code', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);
      prismaService.promotionUsage.count = jest.fn().mockResolvedValue(0);

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20',
        150,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(30); // 20% of 150
    });

    it('should validate a coupon code', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.coupon.findUnique = jest.fn().mockResolvedValue(mockCoupon);
      prismaService.promotionUsage.count = jest.fn().mockResolvedValue(0);

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20-ABC123',
        150,
      );

      expect(result.valid).toBe(true);
    });

    it('should reject invalid code', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.coupon.findUnique = jest.fn().mockResolvedValue(null);

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'INVALID',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid coupon code');
    });

    it('should reject inactive promotion', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        isActive: false,
      });

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Promotion is not active');
    });

    it('should reject expired promotion', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        endDate: pastDate,
      });

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Promotion has ended');
    });

    it('should reject promotion not yet started', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        startDate: futureDate,
      });

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Promotion has not started yet');
    });

    it('should reject promotion for wrong user role', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        targetUserRoles: [UserRole.ADMIN],
      });

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Promotion is not available for your account');
    });

    it('should reject if order amount is below minimum', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20',
        50, // Below 100 minimum
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Minimum order amount of 100 required');
    });

    it('should apply max discount cap', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        maxDiscount: 50,
      });
      prismaService.promotionUsage.count = jest.fn().mockResolvedValue(0);

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20',
        500, // 20% would be 100, but max is 50
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(50);
    });

    it('should reject inactive coupon', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.coupon.findUnique = jest.fn().mockResolvedValue({
        ...mockCoupon,
        isActive: false,
      });

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20-ABC123',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon is no longer active');
    });

    it('should reject expired coupon', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.coupon.findUnique = jest.fn().mockResolvedValue({
        ...mockCoupon,
        expiresAt: pastDate,
      });

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20-ABC123',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon has expired');
    });

    it('should reject coupon at usage limit', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.coupon.findUnique = jest.fn().mockResolvedValue({
        ...mockCoupon,
        usageCount: 1,
        usageLimit: 1,
      });

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20-ABC123',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon usage limit reached');
    });

    it('should reject coupon assigned to different user', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.coupon.findUnique = jest.fn().mockResolvedValue({
        ...mockCoupon,
        assignedToId: 'other-user',
      });

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20-ABC123',
        150,
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Coupon is not assigned to you');
    });

    it('should calculate fixed discount correctly', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        discountType: DiscountType.FIXED,
        discountValue: 25,
        maxDiscount: null,
      });
      prismaService.promotionUsage.count = jest.fn().mockResolvedValue(0);

      const result = await service.validateCoupon(
        mockTenantId,
        mockUserId,
        UserRole.USER,
        'SUMMER20',
        150,
      );

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(25);
    });
  });

  describe('recordUsage', () => {
    it('should record promotion usage', async () => {
      prismaService.$transaction = jest.fn().mockResolvedValue(undefined);

      await service.recordUsage(mockTenantId, mockUserId, mockPromotionId, null, 'order-123', 30);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should record coupon usage', async () => {
      prismaService.$transaction = jest.fn().mockResolvedValue(undefined);

      await service.recordUsage(
        mockTenantId,
        mockUserId,
        mockPromotionId,
        mockCouponId,
        'order-123',
        30,
      );

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all promotions', async () => {
      prismaService.promotion.findMany = jest.fn().mockResolvedValue([mockPromotion]);
      prismaService.promotion.count = jest.fn().mockResolvedValue(1);

      const result = await service.findAll(mockTenantId, {});

      expect(result.promotions).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by isActive', async () => {
      prismaService.promotion.findMany = jest.fn().mockResolvedValue([]);
      prismaService.promotion.count = jest.fn().mockResolvedValue(0);

      await service.findAll(mockTenantId, { isActive: true });

      expect(prismaService.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, isActive: true },
        }),
      );
    });

    it('should filter by type', async () => {
      prismaService.promotion.findMany = jest.fn().mockResolvedValue([]);
      prismaService.promotion.count = jest.fn().mockResolvedValue(0);

      await service.findAll(mockTenantId, { type: PromotionType.PERCENTAGE });

      expect(prismaService.promotion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, type: PromotionType.PERCENTAGE },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return promotion', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);

      const result = await service.findOne(mockTenantId, mockPromotionId);

      expect(result.name).toBe('Summer Sale');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.findOne(mockTenantId, 'not-found')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if wrong tenant', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        tenantId: 'other-tenant',
      });

      await expect(service.findOne(mockTenantId, mockPromotionId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create promotion', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.promotion.create = jest.fn().mockResolvedValue(mockPromotion);

      const result = await service.create(
        mockTenantId,
        {
          name: 'Summer Sale',
          code: 'SUMMER20',
          type: PromotionType.PERCENTAGE,
          discountValue: 20,
          discountType: DiscountType.PERCENTAGE,
          startDate: pastDate.toISOString(),
          endDate: futureDate.toISOString(),
        },
        mockAdminId,
      );

      expect(result.name).toBe('Summer Sale');
    });

    it('should throw ConflictException if code exists', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);

      await expect(
        service.create(
          mockTenantId,
          {
            name: 'Summer Sale',
            code: 'SUMMER20',
            type: PromotionType.PERCENTAGE,
            discountValue: 20,
            discountType: DiscountType.PERCENTAGE,
            startDate: pastDate.toISOString(),
            endDate: futureDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if end date is before start date', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.create(
          mockTenantId,
          {
            name: 'Summer Sale',
            code: 'SUMMER20',
            type: PromotionType.PERCENTAGE,
            discountValue: 20,
            discountType: DiscountType.PERCENTAGE,
            startDate: futureDate.toISOString(),
            endDate: pastDate.toISOString(),
          },
          mockAdminId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update promotion', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);
      prismaService.promotion.update = jest.fn().mockResolvedValue({
        ...mockPromotion,
        name: 'Updated Sale',
      });

      const result = await service.update(mockTenantId, mockPromotionId, {
        name: 'Updated Sale',
      });

      expect(result.name).toBe('Updated Sale');
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.update(mockTenantId, 'not-found', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if dates are invalid', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);

      await expect(
        service.update(mockTenantId, mockPromotionId, {
          startDate: futureDate.toISOString(),
          endDate: pastDate.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete promotion with no usages', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        _count: { usages: 0 },
      });
      prismaService.promotion.delete = jest.fn().mockResolvedValue(mockPromotion);

      await service.delete(mockTenantId, mockPromotionId);

      expect(prismaService.promotion.delete).toHaveBeenCalledWith({
        where: { id: mockPromotionId },
      });
    });

    it('should soft delete promotion with usages', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue({
        ...mockPromotion,
        _count: { usages: 5 },
      });
      prismaService.promotion.update = jest.fn().mockResolvedValue(mockPromotion);

      await service.delete(mockTenantId, mockPromotionId);

      expect(prismaService.promotion.update).toHaveBeenCalledWith({
        where: { id: mockPromotionId },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.delete(mockTenantId, 'not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateCoupons', () => {
    it('should generate coupons', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);
      prismaService.coupon.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.coupon.create = jest.fn().mockImplementation(({ data }) => ({
        id: 'new-coupon',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.generateCoupons(mockTenantId, mockPromotionId, {
        count: 3,
        usageLimit: 1,
      });

      expect(result).toHaveLength(3);
      expect(prismaService.coupon.create).toHaveBeenCalledTimes(3);
    });

    it('should use custom prefix', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);
      prismaService.coupon.findUnique = jest.fn().mockResolvedValue(null);
      prismaService.coupon.create = jest.fn().mockImplementation(({ data }) => ({
        id: 'new-coupon',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.generateCoupons(mockTenantId, mockPromotionId, {
        count: 1,
        prefix: 'CUSTOM',
      });

      expect(result[0].code.startsWith('CUSTOM-')).toBe(true);
    });

    it('should throw NotFoundException if promotion not found', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);

      await expect(
        service.generateCoupons(mockTenantId, 'not-found', { count: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAnalytics', () => {
    it('should return promotion analytics', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);
      prismaService.promotionUsage.count = jest.fn().mockResolvedValue(50);
      prismaService.promotionUsage.aggregate = jest.fn().mockResolvedValue({
        _sum: { discountApplied: 1500 },
      });
      prismaService.promotionUsage.groupBy = jest
        .fn()
        .mockResolvedValue([{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }]);
      prismaService.coupon.aggregate = jest.fn().mockResolvedValue({
        _count: { _all: 100 },
        _sum: { usageCount: 30 },
      });
      prismaService.coupon.count = jest.fn().mockResolvedValue(70);

      const result = await service.getAnalytics(mockTenantId, mockPromotionId);

      expect(result.promotionId).toBe(mockPromotionId);
      expect(result.totalUsages).toBe(50);
      expect(result.totalDiscountGiven).toBe(1500);
      expect(result.uniqueUsers).toBe(3);
      expect(result.activeCoupons).toBe(70);
      expect(result.usedCoupons).toBe(30);
      expect(result.conversionRate).toBe(30);
    });

    it('should throw NotFoundException if promotion not found', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getAnalytics(mockTenantId, 'not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCoupons', () => {
    it('should return coupons for promotion', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(mockPromotion);
      prismaService.coupon.findMany = jest.fn().mockResolvedValue([mockCoupon]);
      prismaService.coupon.count = jest.fn().mockResolvedValue(1);

      const result = await service.getCoupons(mockTenantId, mockPromotionId);

      expect(result.coupons).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException if promotion not found', async () => {
      prismaService.promotion.findUnique = jest.fn().mockResolvedValue(null);

      await expect(service.getCoupons(mockTenantId, 'not-found')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
