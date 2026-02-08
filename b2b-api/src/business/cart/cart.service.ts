import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { TenantCatalogService } from '@business/tenant-catalog';
import { Cart, CartItem, Prisma } from '@prisma/client';
import { AddCartItemDto, UpdateCartItemDto, ApplyCouponDto } from './dto';

export type CartWithItems = Cart & { items: CartItem[] };

// Mock coupon validation - in production, this would be a separate service
const VALID_COUPONS: Record<string, { type: 'percentage' | 'fixed'; value: number }> = {
  SAVE10: { type: 'percentage', value: 10 },
  SAVE20: { type: 'percentage', value: 20 },
  FLAT50: { type: 'fixed', value: 50 },
  FLAT100: { type: 'fixed', value: 100 },
};

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCatalogService: TenantCatalogService,
  ) {}

  /**
   * Get or create cart for user in tenant
   */
  async getOrCreateCart(tenantId: string, userId: string): Promise<CartWithItems> {
    let cart = await this.prisma.cart.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: {
          tenantId,
          userId,
          subtotal: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          tax: new Prisma.Decimal(0),
          total: new Prisma.Decimal(0),
          couponDiscount: new Prisma.Decimal(0),
        },
        include: {
          items: true,
        },
      });
      this.logger.log(`Created new cart for user ${userId} in tenant ${tenantId}`);
    }

    return cart;
  }

  /**
   * Get current user's cart
   */
  async getCart(tenantId: string, userId: string): Promise<CartWithItems> {
    return this.getOrCreateCart(tenantId, userId);
  }

  /**
   * Add item to cart
   */
  async addItem(dto: AddCartItemDto, tenantId: string, userId: string): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(tenantId, userId);

    // Resolve product details
    const resolvedItem = await this.resolveProductDetails(dto, tenantId);

    // Check if item already exists in cart (by masterProductId)
    if (resolvedItem.masterProductId) {
      const existingItem = cart.items.find(
        (item) => item.masterProductId === resolvedItem.masterProductId,
      );

      if (existingItem) {
        // Update quantity instead of adding new item
        const newQuantity = existingItem.quantity + dto.quantity;
        return this.updateItemQuantity(
          existingItem.id,
          newQuantity,
          dto.discount,
          tenantId,
          userId,
        );
      }
    }

    // Calculate line item total
    const lineTotal = this.calculateLineTotal(
      resolvedItem.unitPrice,
      dto.quantity,
      dto.discount || 0,
    );

    // Create new cart item
    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        masterProductId: resolvedItem.masterProductId || null,
        productName: resolvedItem.productName,
        productSku: resolvedItem.productSku || null,
        quantity: dto.quantity,
        unitPrice: new Prisma.Decimal(resolvedItem.unitPrice),
        discount: new Prisma.Decimal(dto.discount || 0),
        total: new Prisma.Decimal(lineTotal),
        metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Added item ${resolvedItem.productName} to cart for user ${userId}`);

    // Recalculate cart totals and return updated cart
    return this.recalculateCart(cart.id);
  }

  /**
   * Update cart item quantity
   */
  async updateItem(
    itemId: string,
    dto: UpdateCartItemDto,
    tenantId: string,
    userId: string,
  ): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(tenantId, userId);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException(`Cart item '${itemId}' not found`);
    }

    return this.updateItemQuantity(
      itemId,
      dto.quantity,
      dto.discount,
      tenantId,
      userId,
      dto.metadata,
    );
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string, tenantId: string, userId: string): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(tenantId, userId);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException(`Cart item '${itemId}' not found`);
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    this.logger.log(`Removed item ${itemId} from cart for user ${userId}`);

    return this.recalculateCart(cart.id);
  }

  /**
   * Clear all items from cart
   */
  async clearCart(tenantId: string, userId: string): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(tenantId, userId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    // Reset cart totals and coupon
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        subtotal: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        tax: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
        couponCode: null,
        couponDiscount: new Prisma.Decimal(0),
      },
    });

    this.logger.log(`Cleared cart for user ${userId}`);

    return this.getOrCreateCart(tenantId, userId);
  }

  /**
   * Apply coupon to cart
   */
  async applyCoupon(dto: ApplyCouponDto, tenantId: string, userId: string): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(tenantId, userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot apply coupon to empty cart');
    }

    const coupon = VALID_COUPONS[dto.couponCode.toUpperCase()];
    if (!coupon) {
      throw new BadRequestException(`Invalid coupon code '${dto.couponCode}'`);
    }

    // Calculate coupon discount
    const subtotal = cart.subtotal.toNumber();
    let couponDiscount = 0;

    if (coupon.type === 'percentage') {
      couponDiscount = (subtotal * coupon.value) / 100;
    } else {
      couponDiscount = Math.min(coupon.value, subtotal);
    }

    // Update cart with coupon
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: dto.couponCode.toUpperCase(),
        couponDiscount: new Prisma.Decimal(couponDiscount),
      },
    });

    this.logger.log(
      `Applied coupon ${dto.couponCode} to cart for user ${userId}, discount: ${couponDiscount}`,
    );

    return this.recalculateCart(cart.id);
  }

  /**
   * Remove coupon from cart
   */
  async removeCoupon(tenantId: string, userId: string): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(tenantId, userId);

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: null,
        couponDiscount: new Prisma.Decimal(0),
      },
    });

    this.logger.log(`Removed coupon from cart for user ${userId}`);

    return this.recalculateCart(cart.id);
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private async resolveProductDetails(
    dto: AddCartItemDto,
    tenantId: string,
  ): Promise<{
    masterProductId?: string;
    productName: string;
    productSku?: string;
    unitPrice: number;
  }> {
    // If masterProductId is provided, resolve from catalog
    if (dto.masterProductId) {
      const hasAccess = await this.tenantCatalogService.hasAccess(dto.masterProductId, tenantId);

      if (!hasAccess) {
        throw new ForbiddenException(
          `Tenant does not have access to product '${dto.masterProductId}'`,
        );
      }

      const product = await this.tenantCatalogService.findOne(dto.masterProductId, tenantId);

      return {
        masterProductId: dto.masterProductId,
        productName: dto.productName || product.name,
        productSku: dto.productSku || product.sku,
        unitPrice: dto.unitPrice || parseFloat(product.effectivePrice),
      };
    }

    // Manual entry - validate required fields
    if (!dto.productName) {
      throw new BadRequestException('productName is required when masterProductId is not provided');
    }

    if (dto.unitPrice === undefined || dto.unitPrice === null) {
      throw new BadRequestException('unitPrice is required when masterProductId is not provided');
    }

    return {
      productName: dto.productName,
      productSku: dto.productSku,
      unitPrice: dto.unitPrice,
    };
  }

  private calculateLineTotal(unitPrice: number, quantity: number, discount: number): number {
    return unitPrice * quantity - discount;
  }

  private async updateItemQuantity(
    itemId: string,
    quantity: number,
    discount: number | undefined,
    tenantId: string,
    userId: string,
    metadata?: Record<string, unknown>,
  ): Promise<CartWithItems> {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Cart item '${itemId}' not found`);
    }

    const newDiscount = discount !== undefined ? discount : item.discount.toNumber();
    const lineTotal = this.calculateLineTotal(item.unitPrice.toNumber(), quantity, newDiscount);

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity,
        discount: new Prisma.Decimal(newDiscount),
        total: new Prisma.Decimal(lineTotal),
        ...(metadata && { metadata: metadata as Prisma.InputJsonValue }),
      },
    });

    this.logger.log(`Updated cart item ${itemId} quantity to ${quantity}`);

    return this.recalculateCart(item.cartId);
  }

  private async recalculateCart(cartId: string): Promise<CartWithItems> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(`Cart '${cartId}' not found`);
    }

    // Calculate subtotal and item discounts
    let subtotal = 0;
    let itemDiscounts = 0;

    for (const item of cart.items) {
      subtotal += item.unitPrice.toNumber() * item.quantity;
      itemDiscounts += item.discount.toNumber();
    }

    // Calculate coupon discount if coupon is applied
    let couponDiscount = cart.couponDiscount.toNumber();
    if (cart.couponCode) {
      const coupon = VALID_COUPONS[cart.couponCode];
      if (coupon) {
        if (coupon.type === 'percentage') {
          couponDiscount = (subtotal * coupon.value) / 100;
        } else {
          couponDiscount = Math.min(coupon.value, subtotal);
        }
      }
    }

    // Total discount = item discounts + coupon discount
    const totalDiscount = itemDiscounts + couponDiscount;

    // Tax calculation (0% for now, can be configured)
    const taxRate = 0;
    const taxableAmount = subtotal - totalDiscount;
    const tax = taxableAmount > 0 ? taxableAmount * taxRate : 0;

    // Final total
    const total = Math.max(0, subtotal - totalDiscount + tax);

    // Update cart
    const updatedCart = await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        discount: new Prisma.Decimal(itemDiscounts),
        tax: new Prisma.Decimal(tax),
        total: new Prisma.Decimal(total),
        couponDiscount: new Prisma.Decimal(couponDiscount),
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return updatedCart;
  }
}
