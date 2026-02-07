import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RetentionPolicy, AuditAction } from '../interfaces';
import { IntegrationMetricsService } from './integration-metrics.service';
import { ConnectorHealthService } from './connector-health.service';
import { AlertConfigService } from './alert-config.service';
import { AuditLogService } from './audit-log.service';

/**
 * Service for managing data retention and cleanup
 */
@Injectable()
export class LogRetentionService {
  private readonly logger = new Logger(LogRetentionService.name);

  // In-memory store for retention policies
  private readonly policies: Map<string, RetentionPolicy> = new Map();

  // Default retention policy
  private readonly defaultPolicy: RetentionPolicy = {
    tenantId: 'default',
    metrics: {
      rawDataDays: 7,
      aggregatedDataDays: 30,
      summaryDataDays: 365,
    },
    auditLogs: {
      defaultDays: 90,
      byAction: {
        [AuditAction.CREDENTIAL_CREATED]: 365,
        [AuditAction.CREDENTIAL_UPDATED]: 365,
        [AuditAction.CREDENTIAL_DELETED]: 365,
        [AuditAction.CREDENTIAL_ROTATED]: 365,
      },
    },
    alerts: {
      activeDays: 30,
      resolvedDays: 7,
    },
    archive: {
      enabled: false,
    },
  };

  constructor(
    private readonly metricsService: IntegrationMetricsService,
    private readonly healthService: ConnectorHealthService,
    private readonly alertService: AlertConfigService,
    private readonly auditService: AuditLogService,
  ) {}

  /**
   * Set retention policy for a tenant
   */
  setPolicy(tenantId: string, policy: Partial<Omit<RetentionPolicy, 'tenantId'>>): RetentionPolicy {
    const existing = this.policies.get(tenantId) || { ...this.defaultPolicy, tenantId };

    const updated: RetentionPolicy = {
      tenantId,
      metrics: {
        ...existing.metrics,
        ...policy.metrics,
      },
      auditLogs: {
        ...existing.auditLogs,
        ...policy.auditLogs,
        byAction: {
          ...existing.auditLogs.byAction,
          ...policy.auditLogs?.byAction,
        },
      },
      alerts: {
        ...existing.alerts,
        ...policy.alerts,
      },
      archive: {
        ...existing.archive,
        ...policy.archive,
      },
    };

    this.policies.set(tenantId, updated);
    this.logger.log(`Updated retention policy for tenant ${tenantId}`);

    return updated;
  }

  /**
   * Get retention policy for a tenant
   */
  getPolicy(tenantId: string): RetentionPolicy {
    return this.policies.get(tenantId) || { ...this.defaultPolicy, tenantId };
  }

  /**
   * Delete retention policy (revert to default)
   */
  deletePolicy(tenantId: string): void {
    this.policies.delete(tenantId);
    this.logger.log(`Deleted retention policy for tenant ${tenantId}`);
  }

  /**
   * Run cleanup for a specific tenant
   */
  async runCleanup(tenantId: string): Promise<{
    metricsDeleted: number;
    healthHistoryDeleted: number;
    alertsDeleted: number;
    auditLogsDeleted: number;
  }> {
    const policy = this.getPolicy(tenantId);
    const results = {
      metricsDeleted: 0,
      healthHistoryDeleted: 0,
      alertsDeleted: 0,
      auditLogsDeleted: 0,
    };

    // Clean up metrics
    results.metricsDeleted = this.metricsService.cleanupOldData(
      policy.metrics.rawDataDays,
    );

    // Clean up connector health history
    results.healthHistoryDeleted = this.healthService.cleanupOldHistory(
      policy.metrics.aggregatedDataDays,
    );

    // Clean up resolved/silenced alerts
    results.alertsDeleted = this.alertService.cleanupOldAlerts(
      policy.alerts.resolvedDays,
    );

    // Clean up audit logs
    results.auditLogsDeleted = this.auditService.cleanupOldLogs(
      policy.auditLogs.defaultDays,
      policy.auditLogs.byAction as Record<string, number>,
    );

    this.logger.log(
      `Cleanup completed for tenant ${tenantId}: ` +
        `${results.metricsDeleted} metrics, ` +
        `${results.healthHistoryDeleted} health history, ` +
        `${results.alertsDeleted} alerts, ` +
        `${results.auditLogsDeleted} audit logs deleted`,
    );

    return results;
  }

