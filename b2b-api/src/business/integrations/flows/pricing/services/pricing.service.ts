import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Prisma, PriceList, PriceListItem, CustomerPriceAssignment } from '@prisma/client';
import {
  PriceListDTO,
  PriceListItemDTO,
  PriceListWithItems,
  CustomerPriceAssignmentDTO,
  PriceListQueryFilters,
  PriceListItemQueryFilters,
  PriceCalculationRequest,
  PriceCalculationResult,
  EffectivePriceQuery,
  EffectivePriceResult,
  PriceResolutionSource,
  PriceResolutionStep,
  QuantityBreak,
  PriceListStatus,
  PriceListType,
  RoundingRule,
} from '../interfaces';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Price List CRUD
  // ============================================

  /**
   * Create a new price list
   */
  async createPriceList(tenantId: string, data: Omit<PriceListDTO, 'id'>): Promise<PriceList> {
    this.logger.log(`Creating price list: ${data.code} for tenant: ${tenantId}`);

    // Validate base price list if specified
    if (data.basePriceListId) {
      const basePriceList = await this.prisma.priceList.findFirst({
        where: { id: data.basePriceListId, tenantId },
      });
      if (!basePriceList) {
        throw new NotFoundException(`Base price list not found: ${data.basePriceListId}`);
      }
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.priceList.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.priceList.create({
      data: {
        ...data,
        tenantId,
        priceModifier: data.priceModifier ? new Prisma.Decimal(data.priceModifier) : null,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Update a price list
   */
  async updatePriceList(
    tenantId: string,
    priceListId: string,
    data: Partial<PriceListDTO>,
  ): Promise<PriceList> {
    this.logger.log(`Updating price list: ${priceListId}`);

    const existing = await this.findPriceListById(tenantId, priceListId);
    if (!existing) {
      throw new NotFoundException(`Price list not found: ${priceListId}`);
    }

    // If setting as default, unset other defaults
    if (data.isDefault && !existing.isDefault) {
      await this.prisma.priceList.updateMany({
        where: { tenantId, isDefault: true, id: { not: priceListId } },
        data: { isDefault: false },
      });
    }

    const updateData: Prisma.PriceListUpdateInput = {
      ...data,
      priceModifier:
        data.priceModifier !== undefined
          ? data.priceModifier
            ? new Prisma.Decimal(data.priceModifier)
            : null
          : undefined,
      metadata: data.metadata !== undefined ? (data.metadata as Prisma.InputJsonValue) : undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    return this.prisma.priceList.update({
      where: { id: priceListId },
      data: updateData,
    });
  }

  /**
   * Find price list by ID
   */
  async findPriceListById(tenantId: string, priceListId: string): Promise<PriceList | null> {
    return this.prisma.priceList.findFirst({
      where: {
        id: priceListId,
        tenantId,
        deletedAt: null,
      },
    });
  }

  /**
   * Find price list by code
   */
  async findPriceListByCode(tenantId: string, code: string): Promise<PriceList | null> {
    return this.prisma.priceList.findFirst({
      where: {
        code,
        tenantId,
        deletedAt: null,
      },
    });
  }

  /**
   * Get price list with items
   */
  async getPriceListWithItems(
    tenantId: string,
    priceListId: string,
  ): Promise<PriceListWithItems | null> {
    const priceList = await this.prisma.priceList.findFirst({
      where: {
        id: priceListId,
        tenantId,
        deletedAt: null,
      },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { sku: 'asc' },
        },
        customerAssignments: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!priceList) return null;

    return this.mapPriceListToDTO(priceList) as PriceListWithItems;
  }

  /**
   * Query price lists with filters
   */
  async queryPriceLists(filters: PriceListQueryFilters): Promise<{
    data: PriceList[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PriceListWhereInput = {
      tenantId: filters.tenantId,
      deletedAt: null,
    };

    if (filters.code) where.code = { contains: filters.code, mode: 'insensitive' };
    if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' };
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.currency) where.currency = filters.currency;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;
    if (filters.isCustomerSpecific !== undefined)
      where.isCustomerSpecific = filters.isCustomerSpecific;
    if (filters.externalId) where.externalId = filters.externalId;
    if (filters.externalSystem) where.externalSystem = filters.externalSystem;

    // Effective at date filter
    if (filters.effectiveAt) {
      where.effectiveFrom = { lte: filters.effectiveAt };
      where.OR = [{ effectiveTo: null }, { effectiveTo: { gte: filters.effectiveAt } }];
    }

    const orderBy: Prisma.PriceListOrderByWithRelationInput = {};
    const sortBy = filters.sortBy ?? 'priority';
    orderBy[sortBy] = filters.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.priceList.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: filters.includeItems
          ? { items: { where: { isActive: true }, take: 100 } }
          : undefined,
      }),
      this.prisma.priceList.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /**
   * Soft delete a price list
   */
  async deletePriceList(tenantId: string, priceListId: string): Promise<void> {
    const priceList = await this.findPriceListById(tenantId, priceListId);
    if (!priceList) {
      throw new NotFoundException(`Price list not found: ${priceListId}`);
    }

    await this.prisma.priceList.update({
      where: { id: priceListId },
      data: { deletedAt: new Date(), status: PriceListStatus.ARCHIVED },
    });
  }

  // ============================================
  // Price List Item CRUD
  // ============================================

  /**
   * Add item to price list
   */
  async addPriceListItem(
    tenantId: string,
    priceListId: string,
    data: Omit<PriceListItemDTO, 'id' | 'priceListId'>,
  ): Promise<PriceListItem> {
    const priceList = await this.findPriceListById(tenantId, priceListId);
    if (!priceList) {
      throw new NotFoundException(`Price list not found: ${priceListId}`);
    }

    // Check for duplicate SKU
    const existingItem = await this.prisma.priceListItem.findUnique({
      where: {
        priceListId_sku: { priceListId, sku: data.sku },
      },
    });

    if (existingItem) {
      throw new BadRequestException(`SKU ${data.sku} already exists in this price list`);
    }

    return this.prisma.priceListItem.create({
      data: {
        priceListId,
        sku: data.sku,
        masterProductId: data.masterProductId,
        basePrice: new Prisma.Decimal(data.basePrice),
        listPrice: new Prisma.Decimal(data.listPrice),
        minPrice: data.minPrice ? new Prisma.Decimal(data.minPrice) : null,
        maxPrice: data.maxPrice ? new Prisma.Decimal(data.maxPrice) : null,
        cost: data.cost ? new Prisma.Decimal(data.cost) : null,
        currency: data.currency,
        quantityBreaks: (data.quantityBreaks ?? []) as unknown as Prisma.InputJsonValue,
        maxDiscountPercent: data.maxDiscountPercent
          ? new Prisma.Decimal(data.maxDiscountPercent)
          : null,
        isDiscountable: data.isDiscountable ?? true,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        isActive: data.isActive ?? true,
        uom: data.uom ?? 'EA',
        externalId: data.externalId,
        externalSystem: data.externalSystem,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Update price list item
   */
  async updatePriceListItem(
    tenantId: string,
    itemId: string,
    data: Partial<PriceListItemDTO>,
  ): Promise<PriceListItem> {
    const item = await this.prisma.priceListItem.findFirst({
      where: { id: itemId },
      include: { priceList: true },
    });

    if (!item || item.priceList.tenantId !== tenantId) {
      throw new NotFoundException(`Price list item not found: ${itemId}`);
    }

    const updateData: Prisma.PriceListItemUpdateInput = {};

    if (data.basePrice !== undefined)
      updateData.basePrice = new Prisma.Decimal(data.basePrice);
    if (data.listPrice !== undefined)
      updateData.listPrice = new Prisma.Decimal(data.listPrice);
    if (data.minPrice !== undefined)
      updateData.minPrice = data.minPrice ? new Prisma.Decimal(data.minPrice) : null;
    if (data.maxPrice !== undefined)
      updateData.maxPrice = data.maxPrice ? new Prisma.Decimal(data.maxPrice) : null;
    if (data.cost !== undefined)
      updateData.cost = data.cost ? new Prisma.Decimal(data.cost) : null;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.quantityBreaks !== undefined) updateData.quantityBreaks = data.quantityBreaks as unknown as Prisma.InputJsonValue;
    if (data.maxDiscountPercent !== undefined)
      updateData.maxDiscountPercent = data.maxDiscountPercent
        ? new Prisma.Decimal(data.maxDiscountPercent)
        : null;
    if (data.isDiscountable !== undefined) updateData.isDiscountable = data.isDiscountable;
    if (data.effectiveFrom !== undefined) updateData.effectiveFrom = data.effectiveFrom;
    if (data.effectiveTo !== undefined) updateData.effectiveTo = data.effectiveTo;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.uom !== undefined) updateData.uom = data.uom;
    if (data.externalId !== undefined) updateData.externalId = data.externalId;
    if (data.externalSystem !== undefined) updateData.externalSystem = data.externalSystem;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue;

    return this.prisma.priceListItem.update({
      where: { id: itemId },
      data: updateData,
    });
  }

  /**
   * Bulk upsert price list items
   */
  async bulkUpsertPriceListItems(
    tenantId: string,
    priceListId: string,
    items: Omit<PriceListItemDTO, 'id' | 'priceListId'>[],
  ): Promise<{ created: number; updated: number; errors: Array<{ sku: string; error: string }> }> {
    const priceList = await this.findPriceListById(tenantId, priceListId);
    if (!priceList) {
      throw new NotFoundException(`Price list not found: ${priceListId}`);
    }

    let created = 0;
    let updated = 0;
    const errors: Array<{ sku: string; error: string }> = [];

    // Process in batches for performance
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      await this.prisma.$transaction(async (tx) => {
        for (const item of batch) {
          try {
            const existing = await tx.priceListItem.findUnique({
              where: {
                priceListId_sku: { priceListId, sku: item.sku },
              },
            });

            const itemData = {
              basePrice: new Prisma.Decimal(item.basePrice),
              listPrice: new Prisma.Decimal(item.listPrice),
              minPrice: item.minPrice ? new Prisma.Decimal(item.minPrice) : null,
              maxPrice: item.maxPrice ? new Prisma.Decimal(item.maxPrice) : null,
              cost: item.cost ? new Prisma.Decimal(item.cost) : null,
              currency: item.currency,
              quantityBreaks: (item.quantityBreaks ?? []) as unknown as Prisma.InputJsonValue,
              maxDiscountPercent: item.maxDiscountPercent
                ? new Prisma.Decimal(item.maxDiscountPercent)
                : null,
              isDiscountable: item.isDiscountable ?? true,
              effectiveFrom: item.effectiveFrom,
              effectiveTo: item.effectiveTo,
              isActive: item.isActive ?? true,
              uom: item.uom ?? 'EA',
              externalId: item.externalId,
              externalSystem: item.externalSystem,
              lastSyncAt: new Date(),
              metadata: (item.metadata ?? {}) as Prisma.InputJsonValue,
            };

            if (existing) {
              await tx.priceListItem.update({
                where: { id: existing.id },
                data: itemData,
              });
              updated++;
            } else {
              await tx.priceListItem.create({
                data: {
                  ...itemData,
                  priceListId,
                  sku: item.sku,
                  masterProductId: item.masterProductId,
                },
              });
              created++;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push({ sku: item.sku, error: errorMessage });
          }
        }
      });
    }

    this.logger.log(
      `Bulk upsert completed for price list ${priceListId}: created=${created}, updated=${updated}, errors=${errors.length}`,
    );

    return { created, updated, errors };
  }

  /**
   * Query price list items
   */
  async queryPriceListItems(filters: PriceListItemQueryFilters): Promise<{
    data: PriceListItem[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where: Prisma.PriceListItemWhereInput = {
      priceListId: filters.priceListId,
    };

    if (filters.sku) where.sku = { contains: filters.sku, mode: 'insensitive' };
    if (filters.skus) where.sku = { in: filters.skus };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.minPrice !== undefined)
      where.listPrice = { gte: new Prisma.Decimal(filters.minPrice) };
    if (filters.maxPrice !== undefined) {
      where.listPrice = {
        ...(where.listPrice as object),
        lte: new Prisma.Decimal(filters.maxPrice),
      };
    }

    if (filters.effectiveAt) {
      where.OR = [
        { effectiveFrom: null },
        {
          effectiveFrom: { lte: filters.effectiveAt },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: filters.effectiveAt } }],
        },
      ];
    }

    const orderBy: Prisma.PriceListItemOrderByWithRelationInput = {};
    const sortBy = filters.sortBy ?? 'sku';
    orderBy[sortBy] = filters.sortOrder ?? 'asc';

    const [data, total] = await Promise.all([
      this.prisma.priceListItem.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: filters.includeOverrides
          ? { overrides: { where: { status: 'ACTIVE' } } }
          : undefined,
      }),
      this.prisma.priceListItem.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  /**
   * Delete price list item
   */
  async deletePriceListItem(tenantId: string, itemId: string): Promise<void> {
    const item = await this.prisma.priceListItem.findFirst({
      where: { id: itemId },
      include: { priceList: true },
    });

    if (!item || item.priceList.tenantId !== tenantId) {
      throw new NotFoundException(`Price list item not found: ${itemId}`);
    }

    await this.prisma.priceListItem.delete({
      where: { id: itemId },
    });
  }

  // ============================================
  // Customer Price Assignment
  // ============================================

  /**
   * Assign price list to customer/organization
   */
  async assignPriceList(
    tenantId: string,
    data: Omit<CustomerPriceAssignmentDTO, 'id' | 'tenantId'>,
  ): Promise<CustomerPriceAssignment> {
    const priceList = await this.findPriceListById(tenantId, data.priceListId);
    if (!priceList) {
      throw new NotFoundException(`Price list not found: ${data.priceListId}`);
    }

    // Check for existing assignment
    const existing = await this.prisma.customerPriceAssignment.findUnique({
      where: {
        tenantId_priceListId_assignmentType_assignmentId: {
          tenantId,
          priceListId: data.priceListId,
          assignmentType: data.assignmentType,
          assignmentId: data.assignmentId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Price list already assigned to this entity');
    }

    return this.prisma.customerPriceAssignment.create({
      data: {
        tenantId,
        priceListId: data.priceListId,
        assignmentType: data.assignmentType,
        assignmentId: data.assignmentId,
        priority: data.priority ?? 0,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        isActive: data.isActive ?? true,
        externalRef: data.externalRef,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Get price lists assigned to a customer
   */
  async getCustomerPriceLists(
    tenantId: string,
    customerId: string,
    organizationId?: string,
    priceDate?: Date,
  ): Promise<PriceList[]> {
    const now = priceDate ?? new Date();

    const where: Prisma.CustomerPriceAssignmentWhereInput = {
      tenantId,
      isActive: true,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      AND: [
        {
          OR: [
            { assignmentType: 'CUSTOMER', assignmentId: customerId },
            ...(organizationId
              ? [{ assignmentType: 'ORGANIZATION' as const, assignmentId: organizationId }]
              : []),
          ],
        },
      ],
    };

    const assignments = await this.prisma.customerPriceAssignment.findMany({
      where,
      orderBy: { priority: 'desc' },
      include: {
        priceList: {
          include: {
            items: false,
          },
        },
      },
    });

    return assignments
      .filter((a) => a.priceList.status === PriceListStatus.ACTIVE)
      .map((a) => a.priceList);
  }

  /**
   * Remove price list assignment
   */
  async removePriceListAssignment(tenantId: string, assignmentId: string): Promise<void> {
    const assignment = await this.prisma.customerPriceAssignment.findFirst({
      where: { id: assignmentId, tenantId },
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment not found: ${assignmentId}`);
    }

    await this.prisma.customerPriceAssignment.delete({
      where: { id: assignmentId },
    });
  }

  // ============================================
  // Price Calculation
  // ============================================

  /**
   * Calculate price for a single SKU
   */
  async calculatePrice(request: PriceCalculationRequest): Promise<PriceCalculationResult> {
    const { tenantId, sku, quantity, customerId, organizationId, contractId, currency, priceDate } =
      request;

    const now = priceDate ?? new Date();
    const resolutionPath: PriceResolutionStep[] = [];
    let selectedPrice: PriceCalculationResult | null = null;

    // 1. Check for price overrides
    if (customerId || organizationId || contractId) {
      const overrideResult = await this.findPriceOverride(
        tenantId,
        sku,
        quantity,
        customerId,
        organizationId,
        contractId,
        now,
      );

      if (overrideResult) {
        resolutionPath.push({
          source: 'override',
          priceListId: overrideResult.priceListId,
          price: overrideResult.unitPrice,
          selected: true,
          reason: 'Active price override found',
        });
        selectedPrice = overrideResult;
      }
    }

    // 2. Check customer-specific price lists
    if (!selectedPrice && customerId) {
      const customerPriceLists = await this.getCustomerPriceLists(
        tenantId,
        customerId,
        organizationId,
        now,
      );

      for (const priceList of customerPriceLists) {
        const item = await this.findEffectivePriceItem(priceList.id, sku, now);
        if (item) {
          const price = this.calculateItemPrice(item, quantity, priceList.roundingRule, priceList.roundingPrecision);
          resolutionPath.push({
            source: 'customer_specific',
            priceListId: priceList.id,
            price,
            selected: !selectedPrice,
            reason: selectedPrice ? 'Lower priority' : 'Customer-specific price list',
          });

          if (!selectedPrice) {
            selectedPrice = this.buildPriceResult(
              sku,
              quantity,
              item,
              price,
              priceList,
              'customer_specific',
              resolutionPath,
              currency,
            );
          }
        }
      }
    }

    // 3. Check default price list
    if (!selectedPrice) {
      const defaultPriceList = await this.getDefaultPriceList(tenantId, now);
      if (defaultPriceList) {
        const item = await this.findEffectivePriceItem(defaultPriceList.id, sku, now);
        if (item) {
          const price = this.calculateItemPrice(
            item,
            quantity,
            defaultPriceList.roundingRule,
            defaultPriceList.roundingPrecision,
          );
          resolutionPath.push({
            source: 'standard',
            priceListId: defaultPriceList.id,
            price,
            selected: true,
            reason: 'Default price list',
          });

          selectedPrice = this.buildPriceResult(
            sku,
            quantity,
            item,
            price,
            defaultPriceList,
            'standard',
            resolutionPath,
            currency,
          );
        }
      }
    }

    if (!selectedPrice) {
      throw new NotFoundException(`No price found for SKU: ${sku}`);
    }

    return selectedPrice;
  }

  /**
   * Calculate prices for multiple SKUs
   */
  async calculatePrices(query: EffectivePriceQuery): Promise<EffectivePriceResult> {
    const result: EffectivePriceResult = {};

    // Process in parallel but limit concurrency
    const batchSize = 10;
    for (let i = 0; i < query.skus.length; i += batchSize) {
      const batch = query.skus.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (sku) => {
          try {
            const price = await this.calculatePrice({
              tenantId: query.tenantId,
              sku,
              quantity: 1,
              customerId: query.customerId,
              organizationId: query.organizationId,
              contractId: query.contractId,
              currency: query.currency,
              priceDate: query.priceDate,
            });
            return { sku, price };
          } catch {
            return { sku, price: null };
          }
        }),
      );

      for (const { sku, price } of batchResults) {
        result[sku] = price;
      }
    }

    return result;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async getDefaultPriceList(tenantId: string, date: Date): Promise<PriceList | null> {
    return this.prisma.priceList.findFirst({
      where: {
        tenantId,
        isDefault: true,
        status: PriceListStatus.ACTIVE,
        deletedAt: null,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
    });
  }

  private async findEffectivePriceItem(
    priceListId: string,
    sku: string,
    date: Date,
  ): Promise<PriceListItem | null> {
    return this.prisma.priceListItem.findFirst({
      where: {
        priceListId,
        sku,
        isActive: true,
        OR: [
          { effectiveFrom: null },
          {
            effectiveFrom: { lte: date },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
          },
        ],
      },
    });
  }

  private async findPriceOverride(
    tenantId: string,
    sku: string,
    quantity: number,
    customerId?: string,
    organizationId?: string,
    contractId?: string,
    date?: Date,
  ): Promise<PriceCalculationResult | null> {
    const now = date ?? new Date();

    const scopeConditions: Prisma.PriceOverrideWhereInput[] = [];
    if (customerId) {
      scopeConditions.push({ scopeType: 'CUSTOMER', scopeId: customerId });
    }
    if (organizationId) {
      scopeConditions.push({ scopeType: 'ORGANIZATION', scopeId: organizationId });
    }
    if (contractId) {
      scopeConditions.push({ scopeType: 'CONTRACT', scopeId: contractId });
    }

    if (scopeConditions.length === 0) return null;

    const override = await this.prisma.priceOverride.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        AND: [
          { OR: scopeConditions },
          {
            OR: [{ minQuantity: null }, { minQuantity: { lte: quantity } }],
          },
          {
            OR: [{ maxQuantity: null }, { maxQuantity: { gte: quantity } }],
          },
        ],
        priceListItem: {
          sku,
          isActive: true,
        },
      },
      include: {
        priceListItem: {
          include: {
            priceList: true,
          },
        },
      },
    });

    if (!override) return null;

    const item = override.priceListItem;
    let unitPrice: number;

    switch (override.overrideType) {
      case 'FIXED_PRICE':
        unitPrice = override.overrideValue.toNumber();
        break;
      case 'PERCENTAGE_DISCOUNT':
        unitPrice = item.listPrice.toNumber() * (1 - override.overrideValue.toNumber() / 100);
        break;
      case 'FIXED_DISCOUNT':
        unitPrice = item.listPrice.toNumber() - override.overrideValue.toNumber();
        break;
      case 'MARKUP_PERCENTAGE':
        unitPrice = (item.cost?.toNumber() ?? item.basePrice.toNumber()) * (1 + override.overrideValue.toNumber() / 100);
        break;
      case 'MARKUP_FIXED':
        unitPrice = (item.cost?.toNumber() ?? item.basePrice.toNumber()) + override.overrideValue.toNumber();
        break;
      default:
        unitPrice = item.listPrice.toNumber();
    }

    // Apply min/max constraints
    if (item.minPrice && unitPrice < item.minPrice.toNumber()) {
      unitPrice = item.minPrice.toNumber();
    }
    if (item.maxPrice && unitPrice > item.maxPrice.toNumber()) {
      unitPrice = item.maxPrice.toNumber();
    }

    return {
      sku: item.sku,
      quantity,
      unitPrice,
      extendedPrice: unitPrice * quantity,
      currency: item.currency ?? item.priceList.currency,
      priceSource: 'override',
      priceListId: item.priceList.id,
      priceListCode: item.priceList.code,
      basePrice: item.basePrice.toNumber(),
      discountAmount: item.listPrice.toNumber() - unitPrice,
      discountPercent: ((item.listPrice.toNumber() - unitPrice) / item.listPrice.toNumber()) * 100,
      overrideApplied: true,
      overrideId: override.id,
      minPrice: item.minPrice?.toNumber(),
      maxPrice: item.maxPrice?.toNumber(),
      isAtMinPrice: item.minPrice ? unitPrice === item.minPrice.toNumber() : false,
      isAtMaxPrice: item.maxPrice ? unitPrice === item.maxPrice.toNumber() : false,
      cost: item.cost?.toNumber(),
      margin: item.cost ? unitPrice - item.cost.toNumber() : undefined,
      marginPercent: item.cost
        ? ((unitPrice - item.cost.toNumber()) / unitPrice) * 100
        : undefined,
      effectiveFrom: override.effectiveFrom,
      effectiveTo: override.effectiveTo ?? undefined,
      resolutionPath: [],
    };
  }

  private calculateItemPrice(
    item: PriceListItem,
    quantity: number,
    roundingRule: RoundingRule,
    roundingPrecision: number,
  ): number {
    const quantityBreaks = (item.quantityBreaks as unknown as QuantityBreak[]) ?? [];
    let price = item.listPrice.toNumber();

    // Find applicable quantity break
    if (quantityBreaks.length > 0) {
      const sortedBreaks = [...quantityBreaks].sort((a, b) => b.minQuantity - a.minQuantity);
      for (const breakItem of sortedBreaks) {
        if (quantity >= breakItem.minQuantity) {
          if (!breakItem.maxQuantity || quantity <= breakItem.maxQuantity) {
            if (breakItem.price !== undefined) {
              price = breakItem.price;
            } else if (breakItem.discountPercent !== undefined) {
              price = item.listPrice.toNumber() * (1 - breakItem.discountPercent / 100);
            }
            break;
          }
        }
      }
    }

    return this.applyRounding(price, roundingRule, roundingPrecision);
  }

  private applyRounding(price: number, rule: RoundingRule, precision: number): number {
    const factor = Math.pow(10, precision);

    switch (rule) {
      case 'UP':
        return Math.ceil(price * factor) / factor;
      case 'DOWN':
        return Math.floor(price * factor) / factor;
      case 'NEAREST':
        return Math.round(price * factor) / factor;
      case 'NEAREST_05':
        return Math.round(price * 20) / 20;
      case 'NEAREST_09':
        return Math.floor(price) + 0.09;
      case 'NEAREST_99':
        return Math.floor(price) + 0.99;
      case 'NONE':
      default:
        return price;
    }
  }

  private buildPriceResult(
    sku: string,
    quantity: number,
    item: PriceListItem,
    unitPrice: number,
    priceList: PriceList,
    source: PriceResolutionSource,
    resolutionPath: PriceResolutionStep[],
    targetCurrency?: string,
  ): PriceCalculationResult {
    const currency = item.currency ?? priceList.currency;
    const quantityBreaks = (item.quantityBreaks as unknown as QuantityBreak[]) ?? [];

    // Find applied quantity break
    let quantityBreakApplied: QuantityBreak | undefined;
    if (quantityBreaks.length > 0) {
      const sortedBreaks = [...quantityBreaks].sort((a, b) => b.minQuantity - a.minQuantity);
      for (const breakItem of sortedBreaks) {
        if (quantity >= breakItem.minQuantity) {
          if (!breakItem.maxQuantity || quantity <= breakItem.maxQuantity) {
            quantityBreakApplied = breakItem;
            break;
          }
        }
      }
    }

    return {
      sku,
      quantity,
      unitPrice,
      extendedPrice: unitPrice * quantity,
      currency: targetCurrency ?? currency,
      priceSource: source,
      priceListId: priceList.id,
      priceListCode: priceList.code,
      basePrice: item.basePrice.toNumber(),
      discountAmount: item.listPrice.toNumber() - unitPrice,
      discountPercent:
        item.listPrice.toNumber() > 0
          ? ((item.listPrice.toNumber() - unitPrice) / item.listPrice.toNumber()) * 100
          : 0,
      quantityBreakApplied,
      overrideApplied: false,
      minPrice: item.minPrice?.toNumber(),
      maxPrice: item.maxPrice?.toNumber(),
      isAtMinPrice: item.minPrice ? unitPrice <= item.minPrice.toNumber() : false,
      isAtMaxPrice: item.maxPrice ? unitPrice >= item.maxPrice.toNumber() : false,
      cost: item.cost?.toNumber(),
      margin: item.cost ? unitPrice - item.cost.toNumber() : undefined,
      marginPercent: item.cost
        ? ((unitPrice - item.cost.toNumber()) / unitPrice) * 100
        : undefined,
      effectiveFrom: item.effectiveFrom ?? priceList.effectiveFrom,
      effectiveTo: item.effectiveTo ?? priceList.effectiveTo ?? undefined,
      originalCurrency: currency !== targetCurrency ? currency : undefined,
      resolutionPath,
    };
  }

  private mapPriceListToDTO(priceList: PriceList & { items?: PriceListItem[]; customerAssignments?: CustomerPriceAssignment[] }): PriceListWithItems {
    return {
      id: priceList.id,
      code: priceList.code,
      name: priceList.name,
      description: priceList.description ?? undefined,
      type: priceList.type,
      status: priceList.status,
      currency: priceList.currency,
      priority: priceList.priority,
      effectiveFrom: priceList.effectiveFrom,
      effectiveTo: priceList.effectiveTo ?? undefined,
      basePriceListId: priceList.basePriceListId ?? undefined,
      priceModifier: priceList.priceModifier?.toNumber(),
      roundingRule: priceList.roundingRule,
      roundingPrecision: priceList.roundingPrecision,
      isDefault: priceList.isDefault,
      isCustomerSpecific: priceList.isCustomerSpecific,
      externalId: priceList.externalId ?? undefined,
      externalSystem: priceList.externalSystem ?? undefined,
      lastSyncAt: priceList.lastSyncAt ?? undefined,
      syncStatus: priceList.syncStatus ?? undefined,
      metadata: priceList.metadata as Record<string, unknown>,
      items: priceList.items?.map((item) => this.mapPriceListItemToDTO(item)) ?? [],
      customerAssignments: priceList.customerAssignments?.map((a) => this.mapAssignmentToDTO(a)),
    };
  }

  private mapPriceListItemToDTO(item: PriceListItem): PriceListItemDTO {
    return {
      id: item.id,
      priceListId: item.priceListId,
      sku: item.sku,
      masterProductId: item.masterProductId ?? undefined,
      basePrice: item.basePrice.toNumber(),
      listPrice: item.listPrice.toNumber(),
      minPrice: item.minPrice?.toNumber(),
      maxPrice: item.maxPrice?.toNumber(),
      cost: item.cost?.toNumber(),
      currency: item.currency ?? undefined,
      quantityBreaks: (item.quantityBreaks as unknown as QuantityBreak[]) ?? [],
      maxDiscountPercent: item.maxDiscountPercent?.toNumber(),
      isDiscountable: item.isDiscountable,
      effectiveFrom: item.effectiveFrom ?? undefined,
      effectiveTo: item.effectiveTo ?? undefined,
      isActive: item.isActive,
      uom: item.uom,
      externalId: item.externalId ?? undefined,
      externalSystem: item.externalSystem ?? undefined,
      lastSyncAt: item.lastSyncAt ?? undefined,
      metadata: item.metadata as Record<string, unknown>,
    };
  }

  private mapAssignmentToDTO(assignment: CustomerPriceAssignment): CustomerPriceAssignmentDTO {
    return {
      id: assignment.id,
      tenantId: assignment.tenantId,
      priceListId: assignment.priceListId,
      assignmentType: assignment.assignmentType,
      assignmentId: assignment.assignmentId,
      priority: assignment.priority,
      effectiveFrom: assignment.effectiveFrom,
      effectiveTo: assignment.effectiveTo ?? undefined,
      isActive: assignment.isActive,
      externalRef: assignment.externalRef ?? undefined,
      metadata: assignment.metadata as Record<string, unknown>,
    };
  }
}
