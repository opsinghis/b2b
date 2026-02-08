import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { P2PFlowInstance, P2PFlowLogEntry, P2PStepType } from '../interfaces';

/**
 * Service for logging P2P flow execution
 */
@Injectable()
export class P2PFlowLogService {
  private readonly logger = new Logger(P2PFlowLogService.name);

  // In-memory log storage (replace with persistent storage in production)
  private readonly logs = new Map<string, P2PFlowLogEntry[]>();
  private readonly maxLogsPerFlow = 1000;

  /**
   * Log a message for a flow
   */
  async log(
    flow: P2PFlowInstance,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>,
  ): Promise<P2PFlowLogEntry> {
    const entry: P2PFlowLogEntry = {
      id: uuidv4(),
      flowId: flow.id,
      tenantId: flow.tenantId,
      level,
      message,
      step: flow.currentStep,
      data,
      timestamp: new Date(),
      correlationId: flow.correlationId,
    };

    const flowLogs = this.logs.get(flow.id) || [];
    flowLogs.push(entry);

    if (flowLogs.length > this.maxLogsPerFlow) {
      flowLogs.splice(0, flowLogs.length - this.maxLogsPerFlow);
    }

    this.logs.set(flow.id, flowLogs);

    const logMessage = `[Flow:${flow.id}] [PO:${flow.poNumber || flow.purchaseOrderId}] ${message}`;
    switch (level) {
      case 'debug':
        this.logger.debug(logMessage, data);
        break;
      case 'info':
        this.logger.log(logMessage, data);
        break;
      case 'warn':
        this.logger.warn(logMessage, data);
        break;
      case 'error':
        this.logger.error(logMessage, data);
        break;
    }

    return entry;
  }

  /**
   * Log a step-specific message
   */
  async logStep(
    flow: P2PFlowInstance,
    step: P2PStepType,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>,
  ): Promise<P2PFlowLogEntry> {
    const entry: P2PFlowLogEntry = {
      id: uuidv4(),
      flowId: flow.id,
      tenantId: flow.tenantId,
      level,
      message,
      step,
      data,
      timestamp: new Date(),
      correlationId: flow.correlationId,
    };

    const flowLogs = this.logs.get(flow.id) || [];
    flowLogs.push(entry);

    if (flowLogs.length > this.maxLogsPerFlow) {
      flowLogs.splice(0, flowLogs.length - this.maxLogsPerFlow);
    }

    this.logs.set(flow.id, flowLogs);

    const logMessage = `[Flow:${flow.id}] [Step:${step}] ${message}`;
    switch (level) {
      case 'debug':
        this.logger.debug(logMessage, data);
        break;
      case 'info':
        this.logger.log(logMessage, data);
        break;
      case 'warn':
        this.logger.warn(logMessage, data);
        break;
      case 'error':
        this.logger.error(logMessage, data);
        break;
    }

    return entry;
  }

  /**
   * Get logs for a flow
   */
  async getFlowLogs(
    flowId: string,
    options?: {
      level?: 'debug' | 'info' | 'warn' | 'error';
      step?: P2PStepType;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<P2PFlowLogEntry[]> {
    let logs = this.logs.get(flowId) || [];

    if (options?.level) {
      logs = logs.filter((l) => l.level === options.level);
    }

    if (options?.step) {
      logs = logs.filter((l) => l.step === options.step);
    }

    if (options?.fromDate) {
      logs = logs.filter((l) => l.timestamp >= options.fromDate!);
    }

    if (options?.toDate) {
      logs = logs.filter((l) => l.timestamp <= options.toDate!);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return logs.slice(offset, offset + limit);
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
  ): Promise<P2PFlowLogEntry[]> {
    let allLogs: P2PFlowLogEntry[] = [];

    for (const logs of this.logs.values()) {
      const tenantLogs = logs.filter((l) => l.tenantId === tenantId && l.level === 'error');
      allLogs = allLogs.concat(tenantLogs);
    }

    if (options?.fromDate) {
      allLogs = allLogs.filter((l) => l.timestamp >= options.fromDate!);
    }

    if (options?.toDate) {
      allLogs = allLogs.filter((l) => l.timestamp <= options.toDate!);
    }

    allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const limit = options?.limit || 500;
    return allLogs.slice(0, limit);
  }

  /**
   * Clear logs for a flow
   */
  async clearFlowLogs(flowId: string): Promise<void> {
    this.logs.delete(flowId);
  }

  /**
   * Get log statistics
   */
  async getLogStats(tenantId: string): Promise<{
    totalLogs: number;
    byLevel: Record<string, number>;
    byStep: Record<string, number>;
  }> {
    let allLogs: P2PFlowLogEntry[] = [];

    for (const logs of this.logs.values()) {
      const tenantLogs = logs.filter((l) => l.tenantId === tenantId);
      allLogs = allLogs.concat(tenantLogs);
    }

    const byLevel: Record<string, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    const byStep: Record<string, number> = {};

    for (const log of allLogs) {
      byLevel[log.level]++;
      if (log.step) {
        byStep[log.step] = (byStep[log.step] || 0) + 1;
      }
    }

    return {
      totalLogs: allLogs.length,
      byLevel,
      byStep,
    };
  }
}
