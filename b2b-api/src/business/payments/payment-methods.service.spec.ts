import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaService } from '@infrastructure/database';
import { PaymentMethodType, UserRole } from '@prisma/client';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockPaymentMethod = {
    id: 'pm-123',
    code: 'CREDIT_CARD',
    name: 'Credit Card',
    description: 'Pay with credit card',
    type: PaymentMethodType.CREDIT_CARD,
    isActive: true,
    sortOrder: 1,
    minAmount: null,
    maxAmount: null,
    processingFee: { toNumber: () => 0 },
    processingFeePercent: { toNumber: () => 2.5 },
    config: {},
    tenantId: mockTenantId,
    createdAt: new Date(),
    updatedAt: new Date(),
    userTypeAccess: [{ userRole: UserRole.USER }, { userRole: UserRole.ADMIN }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        {
          provide: PrismaService,
          useValue: {
            paymentMethod: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            paymentMethodUserType: {
              deleteMany: jest.fn(),
            },
            payment: {
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
    prismaService = module.get(PrismaService);
  });

  describe('findAvailable', () => {
    it('should return available payment methods for user role', async () => {
      prismaService.paymentMethod.findMany = jest.fn().mockResolvedValue([mockPaymentMethod]);

      const result = await service.findAvailable(mockTenantId, UserRole.USER);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('CREDIT_CARD');
      expect(prismaService.paymentMethod.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          isActive: true,
          userTypeAccess: {
            some: {
              userRole: UserRole.USER,
            },
          },
        },
        include: {
          userTypeAccess: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by order amount if provided', async () => {
      const methodWithLimits = {
        ...mockPaymentMethod,
        minAmount: { toNumber: () => 10 },
        maxAmount: { toNumber: () => 1000 },
      };
      prismaService.paymentMethod.findMany = jest.fn().mockResolvedValue([methodWithLimits]);

      const result = await service.findAvailable(mockTenantId, UserRole.USER, 500);
      expect(result).toHaveLength(1);

      const resultBelowMin = await service.findAvailable(mockTenantId, UserRole.USER, 5);
      expect(resultBelowMin).toHaveLength(0);

      const resultAboveMax = await service.findAvailable(mockTenantId, UserRole.USER, 1500);
      expect(resultAboveMax).toHaveLength(0);
    });
  });

  describe('findAll', () => {
    it('should return all payment methods for admin', async () => {
      prismaService.paymentMethod.findMany = jest.fn().mockResolvedValue([mockPaymentMethod]);

      const result = await service.findAll(mockTenantId, {});

      expect(result).toHaveLength(1);
      expect(prismaService.paymentMethod.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        include: { userTypeAccess: true },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by isActive', async () => {
      prismaService.paymentMethod.findMany = jest.fn().mockResolvedValue([]);

      await service.findAll(mockTenantId, { isActive: false });

      expect(prismaService.paymentMethod.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: false },
        include: { userTypeAccess: true },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by type', async () => {
      prismaService.paymentMethod.findMany = jest.fn().mockResolvedValue([]);

      await service.findAll(mockTenantId, { type: PaymentMethodType.BANK_TRANSFER });

      expect(prismaService.paymentMethod.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, type: PaymentMethodType.BANK_TRANSFER },
        include: { userTypeAccess: true },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a payment method by id', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(mockPaymentMethod);

      const result = await service.findOne('pm-123', mockTenantId);

      expect(result.id).toBe('pm-123');
      expect(prismaService.paymentMethod.findFirst).toHaveBeenCalledWith({
        where: { id: 'pm-123', tenantId: mockTenantId },
        include: { userTypeAccess: true },
      });
    });

    it('should throw NotFoundException if payment method not found', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('not-found', mockTenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new payment method', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(null);
      prismaService.paymentMethod.create = jest.fn().mockResolvedValue(mockPaymentMethod);

      const dto = {
        code: 'CREDIT_CARD',
        name: 'Credit Card',
        type: PaymentMethodType.CREDIT_CARD,
        allowedUserRoles: [UserRole.USER, UserRole.ADMIN],
      };

      const result = await service.create(dto, mockTenantId);

      expect(result.code).toBe('CREDIT_CARD');
      expect(prismaService.paymentMethod.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(mockPaymentMethod);

      const dto = {
        code: 'CREDIT_CARD',
        name: 'Credit Card',
        type: PaymentMethodType.CREDIT_CARD,
      };

      await expect(service.create(dto, mockTenantId)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a payment method', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(mockPaymentMethod);
      prismaService.paymentMethod.update = jest.fn().mockResolvedValue({
        ...mockPaymentMethod,
        name: 'Updated Name',
      });

      const result = await service.update('pm-123', { name: 'Updated Name' }, mockTenantId);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if payment method not found', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.update('not-found', { name: 'Updated' }, mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a payment method', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(mockPaymentMethod);
      prismaService.payment.count = jest.fn().mockResolvedValue(0);
      prismaService.paymentMethod.delete = jest.fn().mockResolvedValue(mockPaymentMethod);

      await service.delete('pm-123', mockTenantId);

      expect(prismaService.paymentMethod.delete).toHaveBeenCalledWith({
        where: { id: 'pm-123' },
      });
    });

    it('should throw ConflictException if payment method has been used', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(mockPaymentMethod);
      prismaService.payment.count = jest.fn().mockResolvedValue(5);

      await expect(service.delete('pm-123', mockTenantId)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if payment method not found', async () => {
      prismaService.paymentMethod.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.delete('not-found', mockTenantId)).rejects.toThrow(NotFoundException);
    });
  });
});
