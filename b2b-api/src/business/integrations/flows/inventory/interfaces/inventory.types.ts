/**
 * Inventory & ATP Flow Types and Interfaces
 *
 * This module defines the types for inventory management, ATP calculation,
 * stock reservations, and sync operations.
 */

import {
  ProductAvailability,
  InventoryReservationStatus,
  InventoryReservationType,
  InventoryMovementType,
  InventoryAlertType,
  AlertSeverity,
  AlertStatus,
  WarehouseType,
  InventorySyncJobType,
  SyncJobStatus,
} from '@prisma/client';

// Re-export Prisma enums for convenience
export {
  ProductAvailability,
  InventoryReservationStatus,
  InventoryReservationType,
  InventoryMovementType,
  InventoryAlertType,
  AlertSeverity,
  AlertStatus,
  WarehouseType,
  InventorySyncJobType,
  SyncJobStatus,
};

// ============================================
// Configuration Types
// ============================================

/**
 * Inventory configuration per tenant
 */
export interface InventoryConfig {
  tenantId: string;
  enabled: boolean;

  // Default settings
  defaultSafetyStockDays: number;
  defaultLeadTimeDays: number;
  reservationTimeoutMinutes: number;

  // ATP calculation settings
  atpSettings: ATPSettings;

  // Alert settings
  alertSettings: InventoryAlertSettings;

  // Sync settings
  syncSettings: InventorySyncSettings;

  // Feature toggles
  features: InventoryFeatures;

  metadata?: Record<string, unknown>;
}

/**
 * ATP (Available to Promise) calculation settings
 */
export interface ATPSettings {
  includeSafetyStock: boolean;
  includeIncomingOrders: boolean;
  lookaheadDays: number;
  calculationMethod: 'simple' | 'cumulative' | 'bucketed';
  bucketSizeDays?: number;
}

/**
 * Alert configuration
 */
export interface InventoryAlertSettings {
  enableLowStockAlerts: boolean;
  enableOutOfStockAlerts: boolean;
  enableOverstockAlerts: boolean;
  enableSyncFailureAlerts: boolean;
  enableReservationExpiringAlerts: boolean;

  lowStockThresholdDays: number;
  overstockThresholdDays: number;
  reservationExpiringThresholdMinutes: number;

  notifyChannels: AlertNotifyChannel[];
}

export type AlertNotifyChannel = 'email' | 'webhook' | 'in_app' | 'slack';

/**
 * Sync configuration
 */
export interface InventorySyncSettings {
  enableAutoSync: boolean;
  fullSyncCronSchedule?: string;
  deltaSyncIntervalMinutes: number;
  batchSize: number;
  maxConcurrentSyncs: number;
  retryAttempts: number;
  connectorId?: string;
}

/**
 * Feature toggles
 */
export interface InventoryFeatures {
  enableMultiWarehouse: boolean;
  enableReservations: boolean;
  enableATPCalculation: boolean;
  enableSafetyStock: boolean;
  enableAutomaticReordering: boolean;
  enableLotTracking: boolean;
  enableSerialTracking: boolean;
}

// ============================================
// Warehouse Types
// ============================================

/**
 * Warehouse data transfer object
 */
export interface WarehouseDTO {
  id?: string;
  code: string;
  name: string;
  description?: string;
  type: WarehouseType;
  isActive: boolean;
  isDefault: boolean;

  // Location
  address: WarehouseAddress;
  latitude?: number;
  longitude?: number;
  timezone: string;

  // Contact
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Configuration
  safetyStockDays: number;
  leadTimeDays: number;
  cutoffTime?: string;
  operatingDays: number[];

  // External
  externalId?: string;
  externalSystem?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Warehouse address
 */
export interface WarehouseAddress {
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// ============================================
// Inventory Level Types
// ============================================

/**
 * Inventory level data
 */
export interface InventoryLevelDTO {
  id?: string;
  tenantId: string;
  warehouseId: string;
  warehouseCode?: string;
  masterProductId?: string;
  sku: string;

  // Quantities
  quantityOnHand: number;
  quantityReserved: number;
  quantityOnOrder: number;
  quantityAllocated: number;
  quantityAvailable: number;
  atp: number;

  // Thresholds
  reorderPoint?: number;
  safetyStock: number;
  minOrderQty: number;
  maxOrderQty?: number;

