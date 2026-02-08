import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  O2CFlowInstance,
  O2CFlowStatus,
  O2CStepType,
  O2CStepExecution,
  StepStatus,
  O2CFlowConfig,
  O2CStepConfig,
  O2CStepResult,
  O2CStepContext,
  O2COrderData,
  O2CFlowStats,
  StepStats,
  StartFlowOptions,
  ListFlowsOptions,
  IO2CFlowOrchestrator,
  IO2CStepHandler,
  DEFAULT_O2C_FLOW_CONFIG,
  O2C_FLOW_EVENTS,
  O2CFlowStartedPayload,
  O2CFlowCompletedPayload,
  O2CFlowFailedPayload,
  O2CStepEventPayload,
  OrderWithItems,
} from '../interfaces';
import { O2CFlowConfigService } from './o2c-flow-config.service';
import { O2CFlowLogService } from './o2c-flow-log.service';
import { O2COrderSyncStep } from './steps/o2c-order-sync.step';
import { O2CCreditCheckStep } from './steps/o2c-credit-check.step';
import { O2COrderConfirmationStep } from './steps/o2c-order-confirmation.step';
import { O2CInventoryReservationStep } from './steps/o2c-inventory-reservation.step';
import { O2CFulfillmentStep } from './steps/o2c-fulfillment.step';
import { O2CShipmentSyncStep } from './steps/o2c-shipment-sync.step';
import { O2CAsnGenerationStep } from './steps/o2c-asn-generation.step';
import { O2CInvoiceGenerationStep } from './steps/o2c-invoice-generation.step';
import { O2CInvoiceSyncStep } from './steps/o2c-invoice-sync.step';
import { O2CPaymentProcessingStep } from './steps/o2c-payment-processing.step';
import { O2CPaymentStatusSyncStep } from './steps/o2c-payment-status-sync.step';
import { O2COrderCompletionStep } from './steps/o2c-order-completion.step';

@Injectable()
export class O2CFlowOrchestratorService implements IO2CFlowOrchestrator, OnModuleInit {
  private readonly logger = new Logger(O2CFlowOrchestratorService.name);

  // In-memory storage for flow instances (replace with DB in production)
  private readonly flows = new Map<string, O2CFlowInstance>();
  private readonly flowsByOrder = new Map<string, string>(); // orderId -> flowId

  // Step handlers registry
  private readonly stepHandlers = new Map<O2CStepType, IO2CStepHandler>();

  // Event callbacks (for publishing events)
  private eventCallbacks: ((eventType: string, payload: unknown) => Promise<void>)[] = [];

  constructor(
    private readonly configService: O2CFlowConfigService,
    private readonly logService: O2CFlowLogService,
    private readonly orderSyncStep: O2COrderSyncStep,
    private readonly creditCheckStep: O2CCreditCheckStep,
    private readonly orderConfirmationStep: O2COrderConfirmationStep,
    private readonly inventoryReservationStep: O2CInventoryReservationStep,
    private readonly fulfillmentStep: O2CFulfillmentStep,
    private readonly shipmentSyncStep: O2CShipmentSyncStep,
    private readonly asnGenerationStep: O2CAsnGenerationStep,
    private readonly invoiceGenerationStep: O2CInvoiceGenerationStep,
    private readonly invoiceSyncStep: O2CInvoiceSyncStep,
    private readonly paymentProcessingStep: O2CPaymentProcessingStep,
    private readonly paymentStatusSyncStep: O2CPaymentStatusSyncStep,
    private readonly orderCompletionStep: O2COrderCompletionStep,
  ) {}

  onModuleInit() {
    // Register all step handlers
    this.registerStepHandler(this.orderSyncStep);
    this.registerStepHandler(this.creditCheckStep);
    this.registerStepHandler(this.orderConfirmationStep);
    this.registerStepHandler(this.inventoryReservationStep);
    this.registerStepHandler(this.fulfillmentStep);
    this.registerStepHandler(this.shipmentSyncStep);
    this.registerStepHandler(this.asnGenerationStep);
    this.registerStepHandler(this.invoiceGenerationStep);
    this.registerStepHandler(this.invoiceSyncStep);
    this.registerStepHandler(this.paymentProcessingStep);
    this.registerStepHandler(this.paymentStatusSyncStep);
    this.registerStepHandler(this.orderCompletionStep);

    this.logger.log(`Registered ${this.stepHandlers.size} O2C step handlers`);
  }

