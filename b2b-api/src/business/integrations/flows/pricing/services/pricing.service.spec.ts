import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PrismaService } from '@infrastructure/database';
import { PriceListStatus, PriceListType, RoundingRule } from '../interfaces';

describe('PricingService', () => {
  let service: PricingService;
  let prisma: {
    priceList: {
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    priceListItem: {
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    customerPriceAssignment: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    priceOverride: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };

  const mockTenantId = 'tenant-123';
  const mockPriceListId = 'pricelist-123';

  const mockPriceList = {
    id: mockPriceListId,
    tenantId: mockTenantId,
    code: 'STANDARD-2024',
    name: 'Standard Price List',
    type: PriceListType.STANDARD,
    status: PriceListStatus.ACTIVE,
    currency: 'USD',
    priority: 100,
    isDefault: false,
    isCustomerSpecific: false,
    roundingRule: RoundingRule.NEAREST,
    roundingPrecision: 2,
  };

  const mockPriceListItem = {
    id: 'item-123',
    priceListId: mockPriceListId,
    sku: 'SKU001',
    basePrice: { toNumber: () => 100 },
    listPrice: { toNumber: () => 100 },
    minPrice: null,
    maxPrice: null,
    cost: null,
    currency: 'USD',
    quantityBreaks: [],
    isDiscountable: true,
    isActive: true,
    uom: 'EA',
    priceList: mockPriceList,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: {
            priceList: {
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            priceListItem: {
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            customerPriceAssignment: {
              create: jest.fn(),
              delete: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
            priceOverride: { findFirst: jest.fn() },
            $transaction: jest.fn((fn) => fn({
              priceListItem: {
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockResolvedValue({}),
                update: jest.fn().mockResolvedValue({}),
              },
            })),
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    prisma = module.get(PrismaService);
  });

  describe('createPriceList', () => {
    it('should create a price list', async () => {
      prisma.priceList.create.mockResolvedValue(mockPriceList);

      const result = await service.createPriceList(mockTenantId, {
        code: 'STANDARD-2024',
        name: 'Standard Price List',
        type: PriceListType.STANDARD,
        status: PriceListStatus.ACTIVE,
        currency: 'USD',
        priority: 100,
        roundingRule: RoundingRule.NEAREST,
        roundingPrecision: 2,
        isDefault: false,
        isCustomerSpecific: false,
        effectiveFrom: new Date(),
      });

      expect(result.code).toBe('STANDARD-2024');
      expect(prisma.priceList.create).toHaveBeenCalled();
    });

    it('should validate base price list if specified', async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      await expect(
        service.createPriceList(mockTenantId, {
          code: 'NEW-LIST',
          name: 'New List',
          type: PriceListType.STANDARD,
          status: PriceListStatus.ACTIVE,
          currency: 'USD',
          priority: 100,
          roundingRule: RoundingRule.NEAREST,
          roundingPrecision: 2,
          isDefault: false,
          isCustomerSpecific: false,
          basePriceListId: 'nonexistent',
          effectiveFrom: new Date(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unset other defaults when setting as default', async () => {
      prisma.priceList.updateMany.mockResolvedValue({ count: 1 });
      prisma.priceList.create.mockResolvedValue({ ...mockPriceList, isDefault: true });

      await service.createPriceList(mockTenantId, {
        code: 'DEFAULT-LIST',
        name: 'Default List',
        type: PriceListType.STANDARD,
        status: PriceListStatus.ACTIVE,
        currency: 'USD',
        priority: 100,
        roundingRule: RoundingRule.NEAREST,
        roundingPrecision: 2,
        isDefault: true,
        isCustomerSpecific: false,
        effectiveFrom: new Date(),
      });

      expect(prisma.priceList.updateMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('updatePriceList', () => {
    it('should update a price list', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);
      prisma.priceList.update.mockResolvedValue({ ...mockPriceList, name: 'Updated Name' });

      const result = await service.updatePriceList(mockTenantId, mockPriceListId, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw if price list not found', async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePriceList(mockTenantId, 'nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unset other defaults when updating to default', async () => {
      prisma.priceList.findFirst.mockResolvedValue({ ...mockPriceList, isDefault: false });
      prisma.priceList.updateMany.mockResolvedValue({ count: 1 });
      prisma.priceList.update.mockResolvedValue({ ...mockPriceList, isDefault: true });

      await service.updatePriceList(mockTenantId, mockPriceListId, { isDefault: true });

      expect(prisma.priceList.updateMany).toHaveBeenCalled();
    });
  });

  describe('findPriceListById', () => {
    it('should find price list by ID', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);

      const result = await service.findPriceListById(mockTenantId, mockPriceListId);

      expect(result?.id).toBe(mockPriceListId);
    });

    it('should return null if not found', async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      const result = await service.findPriceListById(mockTenantId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findPriceListByCode', () => {
    it('should find price list by code', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);

      const result = await service.findPriceListByCode(mockTenantId, 'STANDARD-2024');

      expect(result?.code).toBe('STANDARD-2024');
    });
  });

  describe('getPriceListWithItems', () => {
    it('should get price list with items', async () => {
      prisma.priceList.findFirst.mockResolvedValue({
        ...mockPriceList,
        items: [mockPriceListItem],
        customerAssignments: [],
      });

      const result = await service.getPriceListWithItems(mockTenantId, mockPriceListId);

      expect(result).toBeDefined();
    });

    it('should return null if not found', async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      const result = await service.getPriceListWithItems(mockTenantId, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('queryPriceLists', () => {
    it('should query price lists with filters', async () => {
      prisma.priceList.findMany.mockResolvedValue([mockPriceList]);
      prisma.priceList.count.mockResolvedValue(1);

      const result = await service.queryPriceLists({
        tenantId: mockTenantId,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should apply all filters', async () => {
      prisma.priceList.findMany.mockResolvedValue([]);
      prisma.priceList.count.mockResolvedValue(0);

      await service.queryPriceLists({
        tenantId: mockTenantId,
        code: 'TEST',
        name: 'Test',
        type: PriceListType.STANDARD,
        status: PriceListStatus.ACTIVE,
        currency: 'USD',
        isDefault: true,
        isCustomerSpecific: false,
        externalId: 'EXT-001',
        externalSystem: 'ERP',
        effectiveAt: new Date(),
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(prisma.priceList.findMany).toHaveBeenCalled();
    });
  });

  describe('deletePriceList', () => {
    it('should soft delete a price list', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);
      prisma.priceList.update.mockResolvedValue({});

      await service.deletePriceList(mockTenantId, mockPriceListId);

      expect(prisma.priceList.update).toHaveBeenCalledWith({
        where: { id: mockPriceListId },
        data: expect.objectContaining({ status: PriceListStatus.ARCHIVED }),
      });
    });

    it('should throw if not found', async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      await expect(service.deletePriceList(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addPriceListItem', () => {
    it('should add item to price list', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);
      prisma.priceListItem.findUnique.mockResolvedValue(null);
      prisma.priceListItem.create.mockResolvedValue(mockPriceListItem);

      const result = await service.addPriceListItem(mockTenantId, mockPriceListId, {
        sku: 'SKU001',
        basePrice: 100,
        listPrice: 100,
        currency: 'USD',
        quantityBreaks: [],
        isDiscountable: true,
        isActive: true,
        uom: 'EA',
      });

      expect(result.sku).toBe('SKU001');
    });

    it('should throw if price list not found', async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      await expect(
        service.addPriceListItem(mockTenantId, 'nonexistent', {
          sku: 'SKU001',
          basePrice: 100,
          listPrice: 100,
          currency: 'USD',
          quantityBreaks: [],
          isDiscountable: true,
          isActive: true,
          uom: 'EA',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if SKU already exists', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);
      prisma.priceListItem.findUnique.mockResolvedValue(mockPriceListItem);

      await expect(
        service.addPriceListItem(mockTenantId, mockPriceListId, {
          sku: 'SKU001',
          basePrice: 100,
          listPrice: 100,
          currency: 'USD',
          quantityBreaks: [],
          isDiscountable: true,
          isActive: true,
          uom: 'EA',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePriceListItem', () => {
    it('should update price list item', async () => {
      prisma.priceListItem.findFirst.mockResolvedValue(mockPriceListItem);
      prisma.priceListItem.update.mockResolvedValue({
        ...mockPriceListItem,
        listPrice: { toNumber: () => 150 },
      });

      const result = await service.updatePriceListItem(mockTenantId, 'item-123', {
        listPrice: 150,
      });

      expect(prisma.priceListItem.update).toHaveBeenCalled();
    });

    it('should throw if item not found', async () => {
      prisma.priceListItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePriceListItem(mockTenantId, 'nonexistent', { listPrice: 150 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if tenant mismatch', async () => {
      prisma.priceListItem.findFirst.mockResolvedValue({
        ...mockPriceListItem,
        priceList: { ...mockPriceList, tenantId: 'other-tenant' },
      });

      await expect(
        service.updatePriceListItem(mockTenantId, 'item-123', { listPrice: 150 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkUpsertPriceListItems', () => {
    it('should bulk upsert items', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);

      const result = await service.bulkUpsertPriceListItems(mockTenantId, mockPriceListId, [
        { sku: 'SKU001', basePrice: 100, listPrice: 100, currency: 'USD', quantityBreaks: [], isDiscountable: true, isActive: true, uom: 'EA' },
        { sku: 'SKU002', basePrice: 200, listPrice: 200, currency: 'USD', quantityBreaks: [], isDiscountable: true, isActive: true, uom: 'EA' },
      ]);

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('errors');
    });

    it('should throw if price list not found', async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      await expect(
        service.bulkUpsertPriceListItems(mockTenantId, 'nonexistent', []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('queryPriceListItems', () => {
    it('should query price list items', async () => {
      prisma.priceListItem.findMany.mockResolvedValue([mockPriceListItem]);
      prisma.priceListItem.count.mockResolvedValue(1);

      const result = await service.queryPriceListItems({
        priceListId: mockPriceListId,
        page: 1,
        pageSize: 50,
      });

      expect(result.data).toHaveLength(1);
    });

    it('should apply filters', async () => {
      prisma.priceListItem.findMany.mockResolvedValue([]);
      prisma.priceListItem.count.mockResolvedValue(0);

      await service.queryPriceListItems({
        priceListId: mockPriceListId,
        sku: 'TEST',
        skus: ['SKU1', 'SKU2'],
        isActive: true,
        minPrice: 10,
        maxPrice: 100,
        effectiveAt: new Date(),
        sortBy: 'listPrice',
        sortOrder: 'desc',
      });

      expect(prisma.priceListItem.findMany).toHaveBeenCalled();
    });
  });

  describe('deletePriceListItem', () => {
    it('should delete price list item', async () => {
      prisma.priceListItem.findFirst.mockResolvedValue(mockPriceListItem);
      prisma.priceListItem.delete.mockResolvedValue({});

      await service.deletePriceListItem(mockTenantId, 'item-123');

      expect(prisma.priceListItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-123' },
      });
    });

    it('should throw if not found', async () => {
      prisma.priceListItem.findFirst.mockResolvedValue(null);

      await expect(service.deletePriceListItem(mockTenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assignPriceList', () => {
    it('should assign price list to customer', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);
      prisma.customerPriceAssignment.findUnique.mockResolvedValue(null);
      prisma.customerPriceAssignment.create.mockResolvedValue({
        id: 'assign-123',
        tenantId: mockTenantId,
        priceListId: mockPriceListId,
        assignmentType: 'CUSTOMER',
        assignmentId: 'customer-123',
      });

      const result = await service.assignPriceList(mockTenantId, {
        priceListId: mockPriceListId,
        assignmentType: 'CUSTOMER',
        assignmentId: 'customer-123',
        priority: 0,
        effectiveFrom: new Date(),
        isActive: true,
      });

      expect(result.assignmentType).toBe('CUSTOMER');
    });

    it('should throw if price list not found', async () => {
      prisma.priceList.findFirst.mockResolvedValue(null);

      await expect(
        service.assignPriceList(mockTenantId, {
          priceListId: 'nonexistent',
          assignmentType: 'CUSTOMER',
          assignmentId: 'customer-123',
          priority: 0,
          effectiveFrom: new Date(),
          isActive: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if already assigned', async () => {
      prisma.priceList.findFirst.mockResolvedValue(mockPriceList);
      prisma.customerPriceAssignment.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.assignPriceList(mockTenantId, {
          priceListId: mockPriceListId,
          assignmentType: 'CUSTOMER',
          assignmentId: 'customer-123',
          priority: 0,
          effectiveFrom: new Date(),
          isActive: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCustomerPriceLists', () => {
    it('should get customer price lists', async () => {
      prisma.customerPriceAssignment.findMany.mockResolvedValue([
        {
          priceList: { ...mockPriceList, status: PriceListStatus.ACTIVE },
        },
      ]);

      const result = await service.getCustomerPriceLists(mockTenantId, 'customer-123');

      expect(result).toHaveLength(1);
    });

    it('should filter by organization', async () => {
      prisma.customerPriceAssignment.findMany.mockResolvedValue([]);

      await service.getCustomerPriceLists(mockTenantId, 'customer-123', 'org-123');

      expect(prisma.customerPriceAssignment.findMany).toHaveBeenCalled();
    });
  });

  describe('removePriceListAssignment', () => {
    it('should remove assignment', async () => {
      prisma.customerPriceAssignment.findFirst.mockResolvedValue({ id: 'assign-123' });
      prisma.customerPriceAssignment.delete.mockResolvedValue({});

      await service.removePriceListAssignment(mockTenantId, 'assign-123');

      expect(prisma.customerPriceAssignment.delete).toHaveBeenCalled();
    });

    it('should throw if not found', async () => {
      prisma.customerPriceAssignment.findFirst.mockResolvedValue(null);

      await expect(
        service.removePriceListAssignment(mockTenantId, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