  // Status
  availability: ProductAvailability;
  lastSyncAt?: Date;
  lastSyncSource?: string;

  // Tracking
  lastReceivedAt?: Date;
  lastSoldAt?: Date;
  averageDailySales?: number;
  daysOfStock?: number;

  // External
  externalId?: string;
  externalSystem?: string;

  metadata?: Record<string, unknown>;
}

/**
 * Stock check request
 */
export interface StockCheckRequest {
  sku: string;
  quantity: number;
  warehouseId?: string;
  checkAtp?: boolean;
}

/**
 * Stock check response
 */
export interface StockCheckResponse {
  sku: string;
  requestedQuantity: number;
  isAvailable: boolean;

  // By warehouse
  warehouseAvailability: WarehouseAvailability[];

  // Totals across all warehouses
  totalOnHand: number;
  totalAvailable: number;
  totalAtp: number;

  // Recommendations
  canFulfill: boolean;
  fulfillmentPlan?: FulfillmentPlan[];
  estimatedAvailableDate?: Date;

  // Availability status
  availability: ProductAvailability;
}

/**
 * Warehouse availability detail
 */
export interface WarehouseAvailability {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantityOnHand: number;
  quantityAvailable: number;
  atp: number;
  availability: ProductAvailability;
  leadTimeDays: number;
  estimatedShipDate?: Date;
}

/**
 * Fulfillment plan
 */
export interface FulfillmentPlan {
  warehouseId: string;
  warehouseCode: string;
  quantity: number;
  estimatedShipDate: Date;
  estimatedDeliveryDate?: Date;
}

/**
 * Batch stock check request
 */
export interface BatchStockCheckRequest {
  items: StockCheckRequest[];
  warehouseId?: string;
}

/**
 * Batch stock check response
 */
export interface BatchStockCheckResponse {
  items: StockCheckResponse[];
  allAvailable: boolean;
  unavailableSkus: string[];
}

// ============================================
// ATP Types
// ============================================

/**
 * ATP calculation request
 */
export interface ATPRequest {
  sku: string;
  warehouseId?: string;
  lookaheadDays?: number;
  asOfDate?: Date;
}

/**
 * ATP calculation response
 */
export interface ATPResponse {
  sku: string;
  warehouseId?: string;
  calculatedAt: Date;
  asOfDate: Date;

  // Current ATP
  atp: number;

  // ATP breakdown
  quantityOnHand: number;
  quantityReserved: number;
  quantityAllocated: number;
  quantityIncoming: number;
  safetyStock: number;

  // ATP buckets (for bucketed calculation)
  buckets?: ATPBucket[];

