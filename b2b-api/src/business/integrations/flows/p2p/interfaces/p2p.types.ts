/**
 * Procure-to-Pay (P2P) Flow Types and Interfaces
 *
 * This module defines the types for the P2P flow orchestration engine
 * that manages the procurement lifecycle from PO receipt to payment.
 */

// ============================================
// Flow Status and Step Enums
// ============================================

/**
 * P2P Flow status
 */
export enum P2PFlowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING_EXTERNAL = 'waiting_external',
  WAITING_APPROVAL = 'waiting_approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * P2P Flow step types
 */
export enum P2PStepType {
  PO_RECEIPT = 'po_receipt',
  PO_VALIDATION = 'po_validation',
  PO_ACKNOWLEDGMENT = 'po_acknowledgment',
  GOODS_RECEIPT = 'goods_receipt',
  INVOICE_CREATION = 'invoice_creation',
  THREE_WAY_MATCH = 'three_way_match',
  INVOICE_SUBMISSION = 'invoice_submission',
  PAYMENT_TRACKING = 'payment_tracking',
  FLOW_COMPLETION = 'flow_completion',
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
 * Purchase Order status
 */
export enum POStatus {
  DRAFT = 'draft',
  RECEIVED = 'received',
  ACKNOWLEDGED = 'acknowledged',
  PARTIALLY_RECEIVED = 'partially_received',
  FULLY_RECEIVED = 'fully_received',
  INVOICED = 'invoiced',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

/**
 * Goods receipt status
 */
export enum GoodsReceiptStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETE = 'complete',
  REJECTED = 'rejected',
  RETURNED = 'returned',
}

/**
 * 3-way match result
 */
export enum ThreeWayMatchResult {
  MATCHED = 'matched',
  QUANTITY_MISMATCH = 'quantity_mismatch',
  PRICE_MISMATCH = 'price_mismatch',
  PARTIAL_MATCH = 'partial_match',
  NOT_MATCHED = 'not_matched',
  PENDING = 'pending',
}

/**
 * Vendor invoice status
 */
export enum VendorInvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  PARTIAL_PAID = 'partial_paid',
  CANCELLED = 'cancelled',
}

/**
 * Payment status
 */
export enum PaymentStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// ============================================
// Flow Configuration Types
// ============================================

/**
 * P2P Flow configuration per tenant
 */
export interface P2PFlowConfig {
  tenantId: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Connector configurations
  erpConnectorId?: string;
  apConnectorId?: string; // Accounts Payable
  bankingConnectorId?: string;

  // Feature toggles
  features: P2PFlowFeatures;

  // Step configurations
  steps: P2PStepConfig[];

  // Timing and retry settings
  settings: P2PFlowSettings;

  // Tolerance settings for 3-way match
  matchTolerances: MatchTolerances;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Feature toggles for P2P flow
 */
export interface P2PFlowFeatures {
  enableAutoAcknowledgment: boolean;
  enableAutoGoodsReceipt: boolean;
  enableThreeWayMatch: boolean;
  enableAutoInvoiceSubmission: boolean;
  enableAutoPayment: boolean;
  requireApprovalForMismatch: boolean;
  enableEdiIntegration: boolean;
  enableNotifications: boolean;
}

/**
 * Match tolerance settings
 */
export interface MatchTolerances {
  quantityTolerancePercent: number;
  priceTolerancePercent: number;
  amountToleranceAbsolute: number;
  amountToleranceCurrency: string;
}

/**
 * Step configuration
 */
export interface P2PStepConfig {
  stepType: P2PStepType;
  enabled: boolean;
  order: number;
  timeout?: number;
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
export interface P2PFlowSettings {
  defaultTimeoutMs: number;
  maxConcurrentFlows: number;
  pollingIntervalMs: number;
  paymentTermsDays: number;
  maxFlowDurationMs: number;
  deadLetterAfterAttempts: number;
}

// ============================================
// Flow Execution Types
// ============================================

/**
 * P2P Flow instance
 */
export interface P2PFlowInstance {
  id: string;
  tenantId: string;
  configId: string;
  purchaseOrderId: string;
  poNumber: string;
  status: P2PFlowStatus;
  currentStep?: P2PStepType;

