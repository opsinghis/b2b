import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class OrganizationListQueryDto {
  @ApiPropertyOptional({ example: 'eng', description: 'Search by name or code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'clx1234567890', description: 'Filter by parent ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: false, description: 'Include soft-deleted organizations' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
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
