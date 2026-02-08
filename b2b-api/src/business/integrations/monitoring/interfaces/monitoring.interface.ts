/**
 * Monitoring interfaces for Integration Hub
 */

/**
 * Metric types for tracking
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Time window for metric aggregation
 */
export type TimeWindow = '1m' | '5m' | '15m' | '1h' | '6h' | '24h' | '7d' | '30d';

/**
 * Connector health status
 */
export enum ConnectorHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Alert status
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SILENCED = 'silenced',
}

/**
 * Audit action types
 */
export enum AuditAction {
  // Connector actions
  CONNECTOR_REGISTERED = 'connector.registered',
  CONNECTOR_UPDATED = 'connector.updated',
  CONNECTOR_DELETED = 'connector.deleted',
  CONNECTOR_ENABLED = 'connector.enabled',
  CONNECTOR_DISABLED = 'connector.disabled',
  CONNECTOR_TESTED = 'connector.tested',

  // Configuration actions
  CONFIG_CREATED = 'config.created',
  CONFIG_UPDATED = 'config.updated',
  CONFIG_DELETED = 'config.deleted',

  // Credential actions
  CREDENTIAL_CREATED = 'credential.created',
  CREDENTIAL_UPDATED = 'credential.updated',
  CREDENTIAL_DELETED = 'credential.deleted',
  CREDENTIAL_ROTATED = 'credential.rotated',

  // Event actions
  EVENT_PUBLISHED = 'event.published',
  EVENT_DELIVERED = 'event.delivered',
  EVENT_FAILED = 'event.failed',
  EVENT_REPLAYED = 'event.replayed',

  // Subscription actions
  SUBSCRIPTION_CREATED = 'subscription.created',
  SUBSCRIPTION_UPDATED = 'subscription.updated',
  SUBSCRIPTION_DELETED = 'subscription.deleted',

  // Webhook actions
  WEBHOOK_DELIVERED = 'webhook.delivered',
  WEBHOOK_FAILED = 'webhook.failed',
  WEBHOOK_RETRIED = 'webhook.retried',

  // Alert actions
  ALERT_TRIGGERED = 'alert.triggered',
  ALERT_ACKNOWLEDGED = 'alert.acknowledged',
  ALERT_RESOLVED = 'alert.resolved',

  // REST connector actions
  REST_REQUEST_SENT = 'rest.request.sent',
  REST_RESPONSE_RECEIVED = 'rest.response.received',
  REST_REQUEST_FAILED = 'rest.request.failed',
}

/**
 * Dashboard KPIs
 */
export interface DashboardKPIs {
  tenantId: string;
  period: TimeWindow;
  generatedAt: Date;

  // Message throughput
  messagesThroughput: {
    total: number;
    successful: number;
    failed: number;
    rate: number; // per minute
  };

  // Error metrics
  errorMetrics: {
    totalErrors: number;
    errorRate: number; // percentage
    errorsByType: Record<string, number>;
    topErrors: Array<{
      errorType: string;
      count: number;
      lastOccurred: Date;
    }>;
  };

  // Latency percentiles
  latencyMetrics: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
  };

  // Connector health summary
  connectorHealth: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };

  // Active alerts
  alerts: {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
}

/**
 * Message throughput metrics
 */
export interface ThroughputMetrics {
  tenantId: string;
  connectorId?: string;
  period: TimeWindow;
  timestamp: Date;

  // Counts
  messagesReceived: number;
  messagesProcessed: number;
  messagesFailed: number;
  messagesRetried: number;

  // Rates
  receiveRate: number; // per minute
  processRate: number;
  failureRate: number;

  // By type
  byEventType: Record<string, number>;
  byConnector: Record<string, number>;
}

/**
 * Latency metrics
 */
export interface LatencyMetrics {
  tenantId: string;
  connectorId?: string;
  period: TimeWindow;
  timestamp: Date;

  // Percentiles
  p50: number;
  p95: number;
  p99: number;

  // Aggregates
  avg: number;
  min: number;
  max: number;
  stdDev: number;

  // Sample count
  sampleCount: number;

  // By operation
  byOperation: Record<
    string,
    {
      p50: number;
      p95: number;
      p99: number;
      avg: number;
      count: number;
    }
  >;
}

/**
 * Error rate metrics
 */
export interface ErrorMetrics {
  tenantId: string;
  connectorId?: string;
  period: TimeWindow;
  timestamp: Date;

  // Counts
  totalErrors: number;
  totalRequests: number;
  errorRate: number; // percentage

  // By error type
  byErrorType: Record<
    string,
    {
      count: number;
      lastOccurred: Date;
      sample?: string; // sample error message
    }
  >;

