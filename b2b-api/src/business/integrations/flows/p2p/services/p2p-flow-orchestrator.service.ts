import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  IP2PStepHandler,
  P2PFlowInstance,
  P2PFlowConfig,
  P2PFlowStatus,
  P2PStepType,
  P2PStepConfig,
  P2PStepContext,
  P2PStepResult,
  P2PStepExecution,
  StepStatus,
  P2PPurchaseOrderData,
  ConnectorExecutionContext,
} from '../interfaces';
import { P2PFlowConfigService } from './p2p-flow-config.service';
import { P2PFlowLogService } from './p2p-flow-log.service';
import {
  P2PPOReceiptStep,
  P2PPOValidationStep,
  P2PPOAcknowledgmentStep,
  P2PGoodsReceiptStep,
  P2PInvoiceCreationStep,
  P2PThreeWayMatchStep,
  P2PInvoiceSubmissionStep,
  P2PPaymentTrackingStep,
  P2PFlowCompletionStep,
} from './steps';

/**
 * P2P Flow Orchestrator Service
 * Manages the execution of Procure-to-Pay flows
 */
@Injectable()
export class P2PFlowOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(P2PFlowOrchestratorService.name);
  private stepHandlers: Map<P2PStepType, IP2PStepHandler> = new Map();
  private activeFlows: Map<string, P2PFlowInstance> = new Map();

  constructor(
    private readonly configService: P2PFlowConfigService,
    private readonly logService: P2PFlowLogService,
    private readonly poReceiptStep: P2PPOReceiptStep,
    private readonly poValidationStep: P2PPOValidationStep,
    private readonly poAcknowledgmentStep: P2PPOAcknowledgmentStep,
    private readonly goodsReceiptStep: P2PGoodsReceiptStep,
    private readonly invoiceCreationStep: P2PInvoiceCreationStep,
    private readonly threeWayMatchStep: P2PThreeWayMatchStep,
    private readonly invoiceSubmissionStep: P2PInvoiceSubmissionStep,
    private readonly paymentTrackingStep: P2PPaymentTrackingStep,
    private readonly flowCompletionStep: P2PFlowCompletionStep,
  ) {}

  onModuleInit() {
    this.registerStepHandlers();
  }

  private registerStepHandlers(): void {
    this.stepHandlers.set(P2PStepType.PO_RECEIPT, this.poReceiptStep);
    this.stepHandlers.set(P2PStepType.PO_VALIDATION, this.poValidationStep);
    this.stepHandlers.set(P2PStepType.PO_ACKNOWLEDGMENT, this.poAcknowledgmentStep);
    this.stepHandlers.set(P2PStepType.GOODS_RECEIPT, this.goodsReceiptStep);
    this.stepHandlers.set(P2PStepType.INVOICE_CREATION, this.invoiceCreationStep);
    this.stepHandlers.set(P2PStepType.THREE_WAY_MATCH, this.threeWayMatchStep);
    this.stepHandlers.set(P2PStepType.INVOICE_SUBMISSION, this.invoiceSubmissionStep);
    this.stepHandlers.set(P2PStepType.PAYMENT_TRACKING, this.paymentTrackingStep);
    this.stepHandlers.set(P2PStepType.FLOW_COMPLETION, this.flowCompletionStep);

    this.logger.log(`Registered ${this.stepHandlers.size} P2P step handlers`);
  }

  async startFlow(
    tenantId: string,
    poData: P2PPurchaseOrderData,
    options?: { configOverrides?: Partial<P2PFlowConfig> },
  ): Promise<P2PFlowInstance> {
    this.logger.log(`Starting P2P flow for PO ${poData.poNumber} (tenant: ${tenantId})`);

    // Get configuration for tenant
    const config = await this.configService.getConfig(tenantId);
    const mergedConfig = this.mergeConfig(config, options?.configOverrides);

    // Create flow instance
    const flowId = uuidv4();
    const flow: P2PFlowInstance = {
      id: flowId,
      tenantId,
      configId: mergedConfig.tenantId || tenantId,
      purchaseOrderId: poData.poId,
      poNumber: poData.poNumber,
      poData,
      status: P2PFlowStatus.PENDING,
      currentStep: P2PStepType.PO_RECEIPT,
      steps: this.initializeSteps(),
      errorCount: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      correlationId: uuidv4(),
      metadata: {
        initiatedBy: 'system',
      },
    };

    // Store flow
    this.activeFlows.set(flowId, flow);

    // Log flow creation
    await this.logService.log(flow, 'info', 'Flow started', {
      poNumber: poData.poNumber,
      tenantId,
    });

    // Start execution
    flow.status = P2PFlowStatus.RUNNING;
    await this.executeFlow(flow, mergedConfig);

    return flow;
  }

  async pauseFlow(flowId: string, reason: string): Promise<P2PFlowInstance> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    flow.status = P2PFlowStatus.PAUSED;
    flow.metadata = { ...flow.metadata, pauseReason: reason, pausedAt: new Date().toISOString() };
    flow.lastActivityAt = new Date();

    await this.logService.log(flow, 'info', 'Flow paused', { reason });

    return flow;
  }

  async resumeFlow(flowId: string): Promise<P2PFlowInstance> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    if (flow.status !== P2PFlowStatus.PAUSED && flow.status !== P2PFlowStatus.WAITING_APPROVAL) {
      throw new Error(`Flow ${flowId} is not paused or waiting for approval`);
    }

    flow.status = P2PFlowStatus.RUNNING;
    flow.lastActivityAt = new Date();
    delete flow.metadata?.pauseReason;
    delete flow.metadata?.pausedAt;

    await this.logService.log(flow, 'info', 'Flow resumed', {});

    // Continue execution
    const config = await this.configService.getConfig(flow.tenantId);
    await this.executeFlow(flow, config);

    return flow;
  }

  async cancelFlow(flowId: string, reason: string): Promise<P2PFlowInstance> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    flow.status = P2PFlowStatus.CANCELLED;
    flow.completedAt = new Date();
    flow.lastActivityAt = new Date();
    flow.metadata = { ...flow.metadata, cancelReason: reason };

    await this.logService.log(flow, 'info', 'Flow cancelled', { reason });

    return flow;
  }

  async retryStep(flowId: string, stepType: P2PStepType): Promise<P2PFlowInstance> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    const step = flow.steps.find((s) => s.stepType === stepType);
    if (!step) {
      throw new Error(`Step ${stepType} not found in flow ${flowId}`);
    }

    if (step.status !== StepStatus.FAILED) {
      throw new Error(`Step ${stepType} is not in failed state`);
    }

    // Reset step for retry
    step.status = StepStatus.PENDING;
    step.error = undefined;
    step.errorCode = undefined;
    step.attempt++;

    // Set as current step and resume
    flow.currentStep = stepType;
    flow.status = P2PFlowStatus.RUNNING;
    flow.lastActivityAt = new Date();

    await this.logService.logStep(flow, stepType, 'info', 'Step retry initiated', {
      attempt: step.attempt,
    });

    const config = await this.configService.getConfig(flow.tenantId);
    await this.executeFlow(flow, config);

    return flow;
  }

  async getFlowStatus(flowId: string): Promise<P2PFlowInstance | null> {
    return this.activeFlows.get(flowId) || null;
  }

  async handleWebhook(
    flowId: string,
    webhookType: string,
    payload: Record<string, unknown>,
  ): Promise<P2PFlowInstance> {
    const flow = this.activeFlows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    this.logger.log(`Handling webhook ${webhookType} for flow ${flowId}`);
    flow.lastActivityAt = new Date();

    await this.logService.log(flow, 'info', `Webhook received: ${webhookType}`, payload);

    // Handle different webhook types
    switch (webhookType) {
      case 'goods_receipt_update':
        if (payload.receiptData) {
          flow.goodsReceiptData = payload.receiptData as typeof flow.goodsReceiptData;
        }
        break;
      case 'invoice_status_update':
        if (flow.invoiceData && payload.status) {
          flow.invoiceData.status = payload.status as typeof flow.invoiceData.status;
        }
        break;
      case 'payment_status_update':
        if (flow.paymentData && payload.status) {
          flow.paymentData.status = payload.status as typeof flow.paymentData.status;
          if (payload.completedAt) {
            flow.paymentData.completedAt = new Date(payload.completedAt as string);
          }
        }
        break;
      case 'match_approval':
        if (flow.matchData && payload.approved) {
          flow.matchData.approvedBy = payload.approvedBy as string;
          flow.matchData.approvedAt = new Date();
        }
        break;
      default:
        this.logger.warn(`Unknown webhook type: ${webhookType}`);
    }

    // Resume flow if it was waiting for external
    if (flow.status === P2PFlowStatus.WAITING_EXTERNAL) {
      flow.status = P2PFlowStatus.RUNNING;
      const config = await this.configService.getConfig(flow.tenantId);
      await this.executeFlow(flow, config);
    }

    return flow;
  }

  private async executeFlow(flow: P2PFlowInstance, config: P2PFlowConfig): Promise<void> {
    while (flow.status === P2PFlowStatus.RUNNING && flow.currentStep) {
      const currentStepConfig = config.steps.find((s) => s.stepType === flow.currentStep);

      if (!currentStepConfig || !currentStepConfig.enabled) {
        // Skip disabled step
        const nextStep = this.getNextStep(flow.currentStep);
        if (!nextStep) {
          flow.status = P2PFlowStatus.COMPLETED;
          flow.completedAt = new Date();
          break;
        }
        flow.currentStep = nextStep;
        continue;
      }

      const handler = this.stepHandlers.get(flow.currentStep);
      if (!handler) {
        this.logger.error(`No handler for step type: ${flow.currentStep}`);
        flow.status = P2PFlowStatus.FAILED;
        break;
      }

      const stepExecution = flow.steps.find((s) => s.stepType === flow.currentStep);
      if (!stepExecution) {
        this.logger.error(`Step execution not found: ${flow.currentStep}`);
        flow.status = P2PFlowStatus.FAILED;
        break;
      }

      // Execute step
      stepExecution.status = StepStatus.RUNNING;
      stepExecution.startedAt = new Date();

      await this.logService.logStep(flow, flow.currentStep, 'info', 'Step started', {});

      const context = this.buildStepContext(flow, config);
      let result: P2PStepResult;

      try {
        // Validate step
        if (handler.validate) {
          const canExecute = await handler.validate(flow, currentStepConfig);
          if (!canExecute) {
            result = {
              success: false,
              error: 'Step validation failed',
              errorCode: 'VALIDATION_FAILED',
              retryable: false,
            };
          } else {
            result = await this.executeStepWithTimeout(handler, flow, currentStepConfig, context);
          }
        } else {
          result = await this.executeStepWithTimeout(handler, flow, currentStepConfig, context);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result = {
          success: false,
          error: message,
          errorCode: 'EXECUTION_ERROR',
          retryable: true,
        };
      }

      // Handle result
      stepExecution.completedAt = new Date();
      stepExecution.durationMs =
        stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
      stepExecution.output = result.output;
      flow.lastActivityAt = new Date();

      if (result.success) {
        stepExecution.status = StepStatus.COMPLETED;
        await this.logService.logStep(
          flow,
          flow.currentStep,
          'info',
          'Step completed',
          result.output || {},
        );

        // Check if waiting for external
        if (result.nextStep === undefined && this.isWaitingStep(flow.currentStep)) {
          flow.status = P2PFlowStatus.WAITING_EXTERNAL;
          break;
        }

        // Check if requires approval
        if (result.requiresApproval) {
          flow.status = P2PFlowStatus.WAITING_APPROVAL;
          break;
        }

        // Move to next step
        const nextStep = result.nextStep || this.getNextStep(flow.currentStep);
        if (!nextStep) {
          flow.status = P2PFlowStatus.COMPLETED;
          flow.completedAt = new Date();
        } else {
          flow.currentStep = nextStep;
        }
      } else {
        stepExecution.status = StepStatus.FAILED;
        stepExecution.error = result.error;
        stepExecution.errorCode = result.errorCode;
        flow.errorCount++;

        await this.logService.logStep(flow, flow.currentStep, 'error', 'Step failed', {
          error: result.error,
          errorCode: result.errorCode,
        });

        // Check if retryable
        const canRetry = handler.canRetry
          ? handler.canRetry(result.errorCode || '', stepExecution.attempt)
          : stepExecution.attempt < 3;

        if (result.retryable && canRetry) {
          stepExecution.attempt++;
          stepExecution.status = StepStatus.RETRYING;
          await this.delay(this.calculateRetryDelay(stepExecution.attempt));
          stepExecution.status = StepStatus.PENDING;
          continue;
        }

        flow.status = P2PFlowStatus.FAILED;
        flow.lastError = result.error;
      }
    }

    if (flow.status === P2PFlowStatus.COMPLETED) {
      await this.logService.log(flow, 'info', 'Flow completed', {
        duration: flow.completedAt!.getTime() - flow.startedAt.getTime(),
      });
    } else if (flow.status === P2PFlowStatus.FAILED) {
      await this.logService.log(flow, 'error', 'Flow failed', {
        step: flow.currentStep,
        error: flow.lastError,
      });
    }
  }

  private async executeStepWithTimeout(
    handler: IP2PStepHandler,
    flow: P2PFlowInstance,
    config: P2PStepConfig,
    context: P2PStepContext,
  ): Promise<P2PStepResult> {
    const timeout = config.timeout || 30000;

    return Promise.race([
      handler.execute(flow, config, context),
      new Promise<P2PStepResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Step timeout after ${timeout}ms`)), timeout),
      ),
    ]);
  }

  private initializeSteps(): P2PStepExecution[] {
    const stepOrder: P2PStepType[] = [
      P2PStepType.PO_RECEIPT,
      P2PStepType.PO_VALIDATION,
      P2PStepType.PO_ACKNOWLEDGMENT,
      P2PStepType.GOODS_RECEIPT,
      P2PStepType.INVOICE_CREATION,
      P2PStepType.THREE_WAY_MATCH,
      P2PStepType.INVOICE_SUBMISSION,
      P2PStepType.PAYMENT_TRACKING,
      P2PStepType.FLOW_COMPLETION,
    ];

    return stepOrder.map((stepType) => ({
      stepType,
      status: StepStatus.PENDING,
      attempt: 0,
      startedAt: new Date(),
    }));
  }

  private getNextStep(currentStep: P2PStepType): P2PStepType | null {
    const stepOrder: P2PStepType[] = [
      P2PStepType.PO_RECEIPT,
      P2PStepType.PO_VALIDATION,
      P2PStepType.PO_ACKNOWLEDGMENT,
      P2PStepType.GOODS_RECEIPT,
      P2PStepType.INVOICE_CREATION,
      P2PStepType.THREE_WAY_MATCH,
      P2PStepType.INVOICE_SUBMISSION,
      P2PStepType.PAYMENT_TRACKING,
      P2PStepType.FLOW_COMPLETION,
    ];

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
      return null;
    }

    return stepOrder[currentIndex + 1];
  }

  private isWaitingStep(stepType: P2PStepType): boolean {
    return (
      stepType === P2PStepType.GOODS_RECEIPT ||
      stepType === P2PStepType.INVOICE_CREATION ||
      stepType === P2PStepType.PAYMENT_TRACKING
    );
  }

  private buildStepContext(flow: P2PFlowInstance, config: P2PFlowConfig): P2PStepContext {
    return {
      tenantId: flow.tenantId,
      correlationId: flow.correlationId,
      matchTolerances: config.matchTolerances,
      connectorContext: flow.metadata?.connectorContext as ConnectorExecutionContext | undefined,
    };
  }

  private mergeConfig(base: P2PFlowConfig, overrides?: Partial<P2PFlowConfig>): P2PFlowConfig {
    if (!overrides) {
      return base;
    }

    return {
      ...base,
      ...overrides,
      steps: overrides.steps
        ? base.steps.map((step) => {
            const override = overrides.steps?.find((s) => s.stepType === step.stepType);
            return override ? { ...step, ...override } : step;
          })
        : base.steps,
      features: { ...base.features, ...overrides.features },
      matchTolerances: { ...base.matchTolerances, ...overrides.matchTolerances },
    };
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
