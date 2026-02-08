import { Injectable, Logger } from '@nestjs/common';
import {
  O2CFlowInstance,
  O2CFlowConfig,
  O2CFlowStats,
  O2CStepType,
  O2CFlowStatus,
  O2CFlowLogEntry,
  StartFlowOptions,
  ListFlowsOptions,
} from '../interfaces';
import { O2CFlowOrchestratorService } from './o2c-flow-orchestrator.service';
import { O2CFlowConfigService } from './o2c-flow-config.service';
import { O2CFlowLogService } from './o2c-flow-log.service';
import { O2CEventHandlerService } from './o2c-event-handler.service';

/**
 * Main O2C Service - Facade for all O2C flow operations
 */
@Injectable()
export class O2CService {
  private readonly logger = new Logger(O2CService.name);

  constructor(
    private readonly orchestrator: O2CFlowOrchestratorService,
    private readonly configService: O2CFlowConfigService,
    private readonly logService: O2CFlowLogService,
    private readonly eventHandler: O2CEventHandlerService,
  ) {}

  // ==========================================
  // Flow Operations
  // ==========================================

  /**
   * Start a new O2C flow for an order
   */
  async startFlow(
    orderId: string,
    tenantId: string,
    options?: StartFlowOptions,
  ): Promise<O2CFlowInstance> {
    return this.orchestrator.startFlow(orderId, tenantId, options);
  }

  /**
   * Get flow by ID
   */
  async getFlow(flowId: string): Promise<O2CFlowInstance | null> {
    return this.orchestrator.getFlow(flowId);
  }

  /**
   * Get flow by order ID
   */
  async getFlowByOrder(orderId: string): Promise<O2CFlowInstance | null> {
    return this.orchestrator.getFlowByOrder(orderId);
  }

  /**
   * Pause a running flow
   */
  async pauseFlow(flowId: string, reason?: string): Promise<O2CFlowInstance> {
    return this.orchestrator.pauseFlow(flowId, reason);
  }

  /**
   * Resume a paused flow
   */
  async resumeFlow(flowId: string): Promise<O2CFlowInstance> {
    return this.orchestrator.resumeFlow(flowId);
  }

  /**
   * Cancel a flow
   */
  async cancelFlow(flowId: string, reason?: string): Promise<O2CFlowInstance> {
    return this.orchestrator.cancelFlow(flowId, reason);
  }

  /**
   * Retry a specific step
   */
  async retryStep(flowId: string, stepType: O2CStepType): Promise<O2CFlowInstance> {
    return this.orchestrator.retryStep(flowId, stepType);
  }

  /**
   * List flows for a tenant
   */
  async listFlows(tenantId: string, options?: ListFlowsOptions): Promise<O2CFlowInstance[]> {
    return this.orchestrator.listFlows(tenantId, options);
  }

  /**
   * Get flow statistics
   */
  async getFlowStats(tenantId: string, period?: string): Promise<O2CFlowStats> {
    return this.orchestrator.getFlowStats(tenantId, period);
  }

  // ==========================================
  // Configuration Operations
  // ==========================================

  /**
   * Get configuration for a tenant
   */
  async getConfig(tenantId: string): Promise<O2CFlowConfig> {
    return this.configService.getConfig(tenantId);
  }

  /**
   * Save configuration for a tenant
   */
  async saveConfig(tenantId: string, config: Partial<O2CFlowConfig>): Promise<O2CFlowConfig> {
    return this.configService.saveConfig(tenantId, config);
  }

  /**
   * Enable or disable O2C flow for a tenant
   */
  async setEnabled(tenantId: string, enabled: boolean): Promise<O2CFlowConfig> {
    return this.configService.setEnabled(tenantId, enabled);
  }

  /**
   * Enable or disable a specific step
   */
  async setStepEnabled(
    tenantId: string,
    stepType: O2CStepType,
    enabled: boolean,
  ): Promise<O2CFlowConfig> {
    return this.configService.setStepEnabled(tenantId, stepType, enabled);
  }

