import { Injectable, Logger } from '@nestjs/common';
import {
  TimeWindow,
  ThroughputMetrics,
  LatencyMetrics,
  ErrorMetrics,
  MetricDataPoint,
  TimeSeries,
  DashboardKPIs,
} from '../interfaces';

/**
 * Service for tracking and calculating integration metrics
 */
@Injectable()
export class IntegrationMetricsService {
  private readonly logger = new Logger(IntegrationMetricsService.name);

  // In-memory stores for metrics (would be replaced with time-series DB in production)
  private readonly throughputData: Map<string, MetricDataPoint[]> = new Map();
  private readonly latencyData: Map<string, number[]> = new Map();
  private readonly errorData: Map<
    string,
    Array<{ type: string; timestamp: Date; message?: string }>
  > = new Map();
  private readonly requestData: Map<string, number> = new Map();

  /**
   * Record a message received
   */
  recordMessageReceived(tenantId: string, connectorId?: string, eventType?: string): void {
    const key = this.buildKey(tenantId, connectorId);
    const now = new Date();

    const points = this.throughputData.get(`${key}:received`) || [];
    points.push({ timestamp: now, value: 1 });
    this.throughputData.set(`${key}:received`, points);

    if (eventType) {
      const eventKey = `${key}:event:${eventType}`;
      const eventPoints = this.throughputData.get(eventKey) || [];
      eventPoints.push({ timestamp: now, value: 1 });
      this.throughputData.set(eventKey, eventPoints);
    }

    // Track total requests
    const requestKey = `${key}:total`;
    this.requestData.set(requestKey, (this.requestData.get(requestKey) || 0) + 1);

    this.logger.debug(`Recorded message received for tenant ${tenantId}`);
  }

  /**
   * Record a message processed
   */
  recordMessageProcessed(tenantId: string, connectorId?: string, latencyMs?: number): void {
    const key = this.buildKey(tenantId, connectorId);
    const now = new Date();

    const points = this.throughputData.get(`${key}:processed`) || [];
    points.push({ timestamp: now, value: 1 });
    this.throughputData.set(`${key}:processed`, points);

    if (latencyMs !== undefined) {
      const latencies = this.latencyData.get(key) || [];
      latencies.push(latencyMs);
      this.latencyData.set(key, latencies);
    }

    this.logger.debug(`Recorded message processed for tenant ${tenantId}`);
  }

  /**
   * Record a message failure
   */
  recordMessageFailed(
    tenantId: string,
    errorType: string,
    connectorId?: string,
    errorMessage?: string,
  ): void {
    const key = this.buildKey(tenantId, connectorId);
    const now = new Date();

    const points = this.throughputData.get(`${key}:failed`) || [];
    points.push({ timestamp: now, value: 1 });
    this.throughputData.set(`${key}:failed`, points);

    const errors = this.errorData.get(key) || [];
    errors.push({ type: errorType, timestamp: now, message: errorMessage });
    this.errorData.set(key, errors);

    this.logger.debug(`Recorded message failure for tenant ${tenantId}: ${errorType}`);
  }

  /**
   * Record a message retry
   */
  recordMessageRetried(tenantId: string, connectorId?: string): void {
    const key = this.buildKey(tenantId, connectorId);
    const now = new Date();

    const points = this.throughputData.get(`${key}:retried`) || [];
    points.push({ timestamp: now, value: 1 });
    this.throughputData.set(`${key}:retried`, points);

    this.logger.debug(`Recorded message retry for tenant ${tenantId}`);
  }

  /**
   * Record latency for an operation
   */
  recordLatency(
    tenantId: string,
    operation: string,
    latencyMs: number,
    connectorId?: string,
  ): void {
    const key = this.buildKey(tenantId, connectorId);
    const opKey = `${key}:op:${operation}`;

    const latencies = this.latencyData.get(opKey) || [];
    latencies.push(latencyMs);
    this.latencyData.set(opKey, latencies);

    // Also record in general latency
    const generalLatencies = this.latencyData.get(key) || [];
    generalLatencies.push(latencyMs);
    this.latencyData.set(key, generalLatencies);

    this.logger.debug(`Recorded latency ${latencyMs}ms for operation ${operation}`);
  }

