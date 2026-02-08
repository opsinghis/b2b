import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import {
  Prisma,
  InventoryAlertType,
  AlertSeverity,
  AlertStatus,
  ProductAvailability,
  InventoryReservationStatus,
} from '@prisma/client';
import { InventoryAlertDTO, DEFAULT_INVENTORY_CONFIG } from '../interfaces';

/**
 * InventoryAlertService handles creation, monitoring, and management
 * of inventory alerts such as low stock, out of stock, and expiring reservations.
 */
@Injectable()
export class InventoryAlertService {
  private readonly logger = new Logger(InventoryAlertService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check all inventory levels and create alerts as needed
   */
  async checkAndCreateAlerts(tenantId: string): Promise<InventoryAlertDTO[]> {
    const config = DEFAULT_INVENTORY_CONFIG.alertSettings;
    const alerts: InventoryAlertDTO[] = [];

    // Check for low stock and out of stock
    if (config.enableLowStockAlerts || config.enableOutOfStockAlerts) {
      const stockAlerts = await this.checkStockLevels(tenantId, config);
      alerts.push(...stockAlerts);
    }

    // Check for expiring reservations
    if (config.enableReservationExpiringAlerts) {
      const reservationAlerts = await this.checkExpiringReservations(
        tenantId,
        config.reservationExpiringThresholdMinutes,
      );
      alerts.push(...reservationAlerts);
    }

    // Check for items below reorder point
    const reorderAlerts = await this.checkReorderPoints(tenantId);
    alerts.push(...reorderAlerts);

    // Check for safety stock breaches
    const safetyStockAlerts = await this.checkSafetyStockBreaches(tenantId);
    alerts.push(...safetyStockAlerts);

    if (alerts.length > 0) {
      this.logger.log(`Created ${alerts.length} alerts for tenant ${tenantId}`);
    }

    return alerts;
  }

  /**
   * Check stock levels for low stock and out of stock conditions
   */
  private async checkStockLevels(
    tenantId: string,
    config: typeof DEFAULT_INVENTORY_CONFIG.alertSettings,
  ): Promise<InventoryAlertDTO[]> {
    const alerts: InventoryAlertDTO[] = [];

    // Find inventory levels that are low or out of stock
    const levels = await this.prisma.inventoryLevel.findMany({
      where: {
        tenantId,
        availability: {
          in: [ProductAvailability.LOW_STOCK, ProductAvailability.OUT_OF_STOCK],
        },
      },
      include: { warehouse: true },
    });

    for (const level of levels) {
      // Check if alert already exists
      const existingAlert = await this.prisma.inventoryAlert.findFirst({
        where: {
          inventoryLevelId: level.id,
          alertType: {
            in: [InventoryAlertType.LOW_STOCK, InventoryAlertType.OUT_OF_STOCK],
          },
          status: { in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] },
        },
      });

      if (existingAlert) continue;

      const isOutOfStock = level.availability === ProductAvailability.OUT_OF_STOCK;
      const alertType = isOutOfStock
        ? InventoryAlertType.OUT_OF_STOCK
        : InventoryAlertType.LOW_STOCK;

      // Skip if the specific alert type is disabled
      if (isOutOfStock && !config.enableOutOfStockAlerts) continue;
      if (!isOutOfStock && !config.enableLowStockAlerts) continue;

      const alert = await this.createAlert(tenantId, {
        alertType,
        severity: isOutOfStock ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
        inventoryLevelId: level.id,
        title: isOutOfStock
          ? `Out of Stock: ${level.sku}`
          : `Low Stock: ${level.sku}`,
        message: isOutOfStock
          ? `SKU ${level.sku} is out of stock at warehouse ${level.warehouse.name}.`
          : `SKU ${level.sku} has only ${level.quantityAvailable} units available at warehouse ${level.warehouse.name}.`,
        threshold: level.reorderPoint || level.safetyStock,
        currentValue: level.quantityAvailable,
      });

      alerts.push(this.mapToDTO(alert, level));
    }

    return alerts;
  }

