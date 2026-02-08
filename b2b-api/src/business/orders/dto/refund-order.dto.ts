import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundOrderDto {
  @ApiProperty({
    description: 'Refund amount',
    example: 99.99,
    minimum: 0.01,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({
    description: 'Reason for refund',
    example: 'Customer requested refund',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