  /**
   * Archive old data before deletion (if enabled)
   */
  async archiveData(
    tenantId: string,
    startTime: Date,
    endTime: Date,
  ): Promise<{
    auditLogsArchived: number;
    archiveLocation?: string;
  }> {
    const policy = this.getPolicy(tenantId);

    if (!policy.archive.enabled) {
      this.logger.debug(`Archival disabled for tenant ${tenantId}`);
      return { auditLogsArchived: 0 };
    }

    // Export audit logs for archival
    const auditLogs = this.auditService.exportLogs(tenantId, startTime, endTime);

    // In production, this would upload to S3 or similar
    const archiveLocation = policy.archive.destination || 'local';
    this.logger.log(
      `Archived ${auditLogs.length} audit logs for tenant ${tenantId} to ${archiveLocation}`,
    );

    return {
      auditLogsArchived: auditLogs.length,
      archiveLocation,
    };
  }

  /**
   * Get retention statistics
   */
  getRetentionStats(tenantId: string): {
    policy: RetentionPolicy;
    currentDataCounts: {
      auditLogs: number;
    };
    estimatedDeletionCounts: {
      auditLogs: number;
    };
  } {
    const policy = this.getPolicy(tenantId);
    const auditStats = this.auditService.getStatistics(tenantId);

    // Estimate what would be deleted
    const cutoffDate = new Date(
      Date.now() - policy.auditLogs.defaultDays * 24 * 60 * 60 * 1000,
    );
    const oldAuditLogs = this.auditService.query(tenantId, {
      endTime: cutoffDate,
    });

    return {
      policy,
      currentDataCounts: {
        auditLogs: auditStats.total,
      },
      estimatedDeletionCounts: {
        auditLogs: oldAuditLogs.total,
      },
    };
  }

  /**
   * Scheduled job to run cleanup for all tenants
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledCleanup(): Promise<void> {
    this.logger.log('Starting scheduled retention cleanup...');

    // Get all tenants with policies
    const tenantIds = new Set<string>();
    for (const key of this.policies.keys()) {
      tenantIds.add(key);
    }

    // Also clean up default (for system-level data)
    tenantIds.add('default');

    for (const tenantId of tenantIds) {
      try {
        await this.runCleanup(tenantId);
      } catch (error) {
        this.logger.error(
          `Cleanup failed for tenant ${tenantId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Unsilence expired alerts
    this.alertService.unsilenceExpiredAlerts();

    this.logger.log('Scheduled retention cleanup completed');
  }

  /**
   * Validate retention policy values
   */
  validatePolicy(policy: Partial<RetentionPolicy>): string[] {
    const errors: string[] = [];

    if (policy.metrics) {
      if (
        policy.metrics.rawDataDays !== undefined &&
        (policy.metrics.rawDataDays < 1 || policy.metrics.rawDataDays > 365)
      ) {
        errors.push('metrics.rawDataDays must be between 1 and 365');
      }
      if (
        policy.metrics.aggregatedDataDays !== undefined &&
        (policy.metrics.aggregatedDataDays < 1 ||
          policy.metrics.aggregatedDataDays > 730)
      ) {
        errors.push('metrics.aggregatedDataDays must be between 1 and 730');
      }
      if (
        policy.metrics.summaryDataDays !== undefined &&
        (policy.metrics.summaryDataDays < 1 ||
          policy.metrics.summaryDataDays > 1825)
      ) {
        errors.push('metrics.summaryDataDays must be between 1 and 1825');
      }
    }

    if (policy.auditLogs) {
      if (
        policy.auditLogs.defaultDays !== undefined &&
        (policy.auditLogs.defaultDays < 1 || policy.auditLogs.defaultDays > 730)
      ) {
        errors.push('auditLogs.defaultDays must be between 1 and 730');
      }
    }

    if (policy.alerts) {
      if (
        policy.alerts.activeDays !== undefined &&
        (policy.alerts.activeDays < 1 || policy.alerts.activeDays > 365)
      ) {
        errors.push('alerts.activeDays must be between 1 and 365');
      }
      if (
        policy.alerts.resolvedDays !== undefined &&
        (policy.alerts.resolvedDays < 1 || policy.alerts.resolvedDays > 90)
      ) {
        errors.push('alerts.resolvedDays must be between 1 and 90');
      }
    }

    return errors;
  }
}
