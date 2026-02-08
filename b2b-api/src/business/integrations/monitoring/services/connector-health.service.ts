import { Injectable, Logger } from '@nestjs/common';
import {
  ConnectorHealthStatus,
  ConnectorHealthCheck,
  HealthCheckConfig,
  TimeWindow,
} from '../interfaces';

/**
 * Service for monitoring connector health status
 */
@Injectable()
export class ConnectorHealthService {
  private readonly logger = new Logger(ConnectorHealthService.name);

  // In-memory stores (would be replaced with database in production)
  private readonly healthChecks: Map<string, ConnectorHealthCheck> = new Map();
  private readonly healthConfigs: Map<string, HealthCheckConfig> = new Map();
  private readonly uptimeHistory: Map<
    string,
    Array<{ timestamp: Date; status: ConnectorHealthStatus }>
  > = new Map();
  private readonly consecutiveFailures: Map<string, number> = new Map();
  private readonly consecutiveSuccesses: Map<string, number> = new Map();

  /**
   * Get health check for a connector
   */
  getConnectorHealth(tenantId: string, connectorId: string): ConnectorHealthCheck | null {
    const key = this.buildKey(tenantId, connectorId);
    return this.healthChecks.get(key) || null;
  }

  /**
   * Get health status for all connectors in a tenant
   */
  getAllConnectorHealth(
    tenantId: string,
    statusFilter?: ConnectorHealthStatus,
  ): ConnectorHealthCheck[] {
    const results: ConnectorHealthCheck[] = [];

    for (const [key, health] of this.healthChecks.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        if (!statusFilter || health.status === statusFilter) {
          results.push(health);
        }
      }
    }

