import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@core/auth/guards/jwt-auth.guard';
import { AuthorizationGuard } from '@core/authorization/authorization.guard';
import { CheckAbility } from '@core/authorization/check-ability.decorator';
import { TenantContext } from '@core/tenants/tenant-context.decorator';
import { CurrentUser } from '@core/auth/decorators/current-user.decorator';
import {
  InventoryService,
  WarehouseService,
  InventorySyncService,
  InventoryAlertService,
} from './services';
import {
  StockCheckRequest,
  BatchStockCheckRequest,
  CreateReservationRequest,
  BulkReservationRequest,
  FulfillReservationRequest,
  ReleaseReservationRequest,
  RecordMovementRequest,
  AdjustInventoryRequest,
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  StartSyncJobRequest,
  ATPRequest,
  WarehouseDTO,
  ListInventoryOptions,
  ListReservationsOptions,
  ListAlertsOptions,
  ListSyncJobsOptions,
  ListWarehouseOptions,
  ProductAvailability,
  InventoryReservationStatus,
  InventoryAlertType,
  AlertSeverity,
  AlertStatus,
  InventorySyncJobType,
  SyncJobStatus,
} from './interfaces';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('api/v1/inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly warehouseService: WarehouseService,
    private readonly syncService: InventorySyncService,
    private readonly alertService: InventoryAlertService,
  ) {}

  // ============================================
  // Stock Check Endpoints
  // ============================================

  @Post('stock/check')
  @ApiOperation({ summary: 'Check stock availability for a single SKU' })
  @ApiResponse({ status: 200, description: 'Stock check result' })
  @CheckAbility({ action: 'read', subject: 'Inventory' })
  async checkStock(
    @TenantContext() tenantId: string,
    @Body() request: StockCheckRequest,
  ) {
    return this.inventoryService.checkStock(tenantId, request);
  }

  @Post('stock/check-batch')
  @ApiOperation({ summary: 'Check stock availability for multiple SKUs' })
  @ApiResponse({ status: 200, description: 'Batch stock check results' })
  @CheckAbility({ action: 'read', subject: 'Inventory' })
  async batchCheckStock(
    @TenantContext() tenantId: string,
    @Body() request: BatchStockCheckRequest,
  ) {
    return this.inventoryService.batchCheckStock(tenantId, request);
  }

  @Post('atp')
  @ApiOperation({ summary: 'Calculate Available-to-Promise (ATP) for a SKU' })
  @ApiResponse({ status: 200, description: 'ATP calculation result' })
  @CheckAbility({ action: 'read', subject: 'Inventory' })
  async calculateATP(
    @TenantContext() tenantId: string,
    @Body() request: ATPRequest,
  ) {
    return this.inventoryService.calculateATP(tenantId, request);
  }

  // ============================================
  // Inventory Level Endpoints
  // ============================================

  @Get('levels')
  @ApiOperation({ summary: 'List inventory levels' })
  @ApiResponse({ status: 200, description: 'List of inventory levels' })
  @CheckAbility({ action: 'read', subject: 'Inventory' })
  async listInventoryLevels(
    @TenantContext() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('skus') skus?: string,
    @Query('availability') availability?: string,
    @Query('belowReorderPoint') belowReorderPoint?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: 'sku' | 'availability' | 'lastSyncAt' | 'quantityAvailable',
    @Query('orderDir') orderDir?: 'asc' | 'desc',
  ) {
    const options: ListInventoryOptions = {
      warehouseId,
      skus: skus ? skus.split(',') : undefined,
      availability: availability
        ? (availability.split(',') as ProductAvailability[])
        : undefined,
      belowReorderPoint: belowReorderPoint === 'true',
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      orderBy,
      orderDir,
    };

    return this.inventoryService.listInventoryLevels(tenantId, options);
  }

  @Get('levels/:warehouseId/:sku')
  @ApiOperation({ summary: 'Get inventory level for a specific SKU in a warehouse' })
  @ApiResponse({ status: 200, description: 'Inventory level details' })
  @CheckAbility({ action: 'read', subject: 'Inventory' })
  async getInventoryLevel(
    @TenantContext() tenantId: string,
    @Param('warehouseId') warehouseId: string,
    @Param('sku') sku: string,
  ) {
    return this.inventoryService.getInventoryLevel(tenantId, warehouseId, sku);
  }

  @Post('levels/adjust')
  @ApiOperation({ summary: 'Adjust inventory quantity' })
  @ApiResponse({ status: 200, description: 'Updated inventory level' })
  @CheckAbility({ action: 'manage', subject: 'Inventory' })
  async adjustInventory(
    @TenantContext() tenantId: string,
    @Body() request: AdjustInventoryRequest,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.adjustInventory(tenantId, {
      ...request,
      userId: user.id,
    });
  }

  @Post('movements')
  @ApiOperation({ summary: 'Record an inventory movement' })
  @ApiResponse({ status: 201, description: 'Movement recorded' })
  @CheckAbility({ action: 'manage', subject: 'Inventory' })
  async recordMovement(
    @TenantContext() tenantId: string,
    @Body() request: RecordMovementRequest,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.recordMovement(tenantId, {
      ...request,
      userId: user.id,
    });
  }

  // ============================================
  // Reservation Endpoints
  // ============================================

  @Post('reservations')
  @ApiOperation({ summary: 'Create a reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created' })
  @CheckAbility({ action: 'create', subject: 'InventoryReservation' })
  async createReservation(
    @TenantContext() tenantId: string,
    @Body() request: CreateReservationRequest,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.createReservation(tenantId, {
      ...request,
      userId: user.id,
    });
  }

  @Post('reservations/bulk')
  @ApiOperation({ summary: 'Create multiple reservations' })
  @ApiResponse({ status: 201, description: 'Bulk reservation result' })
  @CheckAbility({ action: 'create', subject: 'InventoryReservation' })
  async bulkCreateReservations(
    @TenantContext() tenantId: string,
    @Body() request: BulkReservationRequest,
  ) {
    return this.inventoryService.bulkCreateReservations(tenantId, request);
  }

  @Get('reservations')
  @ApiOperation({ summary: 'List reservations' })
  @ApiResponse({ status: 200, description: 'List of reservations' })
  @CheckAbility({ action: 'read', subject: 'InventoryReservation' })
  async listReservations(
    @TenantContext() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('sku') sku?: string,
    @Query('sourceType') sourceType?: string,
    @Query('sourceId') sourceId?: string,
    @Query('status') status?: string,
    @Query('expiringWithinMinutes') expiringWithinMinutes?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: 'createdAt' | 'expiresAt' | 'status',
    @Query('orderDir') orderDir?: 'asc' | 'desc',
  ) {
    const options: ListReservationsOptions = {
      warehouseId,
      sku,
      sourceType,
      sourceId,
      status: status
        ? (status.split(',') as InventoryReservationStatus[])
        : undefined,
      expiringWithinMinutes: expiringWithinMinutes
        ? parseInt(expiringWithinMinutes, 10)
        : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      orderBy,
      orderDir,
    };

    return this.inventoryService.listReservations(tenantId, options);
  }

  @Get('reservations/:id')
  @ApiOperation({ summary: 'Get a reservation by ID' })
  @ApiResponse({ status: 200, description: 'Reservation details' })
  @CheckAbility({ action: 'read', subject: 'InventoryReservation' })
  async getReservation(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getReservation(tenantId, id);
  }

  @Post('reservations/:id/fulfill')
  @ApiOperation({ summary: 'Fulfill a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation fulfilled' })
  @CheckAbility({ action: 'manage', subject: 'InventoryReservation' })
  async fulfillReservation(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() body: { quantityFulfilled?: number; referenceType?: string; referenceId?: string },
  ) {
    return this.inventoryService.fulfillReservation(tenantId, {
      reservationId: id,
      ...body,
    });
  }

  @Post('reservations/:id/release')
  @ApiOperation({ summary: 'Release a reservation' })
  @ApiResponse({ status: 200, description: 'Reservation released' })
  @CheckAbility({ action: 'manage', subject: 'InventoryReservation' })
  async releaseReservation(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.inventoryService.releaseReservation(tenantId, {
      reservationId: id,
      reason: body.reason,
    });
  }

  @Post('reservations/process-expired')
  @ApiOperation({ summary: 'Process and release expired reservations' })
  @ApiResponse({ status: 200, description: 'Number of expired reservations processed' })
  @HttpCode(HttpStatus.OK)
  @CheckAbility({ action: 'manage', subject: 'InventoryReservation' })
  async processExpiredReservations(@TenantContext() tenantId: string) {
    const count = await this.inventoryService.processExpiredReservations(tenantId);
    return { processedCount: count };
  }

  // ============================================
  // Alert Endpoints
  // ============================================

  @Get('alerts')
  @ApiOperation({ summary: 'List inventory alerts' })
  @ApiResponse({ status: 200, description: 'List of alerts' })
  @CheckAbility({ action: 'read', subject: 'InventoryAlert' })
  async listAlerts(
    @TenantContext() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('sku') sku?: string,
    @Query('alertType') alertType?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('orderBy') orderBy?: 'createdAt' | 'severity' | 'status',
    @Query('orderDir') orderDir?: 'asc' | 'desc',
  ) {
    const options: ListAlertsOptions = {
      warehouseId,
      sku,
      alertType: alertType ? (alertType.split(',') as InventoryAlertType[]) : undefined,
      severity: severity ? (severity.split(',') as AlertSeverity[]) : undefined,
      status: status ? (status.split(',') as AlertStatus[]) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      orderBy,
      orderDir,
    };

    return this.inventoryService.listAlerts(tenantId, options);
  }

  @Get('alerts/summary')
  @ApiOperation({ summary: 'Get alert summary for dashboard' })
  @ApiResponse({ status: 200, description: 'Alert summary' })
  @CheckAbility({ action: 'read', subject: 'InventoryAlert' })
  async getAlertSummary(@TenantContext() tenantId: string) {
    return this.alertService.getAlertSummary(tenantId);
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  @CheckAbility({ action: 'manage', subject: 'InventoryAlert' })
  async acknowledgeAlert(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return this.inventoryService.acknowledgeAlert(tenantId, {
      alertId: id,
      notes: body.notes,
    });
  }

  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  @CheckAbility({ action: 'manage', subject: 'InventoryAlert' })
  async resolveAlert(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() body: { resolution?: string },
  ) {
    return this.inventoryService.resolveAlert(tenantId, {
      alertId: id,
      resolution: body.resolution,
    });
  }

  @Post('alerts/check')
  @ApiOperation({ summary: 'Check and create alerts for current conditions' })
  @ApiResponse({ status: 200, description: 'Newly created alerts' })
  @HttpCode(HttpStatus.OK)
  @CheckAbility({ action: 'manage', subject: 'InventoryAlert' })
  async checkAndCreateAlerts(@TenantContext() tenantId: string) {
    return this.alertService.checkAndCreateAlerts(tenantId);
  }

  @Post('alerts/auto-resolve')
  @ApiOperation({ summary: 'Auto-resolve alerts where conditions have improved' })
  @ApiResponse({ status: 200, description: 'Number of alerts resolved' })
  @HttpCode(HttpStatus.OK)
  @CheckAbility({ action: 'manage', subject: 'InventoryAlert' })
  async autoResolveAlerts(@TenantContext() tenantId: string) {
    const count = await this.alertService.autoResolveAlerts(tenantId);
    return { resolvedCount: count };
  }

  // ============================================
  // Warehouse Endpoints
  // ============================================

  @Get('warehouses')
  @ApiOperation({ summary: 'List warehouses' })
  @ApiResponse({ status: 200, description: 'List of warehouses' })
  @CheckAbility({ action: 'read', subject: 'Warehouse' })
  async listWarehouses(
    @TenantContext() tenantId: string,
    @Query('isActive') isActive?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const options: ListWarehouseOptions = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      type: type as any,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return this.warehouseService.list(tenantId, options);
  }

  @Get('warehouses/default')
  @ApiOperation({ summary: 'Get default warehouse' })
  @ApiResponse({ status: 200, description: 'Default warehouse' })
  @CheckAbility({ action: 'read', subject: 'Warehouse' })
  async getDefaultWarehouse(@TenantContext() tenantId: string) {
    return this.warehouseService.getDefault(tenantId);
  }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse details' })
  @CheckAbility({ action: 'read', subject: 'Warehouse' })
  async getWarehouse(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.warehouseService.getById(tenantId, id);
  }

  @Post('warehouses')
  @ApiOperation({ summary: 'Create a warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created' })
  @CheckAbility({ action: 'manage', subject: 'Warehouse' })
  async createWarehouse(
    @TenantContext() tenantId: string,
    @Body() data: WarehouseDTO,
  ) {
    return this.warehouseService.create(tenantId, data);
  }

  @Patch('warehouses/:id')
  @ApiOperation({ summary: 'Update a warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated' })
  @CheckAbility({ action: 'manage', subject: 'Warehouse' })
  async updateWarehouse(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
    @Body() data: Partial<WarehouseDTO>,
  ) {
    return this.warehouseService.update(tenantId, id, data);
  }

  @Post('warehouses/:id/set-default')
  @ApiOperation({ summary: 'Set warehouse as default' })
  @ApiResponse({ status: 200, description: 'Warehouse set as default' })
  @HttpCode(HttpStatus.OK)
  @CheckAbility({ action: 'manage', subject: 'Warehouse' })
  async setDefaultWarehouse(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.warehouseService.setDefault(tenantId, id);
  }

  @Delete('warehouses/:id')
  @ApiOperation({ summary: 'Delete a warehouse' })
  @ApiResponse({ status: 204, description: 'Warehouse deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckAbility({ action: 'manage', subject: 'Warehouse' })
  async deleteWarehouse(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.warehouseService.delete(tenantId, id);
  }

  // ============================================
  // Sync Job Endpoints
  // ============================================

  @Get('sync-jobs')
  @ApiOperation({ summary: 'List sync jobs' })
  @ApiResponse({ status: 200, description: 'List of sync jobs' })
  @CheckAbility({ action: 'read', subject: 'InventorySyncJob' })
  async listSyncJobs(
    @TenantContext() tenantId: string,
    @Query('jobType') jobType?: InventorySyncJobType,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const options: ListSyncJobsOptions = {
      jobType,
      status: status ? (status.split(',') as SyncJobStatus[]) : undefined,
      warehouseId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    return this.inventoryService.listSyncJobs(tenantId, options);
  }

  @Get('sync-jobs/:id')
  @ApiOperation({ summary: 'Get sync job by ID' })
  @ApiResponse({ status: 200, description: 'Sync job details' })
  @CheckAbility({ action: 'read', subject: 'InventorySyncJob' })
  async getSyncJob(
    @TenantContext() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.inventoryService.getSyncJob(tenantId, id);
  }

  @Post('sync-jobs')
  @ApiOperation({ summary: 'Start a sync job' })
  @ApiResponse({ status: 201, description: 'Sync job started' })
  @CheckAbility({ action: 'manage', subject: 'InventorySyncJob' })
  async startSyncJob(
    @TenantContext() tenantId: string,
    @Body() request: StartSyncJobRequest,
  ) {
    const job = await this.inventoryService.startSyncJob(tenantId, request);

    // Execute sync in background based on job type
    if (request.jobType === InventorySyncJobType.FULL_SYNC) {
      this.syncService
        .executeFullSync(tenantId, job.id, request.warehouseId, request.connectorId)
        .catch((err) => console.error('Full sync failed:', err));
    } else if (request.jobType === InventorySyncJobType.DELTA_SYNC) {
      this.syncService
        .executeDeltaSync(tenantId, job.id, request.warehouseId, request.connectorId)
        .catch((err) => console.error('Delta sync failed:', err));
    }

    return job;
  }
}