  /**
   * Register an event callback
   */
  onEvent(callback: (eventType: string, payload: unknown) => Promise<void>): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * Start a new O2C flow for an order
   */
  async startFlow(
    orderId: string,
    tenantId: string,
    options?: StartFlowOptions,
  ): Promise<O2CFlowInstance> {
    // Check if flow already exists for this order
    const existingFlowId = this.flowsByOrder.get(orderId);
    if (existingFlowId) {
      const existingFlow = this.flows.get(existingFlowId);
      if (existingFlow && !this.isTerminalStatus(existingFlow.status)) {
        throw new Error(`Flow already exists for order ${orderId}: ${existingFlowId}`);
      }
    }

    // Get flow configuration
    const config = await this.configService.getConfig(tenantId, options?.configId);
    if (!config.enabled) {
      throw new Error(`O2C flow is disabled for tenant ${tenantId}`);
    }

    const flowId = uuidv4();
    const correlationId = options?.correlationId || uuidv4();

    // Create flow instance
    const flow: O2CFlowInstance = {
      id: flowId,
      tenantId,
      configId: config.tenantId, // Use config's ID
      orderId,
      orderNumber: '', // Will be populated when order is loaded
      status: O2CFlowStatus.PENDING,
      steps: [],
      orderData: {} as O2COrderData, // Will be populated in first step
      errorCount: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      correlationId,
      metadata: options?.metadata,
    };

    // Store flow
    this.flows.set(flowId, flow);
    this.flowsByOrder.set(orderId, flowId);

    await this.logService.log(flow, 'info', 'Flow created', { options });

    // Start execution
    this.executeFlow(flow, config).catch((error) => {
      this.logger.error(`Flow execution error: ${error.message}`, error.stack);
    });

    return flow;
  }

  /**
   * Get flow by ID
   */
  async getFlow(flowId: string): Promise<O2CFlowInstance | null> {
    return this.flows.get(flowId) || null;
  }

  /**
   * Get flow by order ID
   */
  async getFlowByOrder(orderId: string): Promise<O2CFlowInstance | null> {
    const flowId = this.flowsByOrder.get(orderId);
    if (!flowId) return null;
    return this.flows.get(flowId) || null;
  }

  /**
   * Pause a running flow
   */
  async pauseFlow(flowId: string, reason?: string): Promise<O2CFlowInstance> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    if (flow.status !== O2CFlowStatus.RUNNING) {
      throw new Error(`Cannot pause flow in status: ${flow.status}`);
    }

    flow.status = O2CFlowStatus.PAUSED;
    flow.lastActivityAt = new Date();
    flow.metadata = { ...flow.metadata, pauseReason: reason };

    await this.logService.log(flow, 'info', `Flow paused: ${reason || 'Manual pause'}`);

