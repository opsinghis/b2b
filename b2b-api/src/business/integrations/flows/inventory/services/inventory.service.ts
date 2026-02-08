import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, ProductAvailability, InventoryReservationStatus, InventoryReservationType } from '@prisma/client';
import {
  IInventoryService,
  StockCheckRequest,
  StockCheckResponse,
  BatchStockCheckRequest,
  BatchStockCheckResponse,
  InventoryLevelDTO,
  ListInventoryOptions,
  ATPRequest,
  ATPResponse,
  ATPBucket,
  ProjectedAvailability,
  CreateReservationRequest,
  ReservationResponse,
  BulkReservationRequest,
  BulkReservationResponse,
  ReservationFailure,
  FulfillReservationRequest,
  ReleaseReservationRequest,
  ListReservationsOptions,
  RecordMovementRequest,
  MovementResponse,
  AdjustInventoryRequest,
  InventoryAlertDTO,
  ListAlertsOptions,
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  StartSyncJobRequest,
  SyncJobResponse,
  ListSyncJobsOptions,
  ExternalInventoryData,
  SyncSummary,
  WarehouseAvailability,
  INVENTORY_ERROR_CODES,
  DEFAULT_INVENTORY_CONFIG,
  InventoryMovementType,
  InventoryAlertType,
  AlertSeverity,
  AlertStatus,
  InventorySyncJobType,
  SyncJobStatus,
} from '../interfaces';

