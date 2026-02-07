import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '@infrastructure/database';
import { CartService } from '@business/cart';
import { Order, OrderItem, OrderStatus, Prisma } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: jest.Mocked<PrismaService>;
  let cartService: jest.Mocked<CartService>;

  const tenantId = 'tenant-id-123';
  const userId = 'user-id-123';

  const mockOrderItem: OrderItem = {
    id: 'order-item-id-123',
    orderId: 'order-id-123',
    lineNumber: 1,
    productName: 'Test Product',
    productSku: 'SKU-001',
    description: 'Test description',
    quantity: 2,
    unitPrice: new Prisma.Decimal(100),
    discount: new Prisma.Decimal(10),
    total: new Prisma.Decimal(190),
    masterProductId: 'master-product-id-123',
    metadata: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockOrder: Order & { items: OrderItem[] } = {
    id: 'order-id-123',
    orderNumber: 'ORD-2026-00001',
    status: OrderStatus.PENDING,
    subtotal: new Prisma.Decimal(200),
    discount: new Prisma.Decimal(10),
    couponCode: null,
    couponDiscount: new Prisma.Decimal(0),
    tax: new Prisma.Decimal(0),
    total: new Prisma.Decimal(190),
    currency: 'USD',
    notes: null,
    shippingAddress: {},
    billingAddress: {},
    trackingNumber: null,
    trackingUrl: null,
    carrier: null,
    estimatedDelivery: null,
    confirmedAt: null,
    processingAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    refundedAt: null,
    metadata: {},
    tenantId,
    userId,
    cancelledById: null,
    refundedById: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    items: [mockOrderItem],
  };

  const mockCart = {
    id: 'cart-id-123',
    subtotal: new Prisma.Decimal(200),
    discount: new Prisma.Decimal(10),
    tax: new Prisma.Decimal(0),
    total: new Prisma.Decimal(190),
    couponCode: null,
    couponDiscount: new Prisma.Decimal(0),
    metadata: {},
    tenantId,
    userId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    items: [
      {
        id: 'cart-item-id-123',
        cartId: 'cart-id-123',
        productName: 'Test Product',
        productSku: 'SKU-001',
        quantity: 2,
        unitPrice: new Prisma.Decimal(100),
        discount: new Prisma.Decimal(10),
        total: new Prisma.Decimal(190),
        masterProductId: 'master-product-id-123',
        metadata: {},
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  };

  const mockEmptyCart = {
    ...mockCart,
    subtotal: new Prisma.Decimal(0),
    discount: new Prisma.Decimal(0),
    total: new Prisma.Decimal(0),
    items: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: CartService,
          useValue: {
            getCart: jest.fn(),
            clearCart: jest.fn(),
            addItem: jest.fn(),
            applyCoupon: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get(PrismaService);
    cartService = module.get(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFromCart', () => {
    it('should create order from cart', async () => {
      (cartService.getCart as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.order.create as jest.Mock).mockResolvedValue(mockOrder);
      (cartService.clearCart as jest.Mock).mockResolvedValue(mockEmptyCart);

      const result = await service.createFromCart({}, tenantId, userId);

      expect(cartService.getCart).toHaveBeenCalledWith(tenantId, userId);
      expect(prismaService.order.create).toHaveBeenCalled();
      expect(cartService.clearCart).toHaveBeenCalledWith(tenantId, userId);
      expect(result.orderNumber).toBe('ORD-2026-00001');
    });

    it('should throw BadRequestException for empty cart', async () => {
      (cartService.getCart as jest.Mock).mockResolvedValue(mockEmptyCart);

      await expect(service.createFromCart({}, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should return order for user', async () => {
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.findOne('order-id-123', tenantId, userId);

      expect(result).toEqual(mockOrder);
      expect(prismaService.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'order-id-123', tenantId, userId },
        include: { items: { orderBy: { lineNumber: 'asc' } } },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', tenantId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneAdmin', () => {
    it('should return order for admin without user check', async () => {
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      const result = await service.findOneAdmin('order-id-123', tenantId);

      expect(result).toEqual(mockOrder);
      expect(prismaService.order.findFirst).toHaveBeenCalledWith({
        where: { id: 'order-id-123', tenantId },
        include: { items: { orderBy: { lineNumber: 'asc' } } },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prismaService.order.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 }, tenantId, userId);

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply filters', async () => {
      (prismaService.order.findMany as jest.Mock).mockResolvedValue([mockOrder]);
      (prismaService.order.count as jest.Mock).mockResolvedValue(1);

      await service.findAll(
        { status: OrderStatus.PENDING, search: 'ORD-2026' },
        tenantId,
        userId,
      );

      expect(prismaService.order.findMany).toHaveBeenCalled();
    });
  });

  describe('getTracking', () => {
    it('should return tracking info', async () => {
      const orderWithTracking = {
        ...mockOrder,
        trackingNumber: 'TRACK123',
        trackingUrl: 'https://track.me/TRACK123',
        carrier: 'FedEx',
        shippedAt: new Date('2024-01-02'),
      };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(orderWithTracking);

      const result = await service.getTracking('order-id-123', tenantId, userId);

      expect(result.trackingNumber).toBe('TRACK123');
      expect(result.carrier).toBe('FedEx');
    });
  });

  describe('cancel', () => {
    it('should cancel pending order', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      const cancelledOrder = {
        ...mockOrder,
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      };

      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(pendingOrder);
      (prismaService.order.update as jest.Mock).mockResolvedValue(cancelledOrder);

      const result = await service.cancel(
        'order-id-123',
        { reason: 'Changed my mind' },
        tenantId,
        userId,
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(prismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.CANCELLED,
          }),
        }),
      );
    });

    it('should throw BadRequestException for shipped order', async () => {
      const shippedOrder = { ...mockOrder, status: OrderStatus.SHIPPED };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(shippedOrder);

      await expect(
        service.cancel('order-id-123', {}, tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for delivered order', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(deliveredOrder);

      await expect(
        service.cancel('order-id-123', {}, tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorder', () => {
    it('should add order items back to cart', async () => {
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (cartService.addItem as jest.Mock).mockResolvedValue(mockCart);
      (cartService.getCart as jest.Mock).mockResolvedValue(mockCart);

      const result = await service.reorder('order-id-123', tenantId, userId);

      expect(cartService.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Test Product',
          quantity: 2,
        }),
        tenantId,
        userId,
      );
      expect(result).toEqual(mockCart);
    });

    it('should attempt to apply coupon if order had one', async () => {
      const orderWithCoupon = { ...mockOrder, couponCode: 'SAVE10' };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(orderWithCoupon);
      (cartService.addItem as jest.Mock).mockResolvedValue(mockCart);
      (cartService.applyCoupon as jest.Mock).mockResolvedValue(mockCart);
      (cartService.getCart as jest.Mock).mockResolvedValue(mockCart);

      await service.reorder('order-id-123', tenantId, userId);

      expect(cartService.applyCoupon).toHaveBeenCalledWith(
        { couponCode: 'SAVE10' },
        tenantId,
        userId,
      );
    });
  });

  describe('updateAdmin', () => {
    it('should update order status', async () => {
      const confirmedOrder = {
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
      };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prismaService.order.update as jest.Mock).mockResolvedValue(confirmedOrder);

      const result = await service.updateAdmin(
        'order-id-123',
        { status: OrderStatus.CONFIRMED },
        tenantId,
        'admin-user-id',
      );

      expect(result.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should update tracking info', async () => {
      const orderWithTracking = {
        ...mockOrder,
        trackingNumber: 'TRACK123',
        carrier: 'FedEx',
      };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);
      (prismaService.order.update as jest.Mock).mockResolvedValue(orderWithTracking);

      const result = await service.updateAdmin(
        'order-id-123',
        { trackingNumber: 'TRACK123', carrier: 'FedEx' },
        tenantId,
        'admin-user-id',
      );

      expect(result.trackingNumber).toBe('TRACK123');
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(deliveredOrder);

      await expect(
        service.updateAdmin(
          'order-id-123',
          { status: OrderStatus.PENDING },
          tenantId,
          'admin-user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refund', () => {
    it('should refund delivered order', async () => {
      const deliveredOrder = { ...mockOrder, status: OrderStatus.DELIVERED };
      const refundedOrder = {
        ...mockOrder,
        status: OrderStatus.REFUNDED,
        refundedAt: new Date(),
      };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(deliveredOrder);
      (prismaService.order.update as jest.Mock).mockResolvedValue(refundedOrder);

      const result = await service.refund(
        'order-id-123',
        'Customer requested',
        tenantId,
        'admin-user-id',
      );

      expect(result.status).toBe(OrderStatus.REFUNDED);
    });

    it('should throw BadRequestException for non-delivered order', async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      (prismaService.order.findFirst as jest.Mock).mockResolvedValue(pendingOrder);

      await expect(
        service.refund('order-id-123', 'Reason', tenantId, 'admin-user-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('order number generation', () => {
    it('should generate sequential order numbers', async () => {
      (cartService.getCart as jest.Mock).mockResolvedValue(mockCart);
      (prismaService.order.findFirst as jest.Mock)
        .mockResolvedValueOnce({ orderNumber: 'ORD-2026-00005' }) // For generateOrderNumber
        .mockResolvedValueOnce(null); // For any other findFirst calls
      (prismaService.order.create as jest.Mock).mockResolvedValue({
        ...mockOrder,
        orderNumber: 'ORD-2026-00006',
      });
      (cartService.clearCart as jest.Mock).mockResolvedValue(mockEmptyCart);

      const result = await service.createFromCart({}, tenantId, userId);

      expect(result.orderNumber).toBe('ORD-2026-00006');
    });
  });
});