  /**
   * Get throughput metrics for a tenant
   */
  getThroughputMetrics(
    tenantId: string,
    period: TimeWindow,
    connectorId?: string,
  ): ThroughputMetrics {
    const key = this.buildKey(tenantId, connectorId);
    const windowMs = this.getWindowMs(period);
    const cutoff = new Date(Date.now() - windowMs);

    const received = this.countPointsInWindow(`${key}:received`, cutoff);
    const processed = this.countPointsInWindow(`${key}:processed`, cutoff);
    const failed = this.countPointsInWindow(`${key}:failed`, cutoff);
    const retried = this.countPointsInWindow(`${key}:retried`, cutoff);

    const windowMinutes = windowMs / (1000 * 60);
    const receiveRate = received / windowMinutes;
    const processRate = processed / windowMinutes;
    const failureRate = received > 0 ? (failed / received) * 100 : 0;

    // Get counts by event type
    const byEventType: Record<string, number> = {};
    for (const [k, points] of this.throughputData.entries()) {
      if (k.startsWith(`${key}:event:`)) {
        const eventType = k.split(':event:')[1];
        byEventType[eventType] = points.filter((p) => p.timestamp >= cutoff).length;
      }
    }

    // Get counts by connector (if querying at tenant level)
    const byConnector: Record<string, number> = {};
    if (!connectorId) {
      for (const [k, points] of this.throughputData.entries()) {
        if (k.startsWith(`${tenantId}:`) && k.endsWith(':received')) {
          const parts = k.split(':');
          if (parts.length > 2 && parts[1] !== 'received') {
            const cId = parts[1];
            byConnector[cId] = points.filter((p) => p.timestamp >= cutoff).length;
          }
        }
      }
    }

    return {
      tenantId,
      connectorId,
      period,
      timestamp: new Date(),
      messagesReceived: received,
      messagesProcessed: processed,
      messagesFailed: failed,
      messagesRetried: retried,
      receiveRate,
      processRate,
      failureRate,
      byEventType,
      byConnector,
    };
  }

  /**
   * Get latency metrics for a tenant
   */
  getLatencyMetrics(tenantId: string, period: TimeWindow, connectorId?: string): LatencyMetrics {
    const key = this.buildKey(tenantId, connectorId);
    const latencies = this.latencyData.get(key) || [];

    // For simplicity, we use all stored latencies
    // In production, we'd filter by time window
    const sorted = [...latencies].sort((a, b) => a - b);
    const count = sorted.length;

    const p50 = count > 0 ? this.percentile(sorted, 50) : 0;
    const p95 = count > 0 ? this.percentile(sorted, 95) : 0;
    const p99 = count > 0 ? this.percentile(sorted, 99) : 0;
    const avg = count > 0 ? sorted.reduce((a, b) => a + b, 0) / count : 0;
    const min = count > 0 ? sorted[0] : 0;
    const max = count > 0 ? sorted[count - 1] : 0;
    const stdDev = count > 0 ? this.calculateStdDev(sorted, avg) : 0;

    // Get latency by operation
    const byOperation: Record<
      string,
      { p50: number; p95: number; p99: number; avg: number; count: number }
    > = {};

    for (const [k, opLatencies] of this.latencyData.entries()) {
      if (k.startsWith(`${key}:op:`)) {
        const operation = k.split(':op:')[1];
        const opSorted = [...opLatencies].sort((a, b) => a - b);
        const opCount = opSorted.length;

        byOperation[operation] = {
          p50: opCount > 0 ? this.percentile(opSorted, 50) : 0,
          p95: opCount > 0 ? this.percentile(opSorted, 95) : 0,
          p99: opCount > 0 ? this.percentile(opSorted, 99) : 0,
          avg: opCount > 0 ? opSorted.reduce((a, b) => a + b, 0) / opCount : 0,
          count: opCount,
        };
      }
    }

    return {
      tenantId,
      connectorId,
      period,
      timestamp: new Date(),
      p50,
      p95,
      p99,
      avg,
      min,
      max,
      stdDev,
      sampleCount: count,
      byOperation,
    };
  }