  // Projected availability
  projectedAvailability: ProjectedAvailability[];
}

/**
 * ATP bucket for bucketed calculation
 */
export interface ATPBucket {
  startDate: Date;
  endDate: Date;
  atp: number;
  incoming: number;
  outgoing: number;
}

/**
 * Projected availability for a date range
 */
export interface ProjectedAvailability {
  date: Date;
  atp: number;
  incoming: number;
  outgoing: number;
}

// ============================================
// Reservation Types
// ============================================

/**
 * Create reservation request
 */
export interface CreateReservationRequest {
  sku: string;
  quantity: number;
  warehouseId?: string;
  sourceType: string;
  sourceId: string;
  userId?: string;
  priority?: number;
  expiresInMinutes?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Reservation response
 */
export interface ReservationResponse {
  id: string;
  reservationNumber: string;
  sku: string;
  quantity: number;
  quantityFulfilled: number;
  status: InventoryReservationStatus;
  type: InventoryReservationType;
  priority: number;
  expiresAt: Date;
  releasedAt?: Date;
  fulfilledAt?: Date;
  sourceType: string;
  sourceId: string;
  warehouseId: string;
  warehouseCode: string;
  inventoryLevelId: string;
  userId?: string;
  externalRef?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fulfill reservation request
 */
export interface FulfillReservationRequest {
  reservationId: string;
  quantityFulfilled?: number;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Release reservation request
 */
export interface ReleaseReservationRequest {
  reservationId: string;
  reason?: string;
}

/**
 * Bulk reservation request
 */
export interface BulkReservationRequest {
  items: CreateReservationRequest[];
  sourceType: string;
  sourceId: string;
  failOnPartial?: boolean;
}

/**
 * Bulk reservation response
 */
export interface BulkReservationResponse {
  success: boolean;
  reservations: ReservationResponse[];
  failures: ReservationFailure[];
  partialSuccess: boolean;
}

/**
 * Reservation failure detail
 */
export interface ReservationFailure {
  sku: string;
  quantity: number;
  error: string;
  errorCode: string;
  availableQuantity?: number;
}

// ============================================
// Inventory Movement Types
// ============================================

/**
 * Record inventory movement request
 */
export interface RecordMovementRequest {
  sku: string;
  warehouseId: string;
  type: InventoryMovementType;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  unitCost?: number;
  reason?: string;
  notes?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Movement response
 */
export interface MovementResponse {
  id: string;
  movementNumber: string;
  type: InventoryMovementType;
  sku: string;
  warehouseId: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  referenceType?: string;
  referenceId?: string;
  unitCost?: number;
  totalCost?: number;
  reason?: string;
  notes?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Adjust inventory request
 */
export interface AdjustInventoryRequest {
  sku: string;
  warehouseId: string;
  adjustmentType: 'set' | 'add' | 'subtract';
  quantity: number;
  reason: string;
  notes?: string;
  userId?: string;
}

// ============================================
// Alert Types
// ============================================

/**
 * Inventory alert
 */
export interface InventoryAlertDTO {
  id: string;
  alertType: InventoryAlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  threshold?: number;
  currentValue?: number;
  inventoryLevelId: string;
  sku: string;
  warehouseId: string;
  warehouseCode: string;
  acknowledgedAt?: Date;
  acknowledgedById?: string;
  resolvedAt?: Date;
  resolvedById?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Acknowledge alert request
 */
export interface AcknowledgeAlertRequest {
  alertId: string;
  notes?: string;
}

/**
 * Resolve alert request
 */
export interface ResolveAlertRequest {
  alertId: string;
  resolution?: string;
}

// ============================================
// Sync Types
// ============================================

/**
 * Sync job request
 */
export interface StartSyncJobRequest {
  jobType: InventorySyncJobType;
  connectorId?: string;
  warehouseId?: string;
  skus?: string[];
  options?: SyncJobOptions;
}

/**
 * Sync job options
 */
export interface SyncJobOptions {
  batchSize?: number;
  dryRun?: boolean;
  updateOnly?: boolean;
  createMissing?: boolean;
}

/**
 * Sync job response
 */
export interface SyncJobResponse {
  id: string;
  jobType: InventorySyncJobType;
  status: SyncJobStatus;
  connectorId?: string;
  warehouseId?: string;
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  startedAt?: Date;
  completedAt?: Date;
  errors?: SyncError[];
  summary?: SyncSummary;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sync error detail
 */
export interface SyncError {
  sku: string;
  warehouseId?: string;
  error: string;
  errorCode?: string;
  data?: Record<string, unknown>;
}

/**
 * Sync summary
 */
export interface SyncSummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  duration: number;
}

/**
 * External inventory data (from ERP/WMS)
 */
export interface ExternalInventoryData {
  sku: string;
  warehouseCode?: string;
  externalId?: string;
  quantityOnHand: number;
  quantityReserved?: number;
  quantityOnOrder?: number;
  reorderPoint?: number;
  safetyStock?: number;
  lastUpdated?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// Event Types
// ============================================

/**
 * Inventory event types
 */
export const INVENTORY_EVENTS = {
  // Stock events
  STOCK_UPDATED: 'inventory.stock.updated',
  STOCK_LOW: 'inventory.stock.low',
  STOCK_OUT: 'inventory.stock.out',
  STOCK_REPLENISHED: 'inventory.stock.replenished',

  // Reservation events
  RESERVATION_CREATED: 'inventory.reservation.created',
  RESERVATION_FULFILLED: 'inventory.reservation.fulfilled',
  RESERVATION_RELEASED: 'inventory.reservation.released',
  RESERVATION_EXPIRED: 'inventory.reservation.expired',
  RESERVATION_FAILED: 'inventory.reservation.failed',

  // Movement events
  MOVEMENT_RECORDED: 'inventory.movement.recorded',

  // Alert events
  ALERT_CREATED: 'inventory.alert.created',
  ALERT_ACKNOWLEDGED: 'inventory.alert.acknowledged',
  ALERT_RESOLVED: 'inventory.alert.resolved',

  // Sync events
  SYNC_STARTED: 'inventory.sync.started',
  SYNC_COMPLETED: 'inventory.sync.completed',
  SYNC_FAILED: 'inventory.sync.failed',
} as const;

export type InventoryEventType = (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS];

/**
 * Stock updated event payload
 */
export interface StockUpdatedPayload {
  tenantId: string;
  warehouseId: string;
  sku: string;
  previousQuantity: number;
  newQuantity: number;
  changeType: InventoryMovementType;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Reservation event payload
 */
export interface ReservationEventPayload {
  tenantId: string;
  reservationId: string;
  reservationNumber: string;
  sku: string;
  quantity: number;
  warehouseId: string;
  sourceType: string;
  sourceId: string;
  status: InventoryReservationStatus;
  reason?: string;
}

/**
 * Alert event payload
 */
export interface AlertEventPayload {
  tenantId: string;
  alertId: string;
  alertType: InventoryAlertType;
  severity: AlertSeverity;
  sku: string;
  warehouseId: string;
  message: string;
  threshold?: number;
  currentValue?: number;
}

/**
 * Sync event payload
 */
export interface SyncEventPayload {
  tenantId: string;
  jobId: string;
  jobType: InventorySyncJobType;
  status: SyncJobStatus;
  processedItems?: number;
  successCount?: number;
  errorCount?: number;
  error?: string;
}

// ============================================
// Service Interfaces
// ============================================

/**
 * Inventory service interface
 */
export interface IInventoryService {
  // Stock queries
  checkStock(
    tenantId: string,
    request: StockCheckRequest,
  ): Promise<StockCheckResponse>;
  batchCheckStock(
    tenantId: string,
    request: BatchStockCheckRequest,
  ): Promise<BatchStockCheckResponse>;
  getInventoryLevel(
    tenantId: string,
    warehouseId: string,
    sku: string,
  ): Promise<InventoryLevelDTO | null>;
  listInventoryLevels(
    tenantId: string,
    options?: ListInventoryOptions,
  ): Promise<InventoryLevelDTO[]>;

