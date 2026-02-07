import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsDateString,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TimeWindow,
  AlertSeverity,
  AlertStatus,
  AuditAction,
  ConnectorHealthStatus,
} from '../interfaces';

/**
 * Query DTO for dashboard KPIs
 */
export class DashboardKPIsQueryDto {
  @ApiPropertyOptional({
    enum: ['1m', '5m', '15m', '1h', '6h', '24h', '7d', '30d'],
    default: '24h',
    description: 'Time window for metrics',
  })
  @IsOptional()
  @IsString()
  period?: TimeWindow;

  @ApiPropertyOptional({ description: 'Filter by connector ID' })
  @IsOptional()
  @IsString()
  connectorId?: string;
}

/**
 * Response DTO for dashboard KPIs
 */
export class DashboardKPIsResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ description: 'Time period' })
  period!: TimeWindow;

  @ApiProperty({ description: 'Generated timestamp' })
  generatedAt!: Date;

  @ApiProperty({ description: 'Message throughput metrics' })
  messagesThroughput!: {
    total: number;
    successful: number;
    failed: number;
    rate: number;
  };

  @ApiProperty({ description: 'Error metrics' })
  errorMetrics!: {
    totalErrors: number;
    errorRate: number;
    errorsByType: Record<string, number>;
    topErrors: Array<{
      errorType: string;
      count: number;
      lastOccurred: Date;
    }>;
  };

  @ApiProperty({ description: 'Latency percentiles (ms)' })
  latencyMetrics!: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
  };

  @ApiProperty({ description: 'Connector health summary' })
  connectorHealth!: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };

  @ApiProperty({ description: 'Active alerts summary' })
  alerts!: {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
  };
}

/**
 * Query DTO for metrics
 */
export class MetricsQueryDto {
  @ApiProperty({
    enum: ['1m', '5m', '15m', '1h', '6h', '24h', '7d', '30d'],
    description: 'Time window',
  })
  @IsString()
  period!: TimeWindow;

  @ApiPropertyOptional({ description: 'Filter by connector ID' })
  @IsOptional()
  @IsString()
  connectorId?: string;

  @ApiPropertyOptional({ description: 'Filter by event type' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Start time for custom range' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time for custom range' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    enum: ['sum', 'avg', 'min', 'max', 'count'],
    default: 'sum',
    description: 'Aggregation function',
  })
  @IsOptional()
  @IsString()
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

/**
 * Response DTO for throughput metrics
 */
export class ThroughputMetricsResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiPropertyOptional({ description: 'Connector ID' })
  connectorId?: string;

  @ApiProperty({ description: 'Time period' })
  period!: TimeWindow;

  @ApiProperty({ description: 'Timestamp' })
  timestamp!: Date;

  @ApiProperty({ description: 'Messages received' })
  messagesReceived!: number;

  @ApiProperty({ description: 'Messages processed' })
  messagesProcessed!: number;

  @ApiProperty({ description: 'Messages failed' })
  messagesFailed!: number;

  @ApiProperty({ description: 'Messages retried' })
  messagesRetried!: number;

  @ApiProperty({ description: 'Receive rate per minute' })
  receiveRate!: number;

  @ApiProperty({ description: 'Process rate per minute' })
  processRate!: number;

  @ApiProperty({ description: 'Failure rate percentage' })
  failureRate!: number;

  @ApiProperty({ description: 'Counts by event type' })
  byEventType!: Record<string, number>;

  @ApiProperty({ description: 'Counts by connector' })
  byConnector!: Record<string, number>;
}

/**
 * Response DTO for latency metrics
 */