  /**
   * Check for reservations that are about to expire
   */
  private async checkExpiringReservations(
    tenantId: string,
    thresholdMinutes: number,
  ): Promise<InventoryAlertDTO[]> {
    const alerts: InventoryAlertDTO[] = [];

    const expiringThreshold = new Date(Date.now() + thresholdMinutes * 60 * 1000);

    const expiringReservations = await this.prisma.inventoryReservation.findMany({
      where: {
        tenantId,
        status: {
          in: [InventoryReservationStatus.PENDING, InventoryReservationStatus.CONFIRMED],
        },
        expiresAt: {
          gt: new Date(),
          lte: expiringThreshold,
        },
      },
      include: {
        inventoryLevel: {
          include: { warehouse: true },
        },
      },
    });

    for (const reservation of expiringReservations) {
      // Check if alert already exists
      const existingAlert = await this.prisma.inventoryAlert.findFirst({
        where: {
          inventoryLevelId: reservation.inventoryLevelId,
          alertType: InventoryAlertType.RESERVATION_EXPIRING,
          status: AlertStatus.ACTIVE,
          metadata: {
            path: ['reservationId'],
            equals: reservation.id,
          },
        },
      });

      if (existingAlert) continue;

      const minutesUntilExpiry = Math.round(
        (reservation.expiresAt.getTime() - Date.now()) / (1000 * 60),
      );

      const alert = await this.createAlert(tenantId, {
        alertType: InventoryAlertType.RESERVATION_EXPIRING,
        severity: AlertSeverity.WARNING,
        inventoryLevelId: reservation.inventoryLevelId,
        title: `Reservation Expiring: ${reservation.reservationNumber}`,
        message: `Reservation ${reservation.reservationNumber} for ${reservation.quantity} units of ${reservation.sku} will expire in ${minutesUntilExpiry} minutes.`,
        metadata: {
          reservationId: reservation.id,
          reservationNumber: reservation.reservationNumber,
          sourceType: reservation.sourceType,
          sourceId: reservation.sourceId,
          expiresAt: reservation.expiresAt.toISOString(),
        },
      });

      alerts.push(this.mapToDTO(alert, reservation.inventoryLevel));
    }

    return alerts;
  }

  /**
   * Check for items below reorder point
   */
  private async checkReorderPoints(tenantId: string): Promise<InventoryAlertDTO[]> {
    const alerts: InventoryAlertDTO[] = [];

    const belowReorderPoint = await this.prisma.inventoryLevel.findMany({
      where: {
        tenantId,
        reorderPoint: { not: null },
        quantityAvailable: {
          lte: this.prisma.inventoryLevel.fields.reorderPoint,
        },
      },
      include: { warehouse: true },
    });

    // Manual filter since Prisma doesn't support comparing two fields directly
    const filtered = belowReorderPoint.filter(
      (level) => level.reorderPoint !== null && level.quantityAvailable <= level.reorderPoint,
    );

    for (const level of filtered) {
      // Check if alert already exists
      const existingAlert = await this.prisma.inventoryAlert.findFirst({
        where: {
          inventoryLevelId: level.id,
          alertType: InventoryAlertType.REORDER_POINT,
          status: { in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] },
        },
      });

      if (existingAlert) continue;

      const alert = await this.createAlert(tenantId, {
        alertType: InventoryAlertType.REORDER_POINT,
        severity: AlertSeverity.INFO,
        inventoryLevelId: level.id,
        title: `Reorder Point Reached: ${level.sku}`,
        message: `SKU ${level.sku} has reached its reorder point. Available: ${level.quantityAvailable}, Reorder Point: ${level.reorderPoint}.`,
        threshold: level.reorderPoint,
        currentValue: level.quantityAvailable,
      });

      alerts.push(this.mapToDTO(alert, level));
    }

