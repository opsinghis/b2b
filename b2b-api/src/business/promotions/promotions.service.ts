import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { UserRole, DiscountType } from '@prisma/client';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  GenerateCouponsDto,
  QueryPromotionsDto,
  PromotionResponseDto,
  CouponResponseDto,
  PromotionAnalyticsResponseDto,
  ApplyCouponResponseDto,
  PromotionsListResponseDto,
} from './dto';
import { randomBytes } from 'crypto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // User Operations
  // ============================================

  async getAvailablePromotions(
    tenantId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<PromotionResponseDto[]> {
    const now = new Date();

    const promotions = await this.prisma.promotion.findMany({
      where: {
        tenantId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        OR: [{ targetUserRoles: { isEmpty: true } }, { targetUserRoles: { has: userRole } }],
      },
      orderBy: { startDate: 'desc' },
    });

    // Filter out promotions that have reached their usage limit
    const filteredPromotions = promotions.filter((p) => {
      if (p.usageLimit === null) return true;
      return p.usageCount < p.usageLimit;
    });

    // Filter by per-user limit
    const availablePromotions: PromotionResponseDto[] = [];
    for (const promotion of filteredPromotions) {
      if (promotion.perUserLimit) {
        const userUsageCount = await this.prisma.promotionUsage.count({
          where: { promotionId: promotion.id, userId },
        });
        if (userUsageCount >= promotion.perUserLimit) {
          continue;
        }
      }
      availablePromotions.push(PromotionResponseDto.fromEntity(promotion));
    }

    return availablePromotions;
  }

  async validateCoupon(
    tenantId: string,
    userId: string,
    userRole: UserRole,
    code: string,
    orderAmount: number,
  ): Promise<ApplyCouponResponseDto> {
    const now = new Date();

    // First check if it's a direct promotion code
    const promotion = await this.prisma.promotion.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    if (promotion) {
      return this.validatePromotion(promotion, userId, userRole, orderAmount);
    }

    // Check if it's a coupon code
    const coupon = await this.prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code } },
      include: { promotion: true },
    });

    if (!coupon) {
      return { valid: false, message: 'Invalid coupon code' };
    }

    if (!coupon.isActive) {
      return { valid: false, message: 'Coupon is no longer active' };
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return { valid: false, message: 'Coupon has expired' };
    }

    if (coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, message: 'Coupon usage limit reached' };
    }

    if (coupon.assignedToId && coupon.assignedToId !== userId) {
      return { valid: false, message: 'Coupon is not assigned to you' };
    }

    return this.validatePromotion(coupon.promotion, userId, userRole, orderAmount);
  }

  private async validatePromotion(
    promotion: {
      id: string;
      isActive: boolean;
      startDate: Date;
      endDate: Date;
      targetUserRoles: UserRole[];
      usageLimit: number | null;
      usageCount: number;
      perUserLimit: number | null;
      minOrderAmount: unknown;
      discountValue: unknown;
      discountType: DiscountType;
      maxDiscount: unknown;
    },
    userId: string,
    userRole: UserRole,
    orderAmount: number,
  ): Promise<ApplyCouponResponseDto> {
    const now = new Date();

    if (!promotion.isActive) {
      return { valid: false, message: 'Promotion is not active' };
    }

    if (promotion.startDate > now) {
      return { valid: false, message: 'Promotion has not started yet' };
    }

    if (promotion.endDate < now) {
      return { valid: false, message: 'Promotion has ended' };
    }

    if (promotion.targetUserRoles.length > 0 && !promotion.targetUserRoles.includes(userRole)) {
      return { valid: false, message: 'Promotion is not available for your account' };
    }

    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return { valid: false, message: 'Promotion usage limit reached' };
    }

    if (promotion.perUserLimit) {
      const userUsageCount = await this.prisma.promotionUsage.count({
        where: { promotionId: promotion.id, userId },
      });
      if (userUsageCount >= promotion.perUserLimit) {
        return { valid: false, message: 'You have already used this promotion' };
      }
    }

    const minAmount = promotion.minOrderAmount ? Number(promotion.minOrderAmount) : 0;
    if (orderAmount < minAmount) {
      return {
        valid: false,
        message: `Minimum order amount of ${minAmount} required`,
      };
    }

    // Calculate discount
    let discountAmount: number;
    const discountValue = Number(promotion.discountValue);

    if (promotion.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (orderAmount * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }

    // Apply max discount cap
    const maxDiscount = promotion.maxDiscount ? Number(promotion.maxDiscount) : null;
    if (maxDiscount && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }

    return {
      valid: true,
      discountAmount,
      promotion: PromotionResponseDto.fromEntity(promotion as any),
    };
  }

  async recordUsage(
    tenantId: string,
    userId: string,
    promotionId: string,
    couponId: string | null,
    orderId: string,
    discountApplied: number,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.promotionUsage.create({
        data: {
          tenantId,
          promotionId,
          couponId,
          userId,
          orderId,
          discountApplied,
        },
      }),
      this.prisma.promotion.update({
        where: { id: promotionId },
        data: { usageCount: { increment: 1 } },
      }),
      ...(couponId
        ? [
            this.prisma.coupon.update({
              where: { id: couponId },
              data: { usageCount: { increment: 1 } },
            }),
          ]
        : []),
    ]);
  }

  // ============================================
  // Admin Operations
  // ============================================

  async findAll(tenantId: string, query: QueryPromotionsDto): Promise<PromotionsListResponseDto> {
    const { isActive, type, page = 1, limit = 20 } = query;

    const where: { tenantId: string; isActive?: boolean; type?: any } = { tenantId };
    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }
    if (type) {
      where.type = type;
    }

    const [promotions, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return {
      promotions: promotions.map(PromotionResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, promotionId: string): Promise<PromotionResponseDto> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion || promotion.tenantId !== tenantId) {
      throw new NotFoundException('Promotion not found');
    }

    return PromotionResponseDto.fromEntity(promotion);
  }

  async create(
    tenantId: string,
    dto: CreatePromotionDto,
    createdById: string,
  ): Promise<PromotionResponseDto> {
    // Check for duplicate code
    const existing = await this.prisma.promotion.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existing) {
      throw new ConflictException(`Promotion with code '${dto.code}' already exists`);
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const promotion = await this.prisma.promotion.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        type: dto.type,
        discountValue: dto.discountValue,
        discountType: dto.discountType,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit,
        startDate,
        endDate,
        isActive: dto.isActive ?? true,
        targetUserRoles: dto.targetUserRoles ?? [],
        conditions: dto.conditions ?? {},
        metadata: dto.metadata ?? {},
        createdById,
      },
    });

    return PromotionResponseDto.fromEntity(promotion);
  }

  async update(
    tenantId: string,
    promotionId: string,
    dto: UpdatePromotionDto,
  ): Promise<PromotionResponseDto> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion || promotion.tenantId !== tenantId) {
      throw new NotFoundException('Promotion not found');
    }

    // Validate dates if both are provided
    if (dto.startDate && dto.endDate) {
      const startDate = new Date(dto.startDate);
      const endDate = new Date(dto.endDate);
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const updated = await this.prisma.promotion.update({
      where: { id: promotionId },
      data: {
        name: dto.name,
        description: dto.description,
        discountValue: dto.discountValue,
        discountType: dto.discountType,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive,
        targetUserRoles: dto.targetUserRoles,
        conditions: dto.conditions,
        metadata: dto.metadata,
      },
    });

    return PromotionResponseDto.fromEntity(updated);
  }

  async delete(tenantId: string, promotionId: string): Promise<void> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: { _count: { select: { usages: true } } },
    });

    if (!promotion || promotion.tenantId !== tenantId) {
      throw new NotFoundException('Promotion not found');
    }

    if (promotion._count.usages > 0) {
      // Soft delete by deactivating
      await this.prisma.promotion.update({
        where: { id: promotionId },
        data: { isActive: false },
      });
    } else {
      await this.prisma.promotion.delete({
        where: { id: promotionId },
      });
    }
  }

  async generateCoupons(
    tenantId: string,
    promotionId: string,
    dto: GenerateCouponsDto,
  ): Promise<CouponResponseDto[]> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion || promotion.tenantId !== tenantId) {
      throw new NotFoundException('Promotion not found');
    }

    const coupons: CouponResponseDto[] = [];
    const prefix = dto.prefix || promotion.code;

    for (let i = 0; i < dto.count; i++) {
      const code = `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;

      // Check if code already exists
      const existing = await this.prisma.coupon.findUnique({
        where: { tenantId_code: { tenantId, code } },
      });

      if (existing) {
        i--; // Retry with different code
        continue;
      }

      const coupon = await this.prisma.coupon.create({
        data: {
          tenantId,
          promotionId,
          code,
          usageLimit: dto.usageLimit ?? 1,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });

      coupons.push(CouponResponseDto.fromEntity(coupon));
    }

    return coupons;
  }

  async getAnalytics(
    tenantId: string,
    promotionId: string,
  ): Promise<PromotionAnalyticsResponseDto> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion || promotion.tenantId !== tenantId) {
      throw new NotFoundException('Promotion not found');
    }

    const [totalUsages, totalDiscountGiven, uniqueUsers, couponsStats] = await Promise.all([
      this.prisma.promotionUsage.count({
        where: { promotionId },
      }),
      this.prisma.promotionUsage.aggregate({
        where: { promotionId },
        _sum: { discountApplied: true },
      }),
      this.prisma.promotionUsage.groupBy({
        by: ['userId'],
        where: { promotionId },
      }),
      this.prisma.coupon.aggregate({
        where: { promotionId },
        _count: { _all: true },
        _sum: { usageCount: true },
      }),
    ]);

    const activeCoupons = await this.prisma.coupon.count({
      where: { promotionId, isActive: true },
    });

    const usedCoupons = couponsStats._sum.usageCount || 0;
    const totalCoupons = couponsStats._count._all || 0;
    const conversionRate = totalCoupons > 0 ? (usedCoupons / totalCoupons) * 100 : 0;

    return {
      promotionId,
      totalUsages,
      totalDiscountGiven: Number(totalDiscountGiven._sum.discountApplied || 0),
      uniqueUsers: uniqueUsers.length,
      activeCoupons,
      usedCoupons,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  async getCoupons(
    tenantId: string,
    promotionId: string,
    page = 1,
    limit = 20,
  ): Promise<{ coupons: CouponResponseDto[]; total: number }> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion || promotion.tenantId !== tenantId) {
      throw new NotFoundException('Promotion not found');
    }

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where: { promotionId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({
        where: { promotionId },
      }),
    ]);

    return {
      coupons: coupons.map(CouponResponseDto.fromEntity),
      total,
    };
  }
}
