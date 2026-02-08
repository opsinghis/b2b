/**
 * Order-to-Cash (O2C) Flow Types and Interfaces
 *
 * This module defines the types for the O2C flow orchestration engine
 * that manages the complete order lifecycle from creation to payment.
 */

import { Order, OrderItem, OrderStatus } from '@prisma/client';

// ============================================
// Flow Status and Step Enums
// ============================================

/**
 * O2C Flow status
 */
export enum O2CFlowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING_EXTERNAL = 'waiting_external',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * O2C Flow step types
 */
export enum O2CStepType {
  ORDER_SYNC = 'order_sync',
  CREDIT_CHECK = 'credit_check',
  ORDER_CONFIRMATION = 'order_confirmation',
  INVENTORY_RESERVATION = 'inventory_reservation',
  FULFILLMENT = 'fulfillment',
  SHIPMENT_SYNC = 'shipment_sync',
  ASN_GENERATION = 'asn_generation',
  INVOICE_GENERATION = 'invoice_generation',
  INVOICE_SYNC = 'invoice_sync',
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_STATUS_SYNC = 'payment_status_sync',
  ORDER_COMPLETION = 'order_completion',
}

/**
 * Step execution status
 */
export enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  RETRYING = 'retrying',
}

/**
 * Credit check result
 */
export enum CreditCheckResult {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_REVIEW = 'pending_review',
  ERROR = 'error',
}

/**
 * Payment status from external system
 */
export enum ExternalPaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CAPTURED = 'captured',
  PARTIAL_PAYMENT = 'partial_payment',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ============================================
// Flow Configuration Types
// ============================================

/**
 * O2C Flow configuration per tenant
 */
export interface O2CFlowConfig {
  tenantId: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Connector configurations
  erpConnectorId?: string;
  paymentConnectorId?: string;
  shippingConnectorId?: string;
  invoicingConnectorId?: string;

  // Feature toggles
  features: O2CFlowFeatures;

  // Step configurations
  steps: O2CStepConfig[];

  // Timing and retry settings
  settings: O2CFlowSettings;

  // Webhook configurations
  webhooks: O2CWebhookConfig;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Feature toggles for O2C flow
 */
export interface O2CFlowFeatures {
  enableCreditCheck: boolean;
  enableInventoryReservation: boolean;
  enableAutoInvoice: boolean;
  enableAutoShipment: boolean;
  enablePaymentCapture: boolean;
  enableASNGeneration: boolean;
  enableNotifications: boolean;
  requireApprovalAboveThreshold: boolean;
  approvalThresholdAmount?: number;
  approvalThresholdCurrency?: string;
}

/**
 * Step configuration
 */
export interface O2CStepConfig {
  stepType: O2CStepType;
  enabled: boolean;
  order: number;
  timeout?: number; // ms
  retryPolicy?: RetryPolicyConfig;
  conditions?: StepCondition[];
  connectorCapability?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Retry policy for steps
 */
export interface RetryPolicyConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Step condition for conditional execution
 */
export interface StepCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'contains';
  value: unknown;
}

/**
 * Flow-level settings
 */
export interface O2CFlowSettings {
  defaultTimeoutMs: number;
  maxConcurrentFlows: number;
  pollingIntervalMs: number;
  statusCheckIntervalMs: number;
  maxFlowDurationMs: number;
  deadLetterAfterAttempts: number;
}

/**
 * Webhook configuration
 */
export interface O2CWebhookConfig {
  orderStatusCallback?: string;
  shipmentCallback?: string;
  invoiceCallback?: string;
  paymentCallback?: string;
  errorCallback?: string;
  secretKey?: string;
}

// ============================================
// Flow Execution Types
// ============================================

/**
 * O2C Flow instance
 */
export interface O2CFlowInstance {
  id: string;
  tenantId: string;
  configId: string;
  orderId: string;
  orderNumber: string;
  status: O2CFlowStatus;
  currentStep?: O2CStepType;

  // External references
  externalOrderId?: string;
  externalInvoiceId?: string;
  externalShipmentId?: string;
  externalPaymentId?: string;

  // Step execution history
  steps: O2CStepExecution[];

