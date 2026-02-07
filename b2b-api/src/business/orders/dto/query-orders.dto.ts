import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class QueryOrdersDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Search by order number' })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiPropertyOptional({ description: 'Filter from date (ISO string)' })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date (ISO string)' })
  @IsOptional()
  @IsString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AdminQueryOrdersDto extends QueryOrdersDto {
  @ApiPropertyOptional({ description: 'Filter by user ID (admin only)' })
  @IsOptional()
  @IsString()
  userId?: string;
}
