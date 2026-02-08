/**
 * Price List Sync Types and Interfaces
 *
 * This module defines the types for price list management, customer-specific pricing,
 * currency handling, and sync operations with external ERP systems.
 */

import {
  PriceListType,
  PriceListStatus,
  RoundingRule,
  PriceAssignmentType,
  PriceOverrideType,
  PriceOverrideScopeType,
  PriceOverrideStatus,
  ExchangeRateType,
  PriceListSyncJobType,
  SyncJobStatus,
} from '@prisma/client';

// Re-export Prisma enums for convenience
export {
  PriceListType,
  PriceListStatus,
  RoundingRule,
  PriceAssignmentType,
  PriceOverrideType,
  PriceOverrideScopeType,
  PriceOverrideStatus,
  ExchangeRateType,
  PriceListSyncJobType,
  SyncJobStatus,
};

// ============================================
// Configuration Types
// ============================================

/**
 * Pricing configuration per tenant
 */
export interface PricingConfig {
  tenantId: string;
  enabled: boolean;

  // Default settings
  defaultCurrency: string;
  defaultRoundingRule: RoundingRule;
  defaultRoundingPrecision: number;

  // Price calculation settings
  priceCalculationSettings: PriceCalculationSettings;

  // Currency settings
  currencySettings: CurrencySettings;

  // Sync settings
  syncSettings: PricingSyncSettings;

  // Feature toggles
  features: PricingFeatures;

  metadata?: Record<string, unknown>;
}

/**
 * Price calculation settings
 */
export interface PriceCalculationSettings {
  // Order of price resolution
  priceResolutionOrder: PriceResolutionSource[];

  // Allow prices below cost
  allowBelowCostPricing: boolean;

  // Margin protection
  minimumMarginPercent?: number;

  // Quantity break calculation
  quantityBreakMethod: 'all_units' | 'incremental';

  // Tax handling
  pricesIncludeTax: boolean;
  defaultTaxRate?: number;
}

export type PriceResolutionSource =
  | 'override'
  | 'contract'
  | 'customer_specific'
  | 'volume'
  | 'promotional'
  | 'standard';

/**
 * Currency configuration
 */
export interface CurrencySettings {
  supportedCurrencies: string[];
  baseCurrency: string;
  enableAutoExchangeRateUpdate: boolean;
  exchangeRateUpdateFrequency?: 'daily' | 'hourly' | 'weekly';
  exchangeRateSource?: string;
  defaultExchangeRateType: ExchangeRateType;
}

/**
 * Sync configuration
 */
export interface PricingSyncSettings {
  enableAutoSync: boolean;
  fullSyncCronSchedule?: string;
  deltaSyncIntervalMinutes: number;
  batchSize: number;
  maxConcurrentSyncs: number;
  retryAttempts: number;
  connectorId?: string;

  // Delta sync settings
  enableDeltaSync: boolean;
  deltaTrackingField: 'updatedAt' | 'version' | 'custom';
  customDeltaField?: string;
}

/**
 * Feature toggles
 */
export interface PricingFeatures {
  enableCustomerSpecificPricing: boolean;
  enableContractPricing: boolean;
  enableVolumePricing: boolean;
  enablePromotionalPricing: boolean;
  enablePriceOverrides: boolean;
  enableMultiCurrency: boolean;
  enablePriceHistory: boolean;
  enablePriceApprovalWorkflow: boolean;
}

// ============================================
// Price List Types
// ============================================

/**
 * Price list data transfer object
 */
export interface PriceListDTO {
  id?: string;
  code: string;
  name: string;
  description?: string;
  type: PriceListType;
  status: PriceListStatus;
  currency: string;
  priority: number;

  // Effective dates
  effectiveFrom: Date;
  effectiveTo?: Date;

  // Price basis
  basePriceListId?: string;
  priceModifier?: number;
  roundingRule: RoundingRule;
  roundingPrecision: number;

  // Scope
  isDefault: boolean;
  isCustomerSpecific: boolean;

  // External system
  externalId?: string;
  externalSystem?: string;
  lastSyncAt?: Date;
  syncStatus?: SyncJobStatus;

  metadata?: Record<string, unknown>;
}

/**
 * Price list with items
 */
export interface PriceListWithItems extends PriceListDTO {
  items: PriceListItemDTO[];
  customerAssignments?: CustomerPriceAssignmentDTO[];
}

/**
 * Price list item data transfer object
 */
