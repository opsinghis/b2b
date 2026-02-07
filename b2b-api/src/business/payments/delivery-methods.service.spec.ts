import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DeliveryMethodsService } from './delivery-methods.service';
import { PrismaService } from '@infrastructure/database';

describe('DeliveryMethodsService', () => {
  let service: DeliveryMethodsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockDeliveryMethod = {
    id: 'dm-123',
    code: 'STANDARD',
    name: 'Standard Delivery',
    description: '3-5 business days',
    isActive: true,
    sortOrder: 1,
    minDays: 3,
    maxDays: 5,
    baseCost: { toNumber: () => 10 },
    freeThreshold: { toNumber: () => 100 },
    config: {},
    tenantId: mockTenantId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryMethodsService,
        {
          provide: PrismaService,
          useValue: {
            deliveryMethod: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DeliveryMethodsService>(DeliveryMethodsService);
    prismaService = module.get(PrismaService);
  });

  describe('findAvailable', () => {
    it('should return active delivery methods', async () => {
      prismaService.deliveryMethod.findMany = jest.fn().mockResolvedValue([mockDeliveryMethod]);

      const result = await service.findAvailable(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe('STANDARD');
      expect(prismaService.deliveryMethod.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          isActive: true,
        },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findAll', () => {
    it('should return all delivery methods for admin', async () => {
      prismaService.deliveryMethod.findMany = jest.fn().mockResolvedValue([mockDeliveryMethod]);

      const result = await service.findAll(mockTenantId, {});

      expect(result).toHaveLength(1);
      expect(prismaService.deliveryMethod.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        orderBy: { sortOrder: 'asc' },
      });
    });

    it('should filter by isActive', async () => {
      prismaService.deliveryMethod.findMany = jest.fn().mockResolvedValue([]);

      await service.findAll(mockTenantId, { isActive: false });

      expect(prismaService.deliveryMethod.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: false },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a delivery method by id', async () => {
      prismaService.deliveryMethod.findFirst = jest.fn().mockResolvedValue(mockDeliveryMethod);

      const result = await service.findOne('dm-123', mockTenantId);

      expect(result.id).toBe('dm-123');
    });

    it('should throw NotFoundException if delivery method not found', async () => {
      prismaService.deliveryMethod.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.findOne('not-found', mockTenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new delivery method', async () => {
      prismaService.deliveryMethod.findFirst = jest.fn().mockResolvedValue(null);
      prismaService.deliveryMethod.create = jest.fn().mockResolvedValue(mockDeliveryMethod);

      const dto = {
        code: 'STANDARD',
        name: 'Standard Delivery',
        minDays: 3,
        maxDays: 5,
        baseCost: 10,
      };

      const result = await service.create(dto, mockTenantId);

      expect(result.code).toBe('STANDARD');
      expect(prismaService.deliveryMethod.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      prismaService.deliveryMethod.findFirst = jest.fn().mockResolvedValue(mockDeliveryMethod);

      const dto = {
        code: 'STANDARD',
        name: 'Standard Delivery',
      };

      await expect(service.create(dto, mockTenantId)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a delivery method', async () => {
      prismaService.deliveryMethod.findFirst = jest.fn().mockResolvedValue(mockDeliveryMethod);
      prismaService.deliveryMethod.update = jest.fn().mockResolvedValue({
        ...mockDeliveryMethod,
        name: 'Updated Name',
      });

      const result = await service.update('dm-123', { name: 'Updated Name' }, mockTenantId);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if delivery method not found', async () => {
      prismaService.deliveryMethod.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.update('not-found', { name: 'Updated' }, mockTenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a delivery method', async () => {
      prismaService.deliveryMethod.findFirst = jest.fn().mockResolvedValue(mockDeliveryMethod);
      prismaService.deliveryMethod.delete = jest.fn().mockResolvedValue(mockDeliveryMethod);

      await service.delete('dm-123', mockTenantId);

      expect(prismaService.deliveryMethod.delete).toHaveBeenCalledWith({
        where: { id: 'dm-123' },
      });
    });

    it('should throw NotFoundException if delivery method not found', async () => {
      prismaService.deliveryMethod.findFirst = jest.fn().mockResolvedValue(null);

      await expect(service.delete('not-found', mockTenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateCost', () => {
    it('should return base cost if below free threshold', () => {
      const cost = service.calculateCost(mockDeliveryMethod as any, 50);
      expect(cost).toBe(10);
    });

    it('should return 0 if order exceeds free threshold', () => {
      const cost = service.calculateCost(mockDeliveryMethod as any, 150);
      expect(cost).toBe(0);
    });

    it('should return base cost if no free threshold', () => {
      const methodWithoutFreeThreshold = {
        ...mockDeliveryMethod,
        freeThreshold: null,
      };
      const cost = service.calculateCost(methodWithoutFreeThreshold as any, 1000);
      expect(cost).toBe(10);
    });
  });
});