  /**
   * Get error metrics for a tenant
   */
  getErrorMetrics(tenantId: string, period: TimeWindow, connectorId?: string): ErrorMetrics {
    const key = this.buildKey(tenantId, connectorId);
    const windowMs = this.getWindowMs(period);
    const cutoff = new Date(Date.now() - windowMs);

    const errors = (this.errorData.get(key) || []).filter((e) => e.timestamp >= cutoff);
    const totalErrors = errors.length;

    const requestKey = `${key}:total`;
    const totalRequests = this.requestData.get(requestKey) || 0;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    // Group by error type
    const byErrorType: Record<string, { count: number; lastOccurred: Date; sample?: string }> = {};

    for (const error of errors) {
      if (!byErrorType[error.type]) {
        byErrorType[error.type] = {
          count: 0,
          lastOccurred: error.timestamp,
          sample: error.message,
        };
      }
      byErrorType[error.type].count++;
      if (error.timestamp > byErrorType[error.type].lastOccurred) {
        byErrorType[error.type].lastOccurred = error.timestamp;
        if (error.message) {
          byErrorType[error.type].sample = error.message;
        }
      }
    }

    // By connector
    const byConnector: Record<string, { errors: number; total: number; rate: number }> = {};

    if (!connectorId) {
      for (const [k, connectorErrors] of this.errorData.entries()) {
        if (k.startsWith(`${tenantId}:`) && k !== key) {
          const cId = k.split(':')[1];
          const connectorTotal = this.requestData.get(`${tenantId}:${cId}:total`) || 0;
          const connectorErrorCount = connectorErrors.filter((e) => e.timestamp >= cutoff).length;
          byConnector[cId] = {
            errors: connectorErrorCount,
            total: connectorTotal,
            rate: connectorTotal > 0 ? (connectorErrorCount / connectorTotal) * 100 : 0,
          };
        }
      }
    }

    // Calculate trend (comparing current half to previous half of window)
    const midpoint = new Date(Date.now() - windowMs / 2);
    const recentErrors = errors.filter((e) => e.timestamp >= midpoint).length;
    const olderErrors = errors.filter((e) => e.timestamp < midpoint).length;

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let trendPercentage = 0;

    if (olderErrors > 0) {
      trendPercentage = ((recentErrors - olderErrors) / olderErrors) * 100;
      if (trendPercentage > 10) {
        trend = 'increasing';
      } else if (trendPercentage < -10) {
        trend = 'decreasing';
      }
    } else if (recentErrors > 0) {
      trend = 'increasing';
      trendPercentage = 100;
    }

    return {
      tenantId,
      connectorId,
      period,
      timestamp: new Date(),
      totalErrors,
      totalRequests,
      errorRate,
      byErrorType,
      byConnector,
      trend,
      trendPercentage,
    };
  }

