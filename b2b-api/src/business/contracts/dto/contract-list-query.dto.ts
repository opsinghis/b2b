import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ContractStatus } from '@prisma/client';

export class ContractListQueryDto {
  @ApiPropertyOptional({ example: 'service', description: 'Search in title and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ContractStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ example: 'org-id-123', description: 'Filter by organization' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ example: false, description: 'Include soft-deleted contracts' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
