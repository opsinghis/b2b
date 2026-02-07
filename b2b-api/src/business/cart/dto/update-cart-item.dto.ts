import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsInt, Min, IsObject } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Updated quantity',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @IsPositive()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Updated discount',
    example: 15.0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { notes: 'Updated notes' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
