import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { PrismaService } from '@infrastructure/database';
import { AuditService } from '@core/audit';
import { ContractsService } from '@business/contracts';
import { TenantCatalogService } from '@business/tenant-catalog';
import { NotificationsService } from '@platform/notifications';
import {
  Quote,
  QuoteLineItem,
  QuoteStatus,
  UserRole,
  Prisma,
  MasterProductStatus,
} from '@prisma/client';

describe('QuotesService', () => {
  let service: QuotesService;
  let prismaService: jest.Mocked<PrismaService>;
  let auditService: jest.Mocked<AuditService>;
  let contractsService: jest.Mocked<ContractsService>;
  let tenantCatalogService: jest.Mocked<TenantCatalogService>;

  const tenantId = 'tenant-id-123';
  const userId = 'user-id-123';

  const mockLineItem: QuoteLineItem = {
    id: 'line-item-id-123',
    quoteId: 'quote-id-123',
    lineNumber: 1,
    productName: 'Test Product',
    productSku: 'SKU-001',
    description: 'Test description',
    quantity: 10,
    unitPrice: new Prisma.Decimal(100),
    discount: new Prisma.Decimal(50),
    total: new Prisma.Decimal(950),
    masterProductId: null,
  };

  const mockQuote: Quote & { lineItems: QuoteLineItem[] } = {
    id: 'quote-id-123',
    quoteNumber: 'QT-2024-0001',
    title: 'Test Quote',
    description: 'Test description',
    status: QuoteStatus.DRAFT,
    customerName: null,
    customerEmail: null,
    validUntil: new Date('2024-03-31'),
    subtotal: new Prisma.Decimal(1000),
    discount: new Prisma.Decimal(50),
    discountPercent: null,
    tax: new Prisma.Decimal(0),
    total: new Prisma.Decimal(950),
    currency: 'USD',
    notes: 'Test notes',
    internalNotes: null,
    metadata: { priority: 'high' },
    tenantId,
    contractId: null,
    createdById: userId,
    approvedById: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    lineItems: [mockLineItem],
  };

  const mockContract = {
    id: 'contract-id-123',
    contractNumber: 'CNT-2024-0001',
    title: 'Test Contract',
    tenantId,
    createdById: userId,
    versions: [],
  };

  beforeEach(async () => {
    const mockPrismaTransaction = jest.fn().mockImplementation((callback) =>
      callback({
        quoteLineItem: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        quote: {
          update: jest.fn().mockResolvedValue(mockQuote),
        },
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        {
          provide: PrismaService,
          useValue: {
            quote: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            quoteLineItem: {
              deleteMany: jest.fn(),
              createMany: jest.fn(),
            },
            $transaction: mockPrismaTransaction,
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: ContractsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: TenantCatalogService,
          useValue: {
            hasAccess: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            notifyUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AuditService);
    contractsService = module.get(ContractsService);
    tenantCatalogService = module.get(TenantCatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new quote with line items', async () => {
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.quote.create as jest.Mock).mockResolvedValue(mockQuote);

      const result = await service.create(
        {
          title: 'Test Quote',
          description: 'Test description',
          lineItems: [
            {
              productName: 'Test Product',
              productSku: 'SKU-001',
              quantity: 10,
              unitPrice: 100,
              discount: 50,
            },
          ],
        },
        tenantId,
        userId,
      );

      expect(result).toBeDefined();
      expect(prismaService.quote.create).toHaveBeenCalled();
    });

    it('should calculate totals correctly', async () => {
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.quote.create as jest.Mock).mockResolvedValue(mockQuote);

      await service.create(
        {
          title: 'Test Quote',
          lineItems: [
            {
              productName: 'Product 1',
              quantity: 5,
              unitPrice: 100,
              discount: 25,
            },
            {
              productName: 'Product 2',
              quantity: 10,
              unitPrice: 50,
            },
          ],
        },
        tenantId,
        userId,
      );

      expect(prismaService.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: new Prisma.Decimal(1000), // 5*100 + 10*50
            discount: new Prisma.Decimal(25), // only first item has discount
            total: new Prisma.Decimal(975), // 1000 - 25
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated quotes', async () => {
      (prismaService.quote.findMany as jest.Mock).mockResolvedValue([mockQuote]);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 }, tenantId);

      expect(result).toEqual({
        data: [mockQuote],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      (prismaService.quote.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ status: QuoteStatus.APPROVED }, tenantId);

      expect(prismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: QuoteStatus.APPROVED,
          }),
        }),
      );
    });

    it('should filter by search term', async () => {
      (prismaService.quote.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ search: 'test' }, tenantId);

      expect(prismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ title: { contains: 'test', mode: 'insensitive' } }]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a quote by id', async () => {
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);

      const result = await service.findOne(mockQuote.id, tenantId);

      expect(result).toEqual(mockQuote);
    });

    it('should throw NotFoundException if quote not found', async () => {
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', tenantId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a DRAFT quote', async () => {
      const updatedQuote = { ...mockQuote, title: 'Updated Quote' };
      // First call: findOne for status check
      // Second call: findOne at end (after transaction)
      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockQuote) // Initial findOne
        .mockResolvedValueOnce(updatedQuote); // Final findOne after update

      // Mock the transaction to return updated quote
      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          quoteLineItem: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
          quote: {
            update: jest.fn().mockResolvedValue(updatedQuote),
          },
        });
      });

      const result = await service.update(
        mockQuote.id,
        { title: 'Updated Quote' },
        tenantId,
        userId,
      );

      expect(result.title).toBe('Updated Quote');
    });

    it('should throw BadRequestException if quote is not in DRAFT status', async () => {
      const sentQuote = { ...mockQuote, status: QuoteStatus.SENT };
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(sentQuote);

      await expect(
        service.update(mockQuote.id, { title: 'Updated' }, tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a DRAFT quote', async () => {
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (prismaService.quote.update as jest.Mock).mockResolvedValue({
        ...mockQuote,
        deletedAt: new Date(),
      });

      await service.remove(mockQuote.id, tenantId, userId);

      expect(prismaService.quote.update).toHaveBeenCalledWith({
        where: { id: mockQuote.id },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw BadRequestException if quote is not deletable', async () => {
      const activeQuote = { ...mockQuote, status: QuoteStatus.SENT };
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(activeQuote);

      await expect(service.remove(mockQuote.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================
  // Workflow Tests
  // ==========================================

  describe('submit', () => {
    it('should submit a DRAFT quote for approval', async () => {
      const submittedQuote = { ...mockQuote, status: QuoteStatus.PENDING_APPROVAL };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockQuote)
        .mockResolvedValueOnce(submittedQuote);
      (prismaService.quote.update as jest.Mock).mockResolvedValue(submittedQuote);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.submit(mockQuote.id, tenantId, userId);

      expect(result.status).toBe(QuoteStatus.PENDING_APPROVAL);
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if quote is not DRAFT', async () => {
      const sentQuote = { ...mockQuote, status: QuoteStatus.SENT };
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(sentQuote);

      await expect(service.submit(mockQuote.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    it('should approve a PENDING_APPROVAL quote within threshold', async () => {
      const pendingQuote = {
        ...mockQuote,
        status: QuoteStatus.PENDING_APPROVAL,
        total: new Prisma.Decimal(5000), // Under MANAGER threshold
      };
      const approvedQuote = { ...pendingQuote, status: QuoteStatus.APPROVED };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(pendingQuote)
        .mockResolvedValueOnce(approvedQuote)
        .mockResolvedValueOnce(approvedQuote);
      (prismaService.quote.update as jest.Mock).mockResolvedValue(approvedQuote);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.approve(mockQuote.id, tenantId, userId, UserRole.MANAGER);

      expect(result.status).toBe(QuoteStatus.APPROVED);
    });

    it('should throw BadRequestException if quote exceeds approval threshold', async () => {
      const pendingQuote = {
        ...mockQuote,
        status: QuoteStatus.PENDING_APPROVAL,
        total: new Prisma.Decimal(75000), // Over MANAGER threshold (50000)
      };

      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(pendingQuote);

      await expect(
        service.approve(mockQuote.id, tenantId, userId, UserRole.MANAGER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow ADMIN to approve higher value quotes', async () => {
      const pendingQuote = {
        ...mockQuote,
        status: QuoteStatus.PENDING_APPROVAL,
        total: new Prisma.Decimal(75000), // Over MANAGER but under ADMIN threshold
      };
      const approvedQuote = { ...pendingQuote, status: QuoteStatus.APPROVED };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(pendingQuote)
        .mockResolvedValueOnce(approvedQuote)
        .mockResolvedValueOnce(approvedQuote);
      (prismaService.quote.update as jest.Mock).mockResolvedValue(approvedQuote);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.approve(mockQuote.id, tenantId, userId, UserRole.ADMIN);

      expect(result.status).toBe(QuoteStatus.APPROVED);
    });
  });

  describe('reject', () => {
    it('should reject a PENDING_APPROVAL quote back to DRAFT', async () => {
      const pendingQuote = { ...mockQuote, status: QuoteStatus.PENDING_APPROVAL };
      const rejectedQuote = { ...pendingQuote, status: QuoteStatus.DRAFT };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(pendingQuote)  // First call in reject()
        .mockResolvedValueOnce(rejectedQuote) // Call in transitionStatusDirect
        .mockResolvedValueOnce(rejectedQuote); // Final call in reject() after notification
      (prismaService.quote.update as jest.Mock).mockResolvedValue(rejectedQuote);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.reject(mockQuote.id, tenantId, userId);

      expect(result.status).toBe(QuoteStatus.DRAFT);
    });

    it('should throw BadRequestException if quote cannot be rejected', async () => {
      const expiredQuote = { ...mockQuote, status: QuoteStatus.EXPIRED };
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(expiredQuote);

      await expect(service.reject(mockQuote.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('send', () => {
    it('should send an APPROVED quote', async () => {
      const approvedQuote = { ...mockQuote, status: QuoteStatus.APPROVED };
      const sentQuote = { ...approvedQuote, status: QuoteStatus.SENT };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(approvedQuote)
        .mockResolvedValueOnce(sentQuote);
      (prismaService.quote.update as jest.Mock).mockResolvedValue(sentQuote);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.send(mockQuote.id, tenantId, userId);

      expect(result.status).toBe(QuoteStatus.SENT);
    });
  });

  describe('accept', () => {
    it('should accept a SENT quote', async () => {
      const sentQuote = { ...mockQuote, status: QuoteStatus.SENT };
      const acceptedQuote = { ...sentQuote, status: QuoteStatus.ACCEPTED };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(sentQuote)
        .mockResolvedValueOnce(acceptedQuote);
      (prismaService.quote.update as jest.Mock).mockResolvedValue(acceptedQuote);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.accept(mockQuote.id, tenantId, userId);

      expect(result.status).toBe(QuoteStatus.ACCEPTED);
    });
  });

  describe('rejectByCustomer', () => {
    it('should reject a SENT quote by customer', async () => {
      const sentQuote = { ...mockQuote, status: QuoteStatus.SENT };
      const rejectedQuote = { ...sentQuote, status: QuoteStatus.REJECTED };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(sentQuote)
        .mockResolvedValueOnce(rejectedQuote);
      (prismaService.quote.update as jest.Mock).mockResolvedValue(rejectedQuote);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.rejectByCustomer(mockQuote.id, tenantId, userId);

      expect(result.status).toBe(QuoteStatus.REJECTED);
    });
  });

  describe('convertToContract', () => {
    it('should convert an ACCEPTED quote to a contract', async () => {
      const acceptedQuote = { ...mockQuote, status: QuoteStatus.ACCEPTED };
      const convertedQuote = {
        ...acceptedQuote,
        status: QuoteStatus.CONVERTED,
        contractId: mockContract.id,
      };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(acceptedQuote)
        .mockResolvedValueOnce(convertedQuote);
      (prismaService.quote.update as jest.Mock).mockResolvedValue(convertedQuote);
      (contractsService.create as jest.Mock).mockResolvedValue(mockContract);
      (auditService.log as jest.Mock).mockResolvedValue({});

      const result = await service.convertToContract(mockQuote.id, tenantId, userId);

      expect(result.quote.status).toBe(QuoteStatus.CONVERTED);
      expect(result.contractId).toBe(mockContract.id);
      expect(contractsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining(acceptedQuote.quoteNumber),
          totalValue: acceptedQuote.total.toNumber(),
        }),
        tenantId,
        userId,
      );
    });

    it('should throw BadRequestException if quote is not ACCEPTED', async () => {
      const draftQuote = { ...mockQuote, status: QuoteStatus.DRAFT };
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(draftQuote);

      await expect(service.convertToContract(mockQuote.id, tenantId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('isValidTransition', () => {
    it('should return true for valid DRAFT -> PENDING_APPROVAL', () => {
      expect(service.isValidTransition(QuoteStatus.DRAFT, QuoteStatus.PENDING_APPROVAL)).toBe(true);
    });

    it('should return true for valid SENT -> ACCEPTED', () => {
      expect(service.isValidTransition(QuoteStatus.SENT, QuoteStatus.ACCEPTED)).toBe(true);
    });

    it('should return false for invalid DRAFT -> SENT', () => {
      expect(service.isValidTransition(QuoteStatus.DRAFT, QuoteStatus.SENT)).toBe(false);
    });

    it('should return false for any transition from CONVERTED', () => {
      expect(service.isValidTransition(QuoteStatus.CONVERTED, QuoteStatus.DRAFT)).toBe(false);
    });
  });

  describe('getApprovalThreshold', () => {
    it('should return correct thresholds for each role', () => {
      expect(service.getApprovalThreshold(UserRole.USER)).toBe(10000);
      expect(service.getApprovalThreshold(UserRole.MANAGER)).toBe(50000);
      expect(service.getApprovalThreshold(UserRole.ADMIN)).toBe(100000);
      expect(service.getApprovalThreshold(UserRole.SUPER_ADMIN)).toBe(Infinity);
    });
  });

  // ==========================================
  // Catalog Integration Tests (PRD-022c)
  // ==========================================

  describe('create with masterProductId', () => {
    const mockCatalogProduct = {
      id: 'master-product-1',
      sku: 'CAT-SKU-001',
      name: 'Catalog Product',
      description: 'A product from the catalog',
      category: 'Software',
      subcategory: 'Licenses',
      brand: 'Acme',
      uom: 'EA',
      listPrice: '1000.00',
      effectivePrice: '800.00',
      currency: 'USD',
      status: MasterProductStatus.ACTIVE,
      tenantPricing: {
        agreedPrice: '800.00',
        discountPercent: null,
        minQuantity: 1,
        maxQuantity: 100,
        validFrom: null,
        validUntil: null,
      },
      hasAccess: true,
    };

    it('should create quote with product from catalog', async () => {
      (tenantCatalogService.hasAccess as jest.Mock).mockResolvedValue(true);
      (tenantCatalogService.findOne as jest.Mock).mockResolvedValue(mockCatalogProduct);
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.quote.create as jest.Mock).mockResolvedValue({
        ...mockQuote,
        lineItems: [
          {
            ...mockLineItem,
            masterProductId: 'master-product-1',
            productName: 'Catalog Product',
            productSku: 'CAT-SKU-001',
            unitPrice: new Prisma.Decimal(800),
          },
        ],
      });

      const result = await service.create(
        {
          title: 'Catalog Quote',
          lineItems: [
            {
              masterProductId: 'master-product-1',
              quantity: 5,
            },
          ],
        },
        tenantId,
        userId,
      );

      expect(result).toBeDefined();
      expect(tenantCatalogService.hasAccess).toHaveBeenCalledWith('master-product-1', tenantId);
      expect(tenantCatalogService.findOne).toHaveBeenCalledWith('master-product-1', tenantId);
      expect(prismaService.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lineItems: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  masterProductId: 'master-product-1',
                  productName: 'Catalog Product',
                  productSku: 'CAT-SKU-001',
                  unitPrice: new Prisma.Decimal(800),
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should throw ForbiddenException when tenant has no access', async () => {
      (tenantCatalogService.hasAccess as jest.Mock).mockResolvedValue(false);

      await expect(
        service.create(
          {
            title: 'Catalog Quote',
            lineItems: [
              {
                masterProductId: 'master-product-1',
                quantity: 5,
              },
            ],
          },
          tenantId,
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow manual price override with masterProductId', async () => {
      (tenantCatalogService.hasAccess as jest.Mock).mockResolvedValue(true);
      (tenantCatalogService.findOne as jest.Mock).mockResolvedValue(mockCatalogProduct);
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.quote.create as jest.Mock).mockResolvedValue({
        ...mockQuote,
        lineItems: [
          {
            ...mockLineItem,
            masterProductId: 'master-product-1',
            productName: 'Catalog Product',
            productSku: 'CAT-SKU-001',
            unitPrice: new Prisma.Decimal(750), // Custom price override
          },
        ],
      });

      await service.create(
        {
          title: 'Catalog Quote',
          lineItems: [
            {
              masterProductId: 'master-product-1',
              quantity: 5,
              unitPrice: 750, // Manual override
            },
          ],
        },
        tenantId,
        userId,
      );

      expect(prismaService.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lineItems: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  unitPrice: new Prisma.Decimal(750),
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should allow manual product name override with masterProductId', async () => {
      (tenantCatalogService.hasAccess as jest.Mock).mockResolvedValue(true);
      (tenantCatalogService.findOne as jest.Mock).mockResolvedValue(mockCatalogProduct);
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.quote.create as jest.Mock).mockResolvedValue({
        ...mockQuote,
        lineItems: [
          {
            ...mockLineItem,
            masterProductId: 'master-product-1',
            productName: 'Custom Product Name',
            productSku: 'CAT-SKU-001',
            unitPrice: new Prisma.Decimal(800),
          },
        ],
      });

      await service.create(
        {
          title: 'Catalog Quote',
          lineItems: [
            {
              masterProductId: 'master-product-1',
              productName: 'Custom Product Name', // Manual override
              quantity: 5,
            },
          ],
        },
        tenantId,
        userId,
      );

      expect(prismaService.quote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lineItems: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  productName: 'Custom Product Name',
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('should require productName and unitPrice for manual entry', async () => {
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'Manual Quote',
            lineItems: [
              {
                // No masterProductId, no productName, no unitPrice
                quantity: 5,
              },
            ],
          },
          tenantId,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require unitPrice for manual entry without masterProductId', async () => {
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'Manual Quote',
            lineItems: [
              {
                productName: 'Manual Product',
                // No unitPrice, no masterProductId
                quantity: 5,
              },
            ],
          },
          tenantId,
          userId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update with masterProductId', () => {
    const mockCatalogProduct = {
      id: 'master-product-2',
      sku: 'CAT-SKU-002',
      name: 'Updated Catalog Product',
      description: 'Another product from the catalog',
      category: 'Hardware',
      subcategory: 'Servers',
      brand: 'TechCorp',
      uom: 'EA',
      listPrice: '5000.00',
      effectivePrice: '4500.00',
      currency: 'USD',
      status: MasterProductStatus.ACTIVE,
      tenantPricing: {
        agreedPrice: null,
        discountPercent: '10.00',
        minQuantity: null,
        maxQuantity: null,
        validFrom: null,
        validUntil: null,
      },
      hasAccess: true,
    };

    it('should update quote with product from catalog', async () => {
      const updatedQuote = {
        ...mockQuote,
        lineItems: [
          {
            ...mockLineItem,
            masterProductId: 'master-product-2',
            productName: 'Updated Catalog Product',
            productSku: 'CAT-SKU-002',
            unitPrice: new Prisma.Decimal(4500),
          },
        ],
      };

      (prismaService.quote.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockQuote)
        .mockResolvedValueOnce(updatedQuote);
      (tenantCatalogService.hasAccess as jest.Mock).mockResolvedValue(true);
      (tenantCatalogService.findOne as jest.Mock).mockResolvedValue(mockCatalogProduct);
      (prismaService.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          quoteLineItem: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
          quote: {
            update: jest.fn().mockResolvedValue(updatedQuote),
          },
        });
      });

      const result = await service.update(
        mockQuote.id,
        {
          lineItems: [
            {
              masterProductId: 'master-product-2',
              quantity: 2,
            },
          ],
        },
        tenantId,
        userId,
      );

      expect(result).toBeDefined();
      expect(tenantCatalogService.hasAccess).toHaveBeenCalledWith('master-product-2', tenantId);
      expect(tenantCatalogService.findOne).toHaveBeenCalledWith('master-product-2', tenantId);
    });

    it('should throw ForbiddenException when updating with inaccessible product', async () => {
      (prismaService.quote.findFirst as jest.Mock).mockResolvedValue(mockQuote);
      (tenantCatalogService.hasAccess as jest.Mock).mockResolvedValue(false);

      await expect(
        service.update(
          mockQuote.id,
          {
            lineItems: [
              {
                masterProductId: 'master-product-2',
                quantity: 2,
              },
            ],
          },
          tenantId,
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
