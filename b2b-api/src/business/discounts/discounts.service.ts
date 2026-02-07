import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import {
  CreateDiscountTierDto,
  UpdateDiscountTierDto,
  AssignDiscountTierDto,
  QueryDiscountTiersDto,
  DiscountTierResponseDto,
  UserDiscountTierResponseDto,
  UserSavingsResponseDto,
  DiscountTiersListResponseDto,
} from './dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // User Operations
  // ============================================

  async getUserTier(
    tenantId: string,
    userId: string,
  ): Promise<UserDiscountTierResponseDto | null> {
    const userTier = await this.prisma.userDiscountTier.findUnique({
      where: { userId },
      include: { discountTier: true },
    });

    if (!userTier || userTier.tenantId !== tenantId) {
      return null;
    }

    // Check if tier is expired
    if (userTier.expiresAt && userTier.expiresAt < new Date()) {
      return null;
    }

    return UserDiscountTierResponseDto.fromEntity(userTier);
  }

  async getUserSavings(tenantId: string, userId: string): Promise<UserSavingsResponseDto> {
    const userTier = await this.prisma.userDiscountTier.findUnique({
      where: { userId },
      include: { discountTier: true },
    });

    // Get all active tiers sorted by level
    const allTiers = await this.prisma.discountTier.findMany({
      where: { tenantId, isActive: true },
      orderBy: { level: 'asc' },
    });

    const response = new UserSavingsResponseDto();

    if (userTier && userTier.tenantId === tenantId) {
      response.currentTier = DiscountTierResponseDto.fromEntity(userTier.discountTier);
      response.totalSpend = Number(userTier.totalSpend);
      response.totalOrders = userTier.totalOrders;
      response.totalSavings = Number(userTier.totalSavings);

      // Find next tier
      const nextTier = allTiers.find((t) => t.level > userTier.discountTier.level);
      if (nextTier) {
        response.nextTier = DiscountTierResponseDto.fromEntity(nextTier);
        const currentSpend = Number(userTier.totalSpend);
        const nextMinSpend = nextTier.minSpend ? Number(nextTier.minSpend) : null;
        response.spendToNextTier = nextMinSpend ? Math.max(0, nextMinSpend - currentSpend) : null;
        response.ordersToNextTier = nextTier.minOrders
          ? Math.max(0, nextTier.minOrders - userTier.totalOrders)
          : null;
      } else {
        response.nextTier = null;
        response.spendToNextTier = null;
        response.ordersToNextTier = null;
      }
    } else {
      response.currentTier = null;
      response.totalSpend = 0;
      response.totalOrders = 0;
      response.totalSavings = 0;

      // Find first tier (lowest level)
      const firstTier = allTiers[0];
      if (firstTier) {
        response.nextTier = DiscountTierResponseDto.fromEntity(firstTier);
        response.spendToNextTier = firstTier.minSpend ? Number(firstTier.minSpend) : null;
        response.ordersToNextTier = firstTier.minOrders || null;
      } else {
        response.nextTier = null;
        response.spendToNextTier = null;
        response.ordersToNextTier = null;
      }
    }

    return response;
  }

  async getDiscountForUser(tenantId: string, userId: string): Promise<number> {
    const userTier = await this.prisma.userDiscountTier.findUnique({
      where: { userId },
      include: { discountTier: true },
    });

    if (
      !userTier ||
      userTier.tenantId !== tenantId ||
      !userTier.discountTier.isActive
    ) {
      return 0;
    }

    // Check if tier is expired
    if (userTier.expiresAt && userTier.expiresAt < new Date()) {
      return 0;
    }

    return Number(userTier.discountTier.discountPercent);
  }

  async recordPurchase(
    tenantId: string,
    userId: string,
    orderAmount: number,
    discountSaved: number,
  ): Promise<void> {
    const userTier = await this.prisma.userDiscountTier.findUnique({
      where: { userId },
    });

    if (userTier && userTier.tenantId === tenantId) {
      await this.prisma.userDiscountTier.update({
        where: { userId },
        data: {
          totalSpend: { increment: orderAmount },
          totalOrders: { increment: 1 },
          totalSavings: { increment: discountSaved },
        },
      });
    }
  }

  // ============================================
  // Admin Operations
  // ============================================

  async findAll(
    tenantId: string,
    query: QueryDiscountTiersDto,
  ): Promise<DiscountTiersListResponseDto> {
    const { isActive, page = 1, limit = 20 } = query;

    const where: { tenantId: string; isActive?: boolean } = { tenantId };
    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const [tiers, total] = await Promise.all([
      this.prisma.discountTier.findMany({
        where,
        orderBy: { level: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.discountTier.count({ where }),
    ]);

    return {
      tiers: tiers.map(DiscountTierResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, tierId: string): Promise<DiscountTierResponseDto> {
    const tier = await this.prisma.discountTier.findUnique({
      where: { id: tierId },
    });

    if (!tier || tier.tenantId !== tenantId) {
      throw new NotFoundException('Discount tier not found');
    }

    return DiscountTierResponseDto.fromEntity(tier);
  }

  async create(
    tenantId: string,
    dto: CreateDiscountTierDto,
  ): Promise<DiscountTierResponseDto> {
    // Check for duplicate code
    const existing = await this.prisma.discountTier.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existing) {
      throw new ConflictException(`Discount tier with code '${dto.code}' already exists`);
    }

    const tier = await this.prisma.discountTier.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        level: dto.level ?? 0,
        discountPercent: dto.discountPercent,
        minSpend: dto.minSpend,
        minOrders: dto.minOrders,
        isActive: dto.isActive ?? true,
        color: dto.color,
        icon: dto.icon,
        metadata: dto.metadata ?? {},
      },
    });

    return DiscountTierResponseDto.fromEntity(tier);
  }

  async update(
    tenantId: string,
    tierId: string,
    dto: UpdateDiscountTierDto,
  ): Promise<DiscountTierResponseDto> {
    const tier = await this.prisma.discountTier.findUnique({
      where: { id: tierId },
    });

    if (!tier || tier.tenantId !== tenantId) {
      throw new NotFoundException('Discount tier not found');
    }

    const updated = await this.prisma.discountTier.update({
      where: { id: tierId },
      data: {
        name: dto.name,
        description: dto.description,
        level: dto.level,
        discountPercent: dto.discountPercent,
        minSpend: dto.minSpend,
        minOrders: dto.minOrders,
        isActive: dto.isActive,
        color: dto.color,
        icon: dto.icon,
        metadata: dto.metadata,
      },
    });

    return DiscountTierResponseDto.fromEntity(updated);
  }

  async delete(tenantId: string, tierId: string): Promise<void> {
    const tier = await this.prisma.discountTier.findUnique({
      where: { id: tierId },
      include: { _count: { select: { userAssignments: true } } },
    });

    if (!tier || tier.tenantId !== tenantId) {
      throw new NotFoundException('Discount tier not found');
    }

    if (tier._count.userAssignments > 0) {
      throw new BadRequestException(
        `Cannot delete tier with ${tier._count.userAssignments} active assignments`,
      );
    }

    await this.prisma.discountTier.delete({
      where: { id: tierId },
    });
  }

  async assignTier(
    tenantId: string,
    tierId: string,
    dto: AssignDiscountTierDto,
    assignedById: string,
  ): Promise<UserDiscountTierResponseDto> {
    const tier = await this.prisma.discountTier.findUnique({
      where: { id: tierId },
    });

    if (!tier || tier.tenantId !== tenantId) {
      throw new NotFoundException('Discount tier not found');
    }

    if (!tier.isActive) {
      throw new BadRequestException('Cannot assign inactive tier');
    }

    // Verify user exists in tenant
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a tier assignment
    const existing = await this.prisma.userDiscountTier.findUnique({
      where: { userId: dto.userId },
    });

    let userTier;
    if (existing) {
      // Update existing assignment
      userTier = await this.prisma.userDiscountTier.update({
        where: { userId: dto.userId },
        data: {
          discountTierId: tierId,
          assignedAt: new Date(),
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          reason: dto.reason,
          assignedById,
        },
        include: { discountTier: true },
      });
    } else {
      // Create new assignment
      userTier = await this.prisma.userDiscountTier.create({
        data: {
          tenantId,
          userId: dto.userId,
          discountTierId: tierId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          reason: dto.reason,
          assignedById,
        },
        include: { discountTier: true },
      });
    }

    return UserDiscountTierResponseDto.fromEntity(userTier);
  }

  async unassignTier(tenantId: string, userId: string): Promise<void> {
    const userTier = await this.prisma.userDiscountTier.findUnique({
      where: { userId },
    });

    if (!userTier || userTier.tenantId !== tenantId) {
      throw new NotFoundException('User tier assignment not found');
    }

    await this.prisma.userDiscountTier.delete({
      where: { userId },
    });
  }

  async getTierAssignments(
    tenantId: string,
    tierId: string,
    page = 1,
    limit = 20,
  ): Promise<{ assignments: UserDiscountTierResponseDto[]; total: number }> {
    const tier = await this.prisma.discountTier.findUnique({
      where: { id: tierId },
    });

    if (!tier || tier.tenantId !== tenantId) {
      throw new NotFoundException('Discount tier not found');
    }

    const [assignments, total] = await Promise.all([
      this.prisma.userDiscountTier.findMany({
        where: { discountTierId: tierId },
        include: { discountTier: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { assignedAt: 'desc' },
      }),
      this.prisma.userDiscountTier.count({
        where: { discountTierId: tierId },
      }),
    ]);

    return {
      assignments: assignments.map(UserDiscountTierResponseDto.fromEntity),
      total,
    };
  }
}
