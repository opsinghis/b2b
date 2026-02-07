import { Test, TestingModule } from '@nestjs/testing';
import { MasterCatalogService } from './master-catalog.service';
import { PrismaService } from '@infrastructure/database';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { MasterProductStatus, Prisma } from '@prisma/client';

describe('MasterCatalogService', () => {
  let service: MasterCatalogService;
  let prismaService: jest.Mocked<PrismaService>;

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
    listPrice: new Prisma.Decimal(999.99),
    currency: 'USD',
    status: MasterProductStatus.ACTIVE,
    attributes: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    masterProduct: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    quoteLineItem: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MasterCatalogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MasterCatalogService>(MasterCatalogService);
    prismaService = module.get(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      sku: 'PROD-001',
      name: 'Test Product',
      description: 'A test product',
      category: 'Software',
      listPrice: 999.99,
    };

    it('should create a master product successfully', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);
      mockPrismaService.masterProduct.create.mockResolvedValue(mockMasterProduct);

      const result = await service.create(createDto);

      expect(result).toEqual(mockMasterProduct);
      expect(mockPrismaService.masterProduct.findUnique).toHaveBeenCalledWith({
        where: { sku: 'PROD-001' },
      });
      expect(mockPrismaService.masterProduct.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sku: 'PROD-001',
          name: 'Test Product',
          description: 'A test product',
          category: 'Software',
          uom: 'EA',
          currency: 'USD',
          status: MasterProductStatus.ACTIVE,
        }),
      });
    });

    it('should throw ConflictException if SKU already exists', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.masterProduct.create).not.toHaveBeenCalled();
    });

    it('should use default values for optional fields', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);
      mockPrismaService.masterProduct.create.mockResolvedValue(mockMasterProduct);

      const minimalDto = {
        sku: 'PROD-002',
        name: 'Minimal Product',
        listPrice: 100,
      };

      await service.create(minimalDto);

      expect(mockPrismaService.masterProduct.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          uom: 'EA',
          currency: 'USD',
          status: MasterProductStatus.ACTIVE,
          attributes: {},
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([mockMasterProduct]);
      mockPrismaService.masterProduct.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: [mockMasterProduct],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by search term', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll({ search: 'test', page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'test', mode: 'insensitive' } },
              { sku: { contains: 'test', mode: 'insensitive' } },
              { description: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll({ category: 'Software', page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Software',
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll({ status: MasterProductStatus.ACTIVE, page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: MasterProductStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should filter by brand', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll({ brand: 'Acme', page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            brand: 'Acme',
          }),
        }),
      );
    });

    it('should filter by subcategory', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(0);

      await service.findAll({ subcategory: 'Licenses', page: 1, limit: 20 });

      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subcategory: 'Licenses',
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.count.mockResolvedValue(50);

      const result = await service.findAll({ page: 3, limit: 10 });

      expect(result.totalPages).toBe(5);
      expect(mockPrismaService.masterProduct.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);

      const result = await service.findOne('product-1');

      expect(result).toEqual(mockMasterProduct);
      expect(mockPrismaService.masterProduct.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySku', () => {
    it('should return a product by SKU', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);

      const result = await service.findBySku('PROD-001');

      expect(result).toEqual(mockMasterProduct);
      expect(mockPrismaService.masterProduct.findUnique).toHaveBeenCalledWith({
        where: { sku: 'PROD-001' },
      });
    });

    it('should throw NotFoundException if SKU not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(service.findBySku('INVALID-SKU')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Product',
      listPrice: 1099.99,
    };

    it('should update a product successfully', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);
      mockPrismaService.masterProduct.update.mockResolvedValue({
        ...mockMasterProduct,
        ...updateDto,
      });

      const result = await service.update('product-1', updateDto);

      expect(result.name).toBe('Updated Product');
      expect(mockPrismaService.masterProduct.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: expect.objectContaining({
          name: 'Updated Product',
        }),
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updating to existing SKU', async () => {
      const existingProduct = { ...mockMasterProduct, id: 'product-2', sku: 'EXISTING-SKU' };
      mockPrismaService.masterProduct.findUnique
        .mockResolvedValueOnce(mockMasterProduct) // First call - findOne
        .mockResolvedValueOnce(existingProduct); // Second call - SKU check

      await expect(
        service.update('product-1', { sku: 'EXISTING-SKU' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating SKU if not conflicting', async () => {
      mockPrismaService.masterProduct.findUnique
        .mockResolvedValueOnce(mockMasterProduct) // First call - findOne
        .mockResolvedValueOnce(null); // Second call - SKU check (no conflict)
      mockPrismaService.masterProduct.update.mockResolvedValue({
        ...mockMasterProduct,
        sku: 'NEW-SKU',
      });

      const result = await service.update('product-1', { sku: 'NEW-SKU' });

      expect(result.sku).toBe('NEW-SKU');
    });

    it('should not check for SKU conflict if SKU unchanged', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);
      mockPrismaService.masterProduct.update.mockResolvedValue(mockMasterProduct);

      await service.update('product-1', { sku: 'PROD-001' });

      // findUnique should only be called once (for findOne)
      expect(mockPrismaService.masterProduct.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should delete product if not referenced', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);
      mockPrismaService.quoteLineItem.count.mockResolvedValue(0);
      mockPrismaService.masterProduct.delete.mockResolvedValue(mockMasterProduct);

      await service.remove('product-1');

      expect(mockPrismaService.masterProduct.delete).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
    });

    it('should archive product if referenced by quote line items', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);
      mockPrismaService.quoteLineItem.count.mockResolvedValue(5);
      mockPrismaService.masterProduct.update.mockResolvedValue({
        ...mockMasterProduct,
        status: MasterProductStatus.ARCHIVED,
      });

      await service.remove('product-1');

      expect(mockPrismaService.masterProduct.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { status: MasterProductStatus.ARCHIVED },
      });
      expect(mockPrismaService.masterProduct.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should return list of categories', async () => {
      mockPrismaService.masterProduct.groupBy.mockResolvedValue([
        { category: 'Software' },
        { category: 'Hardware' },
        { category: 'Services' },
      ]);

      const result = await service.getCategories();

      expect(result).toEqual(['Software', 'Hardware', 'Services']);
      expect(mockPrismaService.masterProduct.groupBy).toHaveBeenCalledWith({
        by: ['category'],
        where: { category: { not: null } },
        orderBy: { category: 'asc' },
      });
    });

    it('should filter out null categories', async () => {
      mockPrismaService.masterProduct.groupBy.mockResolvedValue([
        { category: 'Software' },
        { category: null },
        { category: 'Hardware' },
      ]);

      const result = await service.getCategories();

      expect(result).toEqual(['Software', 'Hardware']);
    });
  });

  describe('getBrands', () => {
    it('should return list of brands', async () => {
      mockPrismaService.masterProduct.groupBy.mockResolvedValue([
        { brand: 'Acme' },
        { brand: 'Globex' },
        { brand: 'Initech' },
      ]);

      const result = await service.getBrands();

      expect(result).toEqual(['Acme', 'Globex', 'Initech']);
      expect(mockPrismaService.masterProduct.groupBy).toHaveBeenCalledWith({
        by: ['brand'],
        where: { brand: { not: null } },
        orderBy: { brand: 'asc' },
      });
    });

    it('should filter out null brands', async () => {
      mockPrismaService.masterProduct.groupBy.mockResolvedValue([
        { brand: 'Acme' },
        { brand: null },
      ]);

      const result = await service.getBrands();

      expect(result).toEqual(['Acme']);
    });
  });

  describe('updateStatus', () => {
    it('should update product status', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(mockMasterProduct);
      mockPrismaService.masterProduct.update.mockResolvedValue({
        ...mockMasterProduct,
        status: MasterProductStatus.DISCONTINUED,
      });

      const result = await service.updateStatus('product-1', MasterProductStatus.DISCONTINUED);

      expect(result.status).toBe(MasterProductStatus.DISCONTINUED);
      expect(mockPrismaService.masterProduct.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { status: MasterProductStatus.DISCONTINUED },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.masterProduct.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('nonexistent', MasterProductStatus.ARCHIVED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('importProducts', () => {
    const validProducts = [
      { sku: 'IMP-001', name: 'Import Product 1', listPrice: 100 },
      { sku: 'IMP-002', name: 'Import Product 2', listPrice: 200 },
      { sku: 'IMP-003', name: 'Import Product 3', listPrice: 300 },
    ];

    it('should import products successfully', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.createMany.mockResolvedValue({ count: 3 });

      const result = await service.importProducts(validProducts);

      expect(result.total).toBe(3);
      expect(result.imported).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should skip duplicate SKUs', async () => {
      mockPrismaService.masterProduct.findMany.mockResolvedValue([
        { sku: 'IMP-001' },
      ]);
      mockPrismaService.masterProduct.createMany.mockResolvedValue({ count: 2 });

      const result = await service.importProducts(validProducts);

      expect(result.total).toBe(3);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should report validation errors', async () => {
      const invalidProducts = [
        { sku: '', name: 'No SKU', listPrice: 100 },
        { sku: 'VALID', name: 'Valid', listPrice: 100 },
        { sku: 'NEG', name: 'Negative Price', listPrice: -50 },
      ];

      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importProducts(invalidProducts);

      expect(result.total).toBe(3);
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle empty array', async () => {
      const result = await service.importProducts([]);

      expect(result.total).toBe(0);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should process in batches', async () => {
      const manyProducts = Array.from({ length: 10 }, (_, i) => ({
        sku: `BATCH-${i}`,
        name: `Batch Product ${i}`,
        listPrice: 100,
      }));

      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.createMany.mockResolvedValue({ count: 5 });

      const result = await service.importProducts(manyProducts, 5);

      // Should be called twice for 10 products with batch size 5
      expect(mockPrismaService.masterProduct.createMany).toHaveBeenCalledTimes(2);
      expect(result.imported).toBe(10);
    });

    it('should reject products with missing name', async () => {
      const productsWithMissingName = [
        { sku: 'NO-NAME', listPrice: 100 } as { sku: string; name: string; listPrice: number },
      ];

      const result = await service.importProducts(productsWithMissingName);

      expect(result.failed).toBe(1);
      expect(result.errors?.[0].error).toContain('Name is required');
    });

    it('should reject products with invalid price type', async () => {
      const productsWithInvalidPrice = [
        { sku: 'BAD-PRICE', name: 'Bad Price', listPrice: 'not-a-number' as unknown as number },
      ];

      const result = await service.importProducts(productsWithInvalidPrice);

      expect(result.failed).toBe(1);
      expect(result.errors?.[0].error).toContain('valid number');
    });
  });

  describe('importFromJson', () => {
    it('should parse and import JSON array', async () => {
      const jsonData = JSON.stringify([
        { sku: 'JSON-001', name: 'JSON Product', listPrice: 100 },
      ]);
      const buffer = Buffer.from(jsonData, 'utf-8');

      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importFromJson(buffer);

      expect(result.total).toBe(1);
      expect(result.imported).toBe(1);
    });

    it('should parse and import { products: [...] } format', async () => {
      const jsonData = JSON.stringify({
        products: [
          { sku: 'JSON-001', name: 'JSON Product', listPrice: 100 },
        ],
      });
      const buffer = Buffer.from(jsonData, 'utf-8');

      mockPrismaService.masterProduct.findMany.mockResolvedValue([]);
      mockPrismaService.masterProduct.createMany.mockResolvedValue({ count: 1 });

      const result = await service.importFromJson(buffer);

      expect(result.total).toBe(1);
      expect(result.imported).toBe(1);
    });

    it('should throw error for invalid JSON', async () => {
      const invalidJson = Buffer.from('{ invalid json }', 'utf-8');

      await expect(service.importFromJson(invalidJson)).rejects.toThrow('Failed to parse JSON file');
    });

    it('should throw error for invalid JSON structure', async () => {
      const invalidStructure = Buffer.from('{ "data": "not an array" }', 'utf-8');

      await expect(service.importFromJson(invalidStructure)).rejects.toThrow('Invalid JSON format');
    });
  });
});
