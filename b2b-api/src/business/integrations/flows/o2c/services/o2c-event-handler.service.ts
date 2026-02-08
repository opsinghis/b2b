import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ORDER_EVENTS, INVOICE_EVENTS, EventType } from '@business/integrations/events/interfaces';
import { O2CFlowOrchestratorService } from './o2c-flow-orchestrator.service';
import { O2CFlowConfigService } from './o2c-flow-config.service';
import { O2CFlowLogService } from './o2c-flow-log.service';
import { O2C_FLOW_EVENTS } from '../interfaces';

/**
 * Handles events that trigger or affect O2C flows
 */
@Injectable()
export class O2CEventHandlerService implements OnModuleInit {
  private readonly logger = new Logger(O2CEventHandlerService.name);

  // Event subscription callbacks (would be registered with EventSubscriberService)
  private subscriptionCallbacks: Map<string, (event: any) => Promise<void>> = new Map();

  constructor(
    private readonly orchestrator: O2CFlowOrchestratorService,
    private readonly configService: O2CFlowConfigService,
    private readonly logService: O2CFlowLogService,
  ) {}

  onModuleInit() {
    // Register event callbacks on orchestrator for publishing O2C events
    this.orchestrator.onEvent(async (eventType, payload) => {
      await this.handleO2CFlowEvent(eventType, payload);
    });

    this.logger.log('O2C Event Handler initialized');
  }

  /**
   * Register with the event subscriber service
   * This would be called during module initialization
   */
  registerEventSubscriptions(
    subscribe: (events: EventType[], handler: (event: any) => Promise<void>) => string,
  ): void {
    // Subscribe to order events
    subscribe([ORDER_EVENTS.ORDER_CREATED as EventType], async (event) =>
      this.handleOrderCreated(event),
    );

    subscribe([ORDER_EVENTS.ORDER_CANCELLED as EventType], async (event) =>
      this.handleOrderCancelled(event),
    );

    // Subscribe to invoice events for status updates
    subscribe(
      [INVOICE_EVENTS.INVOICE_PAID as EventType, INVOICE_EVENTS.INVOICE_PARTIAL_PAID as EventType],
      async (event) => this.handleInvoicePaid(event),
    );

    this.logger.log('Registered O2C event subscriptions');
  }

  /**
   * Handle ORDER_CREATED event - starts O2C flow
   */
  async handleOrderCreated(event: {
    id: string;
    tenantId: string;
    payload: { orderId: string; orderNumber: string; total: number; userId: string };
    correlationId?: string;
  }): Promise<void> {
    this.logger.log(`Handling ORDER_CREATED event for order ${event.payload.orderId}`);

    try {
      // Check if O2C flow is enabled for this tenant
      const config = await this.configService.getConfig(event.tenantId);
      if (!config.enabled) {
        this.logger.log(`O2C flow disabled for tenant ${event.tenantId}, skipping`);
        return;
      }

      // Start O2C flow
      const flow = await this.orchestrator.startFlow(event.payload.orderId, event.tenantId, {
        correlationId: event.correlationId,
        metadata: {
          triggerEvent: event.id,
          orderNumber: event.payload.orderNumber,
        },
      });

      this.logger.log(`Started O2C flow ${flow.id} for order ${event.payload.orderId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to start O2C flow for order ${event.payload.orderId}: ${message}`);
    }
  }

  /**
   * Handle ORDER_CANCELLED event - cancels active O2C flow
   */
  async handleOrderCancelled(event: {
    id: string;
    tenantId: string;
    payload: { orderId: string; orderNumber: string; reason?: string };
  }): Promise<void> {
    this.logger.log(`Handling ORDER_CANCELLED event for order ${event.payload.orderId}`);

    try {
      const flow = await this.orchestrator.getFlowByOrder(event.payload.orderId);
      if (!flow) {
        this.logger.log(`No active O2C flow found for cancelled order ${event.payload.orderId}`);
        return;
      }

      if (flow.status === 'completed' || flow.status === 'cancelled') {
        this.logger.log(`O2C flow ${flow.id} already in terminal state: ${flow.status}`);
        return;
      }

      await this.orchestrator.cancelFlow(flow.id, event.payload.reason || 'Order cancelled');

      this.logger.log(`Cancelled O2C flow ${flow.id} due to order cancellation`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to cancel O2C flow for order ${event.payload.orderId}: ${message}`);
    }
  }

  /**
   * Handle invoice payment events
   */
  async handleInvoicePaid(event: {
    id: string;
    tenantId: string;
    payload: { invoiceId: string; orderId?: string; amount: number };
  }): Promise<void> {
    this.logger.log(`Handling invoice payment event for invoice ${event.payload.invoiceId}`);

    // If orderId is provided, update the flow
    if (event.payload.orderId) {
      const flow = await this.orchestrator.getFlowByOrder(event.payload.orderId);
      if (flow && flow.paymentData) {
        // Update payment data
        flow.paymentData.amount = event.payload.amount;
        this.logger.log(`Updated payment amount in O2C flow ${flow.id}`);
      }
    }
  }

  /**
   * Handle O2C flow events for publishing to event bus
   */
  private async handleO2CFlowEvent(eventType: string, payload: unknown): Promise<void> {
    this.logger.debug(`O2C flow event: ${eventType}`, payload);

    // These events would be published to the event bus
    // In production, this would call EventPublisherService.publish()
    switch (eventType) {
      case O2C_FLOW_EVENTS.FLOW_STARTED:
        this.logger.log(`Flow started: ${(payload as any).flowId}`);
        break;

      case O2C_FLOW_EVENTS.FLOW_COMPLETED:
        this.logger.log(`Flow completed: ${(payload as any).flowId}`);
        break;

      case O2C_FLOW_EVENTS.FLOW_FAILED:
        this.logger.warn(`Flow failed: ${(payload as any).flowId} - ${(payload as any).error}`);
        break;

      case O2C_FLOW_EVENTS.CREDIT_REJECTED:
        this.logger.warn(`Credit rejected for flow: ${(payload as any).flowId}`);
        break;

      case O2C_FLOW_EVENTS.PAYMENT_FAILED:
        this.logger.warn(`Payment failed for flow: ${(payload as any).flowId}`);
        break;
    }
  }

  /**
   * Process incoming webhook for order status from external system
   */
  async handleOrderStatusWebhook(
    tenantId: string,
    externalOrderId: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.orchestrator.processOrderStatusWebhook(tenantId, externalOrderId, status, metadata);
  }

  /**
   * Process incoming webhook for shipment from external system
   */
  async handleShipmentWebhook(
    tenantId: string,
    externalShipmentId: string,
    status: string,
    trackingNumber?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.orchestrator.processShipmentWebhook(
      tenantId,
      externalShipmentId,
      status,
      trackingNumber,
      metadata,
    );
  }

  /**
   * Process incoming webhook for payment from external system
   */
  async handlePaymentWebhook(
    tenantId: string,
    externalPaymentId: string,
    status: string,
    amount?: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.orchestrator.processPaymentWebhook(
      tenantId,
      externalPaymentId,
      status,
      amount,
      metadata,
    );
  }
}