    return results;
  }

  /**
   * Get health summary for a tenant
   */
  getHealthSummary(tenantId: string): {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  } {
    const connectors = this.getAllConnectorHealth(tenantId);

    return {
      total: connectors.length,
      healthy: connectors.filter((c) => c.status === ConnectorHealthStatus.HEALTHY).length,
      degraded: connectors.filter((c) => c.status === ConnectorHealthStatus.DEGRADED).length,
      unhealthy: connectors.filter((c) => c.status === ConnectorHealthStatus.UNHEALTHY).length,
      unknown: connectors.filter((c) => c.status === ConnectorHealthStatus.UNKNOWN).length,
    };
  }

  /**
   * Record health check result
   */
  recordHealthCheck(
    tenantId: string,
    connectorId: string,
    result: {
      success: boolean;
      responseTime?: number;
      error?: string;
      rateLimits?: {
        remaining: number;
        limit: number;
        resetsAt: Date;
      };
      authValid?: boolean;
      authExpiresAt?: Date;
    },
  ): ConnectorHealthCheck {
    const key = this.buildKey(tenantId, connectorId);
    const now = new Date();

    // Get or create health check record
    const existing = this.healthChecks.get(key);

    // Update consecutive counters
    if (result.success) {
      this.consecutiveSuccesses.set(key, (this.consecutiveSuccesses.get(key) || 0) + 1);
      this.consecutiveFailures.set(key, 0);
    } else {
      this.consecutiveFailures.set(key, (this.consecutiveFailures.get(key) || 0) + 1);
      this.consecutiveSuccesses.set(key, 0);
    }

    // Get config for thresholds
    const config = this.healthConfigs.get(key);
    const unhealthyThreshold = config?.unhealthyThreshold || 3;
    const healthyThreshold = config?.healthyThreshold || 2;

    // Determine status
    let status: ConnectorHealthStatus;
    const failures = this.consecutiveFailures.get(key) || 0;
    const successes = this.consecutiveSuccesses.get(key) || 0;

    if (failures >= unhealthyThreshold) {
      status = ConnectorHealthStatus.UNHEALTHY;
    } else if (failures > 0 && failures < unhealthyThreshold) {
      status = ConnectorHealthStatus.DEGRADED;
    } else if (successes >= healthyThreshold) {
      status = ConnectorHealthStatus.HEALTHY;
    } else if (existing) {
      status = existing.status;
    } else {
      status = ConnectorHealthStatus.UNKNOWN;
    }

    // Update recent errors
    let recentErrors = existing?.recentErrors || [];
    if (!result.success && result.error) {
      const existingError = recentErrors.find((e) => e.error === result.error);
      if (existingError) {
        existingError.count++;
        existingError.timestamp = now;
      } else {
        recentErrors.push({ error: result.error, timestamp: now, count: 1 });
      }
      // Keep only last 10 errors
      recentErrors = recentErrors.slice(-10);
    }

    // Calculate uptime
    const uptime = this.calculateUptime(tenantId, connectorId, '24h');

    const healthCheck: ConnectorHealthCheck = {
      connectorId,
      tenantId,
      status,
      checkedAt: now,
      responseTime: result.responseTime,
      connectivity: {
        reachable: result.success,
        latency: result.responseTime,
        lastSuccessfulConnection: result.success
          ? now
          : existing?.connectivity.lastSuccessfulConnection,
      },
      authentication: {
        valid: result.authValid ?? true,
        expiresAt: result.authExpiresAt,
        lastRefreshed: result.authValid ? now : existing?.authentication.lastRefreshed,
      },
      rateLimits: result.rateLimits,
      recentErrors,
      uptime,
    };

    this.healthChecks.set(key, healthCheck);

    // Record in uptime history
    this.recordUptimeHistory(tenantId, connectorId, status);

    this.logger.debug(`Recorded health check for connector ${connectorId}: ${status}`);

    return healthCheck;
  }

  /**
   * Set health check configuration for a connector
   */
  setHealthCheckConfig(
    tenantId: string,
    connectorId: string,
    config: Partial<Omit<HealthCheckConfig, 'connectorId' | 'tenantId'>>,
  ): HealthCheckConfig {
    const key = this.buildKey(tenantId, connectorId);
    const existing = this.healthConfigs.get(key);

    const fullConfig: HealthCheckConfig = {
      connectorId,
      tenantId,
      enabled: config.enabled ?? existing?.enabled ?? true,
      intervalSeconds: config.intervalSeconds ?? existing?.intervalSeconds ?? 60,
      timeoutSeconds: config.timeoutSeconds ?? existing?.timeoutSeconds ?? 10,
      unhealthyThreshold: config.unhealthyThreshold ?? existing?.unhealthyThreshold ?? 3,
      healthyThreshold: config.healthyThreshold ?? existing?.healthyThreshold ?? 2,
      customChecks: config.customChecks ?? existing?.customChecks,
    };

    this.healthConfigs.set(key, fullConfig);
    this.logger.debug(`Updated health check config for connector ${connectorId}`);

    return fullConfig;
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfig(tenantId: string, connectorId: string): HealthCheckConfig | null {
    const key = this.buildKey(tenantId, connectorId);
    return this.healthConfigs.get(key) || null;
  }

  /**
   * Mark connector as unhealthy manually
   */
  markUnhealthy(tenantId: string, connectorId: string, reason: string): ConnectorHealthCheck {
    return this.recordHealthCheck(tenantId, connectorId, {
      success: false,
      error: reason,
    });
  }

  /**
   * Mark connector as healthy manually
   */
  markHealthy(tenantId: string, connectorId: string): ConnectorHealthCheck {
    const key = this.buildKey(tenantId, connectorId);

    // Reset consecutive counters to ensure healthy status
    this.consecutiveSuccesses.set(key, 10);
    this.consecutiveFailures.set(key, 0);

    return this.recordHealthCheck(tenantId, connectorId, {
      success: true,
    });
  }

  /**
   * Remove connector health data
   */
  removeConnector(tenantId: string, connectorId: string): void {
    const key = this.buildKey(tenantId, connectorId);
    this.healthChecks.delete(key);
    this.healthConfigs.delete(key);
    this.uptimeHistory.delete(key);
    this.consecutiveFailures.delete(key);
    this.consecutiveSuccesses.delete(key);
    this.logger.debug(`Removed health data for connector ${connectorId}`);
  }

  /**
   * Calculate uptime for a connector
   */
  private calculateUptime(
    tenantId: string,
    connectorId: string,
    period: TimeWindow,
  ): { percentage: number; period: TimeWindow; downtimeMinutes: number } {
    const key = this.buildKey(tenantId, connectorId);
    const history = this.uptimeHistory.get(key) || [];

    const windowMs = this.getWindowMs(period);
    const cutoff = new Date(Date.now() - windowMs);

    const recentHistory = history.filter((h) => h.timestamp >= cutoff);

    if (recentHistory.length === 0) {
      return { percentage: 100, period, downtimeMinutes: 0 };
    }

    const unhealthyCount = recentHistory.filter(
      (h) =>
        h.status === ConnectorHealthStatus.UNHEALTHY || h.status === ConnectorHealthStatus.DEGRADED,
    ).length;

    const percentage = ((recentHistory.length - unhealthyCount) / recentHistory.length) * 100;

    // Estimate downtime (assuming checks every minute)
    const downtimeMinutes = unhealthyCount;

    return {
      percentage: Math.round(percentage * 100) / 100,
      period,
      downtimeMinutes,
    };
  }

  /**
   * Record status in uptime history
   */
  private recordUptimeHistory(
    tenantId: string,
    connectorId: string,
    status: ConnectorHealthStatus,
  ): void {
    const key = this.buildKey(tenantId, connectorId);
    const history = this.uptimeHistory.get(key) || [];

    history.push({ timestamp: new Date(), status });

    // Keep only last 7 days of history (assuming 1 check/minute = ~10080 entries)
    const maxEntries = 10080;
    if (history.length > maxEntries) {
      history.splice(0, history.length - maxEntries);
    }

    this.uptimeHistory.set(key, history);
  }

  /**
   * Build storage key
   */
  private buildKey(tenantId: string, connectorId: string): string {
    return `${tenantId}:${connectorId}`;
  }

  /**
   * Get window duration in milliseconds
   */
  private getWindowMs(period: TimeWindow): number {
    const windows: Record<TimeWindow, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    return windows[period];
  }

  /**
   * Clean up old uptime history
   */
  cleanupOldHistory(retentionDays: number): number {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [key, history] of this.uptimeHistory.entries()) {
      const filtered = history.filter((h) => h.timestamp >= cutoff);
      const removed = history.length - filtered.length;
      if (removed > 0) {
        this.uptimeHistory.set(key, filtered);
        cleaned += removed;
      }
    }

    this.logger.log(`Cleaned up ${cleaned} old uptime history entries`);
    return cleaned;
  }
}
