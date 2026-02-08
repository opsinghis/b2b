import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { O2CFlowInstance, O2CFlowLogEntry, O2CStepType } from '../interfaces';

/**
 * Service for logging O2C flow execution
 */
@Injectable()
export class O2CFlowLogService {
  private readonly logger = new Logger(O2CFlowLogService.name);

  // In-memory log storage (replace with persistent storage in production)
  private readonly logs = new Map<string, O2CFlowLogEntry[]>();
  private readonly maxLogsPerFlow = 1000;

  /**
   * Log a message for a flow
   */
  async log(
    flow: O2CFlowInstance,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>,
  ): Promise<O2CFlowLogEntry> {
    const entry: O2CFlowLogEntry = {
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

    // Store log entry
    const flowLogs = this.logs.get(flow.id) || [];
    flowLogs.push(entry);

    // Trim old logs if exceeded max
    if (flowLogs.length > this.maxLogsPerFlow) {
      flowLogs.splice(0, flowLogs.length - this.maxLogsPerFlow);
    }

    this.logs.set(flow.id, flowLogs);

    // Also log to standard logger
    const logMessage = `[Flow:${flow.id}] [Order:${flow.orderNumber || flow.orderId}] ${message}`;
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
    flow: O2CFlowInstance,
    step: O2CStepType,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>,
  ): Promise<O2CFlowLogEntry> {
    const entry: O2CFlowLogEntry = {
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
      step?: O2CStepType;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<O2CFlowLogEntry[]> {
    let logs = this.logs.get(flowId) || [];

    // Apply filters
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

    // Sort by timestamp descending (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return logs.slice(offset, offset + limit);
  }

  /**
   * Get logs by tenant
   */
  async getTenantLogs(
    tenantId: string,
    options?: {
      level?: 'debug' | 'info' | 'warn' | 'error';
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    },
  ): Promise<O2CFlowLogEntry[]> {
    let allLogs: O2CFlowLogEntry[] = [];

    for (const logs of this.logs.values()) {
      const tenantLogs = logs.filter((l) => l.tenantId === tenantId);
      allLogs = allLogs.concat(tenantLogs);
    }

    // Apply filters
    if (options?.level) {
      allLogs = allLogs.filter((l) => l.level === options.level);
    }

    if (options?.fromDate) {
      allLogs = allLogs.filter((l) => l.timestamp >= options.fromDate!);
    }

    if (options?.toDate) {
      allLogs = allLogs.filter((l) => l.timestamp <= options.toDate!);
    }

    // Sort by timestamp descending
    allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    const limit = options?.limit || 500;
    return allLogs.slice(0, limit);
  }

  /**
   * Get error logs
   */
  async getErrorLogs(
    tenantId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    },
  ): Promise<O2CFlowLogEntry[]> {
    return this.getTenantLogs(tenantId, {
      level: 'error',
      ...options,
    });
  }

  /**
   * Clear logs for a flow
   */
  async clearFlowLogs(flowId: string): Promise<void> {
    this.logs.delete(flowId);
    this.logger.debug(`Cleared logs for flow ${flowId}`);
  }

  /**
   * Clear old logs (retention policy)
   */
  async clearOldLogs(retentionDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let clearedCount = 0;

    for (const [flowId, logs] of this.logs.entries()) {
      const filteredLogs = logs.filter((l) => l.timestamp >= cutoffDate);
      const removedCount = logs.length - filteredLogs.length;

      if (removedCount > 0) {
        clearedCount += removedCount;
        if (filteredLogs.length === 0) {
          this.logs.delete(flowId);
        } else {
          this.logs.set(flowId, filteredLogs);
        }
      }
    }

    this.logger.log(`Cleared ${clearedCount} old log entries`);
    return clearedCount;
  }

  /**
   * Export logs for a flow
   */
  async exportFlowLogs(flowId: string): Promise<string> {
    const logs = this.logs.get(flowId) || [];
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Get log statistics
   */
  async getLogStats(tenantId: string): Promise<{
    totalLogs: number;
    byLevel: Record<string, number>;
    byStep: Record<string, number>;
  }> {
    let allLogs: O2CFlowLogEntry[] = [];

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
