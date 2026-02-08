import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { Payment, PaymentStatus, PaymentMethodType } from '@prisma/client';

export class ProcessPaymentDto {
  @ApiProperty({ description: 'Payment method ID to use' })
  @IsString()
  paymentMethodId!: string;

  @ApiPropertyOptional({
    description: 'External payment reference (e.g., transaction ID from gateway)',
  })
  @IsOptional()
  @IsString()
  externalRef?: string;

  @ApiPropertyOptional({ description: 'Additional payment metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment ID' })
  id!: string;

  @ApiProperty({ description: 'Payment number' })
  paymentNumber!: string;

  @ApiProperty({ description: 'Payment amount' })
  amount!: string;

  @ApiProperty({ description: 'Currency' })
  currency!: string;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional({ description: 'External payment reference' })
  externalRef?: string | null;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'When payment was processed' })
  processedAt?: Date | null;

  @ApiPropertyOptional({ description: 'When payment failed' })
  failedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Failure reason' })
  failureReason?: string | null;

  @ApiProperty({ description: 'Order ID' })
  orderId!: string;

  @ApiProperty({ description: 'Payment method ID' })
  paymentMethodId!: string;

  @ApiPropertyOptional({ description: 'Payment method details' })
  paymentMethod?: {
    id: string;
    code: string;
    name: string;
    type: PaymentMethodType;
  };

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(
    payment: Payment & {
      paymentMethod?: { id: string; code: string; name: string; type: PaymentMethodType };
    },
  ): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = payment.id;
    dto.paymentNumber = payment.paymentNumber;
    dto.amount = payment.amount.toString();
    dto.currency = payment.currency;
    dto.status = payment.status;
    dto.externalRef = payment.externalRef;
    dto.metadata = payment.metadata as Record<string, unknown>;
    dto.processedAt = payment.processedAt;
    dto.failedAt = payment.failedAt;
    dto.failureReason = payment.failureReason;
    dto.orderId = payment.orderId;
    dto.paymentMethodId = payment.paymentMethodId;
    dto.paymentMethod = payment.paymentMethod;
    dto.createdAt = payment.createdAt;
    dto.updatedAt = payment.updatedAt;
    return dto;
  }
}

export class PaymentHistoryResponseDto {
  @ApiProperty({ description: 'List of payments', type: [PaymentResponseDto] })
  payments!: PaymentResponseDto[];

  @ApiProperty({ description: 'Total number of payments' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  static fromEntities(
    payments: (Payment & {
      paymentMethod?: { id: string; code: string; name: string; type: PaymentMethodType };
    })[],
    total: number,
    page: number,
    limit: number,
  ): PaymentHistoryResponseDto {
    const dto = new PaymentHistoryResponseDto();
    dto.payments = payments.map(PaymentResponseDto.fromEntity);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }
}
