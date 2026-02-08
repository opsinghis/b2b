import { Injectable, Logger } from '@nestjs/common';
import {
  P2PFlowInstance,
  P2PStepType,
  P2PFlowStatus,
  P2PPurchaseOrderData,
  P2PGoodsReceiptData,
  P2PMatchData,
} from '../interfaces';
import { P2PFlowOrchestratorService } from './p2p-flow-orchestrator.service';

/**
 * P2P Event Types
 */
export enum P2PEventType {
  // PO Events
  PO_RECEIVED = 'p2p.po.received',
  PO_VALIDATED = 'p2p.po.validated',
  PO_ACKNOWLEDGED = 'p2p.po.acknowledged',
  PO_REJECTED = 'p2p.po.rejected',

  // Goods Receipt Events
  GOODS_RECEIPT_CREATED = 'p2p.goods_receipt.created',
  GOODS_RECEIPT_UPDATED = 'p2p.goods_receipt.updated',
  GOODS_RECEIPT_COMPLETED = 'p2p.goods_receipt.completed',

  // Invoice Events
  INVOICE_CREATED = 'p2p.invoice.created',
  INVOICE_SUBMITTED = 'p2p.invoice.submitted',
  INVOICE_APPROVED = 'p2p.invoice.approved',
  INVOICE_REJECTED = 'p2p.invoice.rejected',

  // Matching Events
  MATCH_COMPLETED = 'p2p.match.completed',
  MATCH_DISCREPANCY_FOUND = 'p2p.match.discrepancy_found',
  MATCH_APPROVAL_REQUIRED = 'p2p.match.approval_required',
  MATCH_APPROVED = 'p2p.match.approved',

  // Payment Events
  PAYMENT_SCHEDULED = 'p2p.payment.scheduled',
  PAYMENT_PROCESSING = 'p2p.payment.processing',
  PAYMENT_COMPLETED = 'p2p.payment.completed',
  PAYMENT_FAILED = 'p2p.payment.failed',

  // Flow Events
  FLOW_STARTED = 'p2p.flow.started',
  FLOW_COMPLETED = 'p2p.flow.completed',
  FLOW_FAILED = 'p2p.flow.failed',
  FLOW_PAUSED = 'p2p.flow.paused',
  FLOW_RESUMED = 'p2p.flow.resumed',
}

/**
 * P2P Event Payload
 */
export interface P2PEvent {
  type: P2PEventType;
  flowId?: string;
  tenantId: string;
  timestamp: Date;
  payload: Record<string, unknown>;
}

/**
 * Event Handler Service for P2P flows
 */
@Injectable()
export class P2PEventHandlerService {
  private readonly logger = new Logger(P2PEventHandlerService.name);
  private eventHandlers: Map<P2PEventType, ((event: P2PEvent) => Promise<void>)[]> = new Map();

  constructor(private readonly orchestrator: P2PFlowOrchestratorService) {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    // Register handlers for common events
    this.on(P2PEventType.PO_RECEIVED, this.handlePoReceived.bind(this));
    this.on(P2PEventType.GOODS_RECEIPT_COMPLETED, this.handleGoodsReceiptCompleted.bind(this));
    this.on(P2PEventType.INVOICE_SUBMITTED, this.handleInvoiceSubmitted.bind(this));
    this.on(P2PEventType.MATCH_APPROVED, this.handleMatchApproved.bind(this));
    this.on(P2PEventType.PAYMENT_COMPLETED, this.handlePaymentCompleted.bind(this));
  }

  /**
   * Register event handler
   */
  on(eventType: P2PEventType, handler: (event: P2PEvent) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }

