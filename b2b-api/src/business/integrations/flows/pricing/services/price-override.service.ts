import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Prisma, PriceOverride } from '@prisma/client';
import {
  PriceOverrideDTO,
  PriceOverrideType,
  PriceOverrideScopeType,
  PriceOverrideStatus,
} from '../interfaces';

@Injectable()
export class PriceOverrideService {
  private readonly logger = new Logger(PriceOverrideService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a price override
   */
  async createOverride(
    tenantId: string,
    data: Omit<PriceOverrideDTO, 'id' | 'tenantId'>,
  ): Promise<PriceOverride> {
    // Validate price list item exists
    const priceListItem = await this.prisma.priceListItem.findFirst({
      where: { id: data.priceListItemId },
      include: { priceList: true },
    });

    if (!priceListItem || priceListItem.priceList.tenantId !== tenantId) {
      throw new NotFoundException(`Price list item not found: ${data.priceListItemId}`);
    }

    // Check for conflicting overrides
    const conflictingOverride = await this.findConflictingOverride(
      tenantId,
      data.priceListItemId,
      data.scopeType,
      data.scopeId,
      data.effectiveFrom,
      data.effectiveTo,
      data.minQuantity,
      data.maxQuantity,
    );

    if (conflictingOverride) {
      throw new BadRequestException(
        `Conflicting override exists for this scope and date range: ${conflictingOverride.id}`,
      );
    }

    return this.prisma.priceOverride.create({
      data: {
        tenantId,
        priceListItemId: data.priceListItemId,
        overrideType: data.overrideType,
        overrideValue: new Prisma.Decimal(data.overrideValue),
        scopeType: data.scopeType,
        scopeId: data.scopeId,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity,
        status: data.status ?? PriceOverrideStatus.ACTIVE,
        reason: data.reason,
        externalRef: data.externalRef,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Update a price override
   */
  async updateOverride(
    tenantId: string,
    overrideId: string,
    data: Partial<PriceOverrideDTO>,
  ): Promise<PriceOverride> {
    const existing = await this.prisma.priceOverride.findFirst({
      where: { id: overrideId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Price override not found: ${overrideId}`);
    }

    // Can't update revoked or expired overrides
    if (existing.status === PriceOverrideStatus.REVOKED) {
      throw new BadRequestException('Cannot update a revoked override');
    }

    const updateData: Prisma.PriceOverrideUpdateInput = {};

    if (data.overrideType !== undefined) updateData.overrideType = data.overrideType;
    if (data.overrideValue !== undefined)
      updateData.overrideValue = new Prisma.Decimal(data.overrideValue);
    if (data.effectiveFrom !== undefined) updateData.effectiveFrom = data.effectiveFrom;
    if (data.effectiveTo !== undefined) updateData.effectiveTo = data.effectiveTo;
    if (data.minQuantity !== undefined) updateData.minQuantity = data.minQuantity;
    if (data.maxQuantity !== undefined) updateData.maxQuantity = data.maxQuantity;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue;

    return this.prisma.priceOverride.update({
      where: { id: overrideId },
      data: updateData,
    });
  }

  /**
   * Approve a pending override
   */
  async approveOverride(
    tenantId: string,
    overrideId: string,
    approverId: string,
  ): Promise<PriceOverride> {
    const existing = await this.prisma.priceOverride.findFirst({
      where: { id: overrideId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Price override not found: ${overrideId}`);
    }

    if (existing.status !== PriceOverrideStatus.PENDING_APPROVAL) {
      throw new BadRequestException(`Override is not pending approval: ${existing.status}`);
    }

    return this.prisma.priceOverride.update({
      where: { id: overrideId },
      data: {
        status: PriceOverrideStatus.ACTIVE,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Revoke an override
   */
  async revokeOverride(tenantId: string, overrideId: string, reason?: string): Promise<PriceOverride> {
    const existing = await this.prisma.priceOverride.findFirst({
      where: { id: overrideId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Price override not found: ${overrideId}`);
    }

    if (existing.status === PriceOverrideStatus.REVOKED) {
      throw new BadRequestException('Override is already revoked');
    }

    return this.prisma.priceOverride.update({
      where: { id: overrideId },
      data: {
        status: PriceOverrideStatus.REVOKED,
        reason: reason ? `${existing.reason ?? ''} | Revoked: ${reason}`.trim() : existing.reason,
      },
    });
  }

  /**
   * Get override by ID
   */
  async getOverride(tenantId: string, overrideId: string): Promise<PriceOverride | null> {
    return this.prisma.priceOverride.findFirst({
      where: { id: overrideId, tenantId },
      include: {
        priceListItem: {
          include: {
            priceList: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });
  }

  /**
   * Query overrides
   */
  async queryOverrides(options: {
    tenantId: string;
    priceListItemId?: string;
    sku?: string;
    scopeType?: PriceOverrideScopeType;
    scopeId?: string;
    status?: PriceOverrideStatus;
    effectiveAt?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: PriceOverride[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PriceOverrideWhereInput = {
      tenantId: options.tenantId,
    };

    if (options.priceListItemId) where.priceListItemId = options.priceListItemId;
    if (options.scopeType) where.scopeType = options.scopeType;
    if (options.scopeId) where.scopeId = options.scopeId;
    if (options.status) where.status = options.status;

    if (options.sku) {
      where.priceListItem = { sku: options.sku };
    }

    if (options.effectiveAt) {
      where.effectiveFrom = { lte: options.effectiveAt };
      where.OR = [{ effectiveTo: null }, { effectiveTo: { gte: options.effectiveAt } }];
    }

    const [data, total] = await Promise.all([
      this.prisma.priceOverride.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          priceListItem: {
            select: { sku: true, listPrice: true },
          },
        },
      }),
      this.prisma.priceOverride.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /**
   * Get active overrides for a scope
   */
  async getActiveOverridesForScope(
    tenantId: string,
    scopeType: PriceOverrideScopeType,
    scopeId: string,
    date?: Date,
  ): Promise<PriceOverride[]> {
    const now = date ?? new Date();

    return this.prisma.priceOverride.findMany({
      where: {
        tenantId,
        scopeType,
        scopeId,
        status: PriceOverrideStatus.ACTIVE,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      include: {
        priceListItem: {
          select: { sku: true, listPrice: true },
        },
      },
    });
  }

  /**
   * Delete override (hard delete)
   */
  async deleteOverride(tenantId: string, overrideId: string): Promise<void> {
    const existing = await this.prisma.priceOverride.findFirst({
      where: { id: overrideId, tenantId },
    });

    if (!existing) {
      throw new NotFoundException(`Price override not found: ${overrideId}`);
    }

    await this.prisma.priceOverride.delete({
      where: { id: overrideId },
    });
  }

  /**
   * Bulk create overrides
   */
  async bulkCreateOverrides(
    tenantId: string,
    overrides: Omit<PriceOverrideDTO, 'id' | 'tenantId'>[],
  ): Promise<{ created: number; errors: Array<{ index: number; error: string }> }> {
    let created = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < overrides.length; i++) {
      try {
        await this.createOverride(tenantId, overrides[i]);
        created++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ index: i, error: errorMessage });
      }
    }

    return { created, errors };
  }

  /**
   * Expire outdated overrides
   */
  async expireOutdatedOverrides(tenantId: string): Promise<number> {
    const result = await this.prisma.priceOverride.updateMany({
      where: {
        tenantId,
        status: PriceOverrideStatus.ACTIVE,
        effectiveTo: { lt: new Date() },
      },
      data: { status: PriceOverrideStatus.EXPIRED },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} overrides for tenant: ${tenantId}`);
    }

    return result.count;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async findConflictingOverride(
    tenantId: string,
    priceListItemId: string,
    scopeType: PriceOverrideScopeType,
    scopeId: string,
    effectiveFrom: Date,
    effectiveTo?: Date,
    minQuantity?: number,
    maxQuantity?: number,
    excludeId?: string,
  ): Promise<PriceOverride | null> {
    const where: Prisma.PriceOverrideWhereInput = {
      tenantId,
      priceListItemId,
      scopeType,
      scopeId,
      status: { in: [PriceOverrideStatus.ACTIVE, PriceOverrideStatus.PENDING_APPROVAL] },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    // Check date overlap
    where.AND = [
      {
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: effectiveFrom } },
        ],
      },
      {
        OR: effectiveTo
          ? [{ effectiveFrom: { lte: effectiveTo } }]
          : [{ effectiveFrom: { lte: effectiveFrom } }],
      },
    ];

    // Check quantity overlap
    if (minQuantity !== undefined || maxQuantity !== undefined) {
      const quantityConditions: Prisma.PriceOverrideWhereInput[] = [];

      if (minQuantity !== undefined) {
        quantityConditions.push({
          OR: [
            { maxQuantity: null },
            { maxQuantity: { gte: minQuantity } },
          ],
        });
      }

      if (maxQuantity !== undefined) {
        quantityConditions.push({
          OR: [
            { minQuantity: null },
            { minQuantity: { lte: maxQuantity } },
          ],
        });
      }

      if (quantityConditions.length > 0) {
        (where.AND as Prisma.PriceOverrideWhereInput[]).push(...quantityConditions);
      }
    }

    return this.prisma.priceOverride.findFirst({ where });
  }
}
