import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Prisma, PriceListSyncJob } from '@prisma/client';
import {
  ERPPriceListImport,
  PriceListSyncResult,
  SyncError,
  SyncSummary,
  PriceChangeStats,
  PriceListImportRequest,
  PriceListSyncJobType,
  SyncJobStatus,
  PriceListType,
  PriceListStatus,
  RoundingRule,
} from '../interfaces';
import { PricingService } from './pricing.service';

@Injectable()
export class PricingSyncService {
  private readonly logger = new Logger(PricingSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  // ============================================
  // Import from ERP
  // ============================================

  /**
   * Import price list from ERP data
   */
  async importPriceList(
    tenantId: string,
    data: ERPPriceListImport,
    options?: { fullSync?: boolean; deltaToken?: string },
  ): Promise<PriceListSyncResult> {
    const startTime = Date.now();
    this.logger.log(`Starting price list import for tenant: ${tenantId}, code: ${data.priceList.code}`);

    // Find or create price list
    let priceList = await this.pricingService.findPriceListByCode(tenantId, data.priceList.code);

    if (!priceList) {
      priceList = await this.pricingService.createPriceList(tenantId, {
        code: data.priceList.code,
        name: data.priceList.name,
        description: data.priceList.description,
        type: this.mapERPType(data.priceList.type),
        status: PriceListStatus.ACTIVE,
        currency: data.priceList.currency,
        priority: 0,
        effectiveFrom: new Date(data.priceList.effectiveFrom),
        effectiveTo: data.priceList.effectiveTo ? new Date(data.priceList.effectiveTo) : undefined,
        roundingRule: RoundingRule.NEAREST,
        roundingPrecision: 2,
        isDefault: false,
        isCustomerSpecific: false,
        externalId: data.priceList.externalId,
        externalSystem: 'ERP',
      });
    }

    // Create sync job
    const syncJob = await this.createSyncJob(tenantId, priceList.id, {
      jobType: options?.fullSync ? PriceListSyncJobType.FULL_SYNC : PriceListSyncJobType.DELTA_SYNC,
      totalItems: data.items.length,
      deltaToken: options?.deltaToken,
    });

    // Process items
    const errors: SyncError[] = [];
    let successCount = 0;
    let skippedCount = 0;

    // Track price changes for summary
    const priceChanges: Array<{
      sku: string;
      oldPrice: number;
      newPrice: number;
      changePercent: number;
    }> = [];

    // Get existing items for comparison
    const existingItems = await this.prisma.priceListItem.findMany({
      where: { priceListId: priceList.id },
      select: { sku: true, listPrice: true },
    });
    const existingPrices = new Map(existingItems.map((i) => [i.sku, i.listPrice.toNumber()]));

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < data.items.length; i += batchSize) {
      const batch = data.items.slice(i, i + batchSize);

      try {
        const result = await this.pricingService.bulkUpsertPriceListItems(
          tenantId,
          priceList.id,
          batch.map((item) => ({
            sku: item.sku,
            basePrice: item.basePrice,
            listPrice: item.listPrice ?? item.basePrice,
            minPrice: item.minPrice,
            maxPrice: item.maxPrice,
            cost: item.cost,
            currency: item.currency,
            uom: item.uom ?? 'EA',
            quantityBreaks: item.quantityBreaks ?? [],
            isDiscountable: true,
            isActive: true,
            effectiveFrom: item.effectiveFrom ? new Date(item.effectiveFrom) : undefined,
            effectiveTo: item.effectiveTo ? new Date(item.effectiveTo) : undefined,
            externalId: item.externalId,
            externalSystem: 'ERP',
          })),
        );

        successCount += result.created + result.updated;
        errors.push(...result.errors.map((e) => ({
          sku: e.sku,
          errorCode: 'UPSERT_ERROR',
          errorMessage: e.error,
        })));

        // Track price changes
        for (const item of batch) {
          const oldPrice = existingPrices.get(item.sku);
          const newPrice = item.listPrice ?? item.basePrice;
          if (oldPrice !== undefined && oldPrice !== newPrice) {
            priceChanges.push({
              sku: item.sku,
              oldPrice,
              newPrice,
              changePercent: ((newPrice - oldPrice) / oldPrice) * 100,
            });
          }
        }

        // Update job progress
        await this.updateSyncJobProgress(syncJob.id, i + batch.length, successCount, errors.length);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Batch processing error: ${errorMessage}`);
        errors.push({
          itemIndex: i,
          errorCode: 'BATCH_ERROR',
          errorMessage,
        });
      }
    }

    // Calculate summary
    const summary = this.calculateSyncSummary(
      existingPrices.size,
      successCount,
      skippedCount,
      priceChanges,
    );

    // Complete sync job
    const completedJob = await this.completeSyncJob(syncJob.id, {
      status: errors.length > 0 && successCount === 0 ? SyncJobStatus.FAILED : SyncJobStatus.COMPLETED,
      successCount,
      errorCount: errors.length,
      skippedCount,
      errors: errors.length > 0 ? errors : undefined,
      summary,
    });

    // Update price list sync status
    await this.prisma.priceList.update({
      where: { id: priceList.id },
      data: {
        lastSyncAt: new Date(),
        syncStatus: completedJob.status,
      },
    });

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Price list import completed: ${priceList.code}, success=${successCount}, errors=${errors.length}, duration=${durationMs}ms`,
    );

    return {
      jobId: syncJob.id,
      priceListId: priceList.id,
      priceListCode: priceList.code,
      status: completedJob.status,
      totalItems: data.items.length,
      processedItems: successCount + errors.length + skippedCount,
      successCount,
      errorCount: errors.length,
      skippedCount,
      deltaToken: completedJob.deltaToken ?? undefined,
      startedAt: completedJob.startedAt!,
      completedAt: completedJob.completedAt!,
      durationMs,
      errors: errors.length > 0 ? errors : undefined,
      summary,
    };
  }

  /**
   * Start a sync job (for external orchestration)
   */
  async startSyncJob(request: PriceListImportRequest): Promise<PriceListSyncJob> {
    const { tenantId, priceListCode, fullSync, deltaToken, connectorId } = request;

    if (!priceListCode) {
      throw new BadRequestException('Price list code is required');
    }

    const priceList = await this.pricingService.findPriceListByCode(tenantId, priceListCode);
    if (!priceList) {
      throw new NotFoundException(`Price list not found: ${priceListCode}`);
    }

    return this.createSyncJob(tenantId, priceList.id, {
      jobType: fullSync ? PriceListSyncJobType.FULL_SYNC : PriceListSyncJobType.DELTA_SYNC,
      connectorId,
      deltaToken,
    });
  }

  /**
   * Get sync job status
   */
  async getSyncJobStatus(tenantId: string, jobId: string): Promise<PriceListSyncJob> {
    const job = await this.prisma.priceListSyncJob.findFirst({
      where: { id: jobId, tenantId },
    });

    if (!job) {
      throw new NotFoundException(`Sync job not found: ${jobId}`);
    }

    return job;
  }

  /**
   * Get sync history for a price list
   */
  async getSyncHistory(
    tenantId: string,
    priceListId: string,
    limit: number = 10,
  ): Promise<PriceListSyncJob[]> {
    return this.prisma.priceListSyncJob.findMany({
      where: { tenantId, priceListId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Cancel a running sync job
   */
  async cancelSyncJob(tenantId: string, jobId: string): Promise<void> {
    const job = await this.getSyncJobStatus(tenantId, jobId);

    if (job.status !== SyncJobStatus.PENDING && job.status !== SyncJobStatus.RUNNING) {
      throw new BadRequestException(`Cannot cancel job in status: ${job.status}`);
    }

    await this.prisma.priceListSyncJob.update({
      where: { id: jobId },
      data: {
        status: SyncJobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  // ============================================
  // Delta Sync Support
  // ============================================

  /**
   * Get last successful delta token
   */
  async getLastDeltaToken(tenantId: string, priceListId: string): Promise<string | null> {
    const lastJob = await this.prisma.priceListSyncJob.findFirst({
      where: {
        tenantId,
        priceListId,
        status: SyncJobStatus.COMPLETED,
        jobType: PriceListSyncJobType.DELTA_SYNC,
        deltaToken: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      select: { deltaToken: true },
    });

    return lastJob?.deltaToken ?? null;
  }

  /**
   * Process delta updates
   */
  async processDeltaUpdates(
    tenantId: string,
    priceListId: string,
    updates: Array<{
      action: 'create' | 'update' | 'delete';
      sku: string;
      data?: Partial<{
        basePrice: number;
        listPrice: number;
        minPrice?: number;
        maxPrice?: number;
        cost?: number;
        effectiveFrom?: string;
        effectiveTo?: string;
      }>;
    }>,
    deltaToken: string,
  ): Promise<{
    processed: number;
    errors: Array<{ sku: string; error: string }>;
    newDeltaToken: string;
  }> {
    const errors: Array<{ sku: string; error: string }> = [];
    let processed = 0;

    for (const update of updates) {
      try {
        switch (update.action) {
          case 'create':
          case 'update':
            if (!update.data) {
              throw new Error('Data required for create/update');
            }
            await this.pricingService.bulkUpsertPriceListItems(tenantId, priceListId, [
              {
                sku: update.sku,
                basePrice: update.data.basePrice!,
                listPrice: update.data.listPrice ?? update.data.basePrice!,
                minPrice: update.data.minPrice,
                maxPrice: update.data.maxPrice,
                cost: update.data.cost,
                quantityBreaks: [],
                isDiscountable: true,
                isActive: true,
                uom: 'EA',
                effectiveFrom: update.data.effectiveFrom
                  ? new Date(update.data.effectiveFrom)
                  : undefined,
                effectiveTo: update.data.effectiveTo
                  ? new Date(update.data.effectiveTo)
                  : undefined,
              },
            ]);
            break;

          case 'delete':
            const item = await this.prisma.priceListItem.findFirst({
              where: { priceListId, sku: update.sku },
            });
            if (item) {
              await this.prisma.priceListItem.update({
                where: { id: item.id },
                data: { isActive: false },
              });
            }
            break;
        }
        processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ sku: update.sku, error: errorMessage });
      }
    }

    // Generate new delta token (could be timestamp or version-based)
    const newDeltaToken = `${deltaToken}-${Date.now()}`;

    return { processed, errors, newDeltaToken };
  }

  // ============================================
  // Batch Sync Jobs
  // ============================================

  /**
   * Schedule batch sync for all active price lists
   */
  async scheduleBatchSync(tenantId: string, connectorId?: string): Promise<string[]> {
    const activePriceLists = await this.prisma.priceList.findMany({
      where: {
        tenantId,
        status: PriceListStatus.ACTIVE,
        deletedAt: null,
        externalId: { not: null }, // Only sync externally managed price lists
      },
      select: { id: true, code: true },
    });

    const jobIds: string[] = [];

    for (const priceList of activePriceLists) {
      const job = await this.createSyncJob(tenantId, priceList.id, {
        jobType: PriceListSyncJobType.DELTA_SYNC,
        connectorId,
      });
      jobIds.push(job.id);
    }

    this.logger.log(`Scheduled ${jobIds.length} batch sync jobs for tenant: ${tenantId}`);
    return jobIds;
  }

  /**
   * Get pending sync jobs
   */
  async getPendingSyncJobs(tenantId: string, limit: number = 10): Promise<PriceListSyncJob[]> {
    return this.prisma.priceListSyncJob.findMany({
      where: {
        tenantId,
        status: { in: [SyncJobStatus.PENDING, SyncJobStatus.RUNNING] },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async createSyncJob(
    tenantId: string,
    priceListId: string,
    options: {
      jobType: PriceListSyncJobType;
      totalItems?: number;
      connectorId?: string;
      deltaToken?: string;
    },
  ): Promise<PriceListSyncJob> {
    return this.prisma.priceListSyncJob.create({
      data: {
        tenantId,
        priceListId,
        jobType: options.jobType,
        status: SyncJobStatus.RUNNING,
        totalItems: options.totalItems ?? 0,
        connectorId: options.connectorId,
        deltaToken: options.deltaToken,
        startedAt: new Date(),
      },
    });
  }

  private async updateSyncJobProgress(
    jobId: string,
    processedItems: number,
    successCount: number,
    errorCount: number,
  ): Promise<void> {
    await this.prisma.priceListSyncJob.update({
      where: { id: jobId },
      data: { processedItems, successCount, errorCount },
    });
  }

  private async completeSyncJob(
    jobId: string,
    result: {
      status: SyncJobStatus;
      successCount: number;
      errorCount: number;
      skippedCount: number;
      errors?: SyncError[];
      summary?: SyncSummary;
      deltaToken?: string;
    },
  ): Promise<PriceListSyncJob> {
    return this.prisma.priceListSyncJob.update({
      where: { id: jobId },
      data: {
        status: result.status,
        successCount: result.successCount,
        errorCount: result.errorCount,
        skippedCount: result.skippedCount,
        completedAt: new Date(),
        errors: result.errors ? (result.errors as unknown as Prisma.JsonArray) : Prisma.JsonNull,
        summary: result.summary ? (result.summary as unknown as Prisma.JsonObject) : Prisma.JsonNull,
        deltaToken: result.deltaToken,
      },
    });
  }

  private mapERPType(type?: string): PriceListType {
    if (!type) return PriceListType.STANDARD;

    const typeMap: Record<string, PriceListType> = {
      standard: PriceListType.STANDARD,
      contract: PriceListType.CONTRACT,
      promotional: PriceListType.PROMOTIONAL,
      volume: PriceListType.VOLUME,
      customer: PriceListType.CUSTOMER_SPECIFIC,
      channel: PriceListType.CHANNEL,
      regional: PriceListType.REGIONAL,
    };

    return typeMap[type.toLowerCase()] ?? PriceListType.STANDARD;
  }

  private calculateSyncSummary(
    existingCount: number,
    successCount: number,
    skippedCount: number,
    priceChanges: Array<{
      sku: string;
      oldPrice: number;
      newPrice: number;
      changePercent: number;
    }>,
  ): SyncSummary {
    const increased = priceChanges.filter((c) => c.changePercent > 0);
    const decreased = priceChanges.filter((c) => c.changePercent < 0);
    const unchanged = successCount - priceChanges.length;

    const priceChangeStats: PriceChangeStats = {
      increased: increased.length,
      decreased: decreased.length,
      unchanged,
      averageChangePercent:
        priceChanges.length > 0
          ? priceChanges.reduce((sum, c) => sum + c.changePercent, 0) / priceChanges.length
          : 0,
    };

    if (increased.length > 0) {
      const maxIncrease = increased.reduce(
        (max, c) => (c.changePercent > max.changePercent ? c : max),
        increased[0],
      );
      priceChangeStats.maxIncrease = maxIncrease;
    }

    if (decreased.length > 0) {
      const maxDecrease = decreased.reduce(
        (min, c) => (c.changePercent < min.changePercent ? c : min),
        decreased[0],
      );
      priceChangeStats.maxDecrease = maxDecrease;
    }

    // Estimate created vs updated based on existing count
    const itemsCreated = Math.max(0, successCount - existingCount);
    const itemsUpdated = successCount - itemsCreated;

    return {
      itemsCreated,
      itemsUpdated,
      itemsDeleted: 0, // Would need to track deletions separately
      itemsUnchanged: skippedCount,
      priceChanges: priceChangeStats,
    };
  }
}