  /**
   * Emit event to all registered handlers
   */
  async emit(event: P2PEvent): Promise<void> {
    this.logger.log(`Emitting event: ${event.type}`);

    const handlers = this.eventHandlers.get(event.type) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Error handling event ${event.type}: ${message}`);
      }
    }
  }

  /**
   * Handle incoming PO
   */
  private async handlePoReceived(event: P2PEvent): Promise<void> {
    this.logger.log(`Handling PO received event`);

    const poData = event.payload.poData as P2PPurchaseOrderData;
    if (!poData) {
      this.logger.warn('No PO data in event payload');
      return;
    }

    // Start new P2P flow
    const flow = await this.orchestrator.startFlow(event.tenantId, poData);
    this.logger.log(`Started P2P flow ${flow.id} for PO ${poData.poNumber}`);
  }

  /**
   * Handle goods receipt completion
   */
  private async handleGoodsReceiptCompleted(event: P2PEvent): Promise<void> {
    this.logger.log(`Handling goods receipt completed event`);

    if (!event.flowId) {
      this.logger.warn('No flow ID in goods receipt event');
      return;
    }

    const receiptData = event.payload.receiptData as P2PGoodsReceiptData;
    await this.orchestrator.handleWebhook(event.flowId, 'goods_receipt_update', {
      receiptData,
    });
  }

  /**
   * Handle invoice submission
   */
  private async handleInvoiceSubmitted(event: P2PEvent): Promise<void> {
    this.logger.log(`Handling invoice submitted event`);

    if (!event.flowId) {
      this.logger.warn('No flow ID in invoice event');
      return;
    }

    await this.orchestrator.handleWebhook(event.flowId, 'invoice_status_update', {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
    });
  }

  /**
   * Handle match approval
   */
  private async handleMatchApproved(event: P2PEvent): Promise<void> {
    this.logger.log(`Handling match approved event`);

    if (!event.flowId) {
      this.logger.warn('No flow ID in match approval event');
      return;
    }

    await this.orchestrator.handleWebhook(event.flowId, 'match_approval', {
      approved: true,
      approvedBy: event.payload.approvedBy as string,
      approvedAt: new Date().toISOString(),
    });

    // Resume flow after approval
    const flow = await this.orchestrator.getFlowStatus(event.flowId);
    if (flow && flow.status === P2PFlowStatus.WAITING_APPROVAL) {
      await this.orchestrator.resumeFlow(event.flowId);
    }
  }

  /**
   * Handle payment completion
   */
  private async handlePaymentCompleted(event: P2PEvent): Promise<void> {
    this.logger.log(`Handling payment completed event`);

    if (!event.flowId) {
      this.logger.warn('No flow ID in payment event');
      return;
    }

    await this.orchestrator.handleWebhook(event.flowId, 'payment_status_update', {
      status: 'paid',
      paidAt: new Date().toISOString(),
      amount: event.payload.amount,
      reference: event.payload.reference,
    });
  }

  /**
   * Create and emit event for flow status change
   */
  async emitFlowStatusChange(flow: P2PFlowInstance, previousStatus: P2PFlowStatus): Promise<void> {
    let eventType: P2PEventType;

    switch (flow.status) {
      case P2PFlowStatus.RUNNING:
        eventType =
          previousStatus === P2PFlowStatus.PAUSED
            ? P2PEventType.FLOW_RESUMED
            : P2PEventType.FLOW_STARTED;
        break;
      case P2PFlowStatus.COMPLETED:
        eventType = P2PEventType.FLOW_COMPLETED;
        break;
      case P2PFlowStatus.FAILED:
        eventType = P2PEventType.FLOW_FAILED;
        break;
      case P2PFlowStatus.PAUSED:
        eventType = P2PEventType.FLOW_PAUSED;
        break;
      default:
        return;
    }

    await this.emit({
      type: eventType,
      flowId: flow.id,
      tenantId: flow.tenantId,
      timestamp: new Date(),
      payload: {
        flowId: flow.id,
        poNumber: flow.poNumber,
        status: flow.status,
        previousStatus,
        currentStep: flow.currentStep,
      },
    });
  }

  /**
   * Create and emit event for step completion
   */
  async emitStepCompleted(
    flow: P2PFlowInstance,
    stepType: P2PStepType,
    output: Record<string, unknown>,
  ): Promise<void> {
    const eventTypeMap: Partial<Record<P2PStepType, P2PEventType>> = {
      [P2PStepType.PO_VALIDATION]: P2PEventType.PO_VALIDATED,
      [P2PStepType.PO_ACKNOWLEDGMENT]: P2PEventType.PO_ACKNOWLEDGED,
      [P2PStepType.GOODS_RECEIPT]: P2PEventType.GOODS_RECEIPT_COMPLETED,
      [P2PStepType.INVOICE_CREATION]: P2PEventType.INVOICE_CREATED,
      [P2PStepType.THREE_WAY_MATCH]: P2PEventType.MATCH_COMPLETED,
      [P2PStepType.INVOICE_SUBMISSION]: P2PEventType.INVOICE_SUBMITTED,
      [P2PStepType.PAYMENT_TRACKING]: P2PEventType.PAYMENT_COMPLETED,
    };

    const eventType = eventTypeMap[stepType];
    if (!eventType) {
      return;
    }

    await this.emit({
      type: eventType,
      flowId: flow.id,
      tenantId: flow.tenantId,
      timestamp: new Date(),
      payload: {
        flowId: flow.id,
        poNumber: flow.poNumber,
        stepType,
        output,
      },
    });
  }

  /**
   * Create and emit event for match discrepancy
   */
  async emitMatchDiscrepancy(flow: P2PFlowInstance, matchData: P2PMatchData): Promise<void> {
    if (matchData.requiresApproval) {
      await this.emit({
        type: P2PEventType.MATCH_APPROVAL_REQUIRED,
        flowId: flow.id,
        tenantId: flow.tenantId,
        timestamp: new Date(),
        payload: {
          flowId: flow.id,
          poNumber: flow.poNumber,
          matchId: matchData.matchId,
          status: matchData.status,
          discrepancies: matchData.discrepancies,
        },
      });
    } else if (matchData.discrepancies.length > 0) {
      await this.emit({
        type: P2PEventType.MATCH_DISCREPANCY_FOUND,
        flowId: flow.id,
        tenantId: flow.tenantId,
        timestamp: new Date(),
        payload: {
          flowId: flow.id,
          poNumber: flow.poNumber,
          matchId: matchData.matchId,
          discrepancies: matchData.discrepancies,
        },
      });
    }
  }
}