    return alerts;
  }

  /**
   * Check for safety stock breaches
   */
  private async checkSafetyStockBreaches(tenantId: string): Promise<InventoryAlertDTO[]> {
    const alerts: InventoryAlertDTO[] = [];

    const levels = await this.prisma.inventoryLevel.findMany({
      where: {
        tenantId,
        safetyStock: { gt: 0 },
      },
      include: { warehouse: true },
    });

    const belowSafetyStock = levels.filter(
      (level) => level.quantityAvailable < level.safetyStock,
    );

    for (const level of belowSafetyStock) {
      // Check if alert already exists
      const existingAlert = await this.prisma.inventoryAlert.findFirst({
        where: {
          inventoryLevelId: level.id,
          alertType: InventoryAlertType.SAFETY_STOCK_BREACH,
          status: { in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] },
        },
      });

      if (existingAlert) continue;

      const alert = await this.createAlert(tenantId, {
        alertType: InventoryAlertType.SAFETY_STOCK_BREACH,
        severity: AlertSeverity.WARNING,
        inventoryLevelId: level.id,
        title: `Safety Stock Breach: ${level.sku}`,
        message: `SKU ${level.sku} has fallen below safety stock level. Available: ${level.quantityAvailable}, Safety Stock: ${level.safetyStock}.`,
        threshold: level.safetyStock,
        currentValue: level.quantityAvailable,
      });

      alerts.push(this.mapToDTO(alert, level));
    }

    return alerts;
  }

  /**
   * Auto-resolve alerts when conditions improve
   */
  async autoResolveAlerts(tenantId: string): Promise<number> {
    let resolvedCount = 0;

    // Get all active alerts
    const activeAlerts = await this.prisma.inventoryAlert.findMany({
      where: {
        tenantId,
        status: { in: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED] },
      },
      include: {
        inventoryLevel: true,
      },
    });

    for (const alert of activeAlerts) {
      let shouldResolve = false;

      switch (alert.alertType) {
        case InventoryAlertType.LOW_STOCK:
        case InventoryAlertType.OUT_OF_STOCK:
          // Resolve if stock is now available and above threshold
          shouldResolve =
            alert.inventoryLevel.quantityAvailable > (alert.threshold || 0);
          break;

        case InventoryAlertType.REORDER_POINT:
          // Resolve if quantity is now above reorder point
          shouldResolve =
            alert.inventoryLevel.reorderPoint !== null &&
            alert.inventoryLevel.quantityAvailable > alert.inventoryLevel.reorderPoint;
          break;

        case InventoryAlertType.SAFETY_STOCK_BREACH:
          // Resolve if quantity is now above safety stock
          shouldResolve =
            alert.inventoryLevel.quantityAvailable >= alert.inventoryLevel.safetyStock;
          break;

        case InventoryAlertType.RESERVATION_EXPIRING:
          // Check if reservation was fulfilled or released
          const reservationId = (alert.metadata as any)?.reservationId;
          if (reservationId) {
            const reservation = await this.prisma.inventoryReservation.findUnique({
              where: { id: reservationId },
            });
            shouldResolve =
              !reservation ||
              reservation.status === InventoryReservationStatus.FULFILLED ||
              reservation.status === InventoryReservationStatus.RELEASED ||
              reservation.status === InventoryReservationStatus.EXPIRED;
          }
          break;
      }

      if (shouldResolve) {
        await this.prisma.inventoryAlert.update({
          where: { id: alert.id },
          data: {
            status: AlertStatus.RESOLVED,
            resolvedAt: new Date(),
          },
        });
        resolvedCount++;
      }
    }

    if (resolvedCount > 0) {
      this.logger.log(`Auto-resolved ${resolvedCount} alerts for tenant ${tenantId}`);
    }

    return resolvedCount;
  }

  /**
   * Get alert summary for dashboard
   */
  async getAlertSummary(tenantId: string): Promise<{
    total: number;
    byType: Record<InventoryAlertType, number>;
    bySeverity: Record<AlertSeverity, number>;
    byStatus: Record<AlertStatus, number>;
  }> {
    const alerts = await this.prisma.inventoryAlert.groupBy({
      by: ['alertType', 'severity', 'status'],
      where: { tenantId },
      _count: true,
    });

    const summary = {
      total: 0,
      byType: {} as Record<InventoryAlertType, number>,
      bySeverity: {} as Record<AlertSeverity, number>,
      byStatus: {} as Record<AlertStatus, number>,
    };

    // Initialize all types
    for (const type of Object.values(InventoryAlertType)) {
      summary.byType[type] = 0;
    }
    for (const severity of Object.values(AlertSeverity)) {
      summary.bySeverity[severity] = 0;
    }
    for (const status of Object.values(AlertStatus)) {
      summary.byStatus[status] = 0;
    }

    // Aggregate counts
    for (const row of alerts) {
      summary.total += row._count;
      summary.byType[row.alertType] = (summary.byType[row.alertType] || 0) + row._count;
      summary.bySeverity[row.severity] = (summary.bySeverity[row.severity] || 0) + row._count;
      summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + row._count;
    }

    return summary;
  }

  /**
   * Create an alert
   */
  private async createAlert(
    tenantId: string,
    data: {
      alertType: InventoryAlertType;
      severity: AlertSeverity;
      inventoryLevelId: string;
      title: string;
      message: string;
      threshold?: number | null;
      currentValue?: number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<any> {
    return this.prisma.inventoryAlert.create({
      data: {
        alertType: data.alertType,
        severity: data.severity,
        status: AlertStatus.ACTIVE,
        title: data.title,
        message: data.message,
        threshold: data.threshold,
        currentValue: data.currentValue,
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
        tenantId,
        inventoryLevelId: data.inventoryLevelId,
      },
      include: {
        inventoryLevel: {
          include: { warehouse: true },
        },
      },
    });
  }

  /**
   * Map alert to DTO
   */
  private mapToDTO(alert: any, inventoryLevel: any): InventoryAlertDTO {
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
      sku: inventoryLevel.sku,
      warehouseId: inventoryLevel.warehouseId,
      warehouseCode: inventoryLevel.warehouse?.code || '',
      acknowledgedAt: alert.acknowledgedAt || undefined,
      acknowledgedById: alert.acknowledgedById || undefined,
      resolvedAt: alert.resolvedAt || undefined,
      resolvedById: alert.resolvedById || undefined,
      metadata: alert.metadata as Record<string, unknown>,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}
