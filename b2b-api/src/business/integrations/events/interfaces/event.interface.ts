/**
 * Event types for the B2B platform
 */

// Order events
export const ORDER_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_SUBMITTED: 'order.submitted',
  ORDER_APPROVED: 'order.approved',
  ORDER_REJECTED: 'order.rejected',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',
} as const;

// Invoice events
export const INVOICE_EVENTS = {
  INVOICE_CREATED: 'invoice.created',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PARTIAL_PAID: 'invoice.partial_paid',
  INVOICE_OVERDUE: 'invoice.overdue',
  INVOICE_CANCELLED: 'invoice.cancelled',
  INVOICE_REFUNDED: 'invoice.refunded',
} as const;

// Inventory events
export const INVENTORY_EVENTS = {
  INVENTORY_UPDATED: 'inventory.updated',
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
  INVENTORY_OUT_OF_STOCK: 'inventory.out_of_stock',
  INVENTORY_RESTOCKED: 'inventory.restocked',
  INVENTORY_ADJUSTMENT: 'inventory.adjustment',
  INVENTORY_TRANSFER: 'inventory.transfer',
} as const;

// Catalog events
export const CATALOG_EVENTS = {
  PRODUCT_CREATED: 'catalog.product.created',
  PRODUCT_UPDATED: 'catalog.product.updated',
  PRODUCT_DELETED: 'catalog.product.deleted',
  PRICE_UPDATED: 'catalog.price.updated',
  CATEGORY_UPDATED: 'catalog.category.updated',
} as const;

// User events
export const USER_EVENTS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
} as const;

// System events
export const SYSTEM_EVENTS = {
  INTEGRATION_CONNECTED: 'system.integration.connected',
  INTEGRATION_DISCONNECTED: 'system.integration.disconnected',
  INTEGRATION_ERROR: 'system.integration.error',
  WEBHOOK_RECEIVED: 'system.webhook.received',
  SYNC_STARTED: 'system.sync.started',
  SYNC_COMPLETED: 'system.sync.completed',
  SYNC_FAILED: 'system.sync.failed',
} as const;

// Combine all event types
export const ALL_EVENTS = {
  ...ORDER_EVENTS,
  ...INVOICE_EVENTS,
  ...INVENTORY_EVENTS,
  ...CATALOG_EVENTS,
  ...USER_EVENTS,
  ...SYSTEM_EVENTS,
} as const;

export type OrderEventType = (typeof ORDER_EVENTS)[keyof typeof ORDER_EVENTS];
export type InvoiceEventType = (typeof INVOICE_EVENTS)[keyof typeof INVOICE_EVENTS];
export type InventoryEventType = (typeof INVENTORY_EVENTS)[keyof typeof INVENTORY_EVENTS];
export type CatalogEventType = (typeof CATALOG_EVENTS)[keyof typeof CATALOG_EVENTS];
export type UserEventType = (typeof USER_EVENTS)[keyof typeof USER_EVENTS];
export type SystemEventType = (typeof SYSTEM_EVENTS)[keyof typeof SYSTEM_EVENTS];

export type EventType =
  | OrderEventType
  | InvoiceEventType
  | InventoryEventType
  | CatalogEventType
  | UserEventType
  | SystemEventType;

/**
 * Event priority levels
 */
export enum EventPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

/**
 * Event status
 */
export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
  DEAD_LETTER = 'dead_letter',
}

/**
 * Base event interface
 */
export interface BaseEvent<T = unknown> {
  id: string;
  type: EventType;
  tenantId: string;
  timestamp: Date;
  version: string;
  source: string;
  correlationId?: string;
  causationId?: string;
  metadata?: EventMetadata;
  payload: T;
}

/**
 * Event metadata
 */
export interface EventMetadata {
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

/**
 * Published event (stored in event log)
 */
export interface PublishedEvent<T = unknown> extends BaseEvent<T> {
  status: EventStatus;
  publishedAt: Date;
  deliveredAt?: Date;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  nextRetryAt?: Date;
}

/**
 * Event subscription configuration
 */
export interface EventSubscription {
  id: string;
  tenantId: string;
  name: string;
  eventTypes: EventType[];
  enabled: boolean;
  filter?: EventFilter;
  destination: EventDestination;
  retryPolicy: RetryPolicy;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event filter for subscriptions
 */
export interface EventFilter {
  // JSONPath expressions for filtering
  conditions?: FilterCondition[];
  // Only process events from specific sources
  sources?: string[];
  // Only process events with specific metadata
  metadata?: Record<string, unknown>;
}

/**
 * Filter condition
 */
export interface FilterCondition {
  path: string; // JSONPath expression
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'regex'
    | 'in';
  value: unknown;
}

/**
 * Event destination configuration
 */
export interface EventDestination {
  type: 'webhook' | 'queue' | 'email' | 'sms' | 'internal';
  config: WebhookDestination | QueueDestination | EmailDestination | InternalDestination;
}

/**
 * Webhook destination
 */
export interface WebhookDestination {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'api_key' | 'hmac';
    credentials?: Record<string, string>;
  };
  timeout?: number;
  verifySsl?: boolean;
}

/**
 * Queue destination (for internal routing)
 */
export interface QueueDestination {
  queueName: string;
  priority?: EventPriority;
}

/**
 * Email destination
 */
export interface EmailDestination {
  to: string[];
  subject?: string;
  template?: string;
}

/**
 * Internal destination (for in-process handling)
 */
export interface InternalDestination {
  handler: string;
  options?: Record<string, unknown>;
}

/**
 * Retry policy for event delivery
 */
export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  retryableErrors?: string[]; // Error codes/patterns that should trigger retry
}

/**
 * Event delivery result
 */
export interface EventDeliveryResult {
  eventId: string;
  subscriptionId: string;
  success: boolean;
  statusCode?: number;
  response?: unknown;
  error?: string;
  duration: number;
  attempt: number;
  deliveredAt: Date;
}

/**
 * Event replay request
 */
export interface EventReplayRequest {
  tenantId: string;
  eventTypes?: EventType[];
  startTime: Date;
  endTime: Date;
  subscriptionId?: string;
  filter?: EventFilter;
  batchSize?: number;
  delayBetweenBatches?: number;
}

/**
 * Event replay result
 */
export interface EventReplayResult {
  requestId: string;
  tenantId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Event log entry for persistence
 */
export interface EventLogEntry {
  id: string;
  eventId: string;
  type: EventType;
  tenantId: string;
  payload: unknown;
  metadata?: EventMetadata;
  source: string;
  correlationId?: string;
  causationId?: string;
  status: EventStatus;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Event statistics
 */
export interface EventStats {
  tenantId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  eventCounts: Record<EventType, number>;
  totalEvents: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  avgDeliveryTime: number;
  retryCount: number;
}

/**
 * Queue names for BullMQ
 */
export const QUEUE_NAMES = {
  EVENTS: 'events',
  WEBHOOKS: 'webhooks',
  NOTIFICATIONS: 'notifications',
  SYNC: 'sync',
  DEAD_LETTER: 'dead-letter',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Job data for event processing
 */
export interface EventJobData {
  event: BaseEvent;
  subscriptionId?: string;
  destination?: EventDestination;
  attempt?: number;
}

/**
 * Job data for webhook delivery
 */
export interface WebhookJobData {
  eventId: string;
  subscriptionId: string;
  destination: WebhookDestination;
  payload: unknown;
  attempt: number;
  maxAttempts: number;
}