    return flow;
  }

  /**
   * Resume a paused flow
   */
  async resumeFlow(flowId: string): Promise<O2CFlowInstance> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    if (flow.status !== O2CFlowStatus.PAUSED) {
      throw new Error(`Cannot resume flow in status: ${flow.status}`);
    }

    const config = await this.configService.getConfig(flow.tenantId);

    flow.status = O2CFlowStatus.RUNNING;
    flow.lastActivityAt = new Date();
    delete flow.metadata?.pauseReason;

    await this.logService.log(flow, 'info', 'Flow resumed');

    // Continue execution from current step
    this.executeFlow(flow, config).catch((error) => {
      this.logger.error(`Flow resume error: ${error.message}`, error.stack);
    });

    return flow;
  }

  /**
   * Cancel a flow
   */
  async cancelFlow(flowId: string, reason?: string): Promise<O2CFlowInstance> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    if (this.isTerminalStatus(flow.status)) {
      throw new Error(`Cannot cancel flow in terminal status: ${flow.status}`);
    }

    flow.status = O2CFlowStatus.CANCELLED;
    flow.completedAt = new Date();
    flow.lastActivityAt = new Date();
    flow.metadata = { ...flow.metadata, cancellationReason: reason };

    await this.logService.log(flow, 'info', `Flow cancelled: ${reason || 'Manual cancellation'}`);

    await this.emitEvent(O2C_FLOW_EVENTS.FLOW_CANCELLED, {
      flowId: flow.id,
      orderId: flow.orderId,
      orderNumber: flow.orderNumber,
      tenantId: flow.tenantId,
      reason,
    });

    return flow;
  }

  /**
   * Retry a specific step
   */
  async retryStep(flowId: string, stepType: O2CStepType): Promise<O2CFlowInstance> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    if (flow.status !== O2CFlowStatus.FAILED && flow.status !== O2CFlowStatus.PAUSED) {
      throw new Error(`Cannot retry step in flow status: ${flow.status}`);
    }

    const config = await this.configService.getConfig(flow.tenantId);

    // Reset flow to running and set current step
    flow.status = O2CFlowStatus.RUNNING;
    flow.currentStep = stepType;
    flow.lastActivityAt = new Date();

    await this.logService.log(flow, 'info', `Retrying step: ${stepType}`);

    // Execute from the specified step
    this.executeFlowFromStep(flow, config, stepType).catch((error) => {
      this.logger.error(`Flow retry error: ${error.message}`, error.stack);
    });

    return flow;
  }

  /**
   * List flows for a tenant
   */
  async listFlows(tenantId: string, options?: ListFlowsOptions): Promise<O2CFlowInstance[]> {
    let flows = Array.from(this.flows.values()).filter((f) => f.tenantId === tenantId);

    // Apply filters
    if (options?.status?.length) {
      flows = flows.filter((f) => options.status!.includes(f.status));
    }

    if (options?.fromDate) {
      flows = flows.filter((f) => f.startedAt >= options.fromDate!);
    }

    if (options?.toDate) {
      flows = flows.filter((f) => f.startedAt <= options.toDate!);
    }

    // Sort
    const orderBy = options?.orderBy || 'createdAt';
    const orderDir = options?.orderDir || 'desc';
    flows.sort((a, b) => {
      const aVal =
        orderBy === 'createdAt'
          ? a.startedAt
          : orderBy === 'updatedAt'
            ? a.lastActivityAt
            : a.status;
      const bVal =
        orderBy === 'createdAt'
          ? b.startedAt
          : orderBy === 'updatedAt'
            ? b.lastActivityAt
            : b.status;
      if (aVal < bVal) return orderDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return orderDir === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    return flows.slice(offset, offset + limit);
  }

  /**
   * Get flow statistics
   */
  async getFlowStats(tenantId: string, period = 'day'): Promise<O2CFlowStats> {
    const flows = Array.from(this.flows.values()).filter((f) => f.tenantId === tenantId);

    const stats: O2CFlowStats = {
      tenantId,
      period,
      totalFlows: flows.length,
      completedFlows: flows.filter((f) => f.status === O2CFlowStatus.COMPLETED).length,
      failedFlows: flows.filter((f) => f.status === O2CFlowStatus.FAILED).length,
      cancelledFlows: flows.filter((f) => f.status === O2CFlowStatus.CANCELLED).length,
      runningFlows: flows.filter((f) => f.status === O2CFlowStatus.RUNNING).length,
      avgDurationMs: 0,
      successRate: 0,
      stepStats: {} as Record<O2CStepType, StepStats>,
    };

    // Calculate average duration for completed flows
    const completedFlows = flows.filter((f) => f.completedAt);
    if (completedFlows.length > 0) {
      const totalDuration = completedFlows.reduce(
        (sum, f) => sum + (f.completedAt!.getTime() - f.startedAt.getTime()),
        0,
      );
      stats.avgDurationMs = Math.round(totalDuration / completedFlows.length);
    }

    // Calculate success rate
    const terminalFlows = stats.completedFlows + stats.failedFlows;
    if (terminalFlows > 0) {
      stats.successRate = Math.round((stats.completedFlows / terminalFlows) * 100);
    }

    // Calculate step stats
    for (const stepType of Object.values(O2CStepType)) {
      const stepExecs = flows.flatMap((f) => f.steps.filter((s) => s.stepType === stepType));
      const completedSteps = stepExecs.filter((s) => s.status === StepStatus.COMPLETED);
      const failedSteps = stepExecs.filter((s) => s.status === StepStatus.FAILED);

      let avgStepDuration = 0;
      if (completedSteps.length > 0) {
        const totalStepDuration = completedSteps.reduce((sum, s) => sum + (s.durationMs || 0), 0);
        avgStepDuration = Math.round(totalStepDuration / completedSteps.length);
      }

      stats.stepStats[stepType] = {
        total: stepExecs.length,
        completed: completedSteps.length,
        failed: failedSteps.length,
        avgDurationMs: avgStepDuration,
        successRate:
          stepExecs.length > 0 ? Math.round((completedSteps.length / stepExecs.length) * 100) : 0,
      };
    }

    return stats;
  }

  /**
   * Process incoming webhook for order status
   */
  async processOrderStatusWebhook(
    tenantId: string,
    externalOrderId: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Find flow by external order ID
    const flow = Array.from(this.flows.values()).find(
      (f) => f.tenantId === tenantId && f.externalOrderId === externalOrderId,
    );

    if (!flow) {
      this.logger.warn(`No flow found for external order: ${externalOrderId}`);
      return;
    }

    await this.logService.log(flow, 'info', `Order status webhook received: ${status}`, {
      metadata,
    });

    // Update flow based on status and potentially advance steps
    // This would trigger step execution if waiting for external status
    if (flow.status === O2CFlowStatus.WAITING_EXTERNAL) {
      const config = await this.configService.getConfig(flow.tenantId);
      flow.status = O2CFlowStatus.RUNNING;
      this.executeFlow(flow, config).catch((error) => {
        this.logger.error(`Flow webhook processing error: ${error.message}`, error.stack);
      });
    }
  }

  /**
   * Process incoming webhook for shipment
   */
  async processShipmentWebhook(
    tenantId: string,
    externalShipmentId: string,
    status: string,
    trackingNumber?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const flow = Array.from(this.flows.values()).find(
      (f) => f.tenantId === tenantId && f.externalShipmentId === externalShipmentId,
    );

    if (!flow) {
      this.logger.warn(`No flow found for external shipment: ${externalShipmentId}`);
      return;
    }

    await this.logService.log(flow, 'info', `Shipment webhook received: ${status}`, {
      trackingNumber,
      metadata,
    });

    // Update shipment data
    if (flow.shipmentData) {
      flow.shipmentData.trackingNumber = trackingNumber || flow.shipmentData.trackingNumber;
    }

    // Resume flow if waiting
    if (flow.status === O2CFlowStatus.WAITING_EXTERNAL) {
      const config = await this.configService.getConfig(flow.tenantId);
      flow.status = O2CFlowStatus.RUNNING;
      this.executeFlow(flow, config).catch((error) => {
        this.logger.error(`Flow shipment webhook error: ${error.message}`, error.stack);
      });
    }
  }

  /**
   * Process incoming webhook for payment
   */
  async processPaymentWebhook(
    tenantId: string,
    externalPaymentId: string,
    status: string,
    amount?: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const flow = Array.from(this.flows.values()).find(
      (f) => f.tenantId === tenantId && f.externalPaymentId === externalPaymentId,
    );

    if (!flow) {
      this.logger.warn(`No flow found for external payment: ${externalPaymentId}`);
      return;
    }

    await this.logService.log(flow, 'info', `Payment webhook received: ${status}`, {
      amount,
      metadata,
    });

    // Resume flow if waiting
    if (flow.status === O2CFlowStatus.WAITING_EXTERNAL) {
      const config = await this.configService.getConfig(flow.tenantId);
      flow.status = O2CFlowStatus.RUNNING;
      this.executeFlow(flow, config).catch((error) => {
        this.logger.error(`Flow payment webhook error: ${error.message}`, error.stack);
      });
    }
  }

  // ==========================================
  // Private Methods
  // ==========================================

  private registerStepHandler(handler: IO2CStepHandler): void {
    this.stepHandlers.set(handler.stepType, handler);
  }

  private async executeFlow(flow: O2CFlowInstance, config: O2CFlowConfig): Promise<void> {
    flow.status = O2CFlowStatus.RUNNING;
    flow.lastActivityAt = new Date();

    // Emit flow started event
    await this.emitEvent(O2C_FLOW_EVENTS.FLOW_STARTED, {
      flowId: flow.id,
      orderId: flow.orderId,
      orderNumber: flow.orderNumber,
      tenantId: flow.tenantId,
      configId: flow.configId,
      orderTotal: flow.orderData?.total || 0,
      currency: flow.orderData?.currency || 'USD',
    } as O2CFlowStartedPayload);

    // Get enabled steps in order
    const enabledSteps = config.steps.filter((s) => s.enabled).sort((a, b) => a.order - b.order);

    // Find starting step
    const startStepIndex = flow.currentStep
      ? enabledSteps.findIndex((s) => s.stepType === flow.currentStep)
      : 0;

    // Execute steps sequentially
    for (let i = startStepIndex; i < enabledSteps.length; i++) {
      const stepConfig = enabledSteps[i];

      // Check if flow was paused or cancelled
      if (flow.status !== O2CFlowStatus.RUNNING) {
        await this.logService.log(
          flow,
          'info',
          `Flow execution interrupted at step ${stepConfig.stepType}`,
        );
        return;
      }

      flow.currentStep = stepConfig.stepType;
      flow.lastActivityAt = new Date();

      const result = await this.executeStep(flow, stepConfig, config);

      if (!result.success) {
        // Handle step failure
        flow.status = O2CFlowStatus.FAILED;
        flow.lastError = result.error;
        flow.errorCount++;

        await this.emitEvent(O2C_FLOW_EVENTS.FLOW_FAILED, {
          flowId: flow.id,
          orderId: flow.orderId,
          orderNumber: flow.orderNumber,
          tenantId: flow.tenantId,
          failedStep: stepConfig.stepType,
          error: result.error || 'Unknown error',
          errorCode: result.errorCode,
          retryable: result.retryable || false,
          attempt: this.getStepAttemptCount(flow, stepConfig.stepType),
        } as O2CFlowFailedPayload);

        return;
      }

      // Handle skip to specific step
      if (result.skipToStep) {
        const skipIndex = enabledSteps.findIndex((s) => s.stepType === result.skipToStep);
        if (skipIndex > i) {
          i = skipIndex - 1; // Will be incremented by loop
          await this.logService.log(flow, 'info', `Skipping to step: ${result.skipToStep}`);
        }
      }
    }

    // All steps completed
    flow.status = O2CFlowStatus.COMPLETED;
    flow.completedAt = new Date();
    flow.currentStep = undefined;

    const durationMs = flow.completedAt.getTime() - flow.startedAt.getTime();

    await this.logService.log(flow, 'info', `Flow completed successfully in ${durationMs}ms`);

    await this.emitEvent(O2C_FLOW_EVENTS.FLOW_COMPLETED, {
      flowId: flow.id,
      orderId: flow.orderId,
      orderNumber: flow.orderNumber,
      tenantId: flow.tenantId,
      externalOrderId: flow.externalOrderId,
      externalInvoiceId: flow.externalInvoiceId,
      externalPaymentId: flow.externalPaymentId,
      durationMs,
      stepsCompleted: flow.steps.filter((s) => s.status === StepStatus.COMPLETED).length,
    } as O2CFlowCompletedPayload);
  }

  private async executeFlowFromStep(
    flow: O2CFlowInstance,
    config: O2CFlowConfig,
    startStep: O2CStepType,
  ): Promise<void> {
    flow.currentStep = startStep;
    await this.executeFlow(flow, config);
  }

  private async executeStep(
    flow: O2CFlowInstance,
    stepConfig: O2CStepConfig,
    flowConfig: O2CFlowConfig,
  ): Promise<O2CStepResult> {
    const handler = this.stepHandlers.get(stepConfig.stepType);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for step: ${stepConfig.stepType}`,
        retryable: false,
      };
    }

    // Check step conditions
    if (stepConfig.conditions?.length) {
      const conditionsMet = this.evaluateConditions(flow, stepConfig.conditions);
      if (!conditionsMet) {
        await this.logService.log(
          flow,
          'info',
          `Step ${stepConfig.stepType} skipped: conditions not met`,
        );
        return { success: true, output: { skipped: true } };
      }
    }

    // Create step execution record
    const stepExecution: O2CStepExecution = {
      stepType: stepConfig.stepType,
      status: StepStatus.RUNNING,
      attempt: this.getStepAttemptCount(flow, stepConfig.stepType) + 1,
      startedAt: new Date(),
    };

    flow.steps.push(stepExecution);

    await this.emitEvent(O2C_FLOW_EVENTS.STEP_STARTED, {
      flowId: flow.id,
      orderId: flow.orderId,
      stepType: stepConfig.stepType,
      status: StepStatus.RUNNING,
      attempt: stepExecution.attempt,
    } as O2CStepEventPayload);

    try {
      // Build step context
      const context: O2CStepContext = {
        tenantId: flow.tenantId,
        correlationId: flow.correlationId,
        previousStepOutput: this.getPreviousStepOutput(flow),
        metadata: flow.metadata,
      };

      // Execute with timeout
      const timeoutMs = stepConfig.timeout || flowConfig.settings.defaultTimeoutMs;
      const result = await this.executeWithTimeout(
        handler.execute(flow, stepConfig, context),
        timeoutMs,
      );

      stepExecution.completedAt = new Date();
      stepExecution.durationMs =
        stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
      stepExecution.output = result.output;

      if (result.success) {
        stepExecution.status = StepStatus.COMPLETED;

        await this.emitEvent(O2C_FLOW_EVENTS.STEP_COMPLETED, {
          flowId: flow.id,
          orderId: flow.orderId,
          stepType: stepConfig.stepType,
          status: StepStatus.COMPLETED,
          attempt: stepExecution.attempt,
          durationMs: stepExecution.durationMs,
          output: result.output,
        } as O2CStepEventPayload);
      } else {
        stepExecution.status = StepStatus.FAILED;
        stepExecution.error = result.error;
        stepExecution.errorCode = result.errorCode;
        stepExecution.retryable = result.retryable;

        await this.logService.log(
          flow,
          'error',
          `Step ${stepConfig.stepType} failed: ${result.error}`,
          { errorCode: result.errorCode },
        );

        await this.emitEvent(O2C_FLOW_EVENTS.STEP_FAILED, {
          flowId: flow.id,
          orderId: flow.orderId,
          stepType: stepConfig.stepType,
          status: StepStatus.FAILED,
          attempt: stepExecution.attempt,
          error: result.error,
        } as O2CStepEventPayload);

        // Check if we should retry
        if (result.retryable && stepConfig.retryPolicy) {
          const shouldRetry = stepExecution.attempt < stepConfig.retryPolicy.maxAttempts;
          if (shouldRetry) {
            const delay = this.calculateRetryDelay(stepExecution.attempt, stepConfig.retryPolicy);
            await this.logService.log(flow, 'info', `Retrying step in ${delay}ms`);
            await this.delay(delay);
            return this.executeStep(flow, stepConfig, flowConfig);
          }
        }
      }

      return result;
    } catch (error) {
      stepExecution.completedAt = new Date();
      stepExecution.durationMs =
        stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
      stepExecution.status = StepStatus.FAILED;
      stepExecution.error = error instanceof Error ? error.message : 'Unknown error';

      await this.logService.log(
        flow,
        'error',
        `Step ${stepConfig.stepType} exception: ${stepExecution.error}`,
      );

      return {
        success: false,
        error: stepExecution.error,
        retryable: false,
      };
    }
  }

  private evaluateConditions(
    flow: O2CFlowInstance,
    conditions: { field: string; operator: string; value: unknown }[],
  ): boolean {
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(flow, condition.field);
      const condMet = this.evaluateCondition(fieldValue, condition.operator, condition.value);
      if (!condMet) return false;
    }
    return true;
  }

  private getFieldValue(flow: O2CFlowInstance, field: string): unknown {
    const parts = field.split('.');
    let value: unknown = flow;
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  }

  private evaluateCondition(
    fieldValue: unknown,
    operator: string,
    conditionValue: unknown,
  ): boolean {
    switch (operator) {
      case 'eq':
        return fieldValue === conditionValue;
      case 'ne':
        return fieldValue !== conditionValue;
      case 'gt':
        return (fieldValue as number) > (conditionValue as number);
      case 'gte':
        return (fieldValue as number) >= (conditionValue as number);
      case 'lt':
        return (fieldValue as number) < (conditionValue as number);
      case 'lte':
        return (fieldValue as number) <= (conditionValue as number);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'notIn':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(String(conditionValue));
      default:
        return true;
    }
  }

  private getStepAttemptCount(flow: O2CFlowInstance, stepType: O2CStepType): number {
    return flow.steps.filter((s) => s.stepType === stepType).length;
  }

  private getPreviousStepOutput(flow: O2CFlowInstance): Record<string, unknown> | undefined {
    const completedSteps = flow.steps.filter((s) => s.status === StepStatus.COMPLETED);
    if (completedSteps.length === 0) return undefined;
    return completedSteps[completedSteps.length - 1].output;
  }

  private calculateRetryDelay(
    attempt: number,
    policy: { initialDelayMs: number; maxDelayMs: number; backoffMultiplier: number },
  ): number {
    const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
    return Math.min(delay, policy.maxDelayMs);
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Step execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private isTerminalStatus(status: O2CFlowStatus): boolean {
    return [O2CFlowStatus.COMPLETED, O2CFlowStatus.FAILED, O2CFlowStatus.CANCELLED].includes(
      status,
    );
  }

  private async emitEvent(eventType: string, payload: unknown): Promise<void> {
    for (const callback of this.eventCallbacks) {
      try {
        await callback(eventType, payload);
      } catch (error) {
        this.logger.error(`Event callback error: ${error}`);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
