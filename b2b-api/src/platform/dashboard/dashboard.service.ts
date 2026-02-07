import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { CacheService } from './cache.service';
import { KpiResponseDto, ContractKpis, QuoteKpis, FinancialKpis, RecentActivity } from './dto';
import { ContractStatus, QuoteStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const KPI_CACHE_KEY_PREFIX = 'dashboard:kpis:';
const KPI_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getKpis(tenantId: string, forceRefresh = false): Promise<KpiResponseDto> {
    const cacheKey = `${KPI_CACHE_KEY_PREFIX}${tenantId}`;

    // Try to get from cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await this.cacheService.get<KpiResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`KPIs served from cache for tenant ${tenantId}`);
        return cached;
      }
    }

    // Calculate KPIs
    const [contractKpis, quoteKpis, financialKpis, recentActivity] = await Promise.all([
      this.getContractKpis(tenantId),
      this.getQuoteKpis(tenantId),
      this.getFinancialKpis(tenantId),
      this.getRecentActivity(tenantId),
    ]);

    const now = new Date();
    const cachedUntil = new Date(now.getTime() + KPI_CACHE_TTL * 1000);

    const kpis: KpiResponseDto = {
      contracts: contractKpis,
      quotes: quoteKpis,
      financial: financialKpis,
      recentActivity,
      generatedAt: now,
      cachedUntil,
    };

    // Store in cache
    await this.cacheService.set(cacheKey, kpis, KPI_CACHE_TTL);

    this.logger.debug(`KPIs calculated and cached for tenant ${tenantId}`);
    return kpis;
  }

  async invalidateKpisCache(tenantId: string): Promise<void> {
    const cacheKey = `${KPI_CACHE_KEY_PREFIX}${tenantId}`;
    await this.cacheService.del(cacheKey);
    this.logger.debug(`KPIs cache invalidated for tenant ${tenantId}`);
  }

  private async getContractKpis(tenantId: string): Promise<ContractKpis> {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [total, draft, pendingApproval, active, expired, expiringThisMonth] = await Promise.all([
      this.prisma.contract.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.contract.count({
        where: { tenantId, status: ContractStatus.DRAFT, deletedAt: null },
      }),
      this.prisma.contract.count({
        where: { tenantId, status: ContractStatus.PENDING_APPROVAL, deletedAt: null },
      }),
      this.prisma.contract.count({
        where: { tenantId, status: ContractStatus.ACTIVE, deletedAt: null },
      }),
      this.prisma.contract.count({
        where: { tenantId, status: ContractStatus.EXPIRED, deletedAt: null },
      }),
      this.prisma.contract.count({
        where: {
          tenantId,
          status: ContractStatus.ACTIVE,
          deletedAt: null,
          expirationDate: {
            gte: now,
            lte: endOfMonth,
          },
        },
      }),
    ]);

    return {
      total,
      draft,
      pendingApproval,
      active,
      expired,
      expiringThisMonth,
    };
  }

  private async getQuoteKpis(tenantId: string): Promise<QuoteKpis> {
    const [total, draft, pendingApproval, approved, converted, rejected] = await Promise.all([
      this.prisma.quote.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.quote.count({
        where: { tenantId, status: QuoteStatus.DRAFT, deletedAt: null },
      }),
      this.prisma.quote.count({
        where: { tenantId, status: QuoteStatus.PENDING_APPROVAL, deletedAt: null },
      }),
      this.prisma.quote.count({
        where: { tenantId, status: QuoteStatus.APPROVED, deletedAt: null },
      }),
      this.prisma.quote.count({
        where: { tenantId, status: QuoteStatus.CONVERTED, deletedAt: null },
      }),
      this.prisma.quote.count({
        where: { tenantId, status: QuoteStatus.REJECTED, deletedAt: null },
      }),
    ]);

    const approvedAndConverted = approved + converted;
    const conversionRate =
      total > 0 ? Math.round((approvedAndConverted / total) * 100 * 100) / 100 : 0;

    return {
      total,
      draft,
      pendingApproval,
      approved,
      converted,
      rejected,
      conversionRate,
    };
  }

  private async getFinancialKpis(tenantId: string): Promise<FinancialKpis> {
    const [contractSum, quoteSum, pendingSum] = await Promise.all([
      this.prisma.contract.aggregate({
        where: {
          tenantId,
          status: ContractStatus.ACTIVE,
          deletedAt: null,
        },
        _sum: { totalValue: true },
      }),
      this.prisma.quote.aggregate({
        where: {
          tenantId,
          deletedAt: null,
        },
        _sum: { total: true },
      }),
      this.prisma.quote.aggregate({
        where: {
          tenantId,
          status: QuoteStatus.PENDING_APPROVAL,
          deletedAt: null,
        },
        _sum: { total: true },
      }),
    ]);

    return {
      totalContractValue: this.decimalToNumber(contractSum._sum.totalValue),
      totalQuoteValue: this.decimalToNumber(quoteSum._sum.total),
      pendingApprovalValue: this.decimalToNumber(pendingSum._sum.total),
      currency: 'USD',
    };
  }

  private async getRecentActivity(tenantId: string, limit = 10): Promise<RecentActivity[]> {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType: { in: ['Contract', 'Quote'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return auditLogs.map((log) => ({
      id: log.id,
      type: log.entityType,
      action: log.action,
      entityId: log.entityId,
      entityName: this.extractEntityName(log.changes),
      timestamp: log.createdAt,
      userId: log.userId,
      userName: `${log.user.firstName} ${log.user.lastName}`,
    }));
  }

  private decimalToNumber(value: Decimal | null): number {
    if (value === null) return 0;
    return value.toNumber();
  }

  private extractEntityName(changes: unknown): string {
    if (typeof changes === 'object' && changes !== null) {
      const changesObj = changes as Record<string, unknown>;
      if (changesObj.title && typeof changesObj.title === 'string') {
        return changesObj.title;
      }
      if (changesObj.contractNumber && typeof changesObj.contractNumber === 'string') {
        return changesObj.contractNumber;
      }
      if (changesObj.quoteNumber && typeof changesObj.quoteNumber === 'string') {
        return changesObj.quoteNumber;
      }
    }
    return 'Unknown';
  }
}
