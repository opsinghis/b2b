import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@infrastructure/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PricingService } from './services/pricing.service';
import { CurrencyService } from './services/currency.service';
import { PricingSyncService } from './services/pricing-sync.service';
import { PriceOverrideService } from './services/price-override.service';
import {
  PriceListStatus,
  PriceListType,
  RoundingRule,
  PriceAssignmentType,
  PriceOverrideType,
  PriceOverrideScopeType,
  PriceOverrideStatus,
  ExchangeRateType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('PricingService', () => {
  let service: PricingService;
  let prismaService: any;

  const mockTenantId = 'tenant-123';
  const mockPriceListId = 'pricelist-123';
  const mockItemId = 'item-123';

  const mockPriceList = {
    id: mockPriceListId,
    code: 'STANDARD-2024',
    name: 'Standard Price List 2024',
    description: 'Standard pricing for 2024',
    type: PriceListType.STANDARD,
    status: PriceListStatus.ACTIVE,
    currency: 'USD',
    priority: 0,
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: null,
    basePriceListId: null,
    priceModifier: null,
    roundingRule: RoundingRule.NEAREST,
    roundingPrecision: 2,
    isDefault: true,
    isCustomerSpecific: false,
    externalId: null,
    externalSystem: null,
    lastSyncAt: null,
    syncStatus: null,
    metadata: {},
    tenantId: mockTenantId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPriceListItem = {
    id: mockItemId,
    priceListId: mockPriceListId,
    sku: 'SKU-001',
    masterProductId: null,
    basePrice: new Decimal(100),
    listPrice: new Decimal(120),
    minPrice: new Decimal(80),
    maxPrice: new Decimal(150),
    cost: new Decimal(60),
    currency: null,
    quantityBreaks: [
      { minQuantity: 10, price: 110 },
      { minQuantity: 50, price: 100 },
    ],
    maxDiscountPercent: new Decimal(20),
    isDiscountable: true,
    effectiveFrom: null,
    effectiveTo: null,
    isActive: true,
    uom: 'EA',
    externalId: null,
    externalSystem: null,
    lastSyncAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
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
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      customerPriceAssignment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      priceOverride: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((fn) => fn(prismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  describe('createPriceList', () => {
    it('should create a price list', async () => {
      prismaService.priceList.create.mockResolvedValue(mockPriceList);

      const result = await service.createPriceList(mockTenantId, {
        code: 'STANDARD-2024',
        name: 'Standard Price List 2024',
        currency: 'USD',
        effectiveFrom: new Date('2024-01-01'),
        roundingRule: RoundingRule.NEAREST,
        roundingPrecision: 2,
        isDefault: false,
        isCustomerSpecific: false,
        priority: 0,
        status: PriceListStatus.ACTIVE,
        type: PriceListType.STANDARD,
      });

      expect(result).toEqual(mockPriceList);
      expect(prismaService.priceList.create).toHaveBeenCalled();
    });

    it('should unset other default price lists when setting as default', async () => {
      prismaService.priceList.updateMany.mockResolvedValue({ count: 1 });
      prismaService.priceList.create.mockResolvedValue(mockPriceList);

      await service.createPriceList(mockTenantId, {
        code: 'STANDARD-2024',
        name: 'Standard Price List 2024',
        currency: 'USD',
        effectiveFrom: new Date('2024-01-01'),
        roundingRule: RoundingRule.NEAREST,
        roundingPrecision: 2,
        isDefault: true,
        isCustomerSpecific: false,
        priority: 0,
        status: PriceListStatus.ACTIVE,
        type: PriceListType.STANDARD,
      });

      expect(prismaService.priceList.updateMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isDefault: true },
        data: { isDefault: false },
      });
    });

    it('should validate base price list exists if specified', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(null);

      await expect(
        service.createPriceList(mockTenantId, {
          code: 'DERIVED-2024',
          name: 'Derived Price List',
          currency: 'USD',
          effectiveFrom: new Date('2024-01-01'),
          roundingRule: RoundingRule.NEAREST,
          roundingPrecision: 2,
          isDefault: false,
          isCustomerSpecific: false,
          priority: 0,
          status: PriceListStatus.ACTIVE,
          type: PriceListType.STANDARD,
          basePriceListId: 'non-existent-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPriceListById', () => {
    it('should find price list by ID', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);

      const result = await service.findPriceListById(mockTenantId, mockPriceListId);

      expect(result).toEqual(mockPriceList);
      expect(prismaService.priceList.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockPriceListId,
          tenantId: mockTenantId,
          deletedAt: null,
        },
      });
    });

    it('should return null if price list not found', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(null);

      const result = await service.findPriceListById(mockTenantId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updatePriceList', () => {
    it('should update price list', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);
      prismaService.priceList.update.mockResolvedValue({
        ...mockPriceList,
        name: 'Updated Name',
      });

      const result = await service.updatePriceList(mockTenantId, mockPriceListId, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw if price list not found', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePriceList(mockTenantId, 'non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePriceList', () => {
    it('should soft delete price list', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);
      prismaService.priceList.update.mockResolvedValue({
        ...mockPriceList,
        deletedAt: new Date(),
        status: PriceListStatus.ARCHIVED,
      });

      await service.deletePriceList(mockTenantId, mockPriceListId);

      expect(prismaService.priceList.update).toHaveBeenCalledWith({
        where: { id: mockPriceListId },
        data: {
          deletedAt: expect.any(Date),
          status: PriceListStatus.ARCHIVED,
        },
      });
    });
  });

  describe('addPriceListItem', () => {
    it('should add item to price list', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);
      prismaService.priceListItem.findUnique.mockResolvedValue(null);
      prismaService.priceListItem.create.mockResolvedValue(mockPriceListItem);

      const result = await service.addPriceListItem(mockTenantId, mockPriceListId, {
        sku: 'SKU-001',
        basePrice: 100,
        listPrice: 120,
        quantityBreaks: [],
        isDiscountable: true,
        isActive: true,
        uom: 'EA',
      });

      expect(result).toEqual(mockPriceListItem);
    });

    it('should throw if SKU already exists in price list', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);
      prismaService.priceListItem.findUnique.mockResolvedValue(mockPriceListItem);

      await expect(
        service.addPriceListItem(mockTenantId, mockPriceListId, {
          sku: 'SKU-001',
          basePrice: 100,
          listPrice: 120,
          quantityBreaks: [],
          isDiscountable: true,
          isActive: true,
          uom: 'EA',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('queryPriceLists', () => {
    it('should query price lists with pagination', async () => {
      prismaService.priceList.findMany.mockResolvedValue([mockPriceList]);
      prismaService.priceList.count.mockResolvedValue(1);

      const result = await service.queryPriceLists({
        tenantId: mockTenantId,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter by status', async () => {
      prismaService.priceList.findMany.mockResolvedValue([mockPriceList]);
      prismaService.priceList.count.mockResolvedValue(1);

      await service.queryPriceLists({
        tenantId: mockTenantId,
        status: PriceListStatus.ACTIVE,
      });

      expect(prismaService.priceList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PriceListStatus.ACTIVE,
          }),
        }),
      );
    });
  });

  describe('calculatePrice', () => {
    it('should calculate price from default price list', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);
      prismaService.priceListItem.findFirst.mockResolvedValue(mockPriceListItem);
      prismaService.priceOverride.findFirst.mockResolvedValue(null);
      prismaService.customerPriceAssignment.findMany.mockResolvedValue([]);

      const result = await service.calculatePrice({
        tenantId: mockTenantId,
        sku: 'SKU-001',
        quantity: 1,
      });

      expect(result.sku).toBe('SKU-001');
      expect(result.unitPrice).toBe(120);
      expect(result.extendedPrice).toBe(120);
      expect(result.currency).toBe('USD');
    });

    it('should apply quantity breaks', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);
      prismaService.priceListItem.findFirst.mockResolvedValue(mockPriceListItem);
      prismaService.priceOverride.findFirst.mockResolvedValue(null);
      prismaService.customerPriceAssignment.findMany.mockResolvedValue([]);

      const result = await service.calculatePrice({
        tenantId: mockTenantId,
        sku: 'SKU-001',
        quantity: 50,
      });

      expect(result.unitPrice).toBe(100);
      expect(result.quantityBreakApplied).toBeDefined();
    });

    it('should throw if no price found', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(null);
      prismaService.customerPriceAssignment.findMany.mockResolvedValue([]);
      prismaService.priceOverride.findFirst.mockResolvedValue(null);

      await expect(
        service.calculatePrice({
          tenantId: mockTenantId,
          sku: 'NON-EXISTENT',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignPriceList', () => {
    it('should assign price list to customer', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);
      prismaService.customerPriceAssignment.findUnique.mockResolvedValue(null);
      prismaService.customerPriceAssignment.create.mockResolvedValue({
        id: 'assignment-123',
        tenantId: mockTenantId,
        priceListId: mockPriceListId,
        assignmentType: PriceAssignmentType.CUSTOMER,
        assignmentId: 'customer-123',
        priority: 0,
        effectiveFrom: new Date(),
        effectiveTo: null,
        isActive: true,
        externalRef: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.assignPriceList(mockTenantId, {
        priceListId: mockPriceListId,
        assignmentType: PriceAssignmentType.CUSTOMER,
        assignmentId: 'customer-123',
        effectiveFrom: new Date(),
        priority: 0,
        isActive: true,
      });

      expect(result.assignmentType).toBe(PriceAssignmentType.CUSTOMER);
    });

    it('should throw if already assigned', async () => {
      prismaService.priceList.findFirst.mockResolvedValue(mockPriceList);
      prismaService.customerPriceAssignment.findUnique.mockResolvedValue({
        id: 'existing-assignment',
      });

      await expect(
        service.assignPriceList(mockTenantId, {
          priceListId: mockPriceListId,
          assignmentType: PriceAssignmentType.CUSTOMER,
          assignmentId: 'customer-123',
          effectiveFrom: new Date(),
          priority: 0,
          isActive: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

describe('CurrencyService', () => {
  let service: CurrencyService;
  let prismaService: any;

  const mockTenantId = 'tenant-123';

  const mockExchangeRate = {
    id: 'rate-123',
    tenantId: mockTenantId,
    sourceCurrency: 'USD',
    targetCurrency: 'EUR',
    rate: new Decimal(0.85),
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: null,
    rateSource: 'ECB',
    rateType: ExchangeRateType.SPOT,
    isActive: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      currencyExchangeRate: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
  });

  describe('upsertExchangeRate', () => {
    it('should create exchange rate if not exists', async () => {
      prismaService.currencyExchangeRate.findFirst.mockResolvedValue(null);
      prismaService.currencyExchangeRate.create.mockResolvedValue(mockExchangeRate);

      const result = await service.upsertExchangeRate(mockTenantId, {
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        rate: 0.85,
        effectiveFrom: new Date('2024-01-01'),
        rateType: ExchangeRateType.SPOT,
        isActive: true,
      });

      expect(result).toEqual(mockExchangeRate);
      expect(prismaService.currencyExchangeRate.create).toHaveBeenCalled();
    });

    it('should update exchange rate if exists', async () => {
      prismaService.currencyExchangeRate.findFirst.mockResolvedValue(mockExchangeRate);
      prismaService.currencyExchangeRate.update.mockResolvedValue({
        ...mockExchangeRate,
        rate: new Decimal(0.90),
      });

      const result = await service.upsertExchangeRate(mockTenantId, {
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        rate: 0.90,
        effectiveFrom: new Date('2024-01-01'),
        rateType: ExchangeRateType.SPOT,
        isActive: true,
      });

      expect(result.rate.toNumber()).toBe(0.90);
      expect(prismaService.currencyExchangeRate.update).toHaveBeenCalled();
    });
  });

  describe('getExchangeRate', () => {
    it('should return 1 for same currency', async () => {
      const result = await service.getExchangeRate(mockTenantId, 'USD', 'USD');
      expect(result).toBe(1);
    });

    it('should return direct rate', async () => {
      prismaService.currencyExchangeRate.findFirst.mockResolvedValue(mockExchangeRate);

      const result = await service.getExchangeRate(mockTenantId, 'USD', 'EUR');
      expect(result).toBe(0.85);
    });

    it('should throw if rate not found', async () => {
      prismaService.currencyExchangeRate.findFirst.mockResolvedValue(null);

      await expect(
        service.getExchangeRate(mockTenantId, 'USD', 'XYZ'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('convertCurrency', () => {
    it('should convert amount', async () => {
      prismaService.currencyExchangeRate.findFirst.mockResolvedValue(mockExchangeRate);

      const result = await service.convertCurrency(mockTenantId, 100, 'USD', 'EUR');

      expect(result.amount).toBe(85);
      expect(result.rate).toBe(0.85);
    });

    it('should return same amount for same currency', async () => {
      const result = await service.convertCurrency(mockTenantId, 100, 'USD', 'USD');

      expect(result.amount).toBe(100);
      expect(result.rate).toBe(1);
    });
  });
});

describe('PriceOverrideService', () => {
  let service: PriceOverrideService;
  let prismaService: any;

  const mockTenantId = 'tenant-123';
  const mockOverrideId = 'override-123';

  const mockPriceListItem = {
    id: 'item-123',
    priceListId: 'pricelist-123',
    sku: 'SKU-001',
    priceList: {
      tenantId: mockTenantId,
    },
  };

  const mockOverride = {
    id: mockOverrideId,
    tenantId: mockTenantId,
    priceListItemId: 'item-123',
    overrideType: PriceOverrideType.FIXED_PRICE,
    overrideValue: new Decimal(80),
    scopeType: PriceOverrideScopeType.CUSTOMER,
    scopeId: 'customer-123',
    effectiveFrom: new Date('2024-01-01'),
    effectiveTo: null,
    minQuantity: null,
    maxQuantity: null,
    status: PriceOverrideStatus.ACTIVE,
    approvedById: null,
    approvedAt: null,
    reason: 'Special discount',
    externalRef: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      priceListItem: {
        findFirst: jest.fn(),
      },
      priceOverride: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceOverrideService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<PriceOverrideService>(PriceOverrideService);
  });

  describe('createOverride', () => {
    it('should create price override', async () => {
      prismaService.priceListItem.findFirst.mockResolvedValue(mockPriceListItem);
      prismaService.priceOverride.findFirst.mockResolvedValue(null);
      prismaService.priceOverride.create.mockResolvedValue(mockOverride);

      const result = await service.createOverride(mockTenantId, {
        priceListItemId: 'item-123',
        overrideType: PriceOverrideType.FIXED_PRICE,
        overrideValue: 80,
        scopeType: PriceOverrideScopeType.CUSTOMER,
        scopeId: 'customer-123',
        effectiveFrom: new Date('2024-01-01'),
        status: PriceOverrideStatus.ACTIVE,
      });

      expect(result).toEqual(mockOverride);
    });

    it('should throw if price list item not found', async () => {
      prismaService.priceListItem.findFirst.mockResolvedValue(null);

      await expect(
        service.createOverride(mockTenantId, {
          priceListItemId: 'non-existent',
          overrideType: PriceOverrideType.FIXED_PRICE,
          overrideValue: 80,
          scopeType: PriceOverrideScopeType.CUSTOMER,
          scopeId: 'customer-123',
          effectiveFrom: new Date('2024-01-01'),
          status: PriceOverrideStatus.ACTIVE,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveOverride', () => {
    it('should approve pending override', async () => {
      const pendingOverride = {
        ...mockOverride,
        status: PriceOverrideStatus.PENDING_APPROVAL,
      };
      prismaService.priceOverride.findFirst.mockResolvedValue(pendingOverride);
      prismaService.priceOverride.update.mockResolvedValue({
        ...mockOverride,
        status: PriceOverrideStatus.ACTIVE,
        approvedById: 'approver-123',
        approvedAt: expect.any(Date),
      });

      const result = await service.approveOverride(
        mockTenantId,
        mockOverrideId,
        'approver-123',
      );

      expect(result.status).toBe(PriceOverrideStatus.ACTIVE);
    });

    it('should throw if not pending approval', async () => {
      prismaService.priceOverride.findFirst.mockResolvedValue(mockOverride);

      await expect(
        service.approveOverride(mockTenantId, mockOverrideId, 'approver-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeOverride', () => {
    it('should revoke active override', async () => {
      prismaService.priceOverride.findFirst.mockResolvedValue(mockOverride);
      prismaService.priceOverride.update.mockResolvedValue({
        ...mockOverride,
        status: PriceOverrideStatus.REVOKED,
      });

      const result = await service.revokeOverride(mockTenantId, mockOverrideId, 'No longer valid');

      expect(result.status).toBe(PriceOverrideStatus.REVOKED);
    });

    it('should throw if already revoked', async () => {
      prismaService.priceOverride.findFirst.mockResolvedValue({
        ...mockOverride,
        status: PriceOverrideStatus.REVOKED,
      });

      await expect(
        service.revokeOverride(mockTenantId, mockOverrideId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('queryOverrides', () => {
    it('should query overrides with pagination', async () => {
      prismaService.priceOverride.findMany.mockResolvedValue([mockOverride]);
      prismaService.priceOverride.count.mockResolvedValue(1);

      const result = await service.queryOverrides({
        tenantId: mockTenantId,
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by scope', async () => {
      prismaService.priceOverride.findMany.mockResolvedValue([mockOverride]);
      prismaService.priceOverride.count.mockResolvedValue(1);

      await service.queryOverrides({
        tenantId: mockTenantId,
        scopeType: PriceOverrideScopeType.CUSTOMER,
        scopeId: 'customer-123',
      });

      expect(prismaService.priceOverride.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scopeType: PriceOverrideScopeType.CUSTOMER,
            scopeId: 'customer-123',
          }),
        }),
      );
    });
  });
});
