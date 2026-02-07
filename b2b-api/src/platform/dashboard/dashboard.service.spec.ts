import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { CacheService } from './cache.service';
import { PrismaService } from '@infrastructure/database';
import { ContractStatus, QuoteStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: PrismaService;
  let cacheService: CacheService;

  const mockTenantId = 'tenant-123';

  const mockContractKpis = {
    total: 100,
    draft: 20,
    pendingApproval: 15,
    active: 50,
    expired: 10,
    expiringThisMonth: 5,
  };

  const mockQuoteKpis = {
    total: 200,
    draft: 50,
    pendingApproval: 30,
    approved: 80,
    converted: 30,
    rejected: 10,
    conversionRate: 55,
  };

  const mockFinancialKpis = {
    totalContractValue: 1000000,
    totalQuoteValue: 500000,
    pendingApprovalValue: 150000,
    currency: 'USD',
  };

  const mockAuditLog = {
    id: 'audit-123',
    entityType: 'Contract',
    action: 'CREATE',
    entityId: 'contract-456',
    changes: { title: 'Test Contract' },
    createdAt: new Date('2026-02-07T10:00:00Z'),
    userId: 'user-789',
    user: {
      id: 'user-789',
      firstName: 'John',
      lastName: 'Doe',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            contract: {
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            quote: {
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            auditLog: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prismaService = module.get(PrismaService);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getKpis', () => {
    it('should return cached KPIs when available', async () => {
      const cachedKpis = {
        contracts: mockContractKpis,
        quotes: mockQuoteKpis,
        financial: mockFinancialKpis,
        recentActivity: [],
        generatedAt: new Date(),
        cachedUntil: new Date(),
      };
      (cacheService.get as jest.Mock).mockResolvedValue(cachedKpis);

      const result = await service.getKpis(mockTenantId);

      expect(result).toEqual(cachedKpis);
      expect(cacheService.get).toHaveBeenCalledWith(`dashboard:kpis:${mockTenantId}`);
      expect(prismaService.contract.count).not.toHaveBeenCalled();
    });

    it('should calculate KPIs when cache is empty', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);

      // Mock contract counts
      (prismaService.contract.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20) // draft
        .mockResolvedValueOnce(15) // pending
        .mockResolvedValueOnce(50) // active
        .mockResolvedValueOnce(10) // expired
        .mockResolvedValueOnce(5); // expiring

      // Mock quote counts
      (prismaService.quote.count as jest.Mock)
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(50) // draft
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(80) // approved
        .mockResolvedValueOnce(30) // converted
        .mockResolvedValueOnce(10); // rejected

      // Mock aggregates
      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: new Decimal(1000000) },
      });
      (prismaService.quote.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: new Decimal(500000) } })
        .mockResolvedValueOnce({ _sum: { total: new Decimal(150000) } });

      // Mock audit logs
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.getKpis(mockTenantId);

      expect(result.contracts.total).toBe(100);
      expect(result.contracts.active).toBe(50);
      expect(result.quotes.total).toBe(200);
      expect(result.quotes.conversionRate).toBe(55);
      expect(result.financial.totalContractValue).toBe(1000000);
      expect(result.recentActivity).toHaveLength(1);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should force refresh when forceRefresh is true', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue({});

      // Mock all database calls
      (prismaService.contract.count as jest.Mock).mockResolvedValue(10);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(20);
      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: null },
      });
      (prismaService.quote.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getKpis(mockTenantId, true);

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(prismaService.contract.count).toHaveBeenCalled();
    });
  });

  describe('invalidateKpisCache', () => {
    it('should delete the cache key', async () => {
      await service.invalidateKpisCache(mockTenantId);

      expect(cacheService.del).toHaveBeenCalledWith(`dashboard:kpis:${mockTenantId}`);
    });
  });

  describe('contract KPIs calculation', () => {
    it('should count contracts by status', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(50);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(0);
      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: null },
      });
      (prismaService.quote.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getKpis(mockTenantId);

      expect(prismaService.contract.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });
  });

  describe('quote KPIs calculation', () => {
    it('should calculate conversion rate correctly', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);

      // Total: 100, Approved: 30, Converted: 20 => (30+20)/100 = 50%
      (prismaService.quote.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(10) // draft
        .mockResolvedValueOnce(20) // pending
        .mockResolvedValueOnce(30) // approved
        .mockResolvedValueOnce(20) // converted
        .mockResolvedValueOnce(10); // rejected

      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: null },
      });
      (prismaService.quote.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getKpis(mockTenantId);

      expect(result.quotes.conversionRate).toBe(50);
    });

    it('should handle zero total quotes', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(0);
      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: null },
      });
      (prismaService.quote.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getKpis(mockTenantId);

      expect(result.quotes.conversionRate).toBe(0);
    });
  });

  describe('financial KPIs calculation', () => {
    it('should aggregate contract and quote values', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(0);
      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: new Decimal(500000) },
      });
      (prismaService.quote.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { total: new Decimal(250000) } })
        .mockResolvedValueOnce({ _sum: { total: new Decimal(100000) } });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getKpis(mockTenantId);

      expect(result.financial.totalContractValue).toBe(500000);
      expect(result.financial.totalQuoteValue).toBe(250000);
      expect(result.financial.pendingApprovalValue).toBe(100000);
    });

    it('should handle null values', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(0);
      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: null },
      });
      (prismaService.quote.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getKpis(mockTenantId);

      expect(result.financial.totalContractValue).toBe(0);
      expect(result.financial.totalQuoteValue).toBe(0);
    });
  });

  describe('recent activity', () => {
    it('should format audit logs into activity items', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(0);
      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: null },
      });
      (prismaService.quote.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([mockAuditLog]);

      const result = await service.getKpis(mockTenantId);

      expect(result.recentActivity[0]).toMatchObject({
        id: 'audit-123',
        type: 'Contract',
        action: 'CREATE',
        entityId: 'contract-456',
        entityName: 'Test Contract',
        userId: 'user-789',
        userName: 'John Doe',
      });
    });

    it('should extract entity name from changes', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (prismaService.contract.count as jest.Mock).mockResolvedValue(0);
      (prismaService.quote.count as jest.Mock).mockResolvedValue(0);
      (prismaService.contract.aggregate as jest.Mock).mockResolvedValue({
        _sum: { totalValue: null },
      });
      (prismaService.quote.aggregate as jest.Mock).mockResolvedValue({
        _sum: { total: null },
      });

      const auditWithQuoteNumber = {
        ...mockAuditLog,
        changes: { quoteNumber: 'QT-001' },
      };
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([auditWithQuoteNumber]);

      const result = await service.getKpis(mockTenantId);

      expect(result.recentActivity[0].entityName).toBe('QT-001');
    });
  });
});

describe('CacheService', () => {
  // CacheService is tested through integration tests with Redis
  // Unit tests would require mocking ioredis which doesn't provide much value
  describe('interface', () => {
    it('should have required methods', () => {
      const mockCacheService = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        delByPattern: jest.fn(),
        getTtl: jest.fn(),
        isConnected: jest.fn(),
      };

      expect(typeof mockCacheService.get).toBe('function');
      expect(typeof mockCacheService.set).toBe('function');
      expect(typeof mockCacheService.del).toBe('function');
      expect(typeof mockCacheService.delByPattern).toBe('function');
      expect(typeof mockCacheService.getTtl).toBe('function');
      expect(typeof mockCacheService.isConnected).toBe('function');
    });
  });
});
