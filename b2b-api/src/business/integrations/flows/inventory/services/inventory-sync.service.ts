import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import {
  InventorySyncJobType,
  SyncJobStatus,
  ProductAvailability,
} from '@prisma/client';
import {
  ExternalInventoryData,
  SyncSummary,
  SyncError,
  DEFAULT_INVENTORY_CONFIG,
} from '../interfaces';

/**
 * InventorySyncService handles batch synchronization of inventory data
 * from external systems (ERP/WMS) to the B2B platform.
 */
@Injectable()
export class InventorySyncService {
  private readonly logger = new Logger(InventorySyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a full inventory sync job
   */
  async executeFullSync(
    tenantId: string,
    jobId: string,
    warehouseId?: string,
    connectorId?: string,
  ): Promise<SyncSummary> {
    this.logger.log(`Starting full sync job ${jobId} for tenant ${tenantId}`);

    await this.updateJobStatus(jobId, SyncJobStatus.RUNNING, { startedAt: new Date() });

    const startTime = Date.now();
    const summary: SyncSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
    };
    const errors: SyncError[] = [];

    try {
      // Get warehouses to sync
      const warehouses = warehouseId
        ? [await this.prisma.warehouse.findUnique({ where: { id: warehouseId } })]
        : await this.prisma.warehouse.findMany({
            where: { tenantId, isActive: true, deletedAt: null },
          });

      // For each warehouse, fetch and sync inventory data
      for (const warehouse of warehouses.filter((w) => w !== null)) {
        try {
          // In a real implementation, this would call the connector to fetch data
          // For now, we'll simulate with existing data or mock data
          const externalData = await this.fetchExternalInventoryData(
            tenantId,
            warehouse!.id,
            connectorId,
          );

          const warehouseSummary = await this.processInventoryBatch(
            tenantId,
            warehouse!.id,
            externalData,
            jobId,
          );

          summary.created += warehouseSummary.created;
          summary.updated += warehouseSummary.updated;
          summary.skipped += warehouseSummary.skipped;
          summary.failed += warehouseSummary.failed;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`Failed to sync warehouse ${warehouse!.code}: ${message}`);
          errors.push({
            sku: '*',
            warehouseId: warehouse!.id,
            error: message,
            errorCode: 'WAREHOUSE_SYNC_FAILED',
          });
        }
      }

      summary.duration = Date.now() - startTime;

      // Update job with results
      await this.updateJobStatus(jobId, SyncJobStatus.COMPLETED, {
        completedAt: new Date(),
        totalItems: summary.created + summary.updated + summary.skipped + summary.failed,
        processedItems: summary.created + summary.updated + summary.skipped + summary.failed,
        successCount: summary.created + summary.updated,
        errorCount: summary.failed,
        summary,
        errors: errors.length > 0 ? errors : undefined,
      });

      this.logger.log(
        `Completed full sync job ${jobId}: created=${summary.created}, updated=${summary.updated}, failed=${summary.failed}`,
      );

      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Full sync job ${jobId} failed: ${message}`);

      await this.updateJobStatus(jobId, SyncJobStatus.FAILED, {
        completedAt: new Date(),
        errors: [{ sku: '*', error: message, errorCode: 'SYNC_FAILED' }],
      });

      throw error;
    }
  }

  /**
   * Execute a delta (incremental) inventory sync
   */
  async executeDeltaSync(
    tenantId: string,
    jobId: string,
    warehouseId?: string,
    connectorId?: string,
    since?: Date,
  ): Promise<SyncSummary> {
    this.logger.log(`Starting delta sync job ${jobId} for tenant ${tenantId}`);

    await this.updateJobStatus(jobId, SyncJobStatus.RUNNING, { startedAt: new Date() });

    const startTime = Date.now();
    const summary: SyncSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
    };

    try {
      // Get last sync timestamp
      const lastSync =
        since ||
        (await this.getLastSuccessfulSyncTime(tenantId, warehouseId));

      // Fetch only changed items since last sync
      const warehouses = warehouseId
        ? [await this.prisma.warehouse.findUnique({ where: { id: warehouseId } })]
        : await this.prisma.warehouse.findMany({
            where: { tenantId, isActive: true, deletedAt: null },
          });

      for (const warehouse of warehouses.filter((w) => w !== null)) {
        const deltaData = await this.fetchDeltaInventoryData(
          tenantId,
          warehouse!.id,
          connectorId,
          lastSync,
        );

        const warehouseSummary = await this.processInventoryBatch(
          tenantId,
          warehouse!.id,
          deltaData,
          jobId,
        );

        summary.created += warehouseSummary.created;
        summary.updated += warehouseSummary.updated;
        summary.skipped += warehouseSummary.skipped;
        summary.failed += warehouseSummary.failed;
      }

      summary.duration = Date.now() - startTime;

      await this.updateJobStatus(jobId, SyncJobStatus.COMPLETED, {
        completedAt: new Date(),
        totalItems: summary.created + summary.updated + summary.skipped + summary.failed,
        processedItems: summary.created + summary.updated + summary.skipped + summary.failed,
        successCount: summary.created + summary.updated,
        errorCount: summary.failed,
        summary,
      });

      this.logger.log(
        `Completed delta sync job ${jobId}: created=${summary.created}, updated=${summary.updated}`,
      );

      return summary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Delta sync job ${jobId} failed: ${message}`);