  /**
   * Get time series data for a metric
   */
  getTimeSeries(
    tenantId: string,
    metric: string,
    period: TimeWindow,
    connectorId?: string,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile' = 'avg',
    intervalSeconds = 60,
  ): TimeSeries {
    const key = this.buildKey(tenantId, connectorId);
    const metricKey = `${key}:${metric}`;
    const windowMs = this.getWindowMs(period);
    const cutoff = new Date(Date.now() - windowMs);

    const points = (this.throughputData.get(metricKey) || []).filter((p) => p.timestamp >= cutoff);

    // Bucket points by interval
    const buckets: Map<number, number[]> = new Map();
    for (const point of points) {
      const bucketTime =
        Math.floor(point.timestamp.getTime() / (intervalSeconds * 1000)) * (intervalSeconds * 1000);
      const bucket = buckets.get(bucketTime) || [];
      bucket.push(point.value);
      buckets.set(bucketTime, bucket);
    }

    // Aggregate each bucket
    const dataPoints: MetricDataPoint[] = [];
    for (const [timestamp, values] of buckets.entries()) {
      let value: number;
      switch (aggregation) {
        case 'sum':
          value = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          value = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          value = Math.min(...values);
          break;
        case 'max':
          value = Math.max(...values);
          break;
        case 'count':
          value = values.length;
          break;
        case 'percentile':
          value = this.percentile(
            [...values].sort((a, b) => a - b),
            95,
          );
          break;
        default:
          value = values.reduce((a, b) => a + b, 0);
      }
      dataPoints.push({ timestamp: new Date(timestamp), value });
    }

    // Sort by timestamp
    dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      metric,
      tenantId,
      connectorId,
      period,
      dataPoints,
      aggregation,
    };
  }

  /**
   * Get dashboard KPIs
   */
  getDashboardKPIs(
    tenantId: string,
    period: TimeWindow = '24h',
    connectorId?: string,
  ): DashboardKPIs {
    const throughput = this.getThroughputMetrics(tenantId, period, connectorId);
    const latency = this.getLatencyMetrics(tenantId, period, connectorId);
    const errors = this.getErrorMetrics(tenantId, period, connectorId);

    // Build top errors list
    const topErrors = Object.entries(errors.byErrorType)
      .map(([errorType, data]) => ({
        errorType,
        count: data.count,
        lastOccurred: data.lastOccurred,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      tenantId,
      period,
      generatedAt: new Date(),
      messagesThroughput: {
        total: throughput.messagesReceived,
        successful: throughput.messagesProcessed,
        failed: throughput.messagesFailed,
        rate: throughput.receiveRate,
      },
      errorMetrics: {
        totalErrors: errors.totalErrors,
        errorRate: errors.errorRate,
        errorsByType: Object.fromEntries(
          Object.entries(errors.byErrorType).map(([k, v]) => [k, v.count]),
        ),
        topErrors,
      },
      latencyMetrics: {
        p50: latency.p50,
        p95: latency.p95,
        p99: latency.p99,
        avg: latency.avg,
        min: latency.min,
        max: latency.max,
      },
      // Connector health and alerts will be filled by the controller
      // using other services
      connectorHealth: {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        unknown: 0,
      },
      alerts: {
        total: 0,
        critical: 0,
        error: 0,
        warning: 0,
        info: 0,
      },
    };
  }

  /**
   * Clear old metrics data
   */
  cleanupOldData(retentionDays: number): number {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [key, points] of this.throughputData.entries()) {
      const filtered = points.filter((p) => p.timestamp >= cutoff);
      const removed = points.length - filtered.length;
      if (removed > 0) {
        this.throughputData.set(key, filtered);
        cleaned += removed;
      }
    }

    for (const [key, errors] of this.errorData.entries()) {
      const filtered = errors.filter((e) => e.timestamp >= cutoff);
      const removed = errors.length - filtered.length;
      if (removed > 0) {
        this.errorData.set(key, filtered);
        cleaned += removed;
      }
    }

    this.logger.log(`Cleaned up ${cleaned} old metric data points`);
    return cleaned;
  }

  /**
   * Build storage key
   */
  private buildKey(tenantId: string, connectorId?: string): string {
    return connectorId ? `${tenantId}:${connectorId}` : tenantId;
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
   * Count data points in a time window
   */
  private countPointsInWindow(key: string, cutoff: Date): number {
    const points = this.throughputData.get(key) || [];
    return points.filter((p) => p.timestamp >= cutoff).length;
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }
}