  // Flow data
  orderData: O2COrderData;
  shipmentData?: O2CShipmentData;
  invoiceData?: O2CInvoiceData;
  paymentData?: O2CPaymentData;
  creditCheckData?: O2CCreditCheckData;

  // Error tracking
  lastError?: string;
  errorCount: number;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;

  // Correlation
  correlationId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Step execution record
 */
export interface O2CStepExecution {
  stepType: O2CStepType;
  status: StepStatus;
  attempt: number;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
}

// ============================================
// Domain Data Types
// ============================================

/**
 * Order data for O2C flow
 */
export interface O2COrderData {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  customerId: string;
  customerEmail?: string;
  customerName?: string;

  // Amounts
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;

  // Addresses
  shippingAddress: O2CAddress;
  billingAddress: O2CAddress;

  // Items
  items: O2COrderItem[];

  // Dates
  createdAt: Date;
  requestedDeliveryDate?: Date;

  // References
  poNumber?: string;
  contractId?: string;

  // Custom fields
  metadata?: Record<string, unknown>;
}

/**
 * Order item for O2C
 */
export interface O2COrderItem {
  lineNumber: number;
  productId?: string;
  sku: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
  uom?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Address structure
 */
export interface O2CAddress {
  name?: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

/**
 * Shipment data
 */
export interface O2CShipmentData {
  shipmentId: string;
  externalShipmentId?: string;
  carrier: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status: ShipmentStatus;
  shippedAt?: Date;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  packages: O2CPackage[];
  asnNumber?: string;
  asnGeneratedAt?: Date;
}

/**
 * Shipment status
 */
export enum ShipmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  EXCEPTION = 'exception',
  RETURNED = 'returned',
}

/**
 * Package in shipment
 */
export interface O2CPackage {
  packageId: string;
  trackingNumber?: string;
  weight?: number;
  weightUnit?: string;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  items: O2CPackageItem[];
}

/**
 * Item in package
 */
export interface O2CPackageItem {
  lineNumber: number;
  sku: string;
  quantity: number;
  lotNumber?: string;
  serialNumbers?: string[];
}

/**
 * Invoice data
 */
export interface O2CInvoiceData {
  invoiceId: string;
  externalInvoiceId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  amountPaid: number;
  amountDue: number;
  paymentTerms?: string;
  items: O2CInvoiceItem[];
  pdfUrl?: string;
  sentAt?: Date;
}

/**
 * Invoice status
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SENT = 'sent',
  VIEWED = 'viewed',
  PARTIAL_PAID = 'partial_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Invoice line item
 */
export interface O2CInvoiceItem {
  lineNumber: number;
  description: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Payment data
 */
export interface O2CPaymentData {
  paymentId: string;
  externalPaymentId?: string;
  status: ExternalPaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency: string;
  authorizedAt?: Date;
  capturedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  transactionId?: string;
  authorizationCode?: string;
  lastFour?: string;
  cardBrand?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment method
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  ACH = 'ach',
  WIRE_TRANSFER = 'wire_transfer',
  CHECK = 'check',
  NET_TERMS = 'net_terms',
  PAYPAL = 'paypal',
  OTHER = 'other',
}

/**
 * Credit check data
 */
export interface O2CCreditCheckData {
  checkId: string;
  externalCheckId?: string;
  result: CreditCheckResult;
  creditLimit?: number;
  availableCredit?: number;
  currentBalance?: number;
  currency?: string;
  checkedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// Event Payloads
// ============================================

/**
 * O2C Flow event types
 */
export const O2C_FLOW_EVENTS = {
  FLOW_STARTED: 'o2c.flow.started',
  FLOW_COMPLETED: 'o2c.flow.completed',
  FLOW_FAILED: 'o2c.flow.failed',
  FLOW_CANCELLED: 'o2c.flow.cancelled',
  STEP_STARTED: 'o2c.step.started',
  STEP_COMPLETED: 'o2c.step.completed',
  STEP_FAILED: 'o2c.step.failed',
  ORDER_SYNCED: 'o2c.order.synced',
  CREDIT_APPROVED: 'o2c.credit.approved',
  CREDIT_REJECTED: 'o2c.credit.rejected',
  SHIPMENT_CREATED: 'o2c.shipment.created',
  SHIPMENT_UPDATED: 'o2c.shipment.updated',
  ASN_GENERATED: 'o2c.asn.generated',
  INVOICE_GENERATED: 'o2c.invoice.generated',
  INVOICE_SYNCED: 'o2c.invoice.synced',
  PAYMENT_AUTHORIZED: 'o2c.payment.authorized',
  PAYMENT_CAPTURED: 'o2c.payment.captured',
  PAYMENT_FAILED: 'o2c.payment.failed',
} as const;

export type O2CFlowEventType = (typeof O2C_FLOW_EVENTS)[keyof typeof O2C_FLOW_EVENTS];

/**
 * Flow started event payload
 */
export interface O2CFlowStartedPayload {
  flowId: string;
  orderId: string;
  orderNumber: string;
  tenantId: string;
  configId: string;
  orderTotal: number;
  currency: string;
}

/**
 * Flow completed event payload
 */
export interface O2CFlowCompletedPayload {
  flowId: string;
  orderId: string;
  orderNumber: string;
  tenantId: string;
  externalOrderId?: string;
  externalInvoiceId?: string;
  externalPaymentId?: string;
  durationMs: number;
  stepsCompleted: number;
}

/**
 * Flow failed event payload
 */
export interface O2CFlowFailedPayload {
  flowId: string;
  orderId: string;
  orderNumber: string;
  tenantId: string;
  failedStep: O2CStepType;
  error: string;
  errorCode?: string;
  retryable: boolean;
  attempt: number;
}

/**
 * Step event payload
 */
export interface O2CStepEventPayload {
  flowId: string;
  orderId: string;
  stepType: O2CStepType;
  status: StepStatus;
  attempt: number;
  durationMs?: number;
  output?: Record<string, unknown>;
  error?: string;
}

// ============================================
// Service Interfaces
// ============================================

/**
 * O2C Flow orchestrator interface
 */
export interface IO2CFlowOrchestrator {
  startFlow(
    orderId: string,
    tenantId: string,
    options?: StartFlowOptions,
  ): Promise<O2CFlowInstance>;
  getFlow(flowId: string): Promise<O2CFlowInstance | null>;
  getFlowByOrder(orderId: string): Promise<O2CFlowInstance | null>;
  pauseFlow(flowId: string, reason?: string): Promise<O2CFlowInstance>;
  resumeFlow(flowId: string): Promise<O2CFlowInstance>;
  cancelFlow(flowId: string, reason?: string): Promise<O2CFlowInstance>;
  retryStep(flowId: string, stepType: O2CStepType): Promise<O2CFlowInstance>;
  listFlows(tenantId: string, options?: ListFlowsOptions): Promise<O2CFlowInstance[]>;
  getFlowStats(tenantId: string, period?: string): Promise<O2CFlowStats>;
}

/**
 * Options for starting a flow
 */
export interface StartFlowOptions {
  configId?: string;
  priority?: 'low' | 'normal' | 'high';
  skipCreditCheck?: boolean;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Options for listing flows
 */
export interface ListFlowsOptions {
  status?: O2CFlowStatus[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'status';
  orderDir?: 'asc' | 'desc';
}

/**
 * Flow statistics
 */
export interface O2CFlowStats {
  tenantId: string;
  period: string;
  totalFlows: number;
  completedFlows: number;
  failedFlows: number;
  cancelledFlows: number;
  runningFlows: number;
  avgDurationMs: number;
  successRate: number;
  stepStats: Record<O2CStepType, StepStats>;
}

/**
 * Step statistics
 */
export interface StepStats {
  total: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
  successRate: number;
}

// ============================================
// Step Handler Interface
// ============================================

/**
 * Step handler interface for implementing individual steps
 */
export interface IO2CStepHandler {
  stepType: O2CStepType;
  execute(
    flow: O2CFlowInstance,
    config: O2CStepConfig,
    context: O2CStepContext,
  ): Promise<O2CStepResult>;
  validate?(flow: O2CFlowInstance, config: O2CStepConfig): Promise<boolean>;
  canRetry?(error: string, attempt: number): boolean;
}

/**
 * Step execution context
 */
export interface O2CStepContext {
  tenantId: string;
  correlationId: string;
  connectorContext?: ConnectorExecutionContext;
  previousStepOutput?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Connector execution context (minimal needed info)
 */
export interface ConnectorExecutionContext {
  configId: string;
  credentials: Record<string, unknown>;
  config: Record<string, unknown>;
}

/**
 * Step execution result
 */
export interface O2CStepResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  nextStep?: O2CStepType;
  skipToStep?: O2CStepType;
}

// ============================================
// Webhook Types
// ============================================

/**
 * Incoming webhook payload for order status
 */
export interface O2COrderStatusWebhook {
  externalOrderId: string;
  status: string;
  statusCode?: string;
  message?: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Incoming webhook payload for shipment
 */
export interface O2CShipmentWebhook {
  externalOrderId?: string;
  externalShipmentId: string;
  trackingNumber?: string;
  carrier?: string;
  status: string;
  statusCode?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  packages?: O2CPackage[];
  metadata?: Record<string, unknown>;
}

/**
 * Incoming webhook payload for invoice
 */
export interface O2CInvoiceWebhook {
  externalOrderId?: string;
  externalInvoiceId: string;
  invoiceNumber?: string;
  status: string;
  amountPaid?: number;
  amountDue?: number;
  paidAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Incoming webhook payload for payment
 */
export interface O2CPaymentWebhook {
  externalOrderId?: string;
  externalPaymentId: string;
  transactionId?: string;
  status: string;
  amount?: number;
  currency?: string;
  method?: string;
  failureCode?: string;
  failureMessage?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Helper Types
// ============================================

/**
 * Order with items (matching Prisma return type)
 */
export type OrderWithItems = Order & { items: OrderItem[] };

/**
 * Flow execution log entry
 */
export interface O2CFlowLogEntry {
  id: string;
  flowId: string;
  tenantId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  step?: O2CStepType;
  data?: Record<string, unknown>;
  timestamp: Date;
  correlationId?: string;
}

/**
 * Default flow configuration template
 */
export const DEFAULT_O2C_FLOW_CONFIG: Omit<O2CFlowConfig, 'tenantId' | 'createdAt' | 'updatedAt'> =
  {
    name: 'Default O2C Flow',
    description: 'Standard Order-to-Cash flow',
    enabled: true,
    features: {
      enableCreditCheck: true,
      enableInventoryReservation: true,
      enableAutoInvoice: true,
      enableAutoShipment: true,
      enablePaymentCapture: true,
      enableASNGeneration: true,
      enableNotifications: true,
      requireApprovalAboveThreshold: false,
    },
    steps: [
      { stepType: O2CStepType.ORDER_SYNC, enabled: true, order: 1 },
      { stepType: O2CStepType.CREDIT_CHECK, enabled: true, order: 2 },
      { stepType: O2CStepType.ORDER_CONFIRMATION, enabled: true, order: 3 },
      { stepType: O2CStepType.INVENTORY_RESERVATION, enabled: true, order: 4 },
      { stepType: O2CStepType.FULFILLMENT, enabled: true, order: 5 },
      { stepType: O2CStepType.SHIPMENT_SYNC, enabled: true, order: 6 },
      { stepType: O2CStepType.ASN_GENERATION, enabled: true, order: 7 },
      { stepType: O2CStepType.INVOICE_GENERATION, enabled: true, order: 8 },
      { stepType: O2CStepType.INVOICE_SYNC, enabled: true, order: 9 },
      { stepType: O2CStepType.PAYMENT_PROCESSING, enabled: true, order: 10 },
      { stepType: O2CStepType.PAYMENT_STATUS_SYNC, enabled: true, order: 11 },
      { stepType: O2CStepType.ORDER_COMPLETION, enabled: true, order: 12 },
    ],
    settings: {
      defaultTimeoutMs: 30000,
      maxConcurrentFlows: 100,
      pollingIntervalMs: 60000,
      statusCheckIntervalMs: 30000,
      maxFlowDurationMs: 86400000, // 24 hours
      deadLetterAfterAttempts: 5,
    },
    webhooks: {},
  };