export interface PriceListItemDTO {
  id?: string;
  priceListId: string;
  sku: string;
  masterProductId?: string;

  // Pricing
  basePrice: number;
  listPrice: number;
  minPrice?: number;
  maxPrice?: number;
  cost?: number;

  // Currency
  currency?: string;

  // Quantity breaks
  quantityBreaks: QuantityBreak[];

  // Discount settings
  maxDiscountPercent?: number;
  isDiscountable: boolean;

  // Effective dates
  effectiveFrom?: Date;
  effectiveTo?: Date;

  // Status
  isActive: boolean;

  // UOM
  uom: string;

  // External system
  externalId?: string;
  externalSystem?: string;
  lastSyncAt?: Date;

  metadata?: Record<string, unknown>;
}

/**
 * Quantity break definition for volume pricing
 */
export interface QuantityBreak {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  discountPercent?: number;
}

// ============================================
// Customer Price Assignment Types
// ============================================

/**
 * Customer price assignment data transfer object
 */
export interface CustomerPriceAssignmentDTO {
  id?: string;
  tenantId: string;
  priceListId: string;

  // Assignment target
  assignmentType: PriceAssignmentType;
  assignmentId: string;

  // Priority
  priority: number;

  // Effective dates
  effectiveFrom: Date;
  effectiveTo?: Date;

  // Status
  isActive: boolean;

  // External
  externalRef?: string;

  metadata?: Record<string, unknown>;
}

// ============================================
// Price Override Types
// ============================================

/**
 * Price override data transfer object
 */
export interface PriceOverrideDTO {
  id?: string;
  tenantId: string;
  priceListItemId: string;

  // Override details
  overrideType: PriceOverrideType;
  overrideValue: number;

  // Scope
  scopeType: PriceOverrideScopeType;
  scopeId: string;

  // Effective dates
  effectiveFrom: Date;
  effectiveTo?: Date;

  // Quantity conditions
  minQuantity?: number;
  maxQuantity?: number;

  // Approval
  status: PriceOverrideStatus;
  approvedById?: string;
  approvedAt?: Date;
  reason?: string;

  // External
  externalRef?: string;

  metadata?: Record<string, unknown>;
}

// ============================================
// Currency Exchange Rate Types
// ============================================

/**
 * Currency exchange rate data transfer object
 */
export interface CurrencyExchangeRateDTO {
  id?: string;
  tenantId: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;

  // Effective dates
  effectiveFrom: Date;
  effectiveTo?: Date;

  // Source
  rateSource?: string;
  rateType: ExchangeRateType;

  isActive: boolean;

  metadata?: Record<string, unknown>;
}

// ============================================
// Price Calculation Types
// ============================================

/**
 * Request to calculate price for a product
 */
export interface PriceCalculationRequest {
  tenantId: string;
  sku: string;
  quantity: number;
  customerId?: string;
  organizationId?: string;
  contractId?: string;
  currency?: string;
  priceDate?: Date;
  warehouseId?: string;
}

/**
 * Result of price calculation
 */
export interface PriceCalculationResult {
  sku: string;
  quantity: number;

  // Calculated prices
  unitPrice: number;
  extendedPrice: number;
  currency: string;

  // Price source information
  priceSource: PriceResolutionSource;
  priceListId?: string;
  priceListCode?: string;

  // Base and discount info
  basePrice: number;
  discountAmount: number;
  discountPercent: number;

  // Quantity break applied
  quantityBreakApplied?: QuantityBreak;

  // Override info
  overrideApplied?: boolean;
  overrideId?: string;

  // Price constraints
  minPrice?: number;
  maxPrice?: number;
  isAtMinPrice: boolean;
  isAtMaxPrice: boolean;

  // Margin info (if cost available)
  cost?: number;
  margin?: number;
  marginPercent?: number;

  // Effective dates
  effectiveFrom: Date;
  effectiveTo?: Date;

  // Conversion info (if currency conversion applied)
  originalCurrency?: string;
  exchangeRate?: number;

  // Debug info
  resolutionPath: PriceResolutionStep[];
}

/**
 * Step in price resolution for debugging
 */
export interface PriceResolutionStep {
  source: PriceResolutionSource;
  priceListId?: string;
  price?: number;
  selected: boolean;
  reason?: string;
}

// ============================================
// Sync Types
// ============================================

/**
 * Price list import request
 */
export interface PriceListImportRequest {
  tenantId: string;
  connectorId?: string;
  priceListCode?: string;
  fullSync?: boolean;
  deltaToken?: string;
}

