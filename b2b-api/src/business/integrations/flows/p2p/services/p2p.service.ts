import { Injectable, Logger } from '@nestjs/common';
import {
  P2PFlowInstance,
  P2PFlowConfig,
  P2PFlowStatus,
  P2PStepType,
  P2PPurchaseOrderData,
  P2PVendorInvoiceData,
  P2PGoodsReceiptData,
  P2PPaymentData,
  ThreeWayMatchResult,
} from '../interfaces';
import { P2PFlowOrchestratorService } from './p2p-flow-orchestrator.service';
import { P2PFlowConfigService } from './p2p-flow-config.service';
import { P2PEventHandlerService, P2PEventType, P2PEvent } from './p2p-event-handler.service';

/**
 * P2P Flow Service - Main facade for P2P operations
 */
@Injectable()
export class P2PService {
  private readonly logger = new Logger(P2PService.name);

  constructor(
    private readonly orchestrator: P2PFlowOrchestratorService,
    private readonly configService: P2PFlowConfigService,
    private readonly eventHandler: P2PEventHandlerService,
  ) {}

  // ============================================
  // Flow Management
  // ============================================

  /**
   * Start a new P2P flow for a purchase order
   */
  async startFlow(
    tenantId: string,
    poData: P2PPurchaseOrderData,
    options?: { configOverrides?: Partial<P2PFlowConfig> },
  ): Promise<P2PFlowInstance> {
    this.logger.log(`Starting P2P flow for PO ${poData.poNumber}`);
    return this.orchestrator.startFlow(tenantId, poData, options);
  }

  /**
   * Get flow status by ID
   */
  async getFlowStatus(flowId: string): Promise<P2PFlowInstance | null> {
    return this.orchestrator.getFlowStatus(flowId);
  }

  /**
   * Pause a running flow
   */
  async pauseFlow(flowId: string, reason: string): Promise<P2PFlowInstance> {
    return this.orchestrator.pauseFlow(flowId, reason);
  }

  /**
   * Resume a paused flow
   */
  async resumeFlow(flowId: string): Promise<P2PFlowInstance> {
    return this.orchestrator.resumeFlow(flowId);
  }

  /**
   * Cancel a flow
   */
  async cancelFlow(flowId: string, reason: string): Promise<P2PFlowInstance> {
    return this.orchestrator.cancelFlow(flowId, reason);
  }

  /**
   * Retry a failed step
   */
  async retryStep(flowId: string, stepType: P2PStepType): Promise<P2PFlowInstance> {
    return this.orchestrator.retryStep(flowId, stepType);
  }

  // ============================================
  // Configuration Management
  // ============================================

  /**
   * Get P2P configuration for tenant
   */
  async getConfig(tenantId: string): Promise<P2PFlowConfig> {
    return this.configService.getConfig(tenantId);
  }

  /**
   * Save P2P configuration for tenant
   */
  async saveConfig(tenantId: string, config: P2PFlowConfig): Promise<void> {
    await this.configService.saveConfig(tenantId, config);
  }

  /**
   * Update match tolerances
   */
  async updateMatchTolerances(
    tenantId: string,
    tolerances: {
      quantityTolerancePercent?: number;
      priceTolerancePercent?: number;
      amountToleranceAbsolute?: number;
    },
  ): Promise<P2PFlowConfig> {
    return this.configService.updateMatchTolerances(tenantId, tolerances);
  }

  /**
   * Update feature flags
   */
  async updateFeatures(
    tenantId: string,
    features: Partial<P2PFlowConfig['features']>,
  ): Promise<P2PFlowConfig> {
    return this.configService.updateFeatures(tenantId, features);
  }

  // ============================================
  // Event Handling
  // ============================================

  /**
   * Handle incoming PO from external system
   */
  async handleIncomingPO(tenantId: string, poData: P2PPurchaseOrderData): Promise<P2PFlowInstance> {
    this.logger.log(`Processing incoming PO ${poData.poNumber}`);

    await this.eventHandler.emit({
      type: P2PEventType.PO_RECEIVED,
      tenantId,
      timestamp: new Date(),
      payload: { poData },
    });

    return this.startFlow(tenantId, poData);
  }

  /**
   * Handle goods receipt update
   */
  async handleGoodsReceiptUpdate(
    flowId: string,
    receiptData: P2PGoodsReceiptData,
  ): Promise<P2PFlowInstance> {
    this.logger.log(`Processing goods receipt for flow ${flowId}`);
    return this.orchestrator.handleWebhook(flowId, 'goods_receipt_update', { receiptData });
  }

