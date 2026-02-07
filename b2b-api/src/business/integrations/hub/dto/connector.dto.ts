import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IntegrationConnectorType,
  IntegrationDirection,
  CircuitBreakerState,
  ConnectorHealthStatus,
} from '@prisma/client';

export class CreateConnectorDto {
  @ApiProperty({ description: 'Unique connector code' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Connector name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Connector description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: IntegrationConnectorType })
  @IsEnum(IntegrationConnectorType)
  type!: IntegrationConnectorType;

  @ApiProperty({ enum: IntegrationDirection })
  @IsEnum(IntegrationDirection)
  direction!: IntegrationDirection;

  @ApiPropertyOptional({ description: 'Is connector active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Connector configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Rate limit (requests per window)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Rate limit window in seconds' })
  @IsOptional()
  @IsInt()
  @Min(1)
  rateLimitWindow?: number;

  @ApiPropertyOptional({ description: 'Failure threshold for circuit breaker', default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  failureThreshold?: number;

  @ApiPropertyOptional({ description: 'Success threshold to close circuit', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  successThreshold?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateConnectorDto extends PartialType(CreateConnectorDto) {
  @ApiPropertyOptional({ enum: CircuitBreakerState })
  @IsOptional()
  @IsEnum(CircuitBreakerState)
  circuitState?: CircuitBreakerState;
}

export class ConnectorQueryDto {
  @ApiPropertyOptional({ enum: IntegrationConnectorType })
  @IsOptional()
  @IsEnum(IntegrationConnectorType)
  type?: IntegrationConnectorType;

  @ApiPropertyOptional({ enum: IntegrationDirection })
  @IsOptional()
  @IsEnum(IntegrationDirection)
  direction?: IntegrationDirection;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional({ enum: CircuitBreakerState })
  @IsOptional()
  @IsEnum(CircuitBreakerState)
  circuitState?: CircuitBreakerState;

  @ApiPropertyOptional({ enum: ConnectorHealthStatus })
  @IsOptional()
  @IsEnum(ConnectorHealthStatus)
  healthStatus?: ConnectorHealthStatus;

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

export class ConnectorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: IntegrationConnectorType })
  type!: IntegrationConnectorType;

  @ApiProperty({ enum: IntegrationDirection })
  direction!: IntegrationDirection;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  config!: Record<string, unknown>;

  @ApiPropertyOptional()
  rateLimit?: number;

  @ApiPropertyOptional()
  rateLimitWindow?: number;

  @ApiProperty()
  currentCount!: number;

  @ApiProperty({ enum: CircuitBreakerState })
  circuitState!: CircuitBreakerState;

  @ApiProperty()
  failureCount!: number;

  @ApiProperty()
  failureThreshold!: number;

  @ApiProperty()
  successCount!: number;

  @ApiProperty()
  successThreshold!: number;

  @ApiPropertyOptional()
  lastHealthCheck?: Date;

  @ApiProperty({ enum: ConnectorHealthStatus })
  healthStatus!: ConnectorHealthStatus;

  @ApiProperty()
  totalMessages!: number;

  @ApiProperty()
  successfulMessages!: number;

  @ApiProperty()
  failedMessages!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ConnectorHealthDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ConnectorHealthStatus })
  status!: ConnectorHealthStatus;

  @ApiProperty({ enum: CircuitBreakerState })
  circuitState!: CircuitBreakerState;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  lastHealthCheck?: Date;

  @ApiPropertyOptional()
  healthDetails?: Record<string, unknown>;

  @ApiProperty()
  metrics!: {
    totalMessages: number;
    successfulMessages: number;
    failedMessages: number;
    successRate: number;
  };
}
