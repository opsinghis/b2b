import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order, OrderItem, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'Order item ID' })
  id!: string;

  @ApiProperty({ description: 'Line number' })
  lineNumber!: number;

  @ApiProperty({ description: 'Product name' })
  productName!: string;

  @ApiPropertyOptional({ description: 'Product SKU' })
  productSku?: string;

  @ApiPropertyOptional({ description: 'Product description' })
  description?: string;

  @ApiProperty({ description: 'Quantity' })
  quantity!: number;

  @ApiProperty({ description: 'Unit price' })
  unitPrice!: string;

  @ApiProperty({ description: 'Line discount' })
  discount!: string;

  @ApiProperty({ description: 'Line total' })
  total!: string;

  @ApiPropertyOptional({ description: 'Master product ID' })
  masterProductId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, unknown>;

  static fromEntity(item: OrderItem): OrderItemResponseDto {
    const dto = new OrderItemResponseDto();
    dto.id = item.id;
    dto.lineNumber = item.lineNumber;
    dto.productName = item.productName;
    dto.productSku = item.productSku || undefined;
    dto.description = item.description || undefined;
    dto.quantity = item.quantity;
    dto.unitPrice =
      item.unitPrice instanceof Decimal ? item.unitPrice.toString() : String(item.unitPrice);
    dto.discount =
      item.discount instanceof Decimal ? item.discount.toString() : String(item.discount);
    dto.total = item.total instanceof Decimal ? item.total.toString() : String(item.total);
    dto.masterProductId = item.masterProductId || undefined;
    dto.metadata = (item.metadata as Record<string, unknown>) || undefined;
    return dto;
  }
}

export class AddressResponseDto {
  @ApiPropertyOptional({ description: 'Street address line 1' })
  street1?: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  street2?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiPropertyOptional({ description: 'State/Province' })
  state?: string;

  @ApiPropertyOptional({ description: 'Postal/ZIP code' })
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  country?: string;
}

export class TrackingResponseDto {
  @ApiPropertyOptional({ description: 'Tracking number' })
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Tracking URL' })
  trackingUrl?: string;

  @ApiPropertyOptional({ description: 'Shipping carrier' })
  carrier?: string;

  @ApiPropertyOptional({ description: 'Estimated delivery date' })
  estimatedDelivery?: string;

  @ApiProperty({ description: 'Order status' })
  status!: OrderStatus;

  @ApiPropertyOptional({ description: 'Shipped date' })
  shippedAt?: string;

  @ApiPropertyOptional({ description: 'Delivered date' })
  deliveredAt?: string;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  id!: string;

