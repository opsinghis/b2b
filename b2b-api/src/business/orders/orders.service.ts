import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { CartService, CartWithItems } from '@business/cart';
import { Order, OrderItem, OrderStatus, Prisma } from '@prisma/client';
import {
  CreateOrderDto,
  ListOrdersQueryDto,
  AdminListOrdersQueryDto,
  CancelOrderDto,
} from './dto';

export type OrderWithItems = Order & { items: OrderItem[] };

// Order status transitions map
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING],
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  /**
   * Create order from cart
   */
  async createFromCart(
    dto: CreateOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<OrderWithItems> {
    // Get cart with items
    const cart = await this.cartService.getCart(tenantId, userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot create order from empty cart');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber(tenantId);

    // Create order
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        tenantId,
        userId,
        status: OrderStatus.PENDING,
        subtotal: cart.subtotal,
        discount: cart.discount,
        couponCode: cart.couponCode,
        couponDiscount: cart.couponDiscount,
        tax: cart.tax,
        total: cart.total,
        notes: dto.notes,
        shippingAddress: (dto.shippingAddress || {}) as Prisma.InputJsonValue,
        billingAddress: (dto.billingAddress || dto.shippingAddress || {}) as Prisma.InputJsonValue,
        metadata: (dto.metadata || {}) as Prisma.InputJsonValue,
        items: {
          create: cart.items.map((item, index) => ({
            lineNumber: index + 1,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: item.total,
            masterProductId: item.masterProductId,
            metadata: item.metadata as Prisma.InputJsonValue,
          })),
        },
      },
      include: {
        items: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    // Clear cart after order creation
    await this.cartService.clearCart(tenantId, userId);

    this.logger.log(`Created order ${orderNumber} for user ${userId}`);

    return order;
  }

  /**
   * Get order by ID (user's own order)
   */
  async findOne(orderId: string, tenantId: string, userId: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        userId,
      },
      include: {
        items: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    return order;
  }

  /**
   * Get order by ID (admin - any user's order)
   */
  async findOneAdmin(orderId: string, tenantId: string): Promise<OrderWithItems> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    return order;
  }

  /**
   * List user's orders
   */
  async findAll(
    query: ListOrdersQueryDto,
    tenantId: string,
    userId: string,
  ): Promise<{ orders: OrderWithItems[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      tenantId,
      userId,
    };

    this.applyFilters(where, query);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            orderBy: { lineNumber: 'asc' },
          },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * List all orders (admin)
   */
  async findAllAdmin(
    query: AdminListOrdersQueryDto,
    tenantId: string,
  ): Promise<{ orders: OrderWithItems[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      tenantId,
    };

    if (query.userId) {
      where.userId = query.userId;
    }

    this.applyFilters(where, query);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            orderBy: { lineNumber: 'asc' },
          },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Get order tracking info
   */
  async getTracking(
    orderId: string,
    tenantId: string,
    userId: string,
  ): Promise<{
    trackingNumber: string | null;
    trackingUrl: string | null;
    carrier: string | null;
    estimatedDelivery: Date | null;
    status: OrderStatus;
    confirmedAt: Date | null;
    processingAt: Date | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  }> {
    const order = await this.findOne(orderId, tenantId, userId);

    return {
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      carrier: order.carrier,
      estimatedDelivery: order.estimatedDelivery,
      status: order.status,
      confirmedAt: order.confirmedAt,
      processingAt: order.processingAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
    };
  }

  /**
   * Cancel order
   */
  async cancel(
    orderId: string,
    dto: CancelOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<OrderWithItems> {
    const order = await this.findOne(orderId, tenantId, userId);

    // Check if order can be cancelled
    const allowedTransitions = STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(OrderStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel order in '${order.status}' status`,
      );
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledById: userId,
        metadata: {
          ...(order.metadata as Record<string, unknown>),
          cancellationReason: dto.reason,
        },
      },
      include: {
        items: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    this.logger.log(`Order ${order.orderNumber} cancelled by user ${userId}`);

    return updatedOrder;
  }

  /**
   * Reorder - add order items back to cart
   */
  async reorder(orderId: string, tenantId: string, userId: string): Promise<CartWithItems> {
    const order = await this.findOne(orderId, tenantId, userId);

    // Add each item back to cart
    for (const item of order.items) {
      await this.cartService.addItem(
        {
          masterProductId: item.masterProductId || undefined,
          productName: item.productName,
          productSku: item.productSku || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toNumber(),
          discount: item.discount.toNumber(),
        },
        tenantId,
        userId,
      );
    }

    // Apply same coupon if order had one
    if (order.couponCode) {
      try {
        await this.cartService.applyCoupon({ couponCode: order.couponCode }, tenantId, userId);
      } catch {
        // Coupon might be expired or invalid now - ignore
        this.logger.warn(`Could not apply coupon ${order.couponCode} during reorder`);
      }
    }

    return this.cartService.getCart(tenantId, userId);
  }

  /**
   * Update order (admin only)
   */
  async updateAdmin(
    orderId: string,
    data: Partial<{
      status: OrderStatus;
      trackingNumber: string;
      trackingUrl: string;
      carrier: string;
      estimatedDelivery: Date;
      notes: string;
    }>,
    tenantId: string,
    adminUserId: string,
  ): Promise<OrderWithItems> {
    const order = await this.findOneAdmin(orderId, tenantId);

    // Validate status transition if status is being changed
    if (data.status && data.status !== order.status) {
      const allowedTransitions = STATUS_TRANSITIONS[order.status];
      if (!allowedTransitions.includes(data.status)) {
        throw new BadRequestException(
          `Cannot transition from '${order.status}' to '${data.status}'`,
        );
      }
    }

    // Build update data
    const updateData: Prisma.OrderUpdateInput = {};

    if (data.status) {
      updateData.status = data.status;
      // Set timestamp for status change
      if (data.status === OrderStatus.CONFIRMED) {
        updateData.confirmedAt = new Date();
      } else if (data.status === OrderStatus.PROCESSING) {
        updateData.processingAt = new Date();
      } else if (data.status === OrderStatus.SHIPPED) {
        updateData.shippedAt = new Date();
      } else if (data.status === OrderStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
      }
    }

    if (data.trackingNumber !== undefined) updateData.trackingNumber = data.trackingNumber;
    if (data.trackingUrl !== undefined) updateData.trackingUrl = data.trackingUrl;
    if (data.carrier !== undefined) updateData.carrier = data.carrier;
    if (data.estimatedDelivery !== undefined) updateData.estimatedDelivery = data.estimatedDelivery;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    this.logger.log(`Order ${order.orderNumber} updated by admin ${adminUserId}`);

    return updatedOrder;
  }

  /**
   * Refund order (admin only)
   */
  async refund(
    orderId: string,
    reason: string | undefined,
    tenantId: string,
    adminUserId: string,
  ): Promise<OrderWithItems> {
    const order = await this.findOneAdmin(orderId, tenantId);

    // Check if order can be refunded (must be delivered)
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Only delivered orders can be refunded');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.REFUNDED,
        refundedAt: new Date(),
        refundedById: adminUserId,
        metadata: {
          ...(order.metadata as Record<string, unknown>),
          refundReason: reason,
        },
      },
      include: {
        items: {
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    this.logger.log(`Order ${order.orderNumber} refunded by admin ${adminUserId}`);

    return updatedOrder;
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;

    // Get the last order number for this year
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        tenantId,
        orderNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
      select: {
        orderNumber: true,
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.replace(prefix, ''), 10);
      sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(5, '0')}`;
  }

  private applyFilters(where: Prisma.OrderWhereInput, query: ListOrdersQueryDto): void {
    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.orderNumber = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.startDate) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter),
        gte: new Date(query.startDate),
      };
    }

    if (query.endDate) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter),
        lte: new Date(query.endDate),
      };
    }
  }
}