@Injectable()
export class InventoryService implements IInventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Stock Queries
  // ============================================

  async checkStock(
    tenantId: string,
    request: StockCheckRequest,
  ): Promise<StockCheckResponse> {
    this.logger.debug(`Checking stock for SKU ${request.sku} in tenant ${tenantId}`);

    const whereClause: Prisma.InventoryLevelWhereInput = {
      tenantId,
      sku: request.sku,
    };

    if (request.warehouseId) {
      whereClause.warehouseId = request.warehouseId;
    }

    const levels = await this.prisma.inventoryLevel.findMany({
      where: whereClause,
      include: {
        warehouse: true,
      },
    });

    if (levels.length === 0) {
      return {
        sku: request.sku,
        requestedQuantity: request.quantity,
        isAvailable: false,
        warehouseAvailability: [],
        totalOnHand: 0,
        totalAvailable: 0,
        totalAtp: 0,
        canFulfill: false,
        availability: ProductAvailability.OUT_OF_STOCK,
      };
    }

    const warehouseAvailability: WarehouseAvailability[] = levels.map((level) => ({
      warehouseId: level.warehouseId,
      warehouseCode: level.warehouse.code,
      warehouseName: level.warehouse.name,
      quantityOnHand: level.quantityOnHand,
      quantityAvailable: level.quantityAvailable,
      atp: request.checkAtp !== false ? level.atp : level.quantityAvailable,
      availability: level.availability,
      leadTimeDays: level.warehouse.leadTimeDays,
      estimatedShipDate: this.calculateEstimatedShipDate(level.warehouse),
    }));

    const totalOnHand = levels.reduce((sum, l) => sum + l.quantityOnHand, 0);
    const totalAvailable = levels.reduce((sum, l) => sum + l.quantityAvailable, 0);
    const totalAtp = levels.reduce((sum, l) => sum + l.atp, 0);

    const canFulfill = request.checkAtp !== false
      ? totalAtp >= request.quantity
      : totalAvailable >= request.quantity;

    // Build fulfillment plan if can fulfill
    let fulfillmentPlan;
    if (canFulfill) {
      fulfillmentPlan = this.buildFulfillmentPlan(
        warehouseAvailability,
        request.quantity,
        request.checkAtp !== false,
      );
    }

    const overallAvailability = this.determineOverallAvailability(totalOnHand, totalAvailable, totalAtp);

    return {
      sku: request.sku,
      requestedQuantity: request.quantity,
      isAvailable: totalAvailable > 0,
      warehouseAvailability,
      totalOnHand,
      totalAvailable,
      totalAtp,
      canFulfill,
      fulfillmentPlan,
      availability: overallAvailability,
    };
  }

  async batchCheckStock(
    tenantId: string,
    request: BatchStockCheckRequest,
  ): Promise<BatchStockCheckResponse> {
    const results = await Promise.all(
      request.items.map((item) =>
        this.checkStock(tenantId, {
          ...item,
          warehouseId: item.warehouseId || request.warehouseId,
        }),
      ),
    );

    const unavailableSkus = results
      .filter((r) => !r.canFulfill)
      .map((r) => r.sku);

    return {
      items: results,
      allAvailable: unavailableSkus.length === 0,
      unavailableSkus,
    };
  }

  async getInventoryLevel(
    tenantId: string,
    warehouseId: string,
    sku: string,
  ): Promise<InventoryLevelDTO | null> {
    const level = await this.prisma.inventoryLevel.findUnique({
      where: {
        tenantId_warehouseId_sku: { tenantId, warehouseId, sku },
      },
      include: {
        warehouse: true,
      },
    });

    if (!level) return null;

    return this.mapInventoryLevelToDTO(level);
  }

  async listInventoryLevels(
    tenantId: string,
    options: ListInventoryOptions = {},
  ): Promise<InventoryLevelDTO[]> {
    const { warehouseId, skus, availability, belowReorderPoint, page = 1, limit = 50 } = options;

    const where: Prisma.InventoryLevelWhereInput = { tenantId };

    if (warehouseId) where.warehouseId = warehouseId;
    if (skus && skus.length > 0) where.sku = { in: skus };
    if (availability && availability.length > 0) where.availability = { in: availability };
    if (belowReorderPoint) {
      where.AND = [
        { reorderPoint: { not: null } },
        { quantityAvailable: { lte: this.prisma.inventoryLevel.fields.reorderPoint } },
      ];
    }

    const orderBy: Prisma.InventoryLevelOrderByWithRelationInput = {};
    if (options.orderBy) {
      orderBy[options.orderBy] = options.orderDir || 'asc';
    } else {
      orderBy.sku = 'asc';
    }

    const levels = await this.prisma.inventoryLevel.findMany({
      where,
      include: { warehouse: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy,
    });

    return levels.map((l) => this.mapInventoryLevelToDTO(l));
  }

  // ============================================
  // ATP Calculation
  // ============================================

  async calculateATP(tenantId: string, request: ATPRequest): Promise<ATPResponse> {
    this.logger.debug(`Calculating ATP for SKU ${request.sku}`);

    const asOfDate = request.asOfDate || new Date();
    const lookaheadDays = request.lookaheadDays || DEFAULT_INVENTORY_CONFIG.atpSettings.lookaheadDays;

    const whereClause: Prisma.InventoryLevelWhereInput = {
      tenantId,
      sku: request.sku,
    };

    if (request.warehouseId) {
      whereClause.warehouseId = request.warehouseId;
    }

    const levels = await this.prisma.inventoryLevel.findMany({
      where: whereClause,
      include: {
        warehouse: true,
        reservations: {
          where: {
            status: {
              in: [InventoryReservationStatus.PENDING, InventoryReservationStatus.CONFIRMED],
            },
            expiresAt: { gt: asOfDate },
          },
        },
      },
    });

    if (levels.length === 0) {
      throw new NotFoundException(`No inventory found for SKU ${request.sku}`);
    }

    // Aggregate quantities
    let quantityOnHand = 0;
    let quantityReserved = 0;
    let quantityAllocated = 0;
    let quantityIncoming = 0;
    let safetyStock = 0;

    for (const level of levels) {
      quantityOnHand += level.quantityOnHand;
      quantityReserved += level.quantityReserved;
      quantityAllocated += level.quantityAllocated;
      quantityIncoming += level.quantityOnOrder;
      safetyStock += level.safetyStock;
    }

    // Simple ATP calculation
    const atp = quantityOnHand - quantityReserved - quantityAllocated - safetyStock + quantityIncoming;

    // Generate projected availability
    const projectedAvailability = this.generateProjectedAvailability(
      atp,
      lookaheadDays,
      asOfDate,
    );

    // Generate ATP buckets if bucketed calculation requested
    let buckets: ATPBucket[] | undefined;
    const atpSettings = DEFAULT_INVENTORY_CONFIG.atpSettings;
    if (atpSettings.calculationMethod === 'bucketed' && atpSettings.bucketSizeDays) {
      buckets = this.generateATPBuckets(
        atp,
        lookaheadDays,
        atpSettings.bucketSizeDays,
        asOfDate,
      );
    }

    return {
      sku: request.sku,
      warehouseId: request.warehouseId,
      calculatedAt: new Date(),
      asOfDate,
      atp: Math.max(0, atp),
      quantityOnHand,
      quantityReserved,
      quantityAllocated,
      quantityIncoming,
      safetyStock,
      buckets,
      projectedAvailability,
    };
  }

  // ============================================
  // Reservations
  // ============================================

  async createReservation(
    tenantId: string,
    request: CreateReservationRequest,
  ): Promise<ReservationResponse> {
    this.logger.log(`Creating reservation for ${request.quantity} units of ${request.sku}`);

    // Find inventory level with sufficient stock
    const warehouseId = request.warehouseId || await this.getDefaultWarehouseId(tenantId);

    const level = await this.prisma.inventoryLevel.findUnique({
      where: {
        tenantId_warehouseId_sku: { tenantId, warehouseId, sku: request.sku },
      },
      include: { warehouse: true },
    });

    if (!level) {
      throw new NotFoundException(
        `Inventory not found for SKU ${request.sku} in warehouse`,
      );
    }

    if (level.quantityAvailable < request.quantity) {
      throw new BadRequestException({
        code: INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK,
        message: `Insufficient stock for ${request.sku}. Available: ${level.quantityAvailable}, Requested: ${request.quantity}`,
        availableQuantity: level.quantityAvailable,
      });
    }

    const expiresInMinutes =
      request.expiresInMinutes || DEFAULT_INVENTORY_CONFIG.reservationTimeoutMinutes;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    const reservation = await this.prisma.$transaction(async (tx) => {
      // Create reservation
      const res = await tx.inventoryReservation.create({
        data: {
          reservationNumber: `RES-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`,
          sku: request.sku,
          quantity: request.quantity,
          status: InventoryReservationStatus.CONFIRMED,
          type: this.mapSourceTypeToReservationType(request.sourceType),
          priority: request.priority || 0,
          expiresAt,
          sourceType: request.sourceType,
          sourceId: request.sourceId,
          notes: request.notes,
          metadata: (request.metadata || {}) as Prisma.InputJsonValue,
          tenantId,
          warehouseId,
          inventoryLevelId: level.id,
          userId: request.userId,
        },
        include: { warehouse: true },
      });

      // Update inventory level
      await tx.inventoryLevel.update({
        where: { id: level.id },
        data: {
          quantityReserved: { increment: request.quantity },
          quantityAvailable: { decrement: request.quantity },
          atp: { decrement: request.quantity },
        },
      });

      // Update availability status if needed
      await this.updateAvailabilityStatus(tx, level.id);

      return res;
    });

    this.logger.log(`Created reservation ${reservation.reservationNumber}`);

    return this.mapReservationToResponse(reservation);
  }

  async bulkCreateReservations(
    tenantId: string,
    request: BulkReservationRequest,
  ): Promise<BulkReservationResponse> {
    const reservations: ReservationResponse[] = [];
    const failures: ReservationFailure[] = [];

    for (const item of request.items) {
      try {
        const reservation = await this.createReservation(tenantId, {
          ...item,
          sourceType: request.sourceType,
          sourceId: request.sourceId,
        });
        reservations.push(reservation);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const errorCode =
          error instanceof BadRequestException
            ? INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK
            : 'RESERVATION_FAILED';

        failures.push({
          sku: item.sku,
          quantity: item.quantity,
          error: message,
          errorCode,
        });

        if (request.failOnPartial) {
          // Rollback successful reservations
          for (const res of reservations) {
            await this.releaseReservation(tenantId, {
              reservationId: res.id,
              reason: 'Bulk reservation rollback',
            }).catch(() => {
              /* ignore */
            });
          }

          throw new BadRequestException({
            message: 'Bulk reservation failed',
            failures,
          });
        }
      }
    }

    return {
      success: failures.length === 0,
      reservations,
      failures,
      partialSuccess: reservations.length > 0 && failures.length > 0,
    };
  }

  async fulfillReservation(
    tenantId: string,
    request: FulfillReservationRequest,
  ): Promise<ReservationResponse> {
    const reservation = await this.prisma.inventoryReservation.findFirst({
      where: { id: request.reservationId, tenantId },
      include: { warehouse: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === InventoryReservationStatus.FULFILLED) {
      throw new BadRequestException({
        code: INVENTORY_ERROR_CODES.RESERVATION_ALREADY_FULFILLED,
        message: 'Reservation already fulfilled',
      });
    }

    if (
      reservation.status === InventoryReservationStatus.RELEASED ||
      reservation.status === InventoryReservationStatus.EXPIRED ||
      reservation.status === InventoryReservationStatus.CANCELLED
    ) {
      throw new BadRequestException({
        code: INVENTORY_ERROR_CODES.RESERVATION_ALREADY_RELEASED,
        message: `Cannot fulfill reservation in ${reservation.status} status`,
      });
    }

    const quantityToFulfill = request.quantityFulfilled ?? reservation.quantity - reservation.quantityFulfilled;
    const newQuantityFulfilled = reservation.quantityFulfilled + quantityToFulfill;
    const isFullyFulfilled = newQuantityFulfilled >= reservation.quantity;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          quantityFulfilled: newQuantityFulfilled,
          status: isFullyFulfilled
            ? InventoryReservationStatus.FULFILLED
            : InventoryReservationStatus.PARTIALLY_FULFILLED,
          fulfilledAt: isFullyFulfilled ? new Date() : undefined,
        },
        include: { warehouse: true },
      });

      // Record movement for fulfilled quantity
      await this.recordMovementInternal(tx, tenantId, {
        sku: reservation.sku,
        warehouseId: reservation.warehouseId,
        type: InventoryMovementType.SALE,
        quantity: quantityToFulfill,
        referenceType: request.referenceType || reservation.sourceType,
        referenceId: request.referenceId || reservation.sourceId,
      });

      return res;
    });

    return this.mapReservationToResponse(updated);
  }

  async releaseReservation(
    tenantId: string,
    request: ReleaseReservationRequest,
  ): Promise<ReservationResponse> {
    const reservation = await this.prisma.inventoryReservation.findFirst({
      where: { id: request.reservationId, tenantId },
      include: { warehouse: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (
      reservation.status === InventoryReservationStatus.RELEASED ||
      reservation.status === InventoryReservationStatus.EXPIRED ||
      reservation.status === InventoryReservationStatus.CANCELLED ||
      reservation.status === InventoryReservationStatus.FULFILLED
    ) {
      throw new BadRequestException({
        code: INVENTORY_ERROR_CODES.RESERVATION_ALREADY_RELEASED,
        message: `Cannot release reservation in ${reservation.status} status`,
      });
    }

    const quantityToRelease = reservation.quantity - reservation.quantityFulfilled;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: {
          status: InventoryReservationStatus.RELEASED,
          releasedAt: new Date(),
          notes: request.reason
            ? `${reservation.notes || ''}\nReleased: ${request.reason}`.trim()
            : reservation.notes,
        },
        include: { warehouse: true },
      });

      // Restore inventory
      if (quantityToRelease > 0) {
        await tx.inventoryLevel.update({
          where: { id: reservation.inventoryLevelId },
          data: {
            quantityReserved: { decrement: quantityToRelease },
            quantityAvailable: { increment: quantityToRelease },
            atp: { increment: quantityToRelease },
          },
        });

        await this.updateAvailabilityStatus(tx, reservation.inventoryLevelId);
      }

      return res;
    });

    this.logger.log(`Released reservation ${reservation.reservationNumber}`);

    return this.mapReservationToResponse(updated);
  }

  async getReservation(
    tenantId: string,
    reservationId: string,
  ): Promise<ReservationResponse | null> {
    const reservation = await this.prisma.inventoryReservation.findFirst({
      where: { id: reservationId, tenantId },
      include: { warehouse: true },
    });

    if (!reservation) return null;

    return this.mapReservationToResponse(reservation);
  }

  async listReservations(
    tenantId: string,
    options: ListReservationsOptions = {},
  ): Promise<ReservationResponse[]> {
    const where: Prisma.InventoryReservationWhereInput = { tenantId };

    if (options.warehouseId) where.warehouseId = options.warehouseId;
    if (options.sku) where.sku = options.sku;
    if (options.sourceType) where.sourceType = options.sourceType;
    if (options.sourceId) where.sourceId = options.sourceId;
    if (options.status) where.status = { in: options.status };
    if (options.expiringWithinMinutes) {
      where.expiresAt = {
        lte: new Date(Date.now() + options.expiringWithinMinutes * 60 * 1000),
        gt: new Date(),
      };
      where.status = { in: [InventoryReservationStatus.PENDING, InventoryReservationStatus.CONFIRMED] };
    }

    const { page = 1, limit = 50 } = options;

    const reservations = await this.prisma.inventoryReservation.findMany({
      where,
      include: { warehouse: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [options.orderBy || 'createdAt']: options.orderDir || 'desc' },
    });

    return reservations.map((r) => this.mapReservationToResponse(r));
  }

  async processExpiredReservations(tenantId: string): Promise<number> {
    const expired = await this.prisma.inventoryReservation.findMany({
      where: {
        tenantId,
        status: { in: [InventoryReservationStatus.PENDING, InventoryReservationStatus.CONFIRMED] },
        expiresAt: { lte: new Date() },
      },
    });

    let count = 0;
    for (const reservation of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.inventoryReservation.update({
            where: { id: reservation.id },
            data: {
              status: InventoryReservationStatus.EXPIRED,
              releasedAt: new Date(),
            },
          });

          const quantityToRelease = reservation.quantity - reservation.quantityFulfilled;
          if (quantityToRelease > 0) {
            await tx.inventoryLevel.update({
              where: { id: reservation.inventoryLevelId },
              data: {
                quantityReserved: { decrement: quantityToRelease },
                quantityAvailable: { increment: quantityToRelease },
                atp: { increment: quantityToRelease },
              },
            });

            await this.updateAvailabilityStatus(tx, reservation.inventoryLevelId);
          }
        });
        count++;
      } catch (error) {
        this.logger.error(`Failed to expire reservation ${reservation.id}: ${error}`);
      }
    }

    if (count > 0) {
      this.logger.log(`Expired ${count} reservations for tenant ${tenantId}`);
    }

    return count;
  }

  // ============================================
  // Inventory Movements
  // ============================================

  async recordMovement(
    tenantId: string,
    request: RecordMovementRequest,
  ): Promise<MovementResponse> {
    return this.prisma.$transaction(async (tx) => {
      return this.recordMovementInternal(tx, tenantId, request);
    });
  }

  private async recordMovementInternal(
    tx: Prisma.TransactionClient,
    tenantId: string,
    request: RecordMovementRequest,
  ): Promise<MovementResponse> {
    const level = await tx.inventoryLevel.findUnique({
      where: {
        tenantId_warehouseId_sku: {
          tenantId,
          warehouseId: request.warehouseId,
          sku: request.sku,
        },
      },
    });

    if (!level) {
      throw new NotFoundException(`Inventory level not found for SKU ${request.sku}`);
    }

    const previousQty = level.quantityOnHand;
    let newQty = previousQty;

    // Calculate new quantity based on movement type
    switch (request.type) {
      case InventoryMovementType.RECEIPT:
      case InventoryMovementType.RETURN:
      case InventoryMovementType.ADJUSTMENT_INCREASE:
      case InventoryMovementType.TRANSFER_IN:
      case InventoryMovementType.RELEASE:
        newQty = previousQty + request.quantity;
        break;

      case InventoryMovementType.SALE:
      case InventoryMovementType.ADJUSTMENT_DECREASE:
      case InventoryMovementType.TRANSFER_OUT:
      case InventoryMovementType.WRITE_OFF:
      case InventoryMovementType.RESERVATION:
        newQty = previousQty - request.quantity;
        break;

      case InventoryMovementType.CYCLE_COUNT:
        newQty = request.quantity; // Set to counted quantity
        break;
    }

    if (newQty < 0) {
      throw new BadRequestException({
        code: INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK,
        message: `Movement would result in negative inventory`,
      });
    }

    // Update inventory level
    await tx.inventoryLevel.update({
      where: { id: level.id },
      data: {
        quantityOnHand: newQty,
        quantityAvailable: newQty - level.quantityReserved - level.quantityAllocated,
        atp: newQty - level.quantityReserved - level.quantityAllocated - level.safetyStock + level.quantityOnOrder,
        lastReceivedAt:
          request.type === InventoryMovementType.RECEIPT ? new Date() : undefined,
        lastSoldAt: request.type === InventoryMovementType.SALE ? new Date() : undefined,
      },
    });

    await this.updateAvailabilityStatus(tx, level.id);

    // Create movement record
    const movement = await tx.inventoryMovement.create({
      data: {
        movementNumber: `MOV-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`,
        type: request.type,
        quantity: request.quantity,
        previousQty,
        newQty,
        referenceType: request.referenceType,
        referenceId: request.referenceId,
        unitCost: request.unitCost,
        totalCost: request.unitCost ? request.unitCost * request.quantity : undefined,
        reason: request.reason,
        notes: request.notes,
        metadata: (request.metadata || {}) as Prisma.InputJsonValue,
        tenantId,
        inventoryLevelId: level.id,
        userId: request.userId,
      },
    });

    return {
      id: movement.id,
      movementNumber: movement.movementNumber,
      type: movement.type,
      sku: request.sku,
      warehouseId: request.warehouseId,
      quantity: movement.quantity,
      previousQty: movement.previousQty,
      newQty: movement.newQty,
      referenceType: movement.referenceType || undefined,
      referenceId: movement.referenceId || undefined,
      unitCost: movement.unitCost ? Number(movement.unitCost) : undefined,
      totalCost: movement.totalCost ? Number(movement.totalCost) : undefined,
      reason: movement.reason || undefined,
      notes: movement.notes || undefined,
      userId: movement.userId || undefined,
      metadata: movement.metadata as Record<string, unknown>,
      createdAt: movement.createdAt,
    };
  }

  async adjustInventory(
    tenantId: string,
    request: AdjustInventoryRequest,
  ): Promise<InventoryLevelDTO> {
    const level = await this.prisma.inventoryLevel.findUnique({
      where: {
        tenantId_warehouseId_sku: {
          tenantId,
          warehouseId: request.warehouseId,
          sku: request.sku,
        },
      },
      include: { warehouse: true },
    });

    if (!level) {
      throw new NotFoundException(`Inventory level not found for SKU ${request.sku}`);
    }

    let movementType: InventoryMovementType;
    let quantity: number;

    switch (request.adjustmentType) {
      case 'set':
        const diff = request.quantity - level.quantityOnHand;
        movementType =
          diff >= 0
            ? InventoryMovementType.ADJUSTMENT_INCREASE
            : InventoryMovementType.ADJUSTMENT_DECREASE;
        quantity = Math.abs(diff);
        break;
      case 'add':
        movementType = InventoryMovementType.ADJUSTMENT_INCREASE;
        quantity = request.quantity;
        break;
      case 'subtract':
        movementType = InventoryMovementType.ADJUSTMENT_DECREASE;
        quantity = request.quantity;
        break;
    }

    if (quantity > 0) {
      await this.recordMovement(tenantId, {
        sku: request.sku,
        warehouseId: request.warehouseId,
        type: movementType,
        quantity,
        reason: request.reason,
        notes: request.notes,
        userId: request.userId,
      });
    }

    const updated = await this.prisma.inventoryLevel.findUnique({
      where: { id: level.id },
      include: { warehouse: true },
    });

    return this.mapInventoryLevelToDTO(updated!);
  }

  // ============================================
  // Alerts
  // ============================================

  async listAlerts(
    tenantId: string,
    options: ListAlertsOptions = {},
  ): Promise<InventoryAlertDTO[]> {
    const where: Prisma.InventoryAlertWhereInput = { tenantId };

    if (options.alertType) where.alertType = { in: options.alertType };
    if (options.severity) where.severity = { in: options.severity };
    if (options.status) where.status = { in: options.status };

    const { page = 1, limit = 50 } = options;

    const alerts = await this.prisma.inventoryAlert.findMany({
      where,
      include: {
        inventoryLevel: {
          include: { warehouse: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [options.orderBy || 'createdAt']: options.orderDir || 'desc' },
    });

    return alerts.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      severity: a.severity,
      status: a.status,
      title: a.title,
      message: a.message,
      threshold: a.threshold || undefined,
      currentValue: a.currentValue || undefined,
      inventoryLevelId: a.inventoryLevelId,
      sku: a.inventoryLevel.sku,
      warehouseId: a.inventoryLevel.warehouseId,
      warehouseCode: a.inventoryLevel.warehouse.code,
      acknowledgedAt: a.acknowledgedAt || undefined,
      acknowledgedById: a.acknowledgedById || undefined,
      resolvedAt: a.resolvedAt || undefined,
      resolvedById: a.resolvedById || undefined,
      metadata: a.metadata as Record<string, unknown>,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  async acknowledgeAlert(
    tenantId: string,
    request: AcknowledgeAlertRequest,
  ): Promise<InventoryAlertDTO> {
    const alert = await this.prisma.inventoryAlert.findFirst({
      where: { id: request.alertId, tenantId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updated = await this.prisma.inventoryAlert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
      include: {
        inventoryLevel: {
          include: { warehouse: true },
        },
      },
    });

    return this.mapAlertToDTO(updated);
  }

  async resolveAlert(
    tenantId: string,
    request: ResolveAlertRequest,
  ): Promise<InventoryAlertDTO> {
    const alert = await this.prisma.inventoryAlert.findFirst({
      where: { id: request.alertId, tenantId },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const updated = await this.prisma.inventoryAlert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt: new Date(),
      },
      include: {
        inventoryLevel: {
          include: { warehouse: true },
        },
      },
    });

    return this.mapAlertToDTO(updated);
  }

  async checkAndCreateAlerts(tenantId: string): Promise<InventoryAlertDTO[]> {
    const config = DEFAULT_INVENTORY_CONFIG.alertSettings;
    const alerts: InventoryAlertDTO[] = [];

    if (config.enableLowStockAlerts || config.enableOutOfStockAlerts) {
      const lowStockLevels = await this.prisma.inventoryLevel.findMany({
        where: {
          tenantId,
          OR: [
            { availability: ProductAvailability.LOW_STOCK },
            { availability: ProductAvailability.OUT_OF_STOCK },
          ],
        },
        include: { warehouse: true },
      });

      for (const level of lowStockLevels) {
        const existingAlert = await this.prisma.inventoryAlert.findFirst({
          where: {
            inventoryLevelId: level.id,
            alertType: {
              in: [InventoryAlertType.LOW_STOCK, InventoryAlertType.OUT_OF_STOCK],
            },
            status: { in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] },
          },
        });

        if (!existingAlert) {
          const isOutOfStock = level.availability === ProductAvailability.OUT_OF_STOCK;
          const alertType = isOutOfStock
            ? InventoryAlertType.OUT_OF_STOCK
            : InventoryAlertType.LOW_STOCK;

          const alert = await this.prisma.inventoryAlert.create({
            data: {
              alertType,
              severity: isOutOfStock ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
              status: AlertStatus.ACTIVE,
              title: isOutOfStock
                ? `Out of Stock: ${level.sku}`
                : `Low Stock: ${level.sku}`,
              message: isOutOfStock
                ? `SKU ${level.sku} is out of stock at ${level.warehouse.name}`
                : `SKU ${level.sku} is low on stock at ${level.warehouse.name}. Available: ${level.quantityAvailable}`,
              threshold: level.reorderPoint || level.safetyStock,
              currentValue: level.quantityAvailable,
              metadata: {},
              tenantId,
              inventoryLevelId: level.id,
            },
            include: {
              inventoryLevel: {
                include: { warehouse: true },
              },
            },
          });

          alerts.push(this.mapAlertToDTO(alert));
        }
      }
    }

    return alerts;
  }

  // ============================================
  // Sync Jobs
  // ============================================

  async startSyncJob(
    tenantId: string,
    request: StartSyncJobRequest,
  ): Promise<SyncJobResponse> {
    // Check for existing running job
    const runningJob = await this.prisma.inventorySyncJob.findFirst({
      where: {
        tenantId,
        status: SyncJobStatus.RUNNING,
        warehouseId: request.warehouseId,
      },
    });

    if (runningJob) {
      throw new BadRequestException({
        code: INVENTORY_ERROR_CODES.SYNC_IN_PROGRESS,
        message: 'A sync job is already running',
        jobId: runningJob.id,
      });
    }

    const job = await this.prisma.inventorySyncJob.create({
      data: {
        jobType: request.jobType,
        status: SyncJobStatus.PENDING,
        connectorId: request.connectorId,
        warehouseId: request.warehouseId,
        metadata: (request.options || {}) as Prisma.InputJsonValue,
        tenantId,
      },
    });

    return this.mapSyncJobToResponse(job);
  }

  async getSyncJob(tenantId: string, jobId: string): Promise<SyncJobResponse | null> {
    const job = await this.prisma.inventorySyncJob.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) return null;

    return this.mapSyncJobToResponse(job);
  }

  async listSyncJobs(
    tenantId: string,
    options: ListSyncJobsOptions = {},
  ): Promise<SyncJobResponse[]> {
    const where: Prisma.InventorySyncJobWhereInput = { tenantId };

    if (options.jobType) where.jobType = options.jobType;
    if (options.status) where.status = { in: options.status };
    if (options.warehouseId) where.warehouseId = options.warehouseId;
    if (options.fromDate) where.createdAt = { gte: options.fromDate };
    if (options.toDate) {
      where.createdAt = { ...((where.createdAt as object) || {}), lte: options.toDate };
    }

    const { page = 1, limit = 50 } = options;

    const jobs = await this.prisma.inventorySyncJob.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((j) => this.mapSyncJobToResponse(j));
  }

  async processExternalInventoryData(
    tenantId: string,
    warehouseId: string,
    data: ExternalInventoryData[],
  ): Promise<SyncSummary> {
    const startTime = Date.now();
    const summary: SyncSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
    };

    for (const item of data) {
      try {
        const existing = await this.prisma.inventoryLevel.findUnique({
          where: {
            tenantId_warehouseId_sku: { tenantId, warehouseId, sku: item.sku },
          },
        });

        if (existing) {
          await this.prisma.inventoryLevel.update({
            where: { id: existing.id },
            data: {
              quantityOnHand: item.quantityOnHand,
              quantityReserved: item.quantityReserved ?? existing.quantityReserved,
              quantityOnOrder: item.quantityOnOrder ?? existing.quantityOnOrder,
              quantityAvailable:
                item.quantityOnHand -
                (item.quantityReserved ?? existing.quantityReserved) -
                existing.quantityAllocated,
              atp:
                item.quantityOnHand -
                (item.quantityReserved ?? existing.quantityReserved) -
                existing.quantityAllocated -
                existing.safetyStock +
                (item.quantityOnOrder ?? existing.quantityOnOrder),
              reorderPoint: item.reorderPoint ?? existing.reorderPoint,
              safetyStock: item.safetyStock ?? existing.safetyStock,
              externalId: item.externalId,
              lastSyncAt: new Date(),
              lastSyncSource: 'external_sync',
            },
          });
          await this.updateAvailabilityStatus(this.prisma, existing.id);
          summary.updated++;
        } else {
          // Find master product if exists
          const masterProduct = await this.prisma.masterProduct.findFirst({
            where: { sku: item.sku },
          });

          await this.prisma.inventoryLevel.create({
            data: {
              sku: item.sku,
              quantityOnHand: item.quantityOnHand,
              quantityReserved: item.quantityReserved ?? 0,
              quantityOnOrder: item.quantityOnOrder ?? 0,
              quantityAllocated: 0,
              quantityAvailable: item.quantityOnHand - (item.quantityReserved ?? 0),
              atp:
                item.quantityOnHand -
                (item.quantityReserved ?? 0) -
                (item.safetyStock ?? 0) +
                (item.quantityOnOrder ?? 0),
              reorderPoint: item.reorderPoint,
              safetyStock: item.safetyStock ?? 0,
              availability: this.calculateAvailability(item.quantityOnHand),
              externalId: item.externalId,
              lastSyncAt: new Date(),
              lastSyncSource: 'external_sync',
              metadata: (item.metadata || {}) as Prisma.InputJsonValue,
              tenantId,
              warehouseId,
              masterProductId: masterProduct?.id,
            },
          });
          summary.created++;
        }
      } catch (error) {
        this.logger.error(`Failed to sync inventory for SKU ${item.sku}: ${error}`);
        summary.failed++;
      }
    }

    summary.duration = Date.now() - startTime;
    return summary;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async getDefaultWarehouseId(tenantId: string): Promise<string> {
    const defaultWarehouse = await this.prisma.warehouse.findFirst({
      where: { tenantId, isDefault: true, isActive: true },
    });

    if (!defaultWarehouse) {
      throw new NotFoundException('No default warehouse configured');
    }

    return defaultWarehouse.id;
  }

  private calculateEstimatedShipDate(warehouse: { leadTimeDays: number; cutoffTime: string | null }): Date {
    const now = new Date();
    const cutoff = warehouse.cutoffTime || '14:00';
    const [hours, minutes] = cutoff.split(':').map(Number);
    const cutoffToday = new Date(now);
    cutoffToday.setHours(hours, minutes, 0, 0);

    let daysToAdd = warehouse.leadTimeDays;
    if (now > cutoffToday) {
      daysToAdd++;
    }

    const shipDate = new Date(now);
    shipDate.setDate(shipDate.getDate() + daysToAdd);
    return shipDate;
  }

  private buildFulfillmentPlan(
    availability: WarehouseAvailability[],
    quantity: number,
    useAtp: boolean,
  ): { warehouseId: string; warehouseCode: string; quantity: number; estimatedShipDate: Date }[] {
    const plan: { warehouseId: string; warehouseCode: string; quantity: number; estimatedShipDate: Date }[] = [];
    let remaining = quantity;

    // Sort by available quantity descending
    const sorted = [...availability].sort((a, b) =>
      useAtp ? b.atp - a.atp : b.quantityAvailable - a.quantityAvailable,
    );

    for (const wh of sorted) {
      if (remaining <= 0) break;

      const available = useAtp ? wh.atp : wh.quantityAvailable;
      if (available <= 0) continue;

      const toFulfill = Math.min(remaining, available);
      plan.push({
        warehouseId: wh.warehouseId,
        warehouseCode: wh.warehouseCode,
        quantity: toFulfill,
        estimatedShipDate: wh.estimatedShipDate || new Date(),
      });

      remaining -= toFulfill;
    }

    return plan;
  }

  private determineOverallAvailability(
    onHand: number,
    available: number,
    atp: number,
  ): ProductAvailability {
    if (onHand === 0 || available === 0) {
      return ProductAvailability.OUT_OF_STOCK;
    }
    if (atp < 10) {
      return ProductAvailability.LOW_STOCK;
    }
    return ProductAvailability.IN_STOCK;
  }

  private calculateAvailability(quantity: number): ProductAvailability {
    if (quantity === 0) return ProductAvailability.OUT_OF_STOCK;
    if (quantity < 10) return ProductAvailability.LOW_STOCK;
    return ProductAvailability.IN_STOCK;
  }

  private generateProjectedAvailability(
    currentAtp: number,
    lookaheadDays: number,
    asOfDate: Date,
  ): ProjectedAvailability[] {
    const projections: ProjectedAvailability[] = [];
    let atp = currentAtp;

    for (let i = 0; i <= lookaheadDays; i++) {
      const date = new Date(asOfDate);
      date.setDate(date.getDate() + i);

      projections.push({
        date,
        atp: Math.max(0, atp),
        incoming: 0,
        outgoing: 0,
      });
    }

    return projections;
  }

  private generateATPBuckets(
    currentAtp: number,
    lookaheadDays: number,
    bucketSizeDays: number,
    asOfDate: Date,
  ): ATPBucket[] {
    const buckets: ATPBucket[] = [];
    let atp = currentAtp;

    for (let i = 0; i < lookaheadDays; i += bucketSizeDays) {
      const startDate = new Date(asOfDate);
      startDate.setDate(startDate.getDate() + i);

      const endDate = new Date(asOfDate);
      endDate.setDate(endDate.getDate() + Math.min(i + bucketSizeDays - 1, lookaheadDays));

      buckets.push({
        startDate,
        endDate,
        atp: Math.max(0, atp),
        incoming: 0,
        outgoing: 0,
      });
    }

    return buckets;
  }

  private async updateAvailabilityStatus(
    tx: Prisma.TransactionClient | PrismaService,
    inventoryLevelId: string,
  ): Promise<void> {
    const level = await tx.inventoryLevel.findUnique({
      where: { id: inventoryLevelId },
    });

    if (!level) return;

    let availability: ProductAvailability;

    if (level.quantityAvailable <= 0) {
      availability = ProductAvailability.OUT_OF_STOCK;
    } else if (
      level.reorderPoint !== null &&
      level.quantityAvailable <= level.reorderPoint
    ) {
      availability = ProductAvailability.LOW_STOCK;
    } else if (level.quantityAvailable < level.safetyStock) {
      availability = ProductAvailability.LOW_STOCK;
    } else {
      availability = ProductAvailability.IN_STOCK;
    }

    if (availability !== level.availability) {
      await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { availability },
      });
    }
  }

  private mapSourceTypeToReservationType(sourceType: string): InventoryReservationType {
    const mapping: Record<string, InventoryReservationType> = {
      order: InventoryReservationType.ORDER,
      cart: InventoryReservationType.CART,
      quote: InventoryReservationType.QUOTE,
      transfer: InventoryReservationType.TRANSFER,
    };
    return mapping[sourceType.toLowerCase()] || InventoryReservationType.HOLD;
  }

  private mapInventoryLevelToDTO(level: any): InventoryLevelDTO {
    return {
      id: level.id,
      tenantId: level.tenantId,
      warehouseId: level.warehouseId,
      warehouseCode: level.warehouse?.code,
      masterProductId: level.masterProductId || undefined,
      sku: level.sku,
      quantityOnHand: level.quantityOnHand,
      quantityReserved: level.quantityReserved,
      quantityOnOrder: level.quantityOnOrder,
      quantityAllocated: level.quantityAllocated,
      quantityAvailable: level.quantityAvailable,
      atp: level.atp,
      reorderPoint: level.reorderPoint || undefined,
      safetyStock: level.safetyStock,
      minOrderQty: level.minOrderQty,
      maxOrderQty: level.maxOrderQty || undefined,
      availability: level.availability,
      lastSyncAt: level.lastSyncAt || undefined,
      lastSyncSource: level.lastSyncSource || undefined,
      lastReceivedAt: level.lastReceivedAt || undefined,
      lastSoldAt: level.lastSoldAt || undefined,
      averageDailySales: level.averageDailySales ? Number(level.averageDailySales) : undefined,
      daysOfStock: level.daysOfStock || undefined,
      externalId: level.externalId || undefined,
      externalSystem: level.externalSystem || undefined,
      metadata: level.metadata as Record<string, unknown>,
    };
  }

  private mapReservationToResponse(reservation: any): ReservationResponse {
    return {
      id: reservation.id,
      reservationNumber: reservation.reservationNumber,
      sku: reservation.sku,
      quantity: reservation.quantity,
      quantityFulfilled: reservation.quantityFulfilled,
      status: reservation.status,
      type: reservation.type,
      priority: reservation.priority,
      expiresAt: reservation.expiresAt,
      releasedAt: reservation.releasedAt || undefined,
      fulfilledAt: reservation.fulfilledAt || undefined,
      sourceType: reservation.sourceType,
      sourceId: reservation.sourceId,
      warehouseId: reservation.warehouseId,
      warehouseCode: reservation.warehouse?.code || '',
      inventoryLevelId: reservation.inventoryLevelId,
      userId: reservation.userId || undefined,
      externalRef: reservation.externalRef || undefined,
      notes: reservation.notes || undefined,
      metadata: reservation.metadata as Record<string, unknown>,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    };
  }

  private mapAlertToDTO(alert: any): InventoryAlertDTO {
    return {
      id: alert.id,
      alertType: alert.alertType,
      severity: alert.severity,
      status: alert.status,
      title: alert.title,
      message: alert.message,
      threshold: alert.threshold || undefined,
      currentValue: alert.currentValue || undefined,
      inventoryLevelId: alert.inventoryLevelId,
      sku: alert.inventoryLevel.sku,
      warehouseId: alert.inventoryLevel.warehouseId,
      warehouseCode: alert.inventoryLevel.warehouse.code,
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedById: alert.acknowledgedById || undefined,
      resolvedAt: alert.resolvedAt || undefined,
      resolvedById: alert.resolvedById || undefined,
      metadata: alert.metadata as Record<string, unknown>,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  private mapSyncJobToResponse(job: any): SyncJobResponse {
    return {
      id: job.id,
      jobType: job.jobType,
      status: job.status,
      connectorId: job.connectorId || undefined,
      warehouseId: job.warehouseId || undefined,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successCount: job.successCount,
      errorCount: job.errorCount,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      errors: job.errors as any[] | undefined,
      summary: job.summary as SyncSummary | undefined,
      metadata: job.metadata as Record<string, unknown>,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