  // ATP
  calculateATP(tenantId: string, request: ATPRequest): Promise<ATPResponse>;

  // Reservations
  createReservation(
    tenantId: string,
    request: CreateReservationRequest,
  ): Promise<ReservationResponse>;
  bulkCreateReservations(
    tenantId: string,
    request: BulkReservationRequest,
  ): Promise<BulkReservationResponse>;
  fulfillReservation(
    tenantId: string,
    request: FulfillReservationRequest,
  ): Promise<ReservationResponse>;
  releaseReservation(
    tenantId: string,
    request: ReleaseReservationRequest,
  ): Promise<ReservationResponse>;
  getReservation(
    tenantId: string,
    reservationId: string,
  ): Promise<ReservationResponse | null>;
  listReservations(
    tenantId: string,
    options?: ListReservationsOptions,
  ): Promise<ReservationResponse[]>;
  processExpiredReservations(tenantId: string): Promise<number>;

  // Movements
  recordMovement(
    tenantId: string,
    request: RecordMovementRequest,
  ): Promise<MovementResponse>;
  adjustInventory(
    tenantId: string,
    request: AdjustInventoryRequest,
  ): Promise<InventoryLevelDTO>;

  // Alerts
  listAlerts(tenantId: string, options?: ListAlertsOptions): Promise<InventoryAlertDTO[]>;
  acknowledgeAlert(
    tenantId: string,
    request: AcknowledgeAlertRequest,
  ): Promise<InventoryAlertDTO>;
  resolveAlert(
    tenantId: string,
    request: ResolveAlertRequest,
  ): Promise<InventoryAlertDTO>;
  checkAndCreateAlerts(tenantId: string): Promise<InventoryAlertDTO[]>;