  // By connector
  byConnector: Record<
    string,
    {
      errors: number;
      total: number;
      rate: number;
    }
  >;

  // Trending
  trend: 'increasing' | 'stable' | 'decreasing';
  trendPercentage: number;
}

/**
 * Connector health check result
 */
export interface ConnectorHealthCheck {
  connectorId: string;
  tenantId: string;
  status: ConnectorHealthStatus;
  checkedAt: Date;

  // Response time
  responseTime?: number;

  // Connectivity
  connectivity: {
    reachable: boolean;
    latency?: number;
    lastSuccessfulConnection?: Date;
  };

  // Authentication
  authentication: {
    valid: boolean;
    expiresAt?: Date;
    lastRefreshed?: Date;
  };

  // Rate limits
  rateLimits?: {
    remaining: number;
    limit: number;
    resetsAt: Date;
  };

  // Recent errors
  recentErrors: Array<{
    error: string;
    timestamp: Date;
    count: number;
  }>;

  // Uptime
  uptime: {
    percentage: number;
    period: TimeWindow;
    downtimeMinutes: number;
  };

  // Details
  details?: Record<string, unknown>;
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  enabled: boolean;

  // Condition
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number;
  duration?: number; // seconds the condition must persist

  // Scope
  connectorId?: string; // null for tenant-wide
  eventType?: string;

  // Alert settings
  severity: AlertSeverity;
  cooldownMinutes: number; // minimum time between alerts

  // Notification
  notificationChannels: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Alert instance
 */
export interface Alert {
  id: string;
  thresholdId: string;
  tenantId: string;
  severity: AlertSeverity;
  status: AlertStatus;

  // Condition details
  metric: string;
  actualValue: number;
  thresholdValue: number;
  message: string;

  // Scope
  connectorId?: string;
  eventType?: string;

  // Timing
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  silencedUntil?: Date;

  // Actions
  acknowledgedBy?: string;
  resolvedBy?: string;

  // Context
  context?: Record<string, unknown>;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  action: AuditAction;
  timestamp: Date;

  // Actor
  actor: {
    type: 'user' | 'system' | 'api' | 'scheduler';
    id?: string;
    name?: string;
    ip?: string;
  };

  // Resource
  resource: {
    type: string;
    id: string;
    name?: string;
  };

  // Changes
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };

  // Request context
  request?: {
    method: string;
    path: string;
    userAgent?: string;
    correlationId?: string;
  };

  // Result
  result: {
    success: boolean;
    error?: string;
    duration?: number;
  };

  // Metadata
  metadata?: Record<string, unknown>;
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  tenantId: string;

  // Metric retention
  metrics: {
    rawDataDays: number;
    aggregatedDataDays: number;
    summaryDataDays: number;
  };

  // Audit log retention
  auditLogs: {
    defaultDays: number;
    byAction?: Partial<Record<AuditAction, number>>;
  };

  // Alert retention
  alerts: {
    activeDays: number;
    resolvedDays: number;
  };

  // Archive settings
  archive: {
    enabled: boolean;
    destination?: string; // e.g., S3 bucket
    format?: 'json' | 'parquet' | 'csv';
  };
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, string>;
}

/**
 * Time series data
 */
export interface TimeSeries {
  metric: string;
  tenantId: string;
  connectorId?: string;
  period: TimeWindow;
  dataPoints: MetricDataPoint[];
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  connectorId: string;
  tenantId: string;
  enabled: boolean;

  // Schedule
  intervalSeconds: number;
  timeoutSeconds: number;

  // Thresholds
  unhealthyThreshold: number; // consecutive failures
  healthyThreshold: number; // consecutive successes

  // Custom checks
  customChecks?: Array<{
    name: string;
    type: 'http' | 'tcp' | 'custom';
    config: Record<string, unknown>;
  }>;
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  id: string;
  tenantId: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams';
  enabled: boolean;

  config:
    | EmailChannelConfig
    | SlackChannelConfig
    | WebhookChannelConfig
    | PagerDutyChannelConfig
    | TeamsChannelConfig;

  // Filters
  minSeverity: AlertSeverity;
  alertTypes?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface EmailChannelConfig {
  recipients: string[];
  subject?: string;
  template?: string;
}

export interface SlackChannelConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

export interface WebhookChannelConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  auth?: {
    type: 'none' | 'basic' | 'bearer' | 'api_key';
    credentials?: Record<string, string>;
  };
}

export interface PagerDutyChannelConfig {
  integrationKey: string;
  severity?: string;
}

export interface TeamsChannelConfig {
  webhookUrl: string;
  title?: string;
}
