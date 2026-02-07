import { Test, TestingModule } from '@nestjs/testing';
import { TenantCatalogService } from './tenant-catalog.service';
import { CategoriesService } from './categories.service';
import { PrismaService } from '@infrastructure/database';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MasterProductStatus, ProductAvailability, Prisma } from '@prisma/client';

describe('TenantCatalogService', () => {
  let service: TenantCatalogService;

  const tenantId = 'tenant-1';

  const mockMasterProduct = {
    id: 'product-1',
    sku: 'PROD-001',
    name: 'Test Product',
    description: 'A test product',
    category: 'Software',
    subcategory: 'Licenses',
    brand: 'Acme',
    manufacturer: 'Acme Corp',
    uom: 'EA',
    listPrice: new Prisma.Decimal(1000),
    currency: 'USD',
    status: MasterProductStatus.ACTIVE,
    availability: ProductAvailability.IN_STOCK,
    primaryImage: null,
    images: [],
    categoryId: null,
    categoryEntity: null,
    attributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantAccess: [],
  };

  const mockAccess = {
    id: 'access-1',
    tenantId,
    masterProductId: 'product-1',
    isActive: true,
    agreedPrice: null,
    discountPercent: null,
    minQuantity: null,
    maxQuantity: null,
    validFrom: null,
    validUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    masterProduct: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    tenantProductAccess: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  };

  const mockCategoriesService = {
    getCategoryIdsWithDescendants: jest.fn().mockResolvedValue(['cat-1']),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantCatalogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    service = module.get<TenantCatalogService>(TenantCatalogService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated products with tenant access', async () => {
      const productWithAccess = {
        ...mockMasterProduct,
        tenantAccess: [mockAccess],
      };
      mockPrismaService.masterProduct.findMany.mockResolvedValue([productWithAccess]);
      mockPrismaService.masterProduct.count.mockResolvedValue(1);

      const result = await service.findAll(tenantId, { page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.data[0].hasAccess).toBe(true);
      expect(result.data[0].listPrice).toBe('1000');
    });

    it('should filter by access only by default', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll(tenantId, { page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantAccess: { some: { tenantId, isActive: true } },
          }),
        }),
      );
    });

    it('should show all products when accessOnly is false', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([mockMasterProduct]);
      mockPrismaService.masterProduct.count.mockResolvedValue(1);

      await service.findAll(tenantId, { accessOnly: false, page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            tenantAccess: expect.anything(),
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll(tenantId, { category: 'Software', page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'Software' }),
        }),
      );
    });

    it('should filter by categoryId (hierarchical)', async () => {
      mockCategoriesService.getCategoryIdsWithDescendants.mockResolvedValue([
        'cat-1',
        'cat-2',
      ]);
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll(tenantId, { categoryId: 'cat-1', page: 1, limit: 20 });

      expect(mockCategoriesService.getCategoryIdsWithDescendants).toHaveBeenCalledWith(
        'cat-1',
      );
      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: { in: ['cat-1', 'cat-2'] } }),
        }),
      );
    });

    it('should filter by search term', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll(tenantId, { search: 'test', page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter by price range', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll(tenantId, {
        minPrice: 100,
        maxPrice: 500,
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            listPrice: {
              gte: expect.any(Prisma.Decimal),
              lte: expect.any(Prisma.Decimal),
            },
          }),
        }),
      );
    });

    it('should filter by availability', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll(tenantId, {
        availability: ProductAvailability.IN_STOCK,
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            availability: ProductAvailability.IN_STOCK,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return product with tenant pricing and availability', async () => {
      const productWithAccess = {
        ...mockMasterProduct,
        tenantAccess: [mockAccess],
      };
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(productWithAccess);

      const result = await service.findOne('product-1', tenantId);

      expect(result.id).toBe('product-1');
      expect(result.hasAccess).toBe(true);
      expect(result.availability).toBe(ProductAvailability.IN_STOCK);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should show hasAccess as false when no access', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);

      const result = await service.findOne('product-1', tenantId);

      expect(result.hasAccess).toBe(false);
    });
  });

  describe('findBySku', () => {
    it('should return product by SKU', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);

      const result = await service.findBySku('PROD-001', tenantId);

      expect(result.sku).toBe('PROD-001');
    });

    it('should throw NotFoundException if SKU not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(service.findBySku('INVALID', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getRelatedProducts', () => {
    it('should return related products by category', async () => {
      const mainProduct = {
        ...mockMasterProduct,
        categoryId: 'cat-1',
        tenantAccess: [mockAccess],
      };
      const relatedProduct = {
        ...mockMasterProduct,
        id: 'product-2',
        name: 'Related Product',
        categoryId: 'cat-1',
        tenantAccess: [{ ...mockAccess, masterProductId: 'product-2' }],
      };

      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mainProduct);
      mockPrismaService.masterProduct.findMany.mockResolvedValue([relatedProduct]);

      const result = await service.getRelatedProducts('product-1', tenantId);

      expect(result.data).toHaveLength(1);
      expect(result.relationType).toBe('same_category');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(
        service.getRelatedProducts('nonexistent', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return empty suggestions for short queries', async () => {
      const result = await service.getSearchSuggestions(tenantId, { q: 'a' });

      expect(result.suggestions).toHaveLength(0);
    });

    it('should return product, category, and brand suggestions', async () => {
      mockPrismaService.masterProduct.findMany
        .mockResolvedValueOnce([{ id: 'p1', name: 'Test Product' }]) // products
        .mockResolvedValueOnce([{ brand: 'Test Brand' }]); // brands
      mockPrismaService.category.findMany.mockResolvedValue([
        { id: 'c1', name: 'Test Category', _count: { products: 5 } },
      ]);

      const result = await service.getSearchSuggestions(tenantId, { q: 'test' });

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some((s) => s.type === 'product')).toBe(true);
      expect(result.suggestions.some((s) => s.type === 'category')).toBe(true);
      expect(result.suggestions.some((s) => s.type === 'brand')).toBe(true);
    });
  });

  describe('grantAccess', () => {
    it('should grant access to a product', async () => {
      mockPrismaService.masterProduct.findUnique
        .mockResolvedValueOnce(mockMasterProduct) // First call for validation
        .mockResolvedValueOnce({ ...mockMasterProduct, tenantAccess: [mockAccess] }); // Second call for response
      mockPrismaService.tenantProductAccess.upsert.mockResolvedValue(mockAccess);

      const result = await service.grantAccess('product-1', tenantId, {
        isActive: true,
      });

      expect(mockPrismaService.tenantProductAccess.upsert).toHaveBeenCalled();
      expect(result.hasAccess).toBe(true);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(
        service.grantAccess('nonexistent', tenantId, { isActive: true }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should set pricing when granting access', async () => {
      mockPrismaService.masterProduct.findUnique
        .mockResolvedValueOnce(mockMasterProduct)
        .mockResolvedValueOnce({
          ...mockMasterProduct,
          tenantAccess: [{ ...mockAccess, agreedPrice: new Prisma.Decimal(800) }],
        });
      mockPrismaService.tenantProductAccess.upsert.mockResolvedValue({
        ...mockAccess,
        agreedPrice: new Prisma.Decimal(800),
      });

      const result = await service.grantAccess('product-1', tenantId, {
        isActive: true,
        agreedPrice: 800,
      });

      expect(mockPrismaService.tenantProductAccess.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            agreedPrice: expect.any(Prisma.Decimal),
          }),
        }),
      );
      expect(result.tenantPricing?.agreedPrice).toBe('800');
    });
  });

  describe('setPricing', () => {
    it('should update pricing for a product', async () => {
      mockPrismaService.masterProduct.findUnique
        .mockResolvedValueOnce(mockMasterProduct)
        .mockResolvedValueOnce({
          ...mockMasterProduct,
          tenantAccess: [{ ...mockAccess, discountPercent: new Prisma.Decimal(10) }],
        });
      mockPrismaService.tenantProductAccess.findUnique.mockResolvedValue(mockAccess);
      mockPrismaService.tenantProductAccess.update.mockResolvedValue({
        ...mockAccess,
        discountPercent: new Prisma.Decimal(10),
      });

      const result = await service.setPricing('product-1', tenantId, {
        discountPercent: 10,
      });

      expect(mockPrismaService.tenantProductAccess.update).toHaveBeenCalled();
      expect(result.tenantPricing?.discountPercent).toBe('10');
    });

    it('should throw ForbiddenException if no access', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);
      mockPrismaService.tenantProductAccess.findUnique.mockResolvedValue(null);

      await expect(
        service.setPricing('product-1', tenantId, { discountPercent: 10 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(
        service.setPricing('nonexistent', tenantId, { discountPercent: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('hasAccess', () => {
    it('should return true if tenant has active access', async () => {
      mockPrismaService.tenantProductAccess.findUnique.mockResolvedValue(mockAccess);

      const result = await service.hasAccess('product-1', tenantId);

      expect(result).toBe(true);
    });

    it('should return false if no access record', async () => {
      mockPrismaService.tenantProductAccess.findUnique.mockResolvedValue(null);

      const result = await service.hasAccess('product-1', tenantId);

      expect(result).toBe(false);
    });

    it('should return false if access is inactive', async () => {
      mockPrismaService.tenantProductAccess.findUnique.mockResolvedValue({
        ...mockAccess,
        isActive: false,
      });

      const result = await service.hasAccess('product-1', tenantId);

      expect(result).toBe(false);
    });

    it('should return false if access has not started yet', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      mockPrismaService.tenantProductAccess.findUnique.mockResolvedValue({
        ...mockAccess,
        validFrom: futureDate,
      });

      const result = await service.hasAccess('product-1', tenantId);

      expect(result).toBe(false);
    });

    it('should return false if access has expired', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      mockPrismaService.tenantProductAccess.findUnique.mockResolvedValue({
        ...mockAccess,
        validUntil: pastDate,
      });

      const result = await service.hasAccess('product-1', tenantId);

      expect(result).toBe(false);
    });
  });

  describe('calculateEffectivePrice', () => {
    const listPrice = new Prisma.Decimal(1000);

    it('should return list price when no access', () => {
      const result = service.calculateEffectivePrice(listPrice, null);

      expect(result.toString()).toBe('1000');
    });

    it('should return list price when access is inactive', () => {
      const result = service.calculateEffectivePrice(listPrice, {
        ...mockAccess,
        isActive: false,
      });

      expect(result.toString()).toBe('1000');
    });

    it('should return agreed price when set (priority 1)', () => {
      const result = service.calculateEffectivePrice(listPrice, {
        ...mockAccess,
        agreedPrice: new Prisma.Decimal(800),
        discountPercent: new Prisma.Decimal(10), // Should be ignored
      });

      expect(result.toString()).toBe('800');
    });

    it('should apply discount when no agreed price (priority 2)', () => {
      const result = service.calculateEffectivePrice(listPrice, {
        ...mockAccess,
        agreedPrice: null,
        discountPercent: new Prisma.Decimal(10),
      });

      expect(result.toString()).toBe('900'); // 1000 - 10% = 900
    });

    it('should return list price when validity period not started', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = service.calculateEffectivePrice(listPrice, {
        ...mockAccess,
        agreedPrice: new Prisma.Decimal(800),
        validFrom: futureDate,
      });

      expect(result.toString()).toBe('1000');
    });

    it('should return list price when validity period expired', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const result = service.calculateEffectivePrice(listPrice, {
        ...mockAccess,
        agreedPrice: new Prisma.Decimal(800),
        validUntil: pastDate,
      });

      expect(result.toString()).toBe('1000');
    });

    it('should apply pricing within valid period', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const result = service.calculateEffectivePrice(listPrice, {
        ...mockAccess,
        agreedPrice: new Prisma.Decimal(750),
        validFrom: pastDate,
        validUntil: futureDate,
      });

      expect(result.toString()).toBe('750');
    });
  });
});