export class LatencyMetricsResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiPropertyOptional({ description: 'Connector ID' })
  connectorId?: string;

  @ApiProperty({ description: 'Time period' })
  period!: TimeWindow;

  @ApiProperty({ description: 'p50 latency in ms' })
  p50!: number;

  @ApiProperty({ description: 'p95 latency in ms' })
  p95!: number;

  @ApiProperty({ description: 'p99 latency in ms' })
  p99!: number;

  @ApiProperty({ description: 'Average latency in ms' })
  avg!: number;

  @ApiProperty({ description: 'Minimum latency in ms' })
  min!: number;

  @ApiProperty({ description: 'Maximum latency in ms' })
  max!: number;

  @ApiProperty({ description: 'Standard deviation' })
  stdDev!: number;

  @ApiProperty({ description: 'Sample count' })
  sampleCount!: number;

  @ApiProperty({ description: 'Latency by operation' })
  byOperation!: Record<
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
 * Response DTO for error metrics
 */
export class ErrorMetricsResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiPropertyOptional({ description: 'Connector ID' })
  connectorId?: string;

  @ApiProperty({ description: 'Time period' })
  period!: TimeWindow;

  @ApiProperty({ description: 'Total errors' })
  totalErrors!: number;

  @ApiProperty({ description: 'Total requests' })
  totalRequests!: number;

  @ApiProperty({ description: 'Error rate percentage' })
  errorRate!: number;

  @ApiProperty({ description: 'Errors by type' })
  byErrorType!: Record<
    string,
    {
      count: number;
      lastOccurred: Date;
      sample?: string;
    }
  >;

  @ApiProperty({ description: 'Errors by connector' })
  byConnector!: Record<
    string,
    {
      errors: number;
      total: number;
      rate: number;
    }
  >;

  @ApiProperty({
    enum: ['increasing', 'stable', 'decreasing'],
    description: 'Error trend',
  })
  trend!: 'increasing' | 'stable' | 'decreasing';

  @ApiProperty({ description: 'Trend percentage' })
  trendPercentage!: number;
}

/**
 * DTO for connector health query
 */
export class ConnectorHealthQueryDto {
  @ApiPropertyOptional({ description: 'Filter by connector ID' })
  @IsOptional()
  @IsString()
  connectorId?: string;

  @ApiPropertyOptional({
    enum: ConnectorHealthStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(ConnectorHealthStatus)
  status?: ConnectorHealthStatus;
}

/**
 * Response DTO for connector health
 */
export class ConnectorHealthResponseDto {
  @ApiProperty({ description: 'Connector ID' })
  connectorId!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ enum: ConnectorHealthStatus, description: 'Health status' })
  status!: ConnectorHealthStatus;

  @ApiProperty({ description: 'Checked at timestamp' })
  checkedAt!: Date;

  @ApiPropertyOptional({ description: 'Response time in ms' })
  responseTime?: number;

  @ApiProperty({ description: 'Connectivity status' })
  connectivity!: {
    reachable: boolean;
    latency?: number;
    lastSuccessfulConnection?: Date;
  };

  @ApiProperty({ description: 'Authentication status' })
  authentication!: {
    valid: boolean;
    expiresAt?: Date;
    lastRefreshed?: Date;
  };

  @ApiPropertyOptional({ description: 'Rate limit info' })
  rateLimits?: {
    remaining: number;
    limit: number;
    resetsAt: Date;
  };

  @ApiProperty({ description: 'Recent errors' })
  recentErrors!: Array<{
    error: string;
    timestamp: Date;
    count: number;
  }>;

  @ApiProperty({ description: 'Uptime metrics' })
  uptime!: {
    percentage: number;
    period: TimeWindow;
    downtimeMinutes: number;
  };
}

/**
 * DTO for creating alert threshold
 */
export class CreateAlertThresholdDto {
  @ApiProperty({ description: 'Alert name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Alert description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Metric to monitor', example: 'error_rate' })
  @IsString()
  metric!: string;

  @ApiProperty({
    enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne'],
    description: 'Comparison operator',
  })
  @IsString()
  operator!: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';

  @ApiProperty({ description: 'Threshold value', example: 5 })
  @IsNumber()
  value!: number;