  /**
   * Handle invoice creation
   */
  async handleInvoiceCreation(
    flowId: string,
    invoiceData: P2PVendorInvoiceData,
  ): Promise<P2PFlowInstance> {
    this.logger.log(`Processing invoice for flow ${flowId}`);

    const flow = await this.orchestrator.getFlowStatus(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    const event: P2PEvent = {
      type: P2PEventType.INVOICE_CREATED,
      flowId,
      tenantId: flow.tenantId,
      timestamp: new Date(),
      payload: { invoiceData },
    };

    await this.eventHandler.emit(event);
    return this.orchestrator.handleWebhook(flowId, 'invoice_created', { invoiceData });
  }

  /**
   * Approve match discrepancy
   */
  async approveMatchDiscrepancy(
    flowId: string,
    approvedBy: string,
    notes?: string,
  ): Promise<P2PFlowInstance> {
    this.logger.log(`Approving match discrepancy for flow ${flowId}`);

    const flow = await this.orchestrator.getFlowStatus(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    if (flow.status !== P2PFlowStatus.WAITING_APPROVAL) {
      throw new Error(`Flow ${flowId} is not waiting for approval`);
    }

    const event: P2PEvent = {
      type: P2PEventType.MATCH_APPROVED,
      flowId,
      tenantId: flow.tenantId,
      timestamp: new Date(),
      payload: {
        approvedBy,
        notes,
        matchId: flow.matchData?.matchId,
      },
    };

    await this.eventHandler.emit(event);
    return this.orchestrator.resumeFlow(flowId);
  }

  /**
   * Handle payment status update
   */
  async handlePaymentUpdate(
    flowId: string,
    paymentData: Partial<P2PPaymentData>,
  ): Promise<P2PFlowInstance> {
    this.logger.log(`Processing payment update for flow ${flowId}`);
    return this.orchestrator.handleWebhook(flowId, 'payment_status_update', paymentData);
  }

  // ============================================
  // Query Operations
  // ============================================

  /**
   * Get flows by status for tenant
   */
  async getFlowsByStatus(tenantId: string, status: P2PFlowStatus): Promise<P2PFlowInstance[]> {
    // This would typically query the database
    // For now, return empty array as flows are in-memory
    this.logger.log(`Getting flows by status ${status} for tenant ${tenantId}`);
    return [];
  }

  /**
   * Get flows requiring approval
   */
  async getFlowsRequiringApproval(tenantId: string): Promise<P2PFlowInstance[]> {
    return this.getFlowsByStatus(tenantId, P2PFlowStatus.WAITING_APPROVAL);
  }

  /**
   * Get failed flows
   */
  async getFailedFlows(tenantId: string): Promise<P2PFlowInstance[]> {
    return this.getFlowsByStatus(tenantId, P2PFlowStatus.FAILED);
  }

  // ============================================
  // Analytics & Reporting
  // ============================================

  /**
   * Get flow statistics for tenant
   */
  async getFlowStatistics(
    tenantId: string,
    _dateRange?: { from: Date; to: Date },
  ): Promise<{
    total: number;
    byStatus: Record<P2PFlowStatus, number>;
    byMatchResult: Record<ThreeWayMatchResult, number>;
    averageDuration: number;
    failureRate: number;
  }> {
    // This would typically aggregate from database
    this.logger.log(`Getting flow statistics for tenant ${tenantId}`);

    return {
      total: 0,
      byStatus: {
        [P2PFlowStatus.PENDING]: 0,
        [P2PFlowStatus.RUNNING]: 0,
        [P2PFlowStatus.PAUSED]: 0,
        [P2PFlowStatus.WAITING_EXTERNAL]: 0,
        [P2PFlowStatus.WAITING_APPROVAL]: 0,
        [P2PFlowStatus.COMPLETED]: 0,
        [P2PFlowStatus.FAILED]: 0,
        [P2PFlowStatus.CANCELLED]: 0,
      },
      byMatchResult: {
        [ThreeWayMatchResult.MATCHED]: 0,
        [ThreeWayMatchResult.QUANTITY_MISMATCH]: 0,
        [ThreeWayMatchResult.PRICE_MISMATCH]: 0,
        [ThreeWayMatchResult.PARTIAL_MATCH]: 0,
        [ThreeWayMatchResult.NOT_MATCHED]: 0,
        [ThreeWayMatchResult.PENDING]: 0,
      },
      averageDuration: 0,
      failureRate: 0,
    };
  }

  /**
   * Get match discrepancy report
   */
  async getMatchDiscrepancyReport(
    tenantId: string,
    _dateRange?: { from: Date; to: Date },
  ): Promise<{
    totalDiscrepancies: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    topVendors: Array<{ vendorId: string; vendorName: string; count: number }>;
    averageResolutionTime: number;
  }> {
    this.logger.log(`Getting match discrepancy report for tenant ${tenantId}`);

    return {
      totalDiscrepancies: 0,
      byType: {},
      bySeverity: {},
      topVendors: [],
      averageResolutionTime: 0,
    };
  }
}
