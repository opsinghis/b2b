import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { PartnerCommissionStatus } from '@prisma/client';
import {
  CreatePartnerDto,
  UpdatePartnerDto,
  AddTeamMemberDto,
  CreateResourceDto,
  QueryPartnersDto,
  QueryCommissionsDto,
  CreateOrderOnBehalfDto,
  PartnerResponseDto,
  TeamMemberResponseDto,
  CommissionResponseDto,
  ResourceResponseDto,
  CommissionSummaryResponseDto,
  PartnersListResponseDto,
  CommissionsListResponseDto,
} from './dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Partner Profile Operations
  // ============================================

  async getMyProfile(tenantId: string, userId: string): Promise<PartnerResponseDto | null> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      return null;
    }

    return PartnerResponseDto.fromEntity(partner);
  }

  async getCommissionSummary(
    tenantId: string,
    userId: string,
  ): Promise<CommissionSummaryResponseDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner profile not found');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [totalEarned, totalPending, totalPaid, currentMonth, teamOrderCount] = await Promise.all([
      this.prisma.partnerCommission.aggregate({
        where: { partnerId: partner.id },
        _sum: { amount: true },
      }),
      this.prisma.partnerCommission.aggregate({
        where: { partnerId: partner.id, status: PartnerCommissionStatus.PENDING },
        _sum: { amount: true },
      }),
      this.prisma.partnerCommission.aggregate({
        where: { partnerId: partner.id, status: PartnerCommissionStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.partnerCommission.aggregate({
        where: {
          partnerId: partner.id,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.partnerCommission.count({
        where: { partnerId: partner.id },
      }),
    ]);

    return {
      totalEarned: Number(totalEarned._sum.amount || 0),
      totalPending: Number(totalPending._sum.amount || 0),
      totalPaid: Number(totalPaid._sum.amount || 0),
      currentMonthCommission: Number(currentMonth._sum.amount || 0),
      commissionRate: Number(partner.commissionRate),
      teamOrderCount,
    };
  }

  async getMyCommissions(
    tenantId: string,
    userId: string,
    query: QueryCommissionsDto,
  ): Promise<CommissionsListResponseDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner profile not found');
    }

    const { status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: {
      partnerId: string;
      status?: PartnerCommissionStatus;
      createdAt?: { gte?: Date; lte?: Date };
    } = { partnerId: partner.id };

    if (status) {
      where.status = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [commissions, total] = await Promise.all([
      this.prisma.partnerCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partnerCommission.count({ where }),
    ]);

    return {
      commissions: commissions.map(CommissionResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }

  // ============================================
  // Team Management Operations
  // ============================================

  async getTeamMembers(
    tenantId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ members: TeamMemberResponseDto[]; total: number }> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner profile not found');
    }

    const [members, total] = await Promise.all([
      this.prisma.partnerTeamMember.findMany({
        where: { partnerId: partner.id, isActive: true },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { joinedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partnerTeamMember.count({
        where: { partnerId: partner.id, isActive: true },
      }),
    ]);

    return {
      members: members.map(TeamMemberResponseDto.fromEntity),
      total,
    };
  }

  async addTeamMember(
    tenantId: string,
    userId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner profile not found');
    }

    // Verify user exists and belongs to tenant
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a team member
    const existing = await this.prisma.partnerTeamMember.findUnique({
      where: { partnerId_userId: { partnerId: partner.id, userId: dto.userId } },
    });

    if (existing && existing.isActive) {
      throw new ConflictException('User is already a team member');
    }

    let member;
    if (existing) {
      // Reactivate existing member
      member = await this.prisma.partnerTeamMember.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          leftAt: null,
          role: dto.role,
          joinedAt: new Date(),
          metadata: dto.metadata ?? {},
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      });
    } else {
      member = await this.prisma.partnerTeamMember.create({
        data: {
          tenantId,
          partnerId: partner.id,
          userId: dto.userId,
          role: dto.role,
          metadata: dto.metadata ?? {},
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      });
    }

    return TeamMemberResponseDto.fromEntity(member);
  }

  async removeTeamMember(tenantId: string, userId: string, memberUserId: string): Promise<void> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner profile not found');
    }

    const member = await this.prisma.partnerTeamMember.findUnique({
      where: { partnerId_userId: { partnerId: partner.id, userId: memberUserId } },
    });

    if (!member || !member.isActive) {
      throw new NotFoundException('Team member not found');
    }

    await this.prisma.partnerTeamMember.update({
      where: { id: member.id },
      data: {
        isActive: false,
        leftAt: new Date(),
      },
    });
  }

  // ============================================
  // Resource Operations
  // ============================================

  async getResources(
    tenantId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ resources: ResourceResponseDto[]; total: number }> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner profile not found');
    }

    // Get partner-specific resources and public resources
    const [resources, total] = await Promise.all([
      this.prisma.partnerResource.findMany({
        where: {
          tenantId,
          OR: [{ partnerId: partner.id }, { isPublic: true }],
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partnerResource.count({
        where: {
          tenantId,
          OR: [{ partnerId: partner.id }, { isPublic: true }],
        },
      }),
    ]);

    return {
      resources: resources.map(ResourceResponseDto.fromEntity),
      total,
    };
  }

  // ============================================
  // Order On-Behalf Operations
  // ============================================

  async createOrderOnBehalf(
    tenantId: string,
    userId: string,
    dto: CreateOrderOnBehalfDto,
  ): Promise<{ orderId: string; commissionAmount: number }> {
    const partner = await this.prisma.partner.findUnique({
      where: { userId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner profile not found');
    }

    if (!partner.isActive) {
      throw new ForbiddenException('Partner account is not active');
    }

    // Verify team member
    const teamMember = await this.prisma.partnerTeamMember.findUnique({
      where: { partnerId_userId: { partnerId: partner.id, userId: dto.teamMemberUserId } },
    });

    if (!teamMember || !teamMember.isActive) {
      throw new BadRequestException('User is not an active team member');
    }

    // Get products and calculate totals
    const productIds = dto.items.map((item) => item.masterProductId);
    const products = await this.prisma.masterProduct.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products not found');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotal = 0;

    const orderItems = dto.items.map((item, index) => {
      const product = productMap.get(item.masterProductId)!;
      const unitPrice = Number(product.listPrice);
      const total = unitPrice * item.quantity;
      subtotal += total;

      return {
        lineNumber: index + 1,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice,
        total,
        masterProductId: item.masterProductId,
      };
    });

    // Generate order number
    const orderNumber = `PO-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calculate commission
    const commissionRate = Number(partner.commissionRate);
    const commissionAmount = (subtotal * commissionRate) / 100;

    // Create order and commission in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          tenantId,
          userId: dto.teamMemberUserId,
          orderNumber,
          subtotal,
          total: subtotal,
          notes: dto.notes,
          metadata: {
            createdByPartnerId: partner.id,
            isPartnerOrder: true,
          },
          items: {
            create: orderItems,
          },
        },
      });

      await tx.partnerCommission.create({
        data: {
          tenantId,
          partnerId: partner.id,
          orderId: order.id,
          teamMemberId: dto.teamMemberUserId,
          amount: commissionAmount,
          rate: commissionRate,
          orderTotal: subtotal,
        },
      });

      return order;
    });

    return {
      orderId: result.id,
      commissionAmount,
    };
  }

  async calculateCommission(
    tenantId: string,
    partnerId: string,
    orderId: string,
    orderTotal: number,
    teamMemberId: string,
  ): Promise<CommissionResponseDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner not found');
    }

    const commissionRate = Number(partner.commissionRate);
    const commissionAmount = (orderTotal * commissionRate) / 100;

    const commission = await this.prisma.partnerCommission.create({
      data: {
        tenantId,
        partnerId,
        orderId,
        teamMemberId,
        amount: commissionAmount,
        rate: commissionRate,
        orderTotal,
      },
    });

    return CommissionResponseDto.fromEntity(commission);
  }

  // ============================================
  // Admin Operations
  // ============================================

  async findAll(tenantId: string, query: QueryPartnersDto): Promise<PartnersListResponseDto> {
    const { isActive, organizationId, page = 1, limit = 20 } = query;

    const where: {
      tenantId: string;
      isActive?: boolean;
      organizationId?: string;
    } = { tenantId };

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [partners, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      partners: partners.map(PartnerResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }

  async findOne(tenantId: string, partnerId: string): Promise<PartnerResponseDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner not found');
    }

    return PartnerResponseDto.fromEntity(partner);
  }

  async create(tenantId: string, dto: CreatePartnerDto): Promise<PartnerResponseDto> {
    // Check for duplicate code
    const existingByCode = await this.prisma.partner.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });

    if (existingByCode) {
      throw new ConflictException(`Partner with code '${dto.code}' already exists`);
    }

    // Check if user already has a partner profile
    const existingByUser = await this.prisma.partner.findUnique({
      where: { userId: dto.userId },
    });

    if (existingByUser) {
      throw new ConflictException('User already has a partner profile');
    }

    // Verify user exists
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify organization if provided
    if (dto.organizationId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: dto.organizationId, tenantId },
      });
      if (!org) {
        throw new NotFoundException('Organization not found');
      }
    }

    const partner = await this.prisma.partner.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        userId: dto.userId,
        organizationId: dto.organizationId,
        commissionRate: dto.commissionRate ?? 0,
        metadata: dto.metadata ?? {},
      },
    });

    return PartnerResponseDto.fromEntity(partner);
  }

  async update(
    tenantId: string,
    partnerId: string,
    dto: UpdatePartnerDto,
  ): Promise<PartnerResponseDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner not found');
    }

    // Verify organization if provided
    if (dto.organizationId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: dto.organizationId, tenantId },
      });
      if (!org) {
        throw new NotFoundException('Organization not found');
      }
    }

    const updated = await this.prisma.partner.update({
      where: { id: partnerId },
      data: {
        name: dto.name,
        description: dto.description,
        organizationId: dto.organizationId,
        commissionRate: dto.commissionRate,
        isActive: dto.isActive,
        metadata: dto.metadata,
      },
    });

    return PartnerResponseDto.fromEntity(updated);
  }

  async delete(tenantId: string, partnerId: string): Promise<void> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: { _count: { select: { commissions: true, teamMembers: true } } },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner not found');
    }

    if (partner._count.commissions > 0 || partner._count.teamMembers > 0) {
      // Soft delete by deactivating
      await this.prisma.partner.update({
        where: { id: partnerId },
        data: { isActive: false },
      });
    } else {
      await this.prisma.partner.delete({
        where: { id: partnerId },
      });
    }
  }

  async createResource(
    tenantId: string,
    dto: CreateResourceDto,
    uploadedById: string,
    partnerId?: string,
  ): Promise<ResourceResponseDto> {
    const resource = await this.prisma.partnerResource.create({
      data: {
        tenantId,
        partnerId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        url: dto.url,
        fileKey: dto.fileKey,
        isPublic: dto.isPublic ?? false,
        sortOrder: dto.sortOrder ?? 0,
        uploadedById,
        metadata: dto.metadata ?? {},
      },
    });

    return ResourceResponseDto.fromEntity(resource);
  }

  async deleteResource(tenantId: string, resourceId: string): Promise<void> {
    const resource = await this.prisma.partnerResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource || resource.tenantId !== tenantId) {
      throw new NotFoundException('Resource not found');
    }

    await this.prisma.partnerResource.delete({
      where: { id: resourceId },
    });
  }

  async getPartnerCommissions(
    tenantId: string,
    partnerId: string,
    query: QueryCommissionsDto,
  ): Promise<CommissionsListResponseDto> {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner || partner.tenantId !== tenantId) {
      throw new NotFoundException('Partner not found');
    }

    const { status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: {
      partnerId: string;
      status?: PartnerCommissionStatus;
      createdAt?: { gte?: Date; lte?: Date };
    } = { partnerId };

    if (status) {
      where.status = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [commissions, total] = await Promise.all([
      this.prisma.partnerCommission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.partnerCommission.count({ where }),
    ]);

    return {
      commissions: commissions.map(CommissionResponseDto.fromEntity),
      total,
      page,
      limit,
    };
  }

  async updateCommissionStatus(
    tenantId: string,
    commissionId: string,
    status: PartnerCommissionStatus,
  ): Promise<CommissionResponseDto> {
    const commission = await this.prisma.partnerCommission.findUnique({
      where: { id: commissionId },
    });

    if (!commission || commission.tenantId !== tenantId) {
      throw new NotFoundException('Commission not found');
    }

    const updated = await this.prisma.partnerCommission.update({
      where: { id: commissionId },
      data: {
        status,
        paidAt: status === PartnerCommissionStatus.PAID ? new Date() : undefined,
      },
    });

    return CommissionResponseDto.fromEntity(updated);
  }
}
