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
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventPriority, EventStatus, EventType, ALL_EVENTS } from '../interfaces';

/**
 * DTO for publishing an event
 */
export class PublishEventDto {
  @ApiProperty({ description: 'Event type', example: 'order.created' })
  @IsString()
  type!: string;

  @ApiProperty({ description: 'Event payload' })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional({ enum: EventPriority, description: 'Event priority' })
  @IsOptional()
  @IsEnum(EventPriority)
  priority?: EventPriority;

  @ApiPropertyOptional({ description: 'Delay in milliseconds before processing' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(604800000) // 7 days max
  delay?: number;

  @ApiPropertyOptional({ description: 'Correlation ID for tracing' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'Event metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for batch publishing events
 */
export class PublishBatchDto {
  @ApiProperty({ type: [PublishEventDto], description: 'Events to publish' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublishEventDto)
  events!: PublishEventDto[];
}

/**
 * DTO for event subscription
 */
export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Subscription name' })
  @IsString()
  name!: string;

  @ApiProperty({ type: [String], description: 'Event types to subscribe to' })
  @IsArray()
  @IsString({ each: true })
  eventTypes!: string[];

  @ApiPropertyOptional({ description: 'Whether subscription is enabled', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Event filter configuration' })
  @IsOptional()
  @IsObject()
  filter?: {
    sources?: string[];
    metadata?: Record<string, unknown>;
    conditions?: Array<{
      path: string;
      operator: string;
      value: unknown;
    }>;
  };

  @ApiProperty({ description: 'Destination configuration' })
  @IsObject()
  destination!: {
    type: 'webhook' | 'queue' | 'email' | 'internal';
    config: Record<string, unknown>;
  };

  @ApiPropertyOptional({ description: 'Retry policy' })
  @IsOptional()
  @IsObject()
  retryPolicy?: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
}

/**
 * DTO for updating subscription
 */
export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: 'Subscription name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: [String], description: 'Event types to subscribe to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiPropertyOptional({ description: 'Whether subscription is enabled' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: 'Event filter configuration' })
  @IsOptional()
  @IsObject()
  filter?: {
    sources?: string[];
    metadata?: Record<string, unknown>;
    conditions?: Array<{
      path: string;
      operator: string;
      value: unknown;
    }>;
  };
}

/**
 * DTO for event replay request
 */
export class EventReplayRequestDto {
  @ApiProperty({ description: 'Start time for replay window' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ description: 'End time for replay window' })
  @IsDateString()
  endTime!: string;

  @ApiPropertyOptional({ type: [String], description: 'Event types to replay' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  eventTypes?: string[];

  @ApiPropertyOptional({ description: 'Subscription ID to replay to' })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiPropertyOptional({ description: 'Event filter' })
  @IsOptional()
  @IsObject()
  filter?: {
    sources?: string[];
    metadata?: Record<string, unknown>;
  };

  @ApiPropertyOptional({ description: 'Batch size for replay', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Delay between batches in ms', default: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60000)
  delayBetweenBatches?: number;
}

/**
 * DTO for event log query
 */
export class EventLogQueryDto {
  @ApiPropertyOptional({ type: [String], description: 'Filter by event types' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @ApiPropertyOptional({ enum: EventStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({ description: 'Filter by source' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Filter events after this time' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Filter events before this time' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Filter by correlation ID' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'Number of results to return', default: 50 })
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
 * DTO for retention policy
 */
export class RetentionPolicyDto {
  @ApiProperty({ description: 'Default retention in days', example: 30 })
  @IsNumber()
  @Min(1)
  @Max(365)
  defaultDays!: number;

  @ApiPropertyOptional({ description: 'Retention by event type' })
  @IsOptional()
  @IsObject()
  byType?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Retention by event status' })
  @IsOptional()
  @IsObject()
  byStatus?: Record<string, number>;
}

/**
 * Response DTO for published event
 */
export class PublishedEventResponseDto {
  @ApiProperty({ description: 'Event ID' })
  id!: string;

  @ApiProperty({ description: 'Event type' })
  type!: string;

  @ApiProperty({ description: 'Event status' })
  status!: EventStatus;

  @ApiProperty({ description: 'Published timestamp' })
  publishedAt!: Date;
}

/**
 * Response DTO for event statistics
 */
export class EventStatsResponseDto {
  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ description: 'Statistics period' })
  period!: string;

  @ApiProperty({ description: 'Event counts by type' })
  eventCounts!: Record<string, number>;

  @ApiProperty({ description: 'Total events' })
  totalEvents!: number;

  @ApiProperty({ description: 'Successful deliveries' })
  successfulDeliveries!: number;

  @ApiProperty({ description: 'Failed deliveries' })
  failedDeliveries!: number;

  @ApiProperty({ description: 'Average delivery time in ms' })
  avgDeliveryTime!: number;

  @ApiProperty({ description: 'Retry count' })
  retryCount!: number;
}

/**
 * Response DTO for queue statistics
 */
export class QueueStatsResponseDto {
  @ApiProperty({ description: 'Events waiting in queue' })
  waiting!: number;

  @ApiProperty({ description: 'Events being processed' })
  active!: number;

  @ApiProperty({ description: 'Completed events' })
  completed!: number;

  @ApiProperty({ description: 'Failed events' })
  failed!: number;

  @ApiProperty({ description: 'Delayed events' })
  delayed!: number;
}

/**
 * Response DTO for replay status
 */
export class ReplayStatusResponseDto {
  @ApiProperty({ description: 'Replay request ID' })
  requestId!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ description: 'Replay status' })
  status!: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

  @ApiProperty({ description: 'Total events to replay' })
  totalEvents!: number;

  @ApiProperty({ description: 'Events processed' })
  processedEvents!: number;

  @ApiProperty({ description: 'Failed events' })
  failedEvents!: number;

  @ApiProperty({ description: 'Replay started at' })
  startedAt!: Date;

  @ApiPropertyOptional({ description: 'Replay completed at' })
  completedAt?: Date;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error?: string;
}
