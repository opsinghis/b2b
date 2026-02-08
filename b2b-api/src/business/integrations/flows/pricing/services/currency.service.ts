import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database';
import { Prisma, CurrencyExchangeRate } from '@prisma/client';
import { CurrencyExchangeRateDTO, ExchangeRateType } from '../interfaces';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  // In-memory cache for exchange rates
  private rateCache: Map<string, { rate: number; expiresAt: Date }> = new Map();
  private readonly cacheExpiryMinutes = 15;

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // Exchange Rate CRUD
  // ============================================

  /**
   * Create or update an exchange rate
   */
  async upsertExchangeRate(
    tenantId: string,
    data: Omit<CurrencyExchangeRateDTO, 'id' | 'tenantId'>,
  ): Promise<CurrencyExchangeRate> {
    const existing = await this.prisma.currencyExchangeRate.findFirst({
      where: {
        tenantId,
        sourceCurrency: data.sourceCurrency,
        targetCurrency: data.targetCurrency,
        effectiveFrom: data.effectiveFrom,
        rateType: data.rateType,
      },
    });

    if (existing) {
      return this.prisma.currencyExchangeRate.update({
        where: { id: existing.id },
        data: {
          rate: new Prisma.Decimal(data.rate),
          effectiveTo: data.effectiveTo,
          rateSource: data.rateSource,
          isActive: data.isActive ?? true,
          metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    }

    return this.prisma.currencyExchangeRate.create({
      data: {
        tenantId,
        sourceCurrency: data.sourceCurrency,
        targetCurrency: data.targetCurrency,
        rate: new Prisma.Decimal(data.rate),
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo,
        rateSource: data.rateSource,
        rateType: data.rateType,
        isActive: data.isActive ?? true,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Bulk upsert exchange rates
   */
  async bulkUpsertExchangeRates(
    tenantId: string,
    rates: Omit<CurrencyExchangeRateDTO, 'id' | 'tenantId'>[],
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const rate of rates) {
      const existing = await this.prisma.currencyExchangeRate.findFirst({
        where: {
          tenantId,
          sourceCurrency: rate.sourceCurrency,
          targetCurrency: rate.targetCurrency,
          effectiveFrom: rate.effectiveFrom,
          rateType: rate.rateType,
        },
      });

      if (existing) {
        await this.prisma.currencyExchangeRate.update({
          where: { id: existing.id },
          data: {
            rate: new Prisma.Decimal(rate.rate),
            effectiveTo: rate.effectiveTo,
            rateSource: rate.rateSource,
            isActive: rate.isActive ?? true,
            metadata: (rate.metadata ?? {}) as Prisma.InputJsonValue,
          },
        });
        updated++;
      } else {
        await this.prisma.currencyExchangeRate.create({
          data: {
            tenantId,
            sourceCurrency: rate.sourceCurrency,
            targetCurrency: rate.targetCurrency,
            rate: new Prisma.Decimal(rate.rate),
            effectiveFrom: rate.effectiveFrom,
            effectiveTo: rate.effectiveTo,
            rateSource: rate.rateSource,
            rateType: rate.rateType,
            isActive: rate.isActive ?? true,
            metadata: (rate.metadata ?? {}) as Prisma.InputJsonValue,
          },
        });
        created++;
      }
    }

    // Clear cache after bulk update
    this.clearCache();

    return { created, updated };
  }

  /**
   * Get current exchange rate
   */
  async getExchangeRate(
    tenantId: string,
    sourceCurrency: string,
    targetCurrency: string,
    rateType: ExchangeRateType = 'SPOT',
    date?: Date,
  ): Promise<number> {
    // Return 1 for same currency
    if (sourceCurrency === targetCurrency) {
      return 1;
    }

    const now = date ?? new Date();
    const cacheKey = `${tenantId}:${sourceCurrency}:${targetCurrency}:${rateType}`;

    // Check cache
    const cached = this.rateCache.get(cacheKey);
    if (cached && cached.expiresAt > new Date()) {
      return cached.rate;
    }

    // Look up direct rate
    let rate = await this.findRate(tenantId, sourceCurrency, targetCurrency, rateType, now);

    // If no direct rate, try inverse
    if (!rate) {
      const inverseRate = await this.findRate(
        tenantId,
        targetCurrency,
        sourceCurrency,
        rateType,
        now,
      );
      if (inverseRate) {
        rate = 1 / inverseRate;
      }
    }

    // If no rate found, try triangulation through USD
    if (!rate && sourceCurrency !== 'USD' && targetCurrency !== 'USD') {
      const sourceToUsd = await this.findRate(tenantId, sourceCurrency, 'USD', rateType, now);
      const usdToTarget = await this.findRate(tenantId, 'USD', targetCurrency, rateType, now);

      if (sourceToUsd && usdToTarget) {
        rate = sourceToUsd * usdToTarget;
      } else if (sourceToUsd && !usdToTarget) {
        // Try inverse for USD to target
        const targetToUsd = await this.findRate(tenantId, targetCurrency, 'USD', rateType, now);
        if (targetToUsd) {
          rate = sourceToUsd / targetToUsd;
        }
      } else if (!sourceToUsd && usdToTarget) {
        // Try inverse for source to USD
        const usdToSource = await this.findRate(tenantId, 'USD', sourceCurrency, rateType, now);
        if (usdToSource) {
          rate = usdToTarget / usdToSource;
        }
      }
    }

    if (!rate) {
      throw new NotFoundException(
        `Exchange rate not found: ${sourceCurrency} to ${targetCurrency}`,
      );
    }

    // Cache the result
    this.rateCache.set(cacheKey, {
      rate,
      expiresAt: new Date(Date.now() + this.cacheExpiryMinutes * 60 * 1000),
    });

    return rate;
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    tenantId: string,
    amount: number,
    sourceCurrency: string,
    targetCurrency: string,
    rateType: ExchangeRateType = 'SPOT',
    date?: Date,
  ): Promise<{ amount: number; rate: number }> {
    if (sourceCurrency === targetCurrency) {
      return { amount, rate: 1 };
    }

    const rate = await this.getExchangeRate(tenantId, sourceCurrency, targetCurrency, rateType, date);
    return {
      amount: amount * rate,
      rate,
    };
  }

  /**
   * Get all active rates for a tenant
   */
  async getActiveRates(
    tenantId: string,
    rateType?: ExchangeRateType,
  ): Promise<CurrencyExchangeRate[]> {
    const now = new Date();

    return this.prisma.currencyExchangeRate.findMany({
      where: {
        tenantId,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        ...(rateType && { rateType }),
      },
      orderBy: [
        { sourceCurrency: 'asc' },
        { targetCurrency: 'asc' },
        { effectiveFrom: 'desc' },
      ],
    });
  }

  /**
   * Get supported currencies for a tenant
   */
  async getSupportedCurrencies(tenantId: string): Promise<string[]> {
    const rates = await this.prisma.currencyExchangeRate.findMany({
      where: { tenantId, isActive: true },
      select: { sourceCurrency: true, targetCurrency: true },
      distinct: ['sourceCurrency', 'targetCurrency'],
    });

    const currencies = new Set<string>();
    for (const rate of rates) {
      currencies.add(rate.sourceCurrency);
      currencies.add(rate.targetCurrency);
    }

    return Array.from(currencies).sort();
  }

  /**
   * Delete exchange rate
   */
  async deleteExchangeRate(tenantId: string, rateId: string): Promise<void> {
    const rate = await this.prisma.currencyExchangeRate.findFirst({
      where: { id: rateId, tenantId },
    });

    if (!rate) {
      throw new NotFoundException(`Exchange rate not found: ${rateId}`);
    }

    await this.prisma.currencyExchangeRate.delete({
      where: { id: rateId },
    });

    this.clearCache();
  }

  /**
   * Deactivate outdated rates
   */
  async deactivateExpiredRates(tenantId: string): Promise<number> {
    const result = await this.prisma.currencyExchangeRate.updateMany({
      where: {
        tenantId,
        isActive: true,
        effectiveTo: { lt: new Date() },
      },
      data: { isActive: false },
    });

    if (result.count > 0) {
      this.clearCache();
    }

    return result.count;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async findRate(
    tenantId: string,
    sourceCurrency: string,
    targetCurrency: string,
    rateType: ExchangeRateType,
    date: Date,
  ): Promise<number | null> {
    const rate = await this.prisma.currencyExchangeRate.findFirst({
      where: {
        tenantId,
        sourceCurrency,
        targetCurrency,
        rateType,
        isActive: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    return rate?.rate.toNumber() ?? null;
  }

  private clearCache(): void {
    this.rateCache.clear();
  }
}
