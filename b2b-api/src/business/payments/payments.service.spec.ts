import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaService } from '@infrastructure/database';
import { PaymentMethodType, PaymentStatus, OrderStatus, UserRole } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: jest.Mocked<PrismaService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockOrderId = 'order-123';
  const mockPaymentMethodId = 'pm-123';

  const mockOrder = {
    id: mockOrderId,
    orderNumber: 'ORD-2026-00001',
    status: OrderStatus.PENDING,
    total: { toNumber: () => 100 },
    currency: 'USD',
    tenantId: mockTenantId,
    userId: mockUserId,
  };

  const mockPaymentMethod = {
    id: mockPaymentMethodId,
    code: 'CREDIT_CARD',
    name: 'Credit Card',
    type: PaymentMethodType.CREDIT_CARD,
    minAmount: null,
    maxAmount: null,
    processingFee: { toNumber: () => 0 },
    processingFeePercent: { toNumber: () => 0 },
    userTypeAccess: [{ userRole: UserRole.USER }],
  };

  const mockPayment = {
    id: 'pay-123',
    paymentNumber: 'PAY-2026-000001',
    amount: { toString: () => '100.00' },
    currency: 'USD',
    status: PaymentStatus.COMPLETED,
    externalRef: null,
    metadata: {},
    processedAt: new Date(),
    failedAt: null,
    failureReason: null,
    tenantId: mockTenantId,
    orderId: mockOrderId,
    userId: mockUserId,
    paymentMethodId: mockPaymentMethodId,
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentMethod: {
      id: mockPaymentMethodId,
      code: 'CREDIT_CARD',
      name: 'Credit Card',
      type: PaymentMethodType.CREDIT_CARD,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            payment: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
          },
        },
        {
          provide: PaymentMethodsService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);
    paymentMethodsService = module.get(PaymentMethodsService);
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      prismaService.order.findFirst = jest.fn().mockResolvedValue(mockOrder);
      prismaService.payment.findFirst = jest.fn().mockResolvedValue(null); // No existing payment
      paymentMethodsService.findOne = jest.fn().mockResolvedValue(mockPaymentMethod);
      prismaService.payment.create = jest.fn().mockResolvedValue(mockPayment);
      prismaService.payment.update = jest.fn().mockResolvedValue(mockPayment);
      prismaService.order.update = jest
        .fn()
        .mockResolvedValue({ ...mockOrder, status: OrderStatus.CONFIRMED });

      const dto = { paymentMethodId: mockPaymentMethodId };
      const result = await service.processPayment(
        mockOrderId,
        dto,
        mockTenantId,
        mockUserId,
        UserRole.USER,
      );

      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(prismaService.payment.create).toHaveBeenCalled();
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        data: {
          status: OrderStatus.CONFIRMED,
          confirmedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      prismaService.order.findFirst = jest.fn().mockResolvedValue(null);

      const dto = { paymentMethodId: mockPaymentMethodId };
      await expect(
        service.processPayment(mockOrderId, dto, mockTenantId, mockUserId, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order already has completed payment', async () => {
      prismaService.order.findFirst = jest.fn().mockResolvedValue(mockOrder);
      prismaService.payment.findFirst = jest.fn().mockResolvedValue(mockPayment);

      const dto = { paymentMethodId: mockPaymentMethodId };
      await expect(
        service.processPayment(mockOrderId, dto, mockTenantId, mockUserId, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid order status', async () => {
      prismaService.order.findFirst = jest.fn().mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
      });

      const dto = { paymentMethodId: mockPaymentMethodId };
      await expect(
        service.processPayment(mockOrderId, dto, mockTenantId, mockUserId, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user role not allowed', async () => {
      prismaService.order.findFirst = jest.fn().mockResolvedValue(mockOrder);
      prismaService.payment.findFirst = jest.fn().mockResolvedValue(null);
      paymentMethodsService.findOne = jest.fn().mockResolvedValue({
        ...mockPaymentMethod,
        userTypeAccess: [{ userRole: UserRole.ADMIN }], // Only admin allowed
      });

      const dto = { paymentMethodId: mockPaymentMethodId };
      await expect(
        service.processPayment(mockOrderId, dto, mockTenantId, mockUserId, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order total below minimum', async () => {
      prismaService.order.findFirst = jest.fn().mockResolvedValue(mockOrder);
      prismaService.payment.findFirst = jest.fn().mockResolvedValue(null);
      paymentMethodsService.findOne = jest.fn().mockResolvedValue({
        ...mockPaymentMethod,
        minAmount: { toNumber: () => 500 },
      });

      const dto = { paymentMethodId: mockPaymentMethodId };
      await expect(
        service.processPayment(mockOrderId, dto, mockTenantId, mockUserId, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order total above maximum', async () => {
      prismaService.order.findFirst = jest.fn().mockResolvedValue({
        ...mockOrder,
        total: { toNumber: () => 2000 },
      });
      prismaService.payment.findFirst = jest.fn().mockResolvedValue(null);
      paymentMethodsService.findOne = jest.fn().mockResolvedValue({
        ...mockPaymentMethod,
        maxAmount: { toNumber: () => 1000 },
      });

      const dto = { paymentMethodId: mockPaymentMethodId };
      await expect(
        service.processPayment(mockOrderId, dto, mockTenantId, mockUserId, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history for user', async () => {
      prismaService.payment.findMany = jest.fn().mockResolvedValue([mockPayment]);
      prismaService.payment.count = jest.fn().mockResolvedValue(1);

      const result = await service.getPaymentHistory(mockTenantId, mockUserId);

      expect(result.payments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prismaService.payment.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, userId: mockUserId },
        include: {
          paymentMethod: {
            select: { id: true, code: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('should paginate results', async () => {
      prismaService.payment.findMany = jest.fn().mockResolvedValue([]);
      prismaService.payment.count = jest.fn().mockResolvedValue(50);

      await service.getPaymentHistory(mockTenantId, mockUserId, 3, 10);

      expect(prismaService.payment.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, userId: mockUserId },
        include: expect.anything(),
        orderBy: { createdAt: 'desc' },
        skip: 20,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      prismaService.payment.findFirst = jest.fn().mockResolvedValue(mockPayment);

      const result = await service.findOne('pay-123', mockTenantId, mockUserId);

      expect(result.id).toBe('pay-123');
    });

    it('should throw NotFoundException if payment not found', async () => {
      prismaService.payment.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('not-found', mockTenantId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByOrder', () => {
    it('should return payments for an order', async () => {
      prismaService.payment.findMany = jest.fn().mockResolvedValue([mockPayment]);

      const result = await service.findByOrder(mockOrderId, mockTenantId);

      expect(result).toHaveLength(1);
      expect(prismaService.payment.findMany).toHaveBeenCalledWith({
        where: { orderId: mockOrderId, tenantId: mockTenantId },
        include: {
          paymentMethod: {
            select: { id: true, code: true, name: true, type: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