  @ApiProperty({ description: 'Order number', example: 'ORD-2026-00001' })
  orderNumber!: string;

  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
  })
  status!: OrderStatus;

  @ApiProperty({ description: 'Subtotal before discounts' })
  subtotal!: string;

  @ApiProperty({ description: 'Item discounts' })
  discount!: string;

  @ApiPropertyOptional({ description: 'Applied coupon code' })
  couponCode?: string;

  @ApiProperty({ description: 'Coupon discount' })
  couponDiscount!: string;

  @ApiProperty({ description: 'Tax amount' })
  tax!: string;

  @ApiProperty({ description: 'Order total' })
  total!: string;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  currency!: string;

  @ApiPropertyOptional({ description: 'Order notes' })
  notes?: string;

  @ApiProperty({ description: 'Shipping address', type: AddressResponseDto })
  shippingAddress!: AddressResponseDto;

  @ApiProperty({ description: 'Billing address', type: AddressResponseDto })
  billingAddress!: AddressResponseDto;

  @ApiPropertyOptional({ description: 'Tracking number' })
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Tracking URL' })
  trackingUrl?: string;

  @ApiPropertyOptional({ description: 'Shipping carrier' })
  carrier?: string;

  @ApiPropertyOptional({ description: 'Estimated delivery date' })
  estimatedDelivery?: string;

  @ApiProperty({ description: 'Order items', type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ description: 'Number of items' })
  itemCount!: number;

  @ApiPropertyOptional({ description: 'Confirmed date' })
  confirmedAt?: string;

  @ApiPropertyOptional({ description: 'Processing started date' })
  processingAt?: string;

  @ApiPropertyOptional({ description: 'Shipped date' })
  shippedAt?: string;

  @ApiPropertyOptional({ description: 'Delivered date' })
  deliveredAt?: string;

  @ApiPropertyOptional({ description: 'Cancelled date' })
  cancelledAt?: string;

  @ApiPropertyOptional({ description: 'Refunded date' })
  refundedAt?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Created date' })
  createdAt!: string;

  @ApiProperty({ description: 'Updated date' })
  updatedAt!: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  static fromEntity(order: Order & { items?: OrderItem[] }): OrderResponseDto {
    const dto = new OrderResponseDto();
    const items = order.items || [];
    dto.id = order.id;
    dto.orderNumber = order.orderNumber;
    dto.status = order.status;
    dto.subtotal =
      order.subtotal instanceof Decimal ? order.subtotal.toString() : String(order.subtotal);
    dto.discount =
      order.discount instanceof Decimal ? order.discount.toString() : String(order.discount);
    dto.couponCode = order.couponCode || undefined;
    dto.couponDiscount =
      order.couponDiscount instanceof Decimal
        ? order.couponDiscount.toString()
        : String(order.couponDiscount);
    dto.tax = order.tax instanceof Decimal ? order.tax.toString() : String(order.tax);
    dto.total = order.total instanceof Decimal ? order.total.toString() : String(order.total);
    dto.currency = order.currency;
    dto.notes = order.notes || undefined;
    dto.shippingAddress = (order.shippingAddress as AddressResponseDto) || {};
    dto.billingAddress = (order.billingAddress as AddressResponseDto) || {};
    dto.trackingNumber = order.trackingNumber || undefined;
    dto.trackingUrl = order.trackingUrl || undefined;
    dto.carrier = order.carrier || undefined;
    dto.estimatedDelivery = order.estimatedDelivery?.toISOString() || undefined;
    dto.items = items.map(OrderItemResponseDto.fromEntity);
    dto.itemCount = items.length;
    dto.confirmedAt = order.confirmedAt?.toISOString() || undefined;
    dto.processingAt = order.processingAt?.toISOString() || undefined;
    dto.shippedAt = order.shippedAt?.toISOString() || undefined;
    dto.deliveredAt = order.deliveredAt?.toISOString() || undefined;
    dto.cancelledAt = order.cancelledAt?.toISOString() || undefined;
    dto.refundedAt = order.refundedAt?.toISOString() || undefined;
    dto.metadata = (order.metadata as Record<string, unknown>) || undefined;
    dto.createdAt = order.createdAt.toISOString();
    dto.updatedAt = order.updatedAt.toISOString();
    dto.tenantId = order.tenantId;
    dto.userId = order.userId;
    return dto;
  }
}

export class OrderListResponseDto {
  @ApiProperty({ description: 'List of orders', type: [OrderResponseDto] })
  data!: OrderResponseDto[];

  @ApiProperty({ description: 'Total number of orders' })
  total!: number;

  @ApiProperty({ description: 'Current page' })
  page!: number;

  @ApiProperty({ description: 'Items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext!: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrevious!: boolean;

  static fromEntities(
    orders: (Order & { items?: OrderItem[] })[],
    total: number,
    page: number,
    limit: number,
  ): OrderListResponseDto {
    const dto = new OrderListResponseDto();
    const totalPages = Math.ceil(total / limit);
    dto.data = orders.map(OrderResponseDto.fromEntity);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = totalPages;
    dto.hasNext = page < totalPages;
    dto.hasPrevious = page > 1;
    return dto;
  }
}
