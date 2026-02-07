import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';
import { AddressDto } from './create-order.dto';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Order status',
    enum: OrderStatus,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Order notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Shipping address',
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress?: AddressDto;

  @ApiPropertyOptional({
    description: 'Billing address',
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiPropertyOptional({
    description: 'Tracking number',
    example: '1Z999AA10123456784',
  })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Tracking URL',
    example: 'https://track.carrier.com/1Z999AA10123456784',
  })
  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @ApiPropertyOptional({
    description: 'Shipping carrier',
    example: 'UPS',
  })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({
    description: 'Estimated delivery date',
    example: '2026-02-15T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
