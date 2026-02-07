import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class DeadLetterQueryDto {
  @ApiPropertyOptional({ description: 'Filter by connector' })
  @IsOptional()
  @IsString()
  connector?: string;

  @ApiPropertyOptional({ description: 'Filter by reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Filter by retryable status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  retryable?: boolean;

  @ApiPropertyOptional({ description: 'Filter reprocessed messages' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  reprocessed?: boolean;

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

export class DeadLetterResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  originalMessageId!: string;

  @ApiProperty()
  connector!: string;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  errorStack?: string;

  @ApiProperty()
  payload!: Record<string, unknown>;

  @ApiProperty()
  metadata!: Record<string, unknown>;

  @ApiProperty()
  retryable!: boolean;

  @ApiPropertyOptional()
  reprocessedAt?: Date;

  @ApiPropertyOptional()
  reprocessedById?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ReprocessDeadLetterDto {
  @ApiProperty({ description: 'Dead letter message ID' })
  @IsUUID()
  id!: string;
}

export class BulkReprocessDto {
  @ApiPropertyOptional({ description: 'Reprocess by connector' })
  @IsOptional()
  @IsString()
  connector?: string;

  @ApiPropertyOptional({ description: 'Reprocess by reason' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Maximum messages to reprocess', default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export class BulkReprocessResultDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  successful!: number;

  @ApiProperty()
  failed!: number;

  @ApiProperty()
  errors!: { id: string; error: string }[];
}

export class DeadLetterStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  retryable!: number;

  @ApiProperty()
  nonRetryable!: number;

  @ApiProperty()
  reprocessed!: number;

  @ApiProperty()
  byConnector!: { connector: string; count: number }[];

  @ApiProperty()
  byReason!: { reason: string; count: number }[];
}
