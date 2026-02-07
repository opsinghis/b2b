import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MasterProductStatus } from '@prisma/client';

export class MasterProductListQueryDto {
  @ApiPropertyOptional({
    description: 'Search term for name, SKU, or description',
    example: 'software',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Software',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by subcategory',
    example: 'Licenses',
  })
  @IsString()
  @IsOptional()
  subcategory?: string;

  @ApiPropertyOptional({
    description: 'Filter by brand',
    example: 'Acme Corp',
  })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: MasterProductStatus,
  })
  @IsEnum(MasterProductStatus)
  @IsOptional()
  status?: MasterProductStatus;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  limit?: number = 20;
}