  @ApiPropertyOptional({
    description: 'Duration in seconds the condition must persist',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Connector ID for scoped alerts' })
  @IsOptional()
  @IsString()
  connectorId?: string;

  @ApiPropertyOptional({ description: 'Event type for scoped alerts' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({ enum: AlertSeverity, description: 'Alert severity' })
  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @ApiPropertyOptional({
    description: 'Cooldown minutes between alerts',
    default: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  cooldownMinutes?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Notification channel IDs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationChannels?: string[];
}

/**
 * DTO for updating alert threshold
 */
export class UpdateAlertThresholdDto {
  @ApiPropertyOptional({ description: 'Alert name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Alert description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether alert is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Threshold value' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({
    enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne'],
    description: 'Comparison operator',
  })
  @IsOptional()
  @IsString()
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ enum: AlertSeverity, description: 'Alert severity' })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: 'Cooldown minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440)
  cooldownMinutes?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Notification channel IDs',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationChannels?: string[];
}

/**
 * Query DTO for alerts
 */
export class AlertsQueryDto {
  @ApiPropertyOptional({ enum: AlertStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional({
    enum: AlertSeverity,
    description: 'Filter by severity',
  })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: 'Filter by connector ID' })
  @IsOptional()
  @IsString()
  connectorId?: string;

  @ApiPropertyOptional({ description: 'Filter by threshold ID' })
  @IsOptional()
  @IsString()
  thresholdId?: string;

  @ApiPropertyOptional({ description: 'Alerts after this time' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Alerts before this time' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Limit results', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * Response DTO for alert
 */
export class AlertResponseDto {
  @ApiProperty({ description: 'Alert ID' })
  id!: string;

  @ApiProperty({ description: 'Threshold ID' })
  thresholdId!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ enum: AlertSeverity, description: 'Severity' })
  severity!: AlertSeverity;

  @ApiProperty({ enum: AlertStatus, description: 'Status' })
  status!: AlertStatus;

  @ApiProperty({ description: 'Metric name' })
  metric!: string;

  @ApiProperty({ description: 'Actual value' })
  actualValue!: number;

  @ApiProperty({ description: 'Threshold value' })
  thresholdValue!: number;

  @ApiProperty({ description: 'Alert message' })
  message!: string;

  @ApiPropertyOptional({ description: 'Connector ID' })
  connectorId?: string;

  @ApiProperty({ description: 'Triggered at timestamp' })
  triggeredAt!: Date;

  @ApiPropertyOptional({ description: 'Acknowledged at timestamp' })
  acknowledgedAt?: Date;

  @ApiPropertyOptional({ description: 'Resolved at timestamp' })
  resolvedAt?: Date;
}

/**
 * DTO for acknowledging alert
 */
export class AcknowledgeAlertDto {
  @ApiPropertyOptional({ description: 'Acknowledgment note' })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * DTO for resolving alert
 */
export class ResolveAlertDto {
  @ApiPropertyOptional({ description: 'Resolution note' })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * DTO for silencing alert
 */
export class SilenceAlertDto {
  @ApiProperty({ description: 'Silence duration in minutes' })
  @IsNumber()
  @Min(1)
  @Max(10080) // 7 days max
  durationMinutes!: number;

  @ApiPropertyOptional({ description: 'Reason for silencing' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Query DTO for audit logs
 */
export class AuditLogQueryDto {
  @ApiPropertyOptional({ enum: AuditAction, description: 'Filter by action' })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ description: 'Filter by resource type' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Filter by resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor ID' })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Filter by success status' })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({ description: 'Logs after this time' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Logs before this time' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Limit results', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

/**
 * Response DTO for audit log entry
 */
export class AuditLogResponseDto {
  @ApiProperty({ description: 'Log entry ID' })
  id!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ enum: AuditAction, description: 'Action performed' })
  action!: AuditAction;

  @ApiProperty({ description: 'Timestamp' })
  timestamp!: Date;

  @ApiProperty({ description: 'Actor information' })
  actor!: {
    type: 'user' | 'system' | 'api' | 'scheduler';
    id?: string;
    name?: string;
    ip?: string;
  };

  @ApiProperty({ description: 'Resource information' })
  resource!: {
    type: string;
    id: string;
    name?: string;
  };

  @ApiPropertyOptional({ description: 'Changes made' })
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };

  @ApiProperty({ description: 'Operation result' })
  result!: {
    success: boolean;
    error?: string;
    duration?: number;
  };
}

/**
 * DTO for recording audit log
 */
export class RecordAuditLogDto {
  @ApiProperty({ enum: AuditAction, description: 'Action to record' })
  @IsEnum(AuditAction)
  action!: AuditAction;

  @ApiProperty({ description: 'Resource type' })
  @IsString()
  resourceType!: string;

  @ApiProperty({ description: 'Resource ID' })
  @IsString()
  resourceId!: string;

  @ApiPropertyOptional({ description: 'Resource name' })
  @IsOptional()
  @IsString()
  resourceName?: string;

  @ApiPropertyOptional({ description: 'Changes before' })
  @IsOptional()
  @IsObject()
  changesBefore?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Changes after' })
  @IsOptional()
  @IsObject()
  changesAfter?: Record<string, unknown>;

  @ApiProperty({ description: 'Operation success status' })
  @IsBoolean()
  success!: boolean;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'Operation duration in ms' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for retention policy
 */
export class UpdateRetentionPolicyDto {
  @ApiPropertyOptional({ description: 'Metrics retention settings' })
  @IsOptional()
  @IsObject()
  metrics?: {
    rawDataDays: number;
    aggregatedDataDays: number;
    summaryDataDays: number;
  };

  @ApiPropertyOptional({ description: 'Audit logs retention settings' })
  @IsOptional()
  @IsObject()
  auditLogs?: {
    defaultDays: number;
    byAction?: Record<string, number>;
  };

  @ApiPropertyOptional({ description: 'Alerts retention settings' })
  @IsOptional()
  @IsObject()
  alerts?: {
    activeDays: number;
    resolvedDays: number;
  };

  @ApiPropertyOptional({ description: 'Archive settings' })
  @IsOptional()
  @IsObject()
  archive?: {
    enabled: boolean;
    destination?: string;
    format?: 'json' | 'parquet' | 'csv';
  };
}

/**
 * Response DTO for retention policy
 */
export class RetentionPolicyResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ description: 'Metrics retention settings' })
  metrics!: {
    rawDataDays: number;
    aggregatedDataDays: number;
    summaryDataDays: number;
  };

  @ApiProperty({ description: 'Audit logs retention settings' })
  auditLogs!: {
    defaultDays: number;
    byAction?: Record<string, number>;
  };

  @ApiProperty({ description: 'Alerts retention settings' })
  alerts!: {
    activeDays: number;
    resolvedDays: number;
  };

  @ApiProperty({ description: 'Archive settings' })
  archive!: {
    enabled: boolean;
    destination?: string;
    format?: 'json' | 'parquet' | 'csv';
  };
}

/**
 * DTO for time series query
 */
export class TimeSeriesQueryDto {
  @ApiProperty({ description: 'Metric name' })
  @IsString()
  metric!: string;

  @ApiProperty({
    enum: ['1m', '5m', '15m', '1h', '6h', '24h', '7d', '30d'],
    description: 'Time window',
  })
  @IsString()
  period!: TimeWindow;

  @ApiPropertyOptional({ description: 'Filter by connector ID' })
  @IsOptional()
  @IsString()
  connectorId?: string;

  @ApiPropertyOptional({
    enum: ['sum', 'avg', 'min', 'max', 'count', 'percentile'],
    default: 'avg',
    description: 'Aggregation function',
  })
  @IsOptional()
  @IsString()
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';

  @ApiPropertyOptional({
    description: 'Data point interval in seconds',
    default: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  intervalSeconds?: number;
}

/**
 * Response DTO for time series data
 */
export class TimeSeriesResponseDto {
  @ApiProperty({ description: 'Metric name' })
  metric!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiPropertyOptional({ description: 'Connector ID' })
  connectorId?: string;

  @ApiProperty({ description: 'Time period' })
  period!: TimeWindow;

  @ApiProperty({ description: 'Data points' })
  dataPoints!: Array<{
    timestamp: Date;
    value: number;
    labels?: Record<string, string>;
  }>;

  @ApiProperty({ description: 'Aggregation used' })
  aggregation!: string;
}
