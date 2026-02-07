import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalEntity } from '@prisma/client';

export class ApprovalChainQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by entity type',
    enum: ApprovalEntity,
  })
  @IsOptional()
  @IsEnum(ApprovalEntity)
  entityType?: ApprovalEntity;

  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10) || 20)
  limit?: number;
}
