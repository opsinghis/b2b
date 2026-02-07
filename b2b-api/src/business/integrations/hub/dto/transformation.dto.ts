import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsObject,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransformationDto {
  @ApiProperty({ description: 'Transformation name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Transformation description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Source connector code' })
  @IsString()
  sourceConnector!: string;

  @ApiProperty({ description: 'Target connector code' })
  @IsString()
  targetConnector!: string;

  @ApiProperty({ description: 'Source message type' })
  @IsString()
  sourceType!: string;

  @ApiProperty({ description: 'Target message type' })
  @IsString()
  targetType!: string;

  @ApiPropertyOptional({ description: 'Is transformation active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Processing priority', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiProperty({ description: 'Source to canonical transformation rules' })
  @IsObject()
  sourceToCanonical!: Record<string, unknown>;

  @ApiProperty({ description: 'Canonical to target transformation rules' })
  @IsObject()
  canonicalToTarget!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Source schema for validation' })
  @IsOptional()
  @IsObject()
  sourceSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Canonical schema for validation' })
  @IsOptional()
  @IsObject()
  canonicalSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Target schema for validation' })
  @IsOptional()
  @IsObject()
  targetSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateTransformationDto extends PartialType(CreateTransformationDto) {}

export class TransformationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by source connector' })
  @IsOptional()
  @IsString()
  sourceConnector?: string;

  @ApiPropertyOptional({ description: 'Filter by target connector' })
  @IsOptional()
  @IsString()
  targetConnector?: string;

  @ApiPropertyOptional({ description: 'Filter by source type' })
  @IsOptional()
  @IsString()
  sourceType?: string;

  @ApiPropertyOptional({ description: 'Filter by target type' })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

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

export class TransformationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  sourceConnector!: string;

  @ApiProperty()
  targetConnector!: string;

  @ApiProperty()
  sourceType!: string;

  @ApiProperty()
  targetType!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  priority!: number;

  @ApiProperty()
  sourceToCanonical!: Record<string, unknown>;

  @ApiProperty()
  canonicalToTarget!: Record<string, unknown>;

  @ApiPropertyOptional()
  sourceSchema?: Record<string, unknown>;

  @ApiPropertyOptional()
  canonicalSchema?: Record<string, unknown>;

  @ApiPropertyOptional()
  targetSchema?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class TransformPayloadDto {
  @ApiProperty({ description: 'Source connector code' })
  @IsString()
  sourceConnector!: string;

  @ApiProperty({ description: 'Target connector code' })
  @IsString()
  targetConnector!: string;

  @ApiProperty({ description: 'Source message type' })
  @IsString()
  sourceType!: string;

  @ApiProperty({ description: 'Target message type' })
  @IsString()
  targetType!: string;

  @ApiProperty({ description: 'Payload to transform' })
  @IsObject()
  payload!: Record<string, unknown>;
}

export class TransformResultDto {
  @ApiProperty()
  success!: boolean;

  @ApiPropertyOptional()
  sourcePayload?: Record<string, unknown>;

  @ApiPropertyOptional()
  canonicalPayload?: Record<string, unknown>;

  @ApiPropertyOptional()
  targetPayload?: Record<string, unknown>;

  @ApiPropertyOptional()
  errors?: string[];

  @ApiProperty()
  transformationId!: string;
}