/**
 * Price list import from ERP format
 */
export interface ERPPriceListImport {
  priceList: {
    code: string;
    name: string;
    description?: string;
    type?: string;
    currency: string;
    effectiveFrom: string;
    effectiveTo?: string;
    externalId?: string;
  };
  items: ERPPriceListItemImport[];
}

/**
 * Price list item from ERP format
 */
export interface ERPPriceListItemImport {
  sku: string;
  basePrice: number;
  listPrice?: number;
  minPrice?: number;
  maxPrice?: number;
  cost?: number;
  currency?: string;
  uom?: string;
  quantityBreaks?: QuantityBreak[];
  effectiveFrom?: string;
  effectiveTo?: string;
  externalId?: string;
}

/**
 * Price list sync result
 */
export interface PriceListSyncResult {
  jobId: string;
  priceListId: string;
  priceListCode: string;
  status: SyncJobStatus;

  // Counts
  totalItems: number;
  processedItems: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;

  // Delta tracking
  deltaToken?: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;

  // Errors
  errors?: SyncError[];

  // Summary
  summary?: SyncSummary;
}

/**
 * Sync error details
 */
export interface SyncError {
  sku?: string;
  itemIndex?: number;
  errorCode: string;
  errorMessage: string;
  details?: Record<string, unknown>;
}

/**
 * Sync summary statistics
 */
export interface SyncSummary {
  itemsCreated: number;
  itemsUpdated: number;
  itemsDeleted: number;
  itemsUnchanged: number;
  priceChanges: PriceChangeStats;
}

/**
 * Price change statistics
 */
export interface PriceChangeStats {
  increased: number;
  decreased: number;
  unchanged: number;
  averageChangePercent: number;
  maxIncrease?: {
    sku: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
  };
  maxDecrease?: {
    sku: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
  };
}

// ============================================
// Event Types
// ============================================

/**
 * Price list events
 */
export type PriceListEventType =
  | 'price_list.created'
  | 'price_list.updated'
  | 'price_list.activated'
  | 'price_list.deactivated'
  | 'price_list.expired'
  | 'price_list.deleted'
  | 'price_list.item_added'
  | 'price_list.item_updated'
  | 'price_list.item_removed'
  | 'price_list.sync_started'
  | 'price_list.sync_completed'
  | 'price_list.sync_failed'
  | 'price_override.created'
  | 'price_override.approved'
  | 'price_override.revoked'
  | 'exchange_rate.updated';

/**
 * Price list event payload
 */
export interface PriceListEvent {
  type: PriceListEventType;
  tenantId: string;
  priceListId?: string;
  priceListItemId?: string;
  overrideId?: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// ============================================
// Query/Filter Types
// ============================================

/**
 * Price list query filters
 */
export interface PriceListQueryFilters {
  tenantId: string;
  code?: string;
  name?: string;
  type?: PriceListType;
  status?: PriceListStatus;
  currency?: string;
  isDefault?: boolean;
  isCustomerSpecific?: boolean;
  effectiveAt?: Date;
  externalId?: string;
  externalSystem?: string;

  // Pagination
  page?: number;
  pageSize?: number;

  // Sorting
  sortBy?: 'code' | 'name' | 'priority' | 'effectiveFrom' | 'createdAt';
  sortOrder?: 'asc' | 'desc';

  // Include relations
  includeItems?: boolean;
  includeAssignments?: boolean;
}

/**
 * Price list item query filters
 */
export interface PriceListItemQueryFilters {
  priceListId: string;
  sku?: string;
  skus?: string[];
  isActive?: boolean;
  effectiveAt?: Date;
  minPrice?: number;
  maxPrice?: number;

  // Pagination
  page?: number;
  pageSize?: number;

  // Sorting
  sortBy?: 'sku' | 'listPrice' | 'effectiveFrom' | 'createdAt';
  sortOrder?: 'asc' | 'desc';

  // Include relations
  includeOverrides?: boolean;
}

/**
 * Effective price query - find prices for multiple SKUs
 */
export interface EffectivePriceQuery {
  tenantId: string;
  skus: string[];
  customerId?: string;
  organizationId?: string;
  contractId?: string;
  currency?: string;
  priceDate?: Date;
  includeBreaks?: boolean;
}

/**
 * Effective price result
 */
export interface EffectivePriceResult {
  [sku: string]: PriceCalculationResult | null;
}