      await this.updateJobStatus(jobId, SyncJobStatus.FAILED, {
        completedAt: new Date(),
        errors: [{ sku: '*', error: message, errorCode: 'DELTA_SYNC_FAILED' }],
      });

      throw error;
    }
  }

  /**
   * Process a batch of inventory data
   */
  async processInventoryBatch(
    tenantId: string,
    warehouseId: string,
    data: ExternalInventoryData[],
    jobId?: string,
  ): Promise<SyncSummary> {
    const batchSize = DEFAULT_INVENTORY_CONFIG.syncSettings.batchSize;
    const summary: SyncSummary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      duration: 0,
    };

    const startTime = Date.now();

    // Process in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      await this.prisma.$transaction(async (tx) => {
        for (const item of batch) {
          try {
            const result = await this.syncSingleItem(tx, tenantId, warehouseId, item);
            switch (result) {
              case 'created':
                summary.created++;
                break;
              case 'updated':
                summary.updated++;
                break;
              case 'skipped':
                summary.skipped++;
                break;
            }
          } catch (error) {
            this.logger.error(`Failed to sync SKU ${item.sku}: ${error}`);
            summary.failed++;
          }
        }
      });

      // Update job progress periodically
      if (jobId && (i + batchSize) % (batchSize * 5) === 0) {
        await this.updateJobProgress(jobId, i + batchSize, data.length);
      }
    }

    summary.duration = Date.now() - startTime;

    return summary;
  }

  /**
   * Sync a single inventory item
   */
  private async syncSingleItem(
    tx: any,
    tenantId: string,
    warehouseId: string,
    item: ExternalInventoryData,
  ): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await tx.inventoryLevel.findUnique({
      where: {
        tenantId_warehouseId_sku: { tenantId, warehouseId, sku: item.sku },
      },
    });

    if (existing) {
      // Check if update is needed
      if (existing.quantityOnHand === item.quantityOnHand && !this.hasChanges(existing, item)) {
        return 'skipped';
      }

      // Update existing record
      const quantityReserved = item.quantityReserved ?? existing.quantityReserved;
      const quantityOnOrder = item.quantityOnOrder ?? existing.quantityOnOrder;
      const safetyStock = item.safetyStock ?? existing.safetyStock;

      const quantityAvailable = item.quantityOnHand - quantityReserved - existing.quantityAllocated;
      const atp =
        item.quantityOnHand -
        quantityReserved -
        existing.quantityAllocated -
        safetyStock +
        quantityOnOrder;

      await tx.inventoryLevel.update({
        where: { id: existing.id },
        data: {
          quantityOnHand: item.quantityOnHand,
          quantityReserved,
          quantityOnOrder,
          quantityAvailable,
          atp,
          reorderPoint: item.reorderPoint ?? existing.reorderPoint,
          safetyStock,
          availability: this.calculateAvailability(quantityAvailable, item.reorderPoint, safetyStock),
          externalId: item.externalId || existing.externalId,
          lastSyncAt: new Date(),
          lastSyncSource: 'batch_sync',
        },
      });

      return 'updated';
    } else {
      // Create new record
      const masterProduct = await tx.masterProduct.findFirst({
        where: { sku: item.sku },
      });

      const quantityReserved = item.quantityReserved ?? 0;
      const quantityOnOrder = item.quantityOnOrder ?? 0;
      const safetyStock = item.safetyStock ?? 0;

      const quantityAvailable = item.quantityOnHand - quantityReserved;
      const atp = item.quantityOnHand - quantityReserved - safetyStock + quantityOnOrder;

      await tx.inventoryLevel.create({
        data: {
          sku: item.sku,
          quantityOnHand: item.quantityOnHand,
          quantityReserved,
          quantityOnOrder,
          quantityAllocated: 0,
          quantityAvailable,
          atp,
          reorderPoint: item.reorderPoint,
          safetyStock,
          availability: this.calculateAvailability(quantityAvailable, item.reorderPoint, safetyStock),
          externalId: item.externalId,
          lastSyncAt: new Date(),
          lastSyncSource: 'batch_sync',
          metadata: item.metadata || {},
          tenantId,
          warehouseId,
          masterProductId: masterProduct?.id,
        },
      });

      return 'created';
    }
  }

  /**
   * Fetch external inventory data (stub - would call connector in real implementation)
   */
  private async fetchExternalInventoryData(
    tenantId: string,
    warehouseId: string,
    connectorId?: string,
  ): Promise<ExternalInventoryData[]> {
    // In a real implementation, this would:
    // 1. Look up the connector configuration
    // 2. Authenticate with the external system
    // 3. Fetch inventory data via the appropriate API

    this.logger.debug(
      `Fetching external inventory data for warehouse ${warehouseId} via connector ${connectorId}`,
    );

    // For now, return existing data as a simulation
    const existingLevels = await this.prisma.inventoryLevel.findMany({
      where: { tenantId, warehouseId },
    });

    return existingLevels.map((level) => ({
      sku: level.sku,
      warehouseCode: undefined,
      externalId: level.externalId || undefined,
      quantityOnHand: level.quantityOnHand,
      quantityReserved: level.quantityReserved,
      quantityOnOrder: level.quantityOnOrder,
      reorderPoint: level.reorderPoint || undefined,
      safetyStock: level.safetyStock,
      lastUpdated: level.updatedAt,
    }));
  }

  /**
   * Fetch delta (changed) inventory data
   */
  private async fetchDeltaInventoryData(
    tenantId: string,
    warehouseId: string,
    connectorId?: string,
    since?: Date,
  ): Promise<ExternalInventoryData[]> {
    // In a real implementation, this would call the external system's
    // delta/change API to get only modified records

    this.logger.debug(
      `Fetching delta inventory data since ${since} for warehouse ${warehouseId}`,
    );

    // For now, return all levels modified after the since date
    const levels = await this.prisma.inventoryLevel.findMany({
      where: {
        tenantId,
        warehouseId,
        updatedAt: since ? { gt: since } : undefined,
      },
    });

    return levels.map((level) => ({
      sku: level.sku,
      externalId: level.externalId || undefined,
      quantityOnHand: level.quantityOnHand,
      quantityReserved: level.quantityReserved,
      quantityOnOrder: level.quantityOnOrder,
      reorderPoint: level.reorderPoint || undefined,
      safetyStock: level.safetyStock,
      lastUpdated: level.updatedAt,
    }));
  }

  /**
   * Get the last successful sync time
   */
  private async getLastSuccessfulSyncTime(
    tenantId: string,
    warehouseId?: string,
  ): Promise<Date | undefined> {
    const lastJob = await this.prisma.inventorySyncJob.findFirst({
      where: {
        tenantId,
        warehouseId: warehouseId || undefined,
        status: SyncJobStatus.COMPLETED,
      },
      orderBy: { completedAt: 'desc' },
    });

    return lastJob?.completedAt || undefined;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(
    jobId: string,
    status: SyncJobStatus,
    data: Partial<{
      startedAt: Date;
      completedAt: Date;
      totalItems: number;
      processedItems: number;
      successCount: number;
      errorCount: number;
      errors: any;
      summary: any;
    }>,
  ): Promise<void> {
    await this.prisma.inventorySyncJob.update({
      where: { id: jobId },
      data: { status, ...data },
    });
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    processedItems: number,
    totalItems: number,
  ): Promise<void> {
    await this.prisma.inventorySyncJob.update({
      where: { id: jobId },
      data: { processedItems, totalItems },
    });
  }

  /**
   * Check if there are meaningful changes
   */
  private hasChanges(existing: any, item: ExternalInventoryData): boolean {
    if (item.quantityReserved !== undefined && item.quantityReserved !== existing.quantityReserved) {
      return true;
    }
    if (item.quantityOnOrder !== undefined && item.quantityOnOrder !== existing.quantityOnOrder) {
      return true;
    }
    if (item.reorderPoint !== undefined && item.reorderPoint !== existing.reorderPoint) {
      return true;
    }
    if (item.safetyStock !== undefined && item.safetyStock !== existing.safetyStock) {
      return true;
    }
    return false;
  }

  /**
   * Calculate availability status
   */
  private calculateAvailability(
    quantityAvailable: number,
    reorderPoint?: number | null,
    safetyStock?: number,
  ): ProductAvailability {
    if (quantityAvailable <= 0) {
      return ProductAvailability.OUT_OF_STOCK;
    }

    if (reorderPoint !== null && reorderPoint !== undefined && quantityAvailable <= reorderPoint) {
      return ProductAvailability.LOW_STOCK;
    }

    if (safetyStock && quantityAvailable <= safetyStock) {
      return ProductAvailability.LOW_STOCK;
    }

    return ProductAvailability.IN_STOCK;
  }
}