  // Sync
  startSyncJob(
    tenantId: string,
    request: StartSyncJobRequest,
  ): Promise<SyncJobResponse>;
  getSyncJob(tenantId: string, jobId: string): Promise<SyncJobResponse | null>;
  listSyncJobs(
    tenantId: string,
    options?: ListSyncJobsOptions,
  ): Promise<SyncJobResponse[]>;
  processExternalInventoryData(
    tenantId: string,
    warehouseId: string,
    data: ExternalInventoryData[],
  ): Promise<SyncSummary>;
}

/**
 * Warehouse service interface
 */
export interface IWarehouseService {
  create(tenantId: string, data: WarehouseDTO): Promise<WarehouseDTO>;
  update(
    tenantId: string,
    warehouseId: string,
    data: Partial<WarehouseDTO>,
  ): Promise<WarehouseDTO>;
  getById(tenantId: string, warehouseId: string): Promise<WarehouseDTO | null>;
  getByCode(tenantId: string, code: string): Promise<WarehouseDTO | null>;
  list(tenantId: string, options?: ListWarehouseOptions): Promise<WarehouseDTO[]>;
  getDefault(tenantId: string): Promise<WarehouseDTO | null>;
  setDefault(tenantId: string, warehouseId: string): Promise<WarehouseDTO>;
  delete(tenantId: string, warehouseId: string): Promise<void>;
}

// ============================================
// Query Options
// ============================================

export interface ListInventoryOptions {
  warehouseId?: string;
  skus?: string[];
  availability?: ProductAvailability[];
  belowReorderPoint?: boolean;
  hasAlerts?: boolean;
  page?: number;
  limit?: number;
  orderBy?: 'sku' | 'availability' | 'lastSyncAt' | 'quantityAvailable';
  orderDir?: 'asc' | 'desc';
}

export interface ListReservationsOptions {
  warehouseId?: string;
  sku?: string;
  sourceType?: string;
  sourceId?: string;
  status?: InventoryReservationStatus[];
  expiringWithinMinutes?: number;
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'expiresAt' | 'status';
  orderDir?: 'asc' | 'desc';
}

export interface ListAlertsOptions {
  warehouseId?: string;
  sku?: string;
  alertType?: InventoryAlertType[];
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  page?: number;
  limit?: number;
  orderBy?: 'createdAt' | 'severity' | 'status';
  orderDir?: 'asc' | 'desc';
}

export interface ListSyncJobsOptions {
  jobType?: InventorySyncJobType;
  status?: SyncJobStatus[];
  warehouseId?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface ListWarehouseOptions {
  isActive?: boolean;
  type?: WarehouseType;
  page?: number;
  limit?: number;
}

// ============================================
// Error Codes
// ============================================

export const INVENTORY_ERROR_CODES = {
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  SKU_NOT_FOUND: 'SKU_NOT_FOUND',
  WAREHOUSE_NOT_FOUND: 'WAREHOUSE_NOT_FOUND',
  RESERVATION_NOT_FOUND: 'RESERVATION_NOT_FOUND',
  RESERVATION_EXPIRED: 'RESERVATION_EXPIRED',
  RESERVATION_ALREADY_FULFILLED: 'RESERVATION_ALREADY_FULFILLED',
  RESERVATION_ALREADY_RELEASED: 'RESERVATION_ALREADY_RELEASED',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  SYNC_IN_PROGRESS: 'SYNC_IN_PROGRESS',
  CONNECTOR_NOT_CONFIGURED: 'CONNECTOR_NOT_CONFIGURED',
  EXTERNAL_SYNC_FAILED: 'EXTERNAL_SYNC_FAILED',
} as const;

export type InventoryErrorCode = (typeof INVENTORY_ERROR_CODES)[keyof typeof INVENTORY_ERROR_CODES];

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_INVENTORY_CONFIG: Omit<InventoryConfig, 'tenantId'> = {
  enabled: true,
  defaultSafetyStockDays: 3,
  defaultLeadTimeDays: 2,
  reservationTimeoutMinutes: 30,
  atpSettings: {
    includeSafetyStock: true,
    includeIncomingOrders: true,
    lookaheadDays: 30,
    calculationMethod: 'simple',
  },
  alertSettings: {
    enableLowStockAlerts: true,
    enableOutOfStockAlerts: true,
    enableOverstockAlerts: false,
    enableSyncFailureAlerts: true,
    enableReservationExpiringAlerts: true,
    lowStockThresholdDays: 7,
    overstockThresholdDays: 90,
    reservationExpiringThresholdMinutes: 5,
    notifyChannels: ['in_app'],
  },
  syncSettings: {
    enableAutoSync: false,
    deltaSyncIntervalMinutes: 60,
    batchSize: 500,
    maxConcurrentSyncs: 1,
    retryAttempts: 3,
  },
  features: {
    enableMultiWarehouse: true,
    enableReservations: true,
    enableATPCalculation: true,
    enableSafetyStock: true,
    enableAutomaticReordering: false,
    enableLotTracking: false,
    enableSerialTracking: false,
  },
};
