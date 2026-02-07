import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Cart, CartItem } from '@prisma/client';

export class CartItemResponseDto {
  @ApiProperty({ description: 'Cart item ID' })
  id!: string;

  @ApiProperty({ description: 'Product name' })
  productName!: string;

  @ApiPropertyOptional({ description: 'Product SKU' })
  productSku?: string | null;

  @ApiProperty({ description: 'Quantity' })
  quantity!: number;

  @ApiProperty({ description: 'Unit price' })
  unitPrice!: string;

  @ApiProperty({ description: 'Line item discount' })
  discount!: string;

  @ApiProperty({ description: 'Line item total' })
  total!: string;

  @ApiPropertyOptional({ description: 'Master product ID from catalog' })
  masterProductId?: string | null;

  @ApiProperty({ description: 'Additional metadata' })
  metadata!: Record<string, unknown>;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(item: CartItem): CartItemResponseDto {
    const dto = new CartItemResponseDto();
    dto.id = item.id;
    dto.productName = item.productName;
    dto.productSku = item.productSku;
    dto.quantity = item.quantity;
    dto.unitPrice = item.unitPrice.toString();
    dto.discount = item.discount.toString();
    dto.total = item.total.toString();
    dto.masterProductId = item.masterProductId;
    dto.metadata = item.metadata as Record<string, unknown>;
    dto.createdAt = item.createdAt;
    dto.updatedAt = item.updatedAt;
    return dto;
  }
}

export class CartResponseDto {
  @ApiProperty({ description: 'Cart ID' })
  id!: string;

  @ApiProperty({ description: 'Subtotal (before discounts)' })
  subtotal!: string;

  @ApiProperty({ description: 'Total discount (item discounts)' })
  discount!: string;

  @ApiProperty({ description: 'Tax amount' })
  tax!: string;

  @ApiProperty({ description: 'Final total' })
  total!: string;

  @ApiPropertyOptional({ description: 'Applied coupon code' })
  couponCode?: string | null;

  @ApiProperty({ description: 'Coupon discount amount' })
  couponDiscount!: string;

  @ApiProperty({ description: 'Additional metadata' })
  metadata!: Record<string, unknown>;

  @ApiProperty({ description: 'Cart items', type: [CartItemResponseDto] })
  items!: CartItemResponseDto[];

  @ApiProperty({ description: 'Number of items in cart' })
  itemCount!: number;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId!: string;

  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt!: Date;

  static fromEntity(cart: Cart & { items: CartItem[] }): CartResponseDto {
    const dto = new CartResponseDto();
    dto.id = cart.id;
    dto.subtotal = cart.subtotal.toString();
    dto.discount = cart.discount.toString();
    dto.tax = cart.tax.toString();
    dto.total = cart.total.toString();
    dto.couponCode = cart.couponCode;
    dto.couponDiscount = cart.couponDiscount.toString();
    dto.metadata = cart.metadata as Record<string, unknown>;
    dto.items = cart.items.map(CartItemResponseDto.fromEntity);
    dto.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    dto.tenantId = cart.tenantId;
    dto.userId = cart.userId;
    dto.createdAt = cart.createdAt;
    dto.updatedAt = cart.updatedAt;
    return dto;
  }
}
