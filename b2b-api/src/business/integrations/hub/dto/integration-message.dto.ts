import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsEnum,
  Min,
  Max,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntegrationDirection, IntegrationMessageStatus } from '@prisma/client';

export class CreateIntegrationMessageDto {
  @ApiProperty({ description: 'Unique message identifier' })
  @IsString()
  messageId!: string;

  @ApiPropertyOptional({ description: 'Correlation ID for message tracking' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiProperty({ description: 'Source connector code' })
  @IsString()
  sourceConnector!: string;

  @ApiProperty({ description: 'Target connector code' })
  @IsString()
  targetConnector!: string;

  @ApiProperty({ enum: IntegrationDirection })
  @IsEnum(IntegrationDirection)
  direction!: IntegrationDirection;

  @ApiProperty({ description: 'Message type' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'Message priority (0-10)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  @ApiProperty({ description: 'Source payload' })
  @IsObject()
  sourcePayload!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Idempotency key for deduplication' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Maximum retry attempts', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateIntegrationMessageDto extends PartialType(CreateIntegrationMessageDto) {
  @ApiPropertyOptional({ enum: IntegrationMessageStatus })
  @IsOptional()
  @IsEnum(IntegrationMessageStatus)
  status?: IntegrationMessageStatus;

  @ApiPropertyOptional({ description: 'Canonical payload after transformation' })
  @IsOptional()
  @IsObject()
  canonicalPayload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Target payload after transformation' })
  @IsOptional()
  @IsObject()
  targetPayload?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Last error message' })
  @IsOptional()
  @IsString()
  lastError?: string;

  @ApiPropertyOptional({ description: 'Error details' })
  @IsOptional()
  @IsObject()
  errorDetails?: Record<string, unknown>;
}

export class IntegrationMessageQueryDto {
  @ApiPropertyOptional({ description: 'Filter by source connector' })
  @IsOptional()
  @IsString()
  sourceConnector?: string;

  @ApiPropertyOptional({ description: 'Filter by target connector' })
  @IsOptional()
  @IsString()
  targetConnector?: string;

  @ApiPropertyOptional({ enum: IntegrationMessageStatus })
  @IsOptional()
  @IsEnum(IntegrationMessageStatus)
  status?: IntegrationMessageStatus;

  @ApiPropertyOptional({ enum: IntegrationDirection })
  @IsOptional()
  @IsEnum(IntegrationDirection)
  direction?: IntegrationDirection;

  @ApiPropertyOptional({ description: 'Filter by message type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by correlation ID' })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'Include dead-letter messages', default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDlq?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class IntegrationMessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  messageId!: string;

  @ApiPropertyOptional()
  correlationId?: string;

  @ApiProperty()
  sourceConnector!: string;

  @ApiProperty()
  targetConnector!: string;

  @ApiProperty({ enum: IntegrationDirection })
  direction!: IntegrationDirection;

  @ApiProperty()
  type!: string;

  @ApiProperty({ enum: IntegrationMessageStatus })
  status!: IntegrationMessageStatus;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  sourcePayload!: Record<string, unknown>;

  @ApiPropertyOptional()
  canonicalPayload?: Record<string, unknown>;

  @ApiPropertyOptional()
  targetPayload?: Record<string, unknown>;

  @ApiProperty()
  retryCount!: number;

  @ApiProperty()
  maxRetries!: number;

  @ApiPropertyOptional()
  lastError?: string;

  @ApiPropertyOptional()
  idempotencyKey?: string;

  @ApiProperty()
  isDuplicate!: boolean;

  @ApiProperty()
  receivedAt!: Date;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  failedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ReprocessMessageDto {
  @ApiProperty({ description: 'Message ID to reprocess' })
  @IsUUID()
  id!: string;

  @ApiPropertyOptional({ description: 'Reset retry count', default: true })
  @IsOptional()
  @IsBoolean()
  resetRetryCount?: boolean;
}