  /**
   * Set connector IDs for integration
   */
  async setConnectors(
    tenantId: string,
    connectors: {
      erpConnectorId?: string;
      paymentConnectorId?: string;
      shippingConnectorId?: string;
      invoicingConnectorId?: string;
    },
  ): Promise<O2CFlowConfig> {
    return this.configService.setConnectors(tenantId, connectors);
  }

  /**
   * Validate configuration
   */
  validateConfig(config: O2CFlowConfig): { valid: boolean; errors: string[] } {
    return this.configService.validateConfig(config);
  }

  // ==========================================
  // Logging Operations
  // ==========================================

  /**
   * Get logs for a flow
   */
  async getFlowLogs(
    flowId: string,
    options?: {
      level?: 'debug' | 'info' | 'warn' | 'error';
      step?: O2CStepType;
      limit?: number;
    },
  ): Promise<O2CFlowLogEntry[]> {
    return this.logService.getFlowLogs(flowId, options);
  }

  /**
   * Get error logs for a tenant
   */
  async getErrorLogs(
    tenantId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    },
  ): Promise<O2CFlowLogEntry[]> {
    return this.logService.getErrorLogs(tenantId, options);
  }

  /**
   * Get log statistics
   */
  async getLogStats(tenantId: string): Promise<{
    totalLogs: number;
    byLevel: Record<string, number>;
    byStep: Record<string, number>;
  }> {
    return this.logService.getLogStats(tenantId);
  }

  // ==========================================
  // Webhook Handling
  // ==========================================

  /**
   * Process incoming order status webhook
   */
  async handleOrderStatusWebhook(
    tenantId: string,
    externalOrderId: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.eventHandler.handleOrderStatusWebhook(tenantId, externalOrderId, status, metadata);
  }

  /**
   * Process incoming shipment webhook
   */
  async handleShipmentWebhook(
    tenantId: string,
    externalShipmentId: string,
    status: string,
    trackingNumber?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.eventHandler.handleShipmentWebhook(
      tenantId,
      externalShipmentId,
      status,
      trackingNumber,
      metadata,
    );
  }

  /**
   * Process incoming payment webhook
   */
  async handlePaymentWebhook(
    tenantId: string,
    externalPaymentId: string,
    status: string,
    amount?: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    return this.eventHandler.handlePaymentWebhook(
      tenantId,
      externalPaymentId,
      status,
      amount,
      metadata,
    );
  }

  // ==========================================
  // Utility Methods
  // ==========================================

  /**
   * Get summary of active flows
   */
  async getActiveSummary(tenantId: string): Promise<{
    running: number;
    paused: number;
    waiting: number;
    failed: number;
    totalToday: number;
    completedToday: number;
  }> {
    const flows = await this.listFlows(tenantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayFlows = flows.filter((f) => f.startedAt >= today);

    return {
      running: flows.filter((f) => f.status === O2CFlowStatus.RUNNING).length,
      paused: flows.filter((f) => f.status === O2CFlowStatus.PAUSED).length,
      waiting: flows.filter((f) => f.status === O2CFlowStatus.WAITING_EXTERNAL).length,
      failed: flows.filter((f) => f.status === O2CFlowStatus.FAILED).length,
      totalToday: todayFlows.length,
      completedToday: todayFlows.filter((f) => f.status === O2CFlowStatus.COMPLETED).length,
    };
  }

  /**
   * Get flow health metrics
   */
  async getHealthMetrics(tenantId: string): Promise<{
    healthy: boolean;
    activeFlows: number;
    failedFlows24h: number;
    avgCompletionTimeMs: number;
    successRate: number;
  }> {
    const stats = await this.getFlowStats(tenantId, 'day');

    return {
      healthy: stats.failedFlows === 0 || stats.successRate >= 95,
      activeFlows: stats.runningFlows,
      failedFlows24h: stats.failedFlows,
      avgCompletionTimeMs: stats.avgDurationMs,
      successRate: stats.successRate,
    };
  }
}
