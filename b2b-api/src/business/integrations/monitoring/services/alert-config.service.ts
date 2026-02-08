import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AlertThreshold, Alert, AlertSeverity, AlertStatus } from '../interfaces';

/**
 * Input type for creating alert threshold (allows optional fields with defaults)
 */
export interface CreateAlertThresholdInput {
  name: string;
  description?: string;
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number;
  duration?: number;
  connectorId?: string;
  eventType?: string;
  severity: AlertSeverity;
  cooldownMinutes?: number;
  notificationChannels?: string[];
}

/**
 * Service for managing alert configurations and triggering alerts
 */
@Injectable()
export class AlertConfigService {
  private readonly logger = new Logger(AlertConfigService.name);

  // In-memory stores (would be replaced with database in production)
  private readonly thresholds: Map<string, AlertThreshold> = new Map();
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly lastAlertTimes: Map<string, Date> = new Map();

  /**
   * Create a new alert threshold
   */
  createThreshold(
    tenantId: string,
    createdBy: string,
    data: CreateAlertThresholdInput,
  ): AlertThreshold {
    const threshold: AlertThreshold = {
      id: uuidv4(),
      tenantId,
      name: data.name,
      description: data.description,
      enabled: true,
      metric: data.metric,
      operator: data.operator,
      value: data.value,
      duration: data.duration || 0,
      connectorId: data.connectorId,
      eventType: data.eventType,
      severity: data.severity,
      cooldownMinutes: data.cooldownMinutes || 15,
      notificationChannels: data.notificationChannels || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
    };

    this.thresholds.set(threshold.id, threshold);
    this.logger.log(`Created alert threshold: ${threshold.name}`);

    return threshold;
  }

  /**
   * Update an alert threshold
   */
  updateThreshold(
    tenantId: string,
    thresholdId: string,
    data: Partial<
      Omit<AlertThreshold, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>
    >,
  ): AlertThreshold {
    const threshold = this.thresholds.get(thresholdId);

    if (!threshold || threshold.tenantId !== tenantId) {
      throw new NotFoundException(`Threshold ${thresholdId} not found`);
    }

    const updated: AlertThreshold = {
      ...threshold,
      ...data,
      updatedAt: new Date(),
    };

    this.thresholds.set(thresholdId, updated);
    this.logger.log(`Updated alert threshold: ${updated.name}`);

    return updated;
  }

  /**
   * Delete an alert threshold
   */
  deleteThreshold(tenantId: string, thresholdId: string): void {
    const threshold = this.thresholds.get(thresholdId);

    if (!threshold || threshold.tenantId !== tenantId) {
      throw new NotFoundException(`Threshold ${thresholdId} not found`);
    }

    this.thresholds.delete(thresholdId);
    this.logger.log(`Deleted alert threshold: ${threshold.name}`);
  }

  /**
   * Get a threshold by ID
   */
  getThreshold(tenantId: string, thresholdId: string): AlertThreshold | null {
    const threshold = this.thresholds.get(thresholdId);
    if (!threshold || threshold.tenantId !== tenantId) {
      return null;
    }
    return threshold;
  }

  /**
   * List all thresholds for a tenant
   */
  listThresholds(
    tenantId: string,
    options?: {
      connectorId?: string;
      enabled?: boolean;
      severity?: AlertSeverity;
    },
  ): AlertThreshold[] {
    const results: AlertThreshold[] = [];

    for (const threshold of this.thresholds.values()) {
      if (threshold.tenantId !== tenantId) continue;
      if (options?.connectorId && threshold.connectorId !== options.connectorId) continue;
      if (options?.enabled !== undefined && threshold.enabled !== options.enabled) continue;
      if (options?.severity && threshold.severity !== options.severity) continue;

      results.push(threshold);
    }

    return results;
  }

  /**
   * Enable or disable a threshold
   */
  setThresholdEnabled(tenantId: string, thresholdId: string, enabled: boolean): AlertThreshold {
    return this.updateThreshold(tenantId, thresholdId, { enabled });
  }