  // External references
  externalPOId?: string;
  externalInvoiceId?: string;
  externalPaymentId?: string;

  // Step execution history
  steps: P2PStepExecution[];

  // Flow data
  poData: P2PPurchaseOrderData;
  goodsReceiptData?: P2PGoodsReceiptData;
  invoiceData?: P2PVendorInvoiceData;
  matchData?: P2PMatchData;
  paymentData?: P2PPaymentData;

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
export interface P2PStepExecution {
  stepType: P2PStepType;
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
 * Purchase Order data
 */
export interface P2PPurchaseOrderData {
  poId: string;
  poNumber: string;
  externalPONumber?: string;
  status: POStatus;
  vendorId: string;
  vendorName?: string;
  buyerId: string;
  buyerName?: string;

  // Amounts
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;

  // Addresses
  shipToAddress: P2PAddress;
  billToAddress: P2PAddress;

  // Items
  items: P2PPurchaseOrderItem[];

  // Dates
  poDate: Date;
  expectedDeliveryDate?: Date;
  paymentDueDate?: Date;
  paymentTerms?: string;

  // References
  contractId?: string;
  requisitionId?: string;

  // Custom fields
  metadata?: Record<string, unknown>;
}

/**
 * Purchase Order item
 */
export interface P2PPurchaseOrderItem {
  lineNumber: number;
  productId?: string;
  sku: string;
  description: string;
  quantity: number;
  quantityReceived: number;
  unitPrice: number;
  tax: number;
  total: number;
  uom?: string;
  expectedDeliveryDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Address structure
 */
export interface P2PAddress {
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
 * Goods receipt data
 */
export interface P2PGoodsReceiptData {
  receiptId: string;
  externalReceiptId?: string;
  poId: string;
  poNumber: string;
  status: GoodsReceiptStatus;
  receivedAt: Date;
  receivedBy?: string;
  warehouseId?: string;
  warehouseName?: string;
  items: P2PGoodsReceiptItem[];
  notes?: string;
  attachments?: string[];
}

/**
 * Goods receipt line item
 */
export interface P2PGoodsReceiptItem {
  lineNumber: number;
  poLineNumber: number;
  sku: string;
  description?: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityRejected: number;
  lotNumber?: string;
  serialNumbers?: string[];
  expirationDate?: Date;
  conditionCode?: string;
  notes?: string;
}

/**
 * Vendor invoice data
 */
export interface P2PVendorInvoiceData {
  invoiceId: string;
  externalInvoiceId?: string;
  invoiceNumber: string;
  status: VendorInvoiceStatus;
  vendorId: string;
  vendorName?: string;
  poId: string;
  poNumber: string;
  receiptId?: string;
  invoiceDate: Date;
  dueDate: Date;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  amountPaid: number;
  amountDue: number;
  paymentTerms?: string;
  items: P2PVendorInvoiceItem[];
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectionReason?: string;
}

/**
 * Vendor invoice line item
 */
export interface P2PVendorInvoiceItem {
  lineNumber: number;
  poLineNumber?: number;
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
}

/**
 * 3-way match data
 */
export interface P2PMatchData {
  matchId: string;
  poId: string;
  receiptId?: string;
  invoiceId?: string;
  status: ThreeWayMatchResult;
  matchedAt: Date;
  items: P2PMatchItem[];
  discrepancies: P2PMatchDiscrepancy[];
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;
}

/**
 * Match line item
 */
export interface P2PMatchItem {
  lineNumber: number;
  sku: string;
  poQuantity: number;
  receivedQuantity: number;
  invoicedQuantity: number;
  poUnitPrice: number;
  invoiceUnitPrice: number;
  quantityMatched: boolean;
  priceMatched: boolean;
  withinTolerance: boolean;
}

/**
 * Match discrepancy
 */
export interface P2PMatchDiscrepancy {
  lineNumber: number;
  sku: string;
  type: 'quantity' | 'price' | 'missing_receipt' | 'missing_invoice';
  severity: 'warning' | 'error';
  expected: number;
  actual: number;
  difference: number;
  differencePercent: number;
  message: string;
}

/**
 * Payment data
 */
export interface P2PPaymentData {
  paymentId: string;
  externalPaymentId?: string;
  invoiceId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  amount: number;
  currency: string;
  scheduledDate?: Date;
  processedAt?: Date;
  completedAt?: Date;
  transactionId?: string;
  bankReference?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment method
 */
export enum PaymentMethod {
  ACH = 'ach',
  WIRE = 'wire',
  CHECK = 'check',
  VIRTUAL_CARD = 'virtual_card',
  CREDIT_CARD = 'credit_card',
  OTHER = 'other',
}

// ============================================
// Event Payloads
// ============================================

/**
 * P2P Flow event types
 */
export const P2P_FLOW_EVENTS = {
  FLOW_STARTED: 'p2p.flow.started',
  FLOW_COMPLETED: 'p2p.flow.completed',
  FLOW_FAILED: 'p2p.flow.failed',
  FLOW_CANCELLED: 'p2p.flow.cancelled',
  STEP_STARTED: 'p2p.step.started',
  STEP_COMPLETED: 'p2p.step.completed',
  STEP_FAILED: 'p2p.step.failed',
  PO_RECEIVED: 'p2p.po.received',
  PO_ACKNOWLEDGED: 'p2p.po.acknowledged',
  GOODS_RECEIVED: 'p2p.goods.received',
  MATCH_COMPLETED: 'p2p.match.completed',
  MATCH_DISCREPANCY: 'p2p.match.discrepancy',
  INVOICE_SUBMITTED: 'p2p.invoice.submitted',
  INVOICE_APPROVED: 'p2p.invoice.approved',
  INVOICE_REJECTED: 'p2p.invoice.rejected',
  PAYMENT_SCHEDULED: 'p2p.payment.scheduled',
  PAYMENT_COMPLETED: 'p2p.payment.completed',
  PAYMENT_FAILED: 'p2p.payment.failed',
} as const;

export type P2PFlowEventType = (typeof P2P_FLOW_EVENTS)[keyof typeof P2P_FLOW_EVENTS];

/**
 * Flow started event payload
 */
export interface P2PFlowStartedPayload {
  flowId: string;
  poId: string;
  poNumber: string;
  tenantId: string;
  configId: string;
  vendorId: string;
  poTotal: number;
  currency: string;
}

/**
 * Flow completed event payload
 */
export interface P2PFlowCompletedPayload {
  flowId: string;
  poId: string;
  poNumber: string;
  tenantId: string;
  externalPOId?: string;
  externalInvoiceId?: string;
  externalPaymentId?: string;
  durationMs: number;
  stepsCompleted: number;
}

/**
 * Match discrepancy event payload
 */
export interface P2PMatchDiscrepancyPayload {
  flowId: string;
  poId: string;
  poNumber: string;
  tenantId: string;
  matchResult: ThreeWayMatchResult;
  discrepancies: P2PMatchDiscrepancy[];
  requiresApproval: boolean;
}

// ============================================
// Service Interfaces
// ============================================

/**
 * P2P Flow orchestrator interface
 */
export interface IP2PFlowOrchestrator {
  startFlow(poId: string, tenantId: string, options?: StartFlowOptions): Promise<P2PFlowInstance>;
  getFlow(flowId: string): Promise<P2PFlowInstance | null>;
  getFlowByPO(poId: string): Promise<P2PFlowInstance | null>;
  pauseFlow(flowId: string, reason?: string): Promise<P2PFlowInstance>;
  resumeFlow(flowId: string): Promise<P2PFlowInstance>;
  cancelFlow(flowId: string, reason?: string): Promise<P2PFlowInstance>;
  retryStep(flowId: string, stepType: P2PStepType): Promise<P2PFlowInstance>;
  approveMatch(flowId: string, approvedBy: string): Promise<P2PFlowInstance>;
  listFlows(tenantId: string, options?: ListFlowsOptions): Promise<P2PFlowInstance[]>;
  getFlowStats(tenantId: string, period?: string): Promise<P2PFlowStats>;
}

/**
 * Options for starting a flow
 */
export interface StartFlowOptions {
  configId?: string;
  priority?: 'low' | 'normal' | 'high';
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Options for listing flows
 */
export interface ListFlowsOptions {
  status?: P2PFlowStatus[];
  vendorId?: string;
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
export interface P2PFlowStats {
  tenantId: string;
  period: string;
  totalFlows: number;
  completedFlows: number;
  failedFlows: number;
  cancelledFlows: number;
  runningFlows: number;
  avgDurationMs: number;
  successRate: number;
  matchSuccessRate: number;
  discrepancyCount: number;
  totalPOAmount: number;
  totalPaymentAmount: number;
  currency: string;
  stepStats: Record<P2PStepType, StepStats>;
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
 * Step handler interface
 */
export interface IP2PStepHandler {
  stepType: P2PStepType;
  execute(
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult>;
  validate?(flow: P2PFlowInstance, config: P2PStepConfig): Promise<boolean>;
  canRetry?(error: string, attempt: number): boolean;
}

/**
 * Step execution context
 */
export interface P2PStepContext {
  tenantId: string;
  correlationId: string;
  connectorContext?: ConnectorExecutionContext;
  previousStepOutput?: Record<string, unknown>;
  matchTolerances?: MatchTolerances;
  metadata?: Record<string, unknown>;
}

/**
 * Connector execution context
 */
export interface ConnectorExecutionContext {
  configId: string;
  credentials: Record<string, unknown>;
  config: Record<string, unknown>;
}

/**
 * Step execution result
 */
export interface P2PStepResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
  requiresApproval?: boolean;
  nextStep?: P2PStepType;
  skipToStep?: P2PStepType;
}

// ============================================
// Flow Log Entry
// ============================================

/**
 * Flow execution log entry
 */
export interface P2PFlowLogEntry {
  id: string;
  flowId: string;
  tenantId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  step?: P2PStepType;
  data?: Record<string, unknown>;
  timestamp: Date;
  correlationId?: string;
}

// ============================================
// Default Configuration
// ============================================

/**
 * Default flow configuration template
 */
export const DEFAULT_P2P_FLOW_CONFIG: Omit<P2PFlowConfig, 'tenantId' | 'createdAt' | 'updatedAt'> =
  {
    name: 'Default P2P Flow',
    description: 'Standard Procure-to-Pay flow',
    enabled: true,
    features: {
      enableAutoAcknowledgment: true,
      enableAutoGoodsReceipt: false,
      enableThreeWayMatch: true,
      enableAutoInvoiceSubmission: true,
      enableAutoPayment: false,
      requireApprovalForMismatch: true,
      enableEdiIntegration: true,
      enableNotifications: true,
    },
    steps: [
      { stepType: P2PStepType.PO_RECEIPT, enabled: true, order: 1 },
      { stepType: P2PStepType.PO_VALIDATION, enabled: true, order: 2 },
      { stepType: P2PStepType.PO_ACKNOWLEDGMENT, enabled: true, order: 3 },
      { stepType: P2PStepType.GOODS_RECEIPT, enabled: true, order: 4 },
      { stepType: P2PStepType.INVOICE_CREATION, enabled: true, order: 5 },
      { stepType: P2PStepType.THREE_WAY_MATCH, enabled: true, order: 6 },
      { stepType: P2PStepType.INVOICE_SUBMISSION, enabled: true, order: 7 },
      { stepType: P2PStepType.PAYMENT_TRACKING, enabled: true, order: 8 },
      { stepType: P2PStepType.FLOW_COMPLETION, enabled: true, order: 9 },
    ],
    settings: {
      defaultTimeoutMs: 30000,
      maxConcurrentFlows: 100,
      pollingIntervalMs: 60000,
      paymentTermsDays: 30,
      maxFlowDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      deadLetterAfterAttempts: 5,
    },
    matchTolerances: {
      quantityTolerancePercent: 5,
      priceTolerancePercent: 2,
      amountToleranceAbsolute: 10,
      amountToleranceCurrency: 'USD',
    },
  };