  /**
   * Evaluate metrics against thresholds and trigger alerts if needed
   */
  evaluateMetrics(
    tenantId: string,
    metrics: Record<string, number>,
    context?: { connectorId?: string; eventType?: string },
  ): Alert[] {
    const triggeredAlerts: Alert[] = [];
    const thresholds = this.listThresholds(tenantId, { enabled: true });

    for (const threshold of thresholds) {
      // Check if threshold applies to this context
      if (threshold.connectorId && threshold.connectorId !== context?.connectorId) continue;
      if (threshold.eventType && threshold.eventType !== context?.eventType) continue;

      // Get metric value
      const value = metrics[threshold.metric];
      if (value === undefined) continue;

      // Check if condition is met
      const conditionMet = this.evaluateCondition(value, threshold.operator, threshold.value);

      if (conditionMet) {
        // Check cooldown
        const lastAlertKey = `${threshold.id}:${context?.connectorId || 'global'}`;
        const lastAlert = this.lastAlertTimes.get(lastAlertKey);

        if (lastAlert) {
          const cooldownMs = threshold.cooldownMinutes * 60 * 1000;
          if (Date.now() - lastAlert.getTime() < cooldownMs) {
            continue; // Still in cooldown
          }
        }

        // Trigger alert
        const alert = this.triggerAlert(threshold, value, context);
        triggeredAlerts.push(alert);

        // Update last alert time
        this.lastAlertTimes.set(lastAlertKey, new Date());
      } else {
        // Auto-resolve active alerts for this threshold
        this.autoResolveAlerts(threshold.id, context?.connectorId);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Trigger an alert
   */
  triggerAlert(
    threshold: AlertThreshold,
    actualValue: number,
    context?: { connectorId?: string; eventType?: string },
  ): Alert {
    const alert: Alert = {
      id: uuidv4(),
      thresholdId: threshold.id,
      tenantId: threshold.tenantId,
      severity: threshold.severity,
      status: AlertStatus.ACTIVE,
      metric: threshold.metric,
      actualValue,
      thresholdValue: threshold.value,
      message: this.buildAlertMessage(threshold, actualValue),
      connectorId: context?.connectorId || threshold.connectorId,
      eventType: context?.eventType || threshold.eventType,
      triggeredAt: new Date(),
    };

    this.alerts.set(alert.id, alert);
    this.logger.warn(`Alert triggered: ${alert.message}`);

    return alert;
  }

  /**
   * Get an alert by ID
   */
  getAlert(tenantId: string, alertId: string): Alert | null {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.tenantId !== tenantId) {
      return null;
    }
    return alert;
  }

  /**
   * List alerts for a tenant
   */
  listAlerts(
    tenantId: string,
    options?: {
      status?: AlertStatus;
      severity?: AlertSeverity;
      connectorId?: string;
      thresholdId?: string;
      startTime?: Date;
      endTime?: Date;
      limit?: number;
      offset?: number;
    },
  ): { alerts: Alert[]; total: number } {
    let results: Alert[] = [];

    for (const alert of this.alerts.values()) {
      if (alert.tenantId !== tenantId) continue;
      if (options?.status && alert.status !== options.status) continue;
      if (options?.severity && alert.severity !== options.severity) continue;
      if (options?.connectorId && alert.connectorId !== options.connectorId) continue;
      if (options?.thresholdId && alert.thresholdId !== options.thresholdId) continue;
      if (options?.startTime && alert.triggeredAt < options.startTime) continue;
      if (options?.endTime && alert.triggeredAt > options.endTime) continue;

      results.push(alert);
    }

    // Sort by triggered time descending
    results.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());

    const total = results.length;

    // Apply pagination
    if (options?.offset) {
      results = results.slice(options.offset);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return { alerts: results, total };
  }

  /**
   * Get alert summary for a tenant
   */
  getAlertSummary(tenantId: string): {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
  } {
    const { alerts } = this.listAlerts(tenantId, {
      status: AlertStatus.ACTIVE,
    });

    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL).length,
      error: alerts.filter((a) => a.severity === AlertSeverity.ERROR).length,
      warning: alerts.filter((a) => a.severity === AlertSeverity.WARNING).length,
      info: alerts.filter((a) => a.severity === AlertSeverity.INFO).length,
    };
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(tenantId: string, alertId: string, acknowledgedBy: string): Alert {
    const alert = this.alerts.get(alertId);

    if (!alert || alert.tenantId !== tenantId) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    this.logger.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(tenantId: string, alertId: string, resolvedBy: string): Alert {
    const alert = this.alerts.get(alertId);

    if (!alert || alert.tenantId !== tenantId) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    this.logger.log(`Alert ${alertId} resolved by ${resolvedBy}`);

    return alert;
  }

  /**
   * Silence an alert temporarily
   */
  silenceAlert(tenantId: string, alertId: string, durationMinutes: number): Alert {
    const alert = this.alerts.get(alertId);

    if (!alert || alert.tenantId !== tenantId) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    alert.status = AlertStatus.SILENCED;
    alert.silencedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    this.logger.log(`Alert ${alertId} silenced for ${durationMinutes} minutes`);

    return alert;
  }

  /**
   * Auto-resolve alerts when condition is no longer met
   */
  private autoResolveAlerts(thresholdId: string, connectorId?: string): void {
    for (const alert of this.alerts.values()) {
      if (
        alert.thresholdId === thresholdId &&
        alert.status === AlertStatus.ACTIVE &&
        (!connectorId || alert.connectorId === connectorId)
      ) {
        alert.status = AlertStatus.RESOLVED;
        alert.resolvedAt = new Date();
        alert.resolvedBy = 'system';
        this.logger.log(`Alert ${alert.id} auto-resolved`);
      }
    }
  }

  /**
   * Evaluate a threshold condition
   */
  private evaluateCondition(
    value: number,
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne',
    threshold: number,
  ): boolean {
    switch (operator) {
      case 'gt':
        return value > threshold;
      case 'gte':
        return value >= threshold;
      case 'lt':
        return value < threshold;
      case 'lte':
        return value <= threshold;
      case 'eq':
        return value === threshold;
      case 'ne':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Build alert message
   */
  private buildAlertMessage(threshold: AlertThreshold, actualValue: number): string {
    const operatorText: Record<string, string> = {
      gt: 'exceeded',
      gte: 'reached or exceeded',
      lt: 'dropped below',
      lte: 'reached or dropped below',
      eq: 'equals',
      ne: 'changed from',
    };

    return `${threshold.name}: ${threshold.metric} ${operatorText[threshold.operator]} threshold. Current: ${actualValue}, Threshold: ${threshold.value}`;
  }

  /**
   * Clean up old resolved/silenced alerts
   */
  cleanupOldAlerts(retentionDays: number): number {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [id, alert] of this.alerts.entries()) {
      if (
        (alert.status === AlertStatus.RESOLVED || alert.status === AlertStatus.SILENCED) &&
        alert.triggeredAt < cutoff
      ) {
        this.alerts.delete(id);
        cleaned++;
      }
    }

    this.logger.log(`Cleaned up ${cleaned} old alerts`);
    return cleaned;
  }

  /**
   * Unsilence alerts that have passed their silence period
   */
  unsilenceExpiredAlerts(): number {
    const now = new Date();
    let unsilenced = 0;

    for (const alert of this.alerts.values()) {
      if (
        alert.status === AlertStatus.SILENCED &&
        alert.silencedUntil &&
        alert.silencedUntil <= now
      ) {
        alert.status = AlertStatus.ACTIVE;
        alert.silencedUntil = undefined;
        unsilenced++;
      }
    }

    if (unsilenced > 0) {
      this.logger.log(`Unsilenced ${unsilenced} alerts`);
    }

    return unsilenced;
  }
}
