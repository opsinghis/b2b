"use client";

import { createApiClient } from "@b2b/api-client";
import type {
  UserDiscountTierResponseDto,
  DiscountTierResponseDto,
} from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export interface DiscountTier {
  id: string;
  name: string;
  code: string;
  description: string | null;
  level: number;
  discountPercent: number;
  minSpend: number | null;
  minOrders: number | null;
  isActive: boolean;
  color: string | null;
  icon: string | null;
}

export interface UserDiscountTier {
  id: string;
  userId: string;
  tier: DiscountTier;
  assignedAt: string;
  expiresAt: string | null;
  reason: string | null;
  totalSpend: number;
  totalOrders: number;
  totalSavings: number;
}

export interface UserSavings {
  currentTier: DiscountTier | null;
  totalSpend: number;
  totalOrders: number;
  totalSavings: number;
  nextTier: DiscountTier | null;
  spendToNextTier: number | null;
  ordersToNextTier: number | null;
  // Extended savings data
  savingsThisMonth: number;
  savingsThisYear: number;
  savingsHistory: SavingsHistoryItem[];
}

export interface SavingsHistoryItem {
  id: string;
  month: string; // YYYY-MM format
  amount: number;
  ordersCount: number;
  averageDiscount: number;
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_SHIPPING";
  discountValue: number;
  discountType: "PERCENTAGE" | "FIXED";
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CouponValidationResult {
  isValid: boolean;
  discountAmount?: number;
  message?: string;
  promotion?: Promotion;
}

// =============================================================================
// API Client Hook
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return useMemo(
    () =>
      createApiClient({
        tenantId: user?.tenantId,
        token: user?.accessToken,
      }),
    [user?.tenantId, user?.accessToken]
  );
}

// =============================================================================
// Discount Tier Hooks
// =============================================================================

export function useUserDiscountTier() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["user-discount-tier"],
    queryFn: async (): Promise<UserDiscountTier | null> => {
      const { data, error } = await client.GET(
        "/api/v1/api/v1/users/me/discount-tier"
      );
      if (error) {
        return null;
      }
      return mapUserDiscountTierFromDto(
        data as unknown as UserDiscountTierResponseDto
      );
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useUserSavings() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["user-savings"],
    queryFn: async (): Promise<UserSavings | null> => {
      const { data, error } = await client.GET(
        "/api/v1/api/v1/users/me/savings"
      );
      if (error) {
        return null;
      }
      return mapUserSavingsFromDto(data);
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useAvailablePromotions() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["available-promotions"],
    queryFn: async (): Promise<Promotion[]> => {
      const { data, error } = await client.GET(
        "/api/v1/api/v1/promotions/available"
      );
      if (error) {
        return [];
      }
      const result = data as unknown as { promotions?: unknown[] };
      if (Array.isArray(result?.promotions)) {
        return result.promotions.map(mapPromotionFromDto);
      }
      if (Array.isArray(result)) {
        return (result as unknown[]).map(mapPromotionFromDto);
      }
      return [];
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useValidateCoupon() {
  const client = useApiClient();

  return useMutation({
    mutationFn: async ({
      code,
      orderAmount = 0,
    }: {
      code: string;
      orderAmount?: number;
    }): Promise<CouponValidationResult> => {
      const { data, error } = await client.POST(
        "/api/v1/api/v1/promotions/validate",
        {
          body: { code, orderAmount },
        }
      );
      if (error) {
        return {
          isValid: false,
          message: "Invalid coupon code",
        };
      }
      const result = data as unknown as {
        isValid?: boolean;
        discountAmount?: number;
        message?: string;
        promotion?: unknown;
      };
      return {
        isValid: result.isValid ?? false,
        discountAmount: result.discountAmount,
        message: result.message,
        promotion: result.promotion
          ? mapPromotionFromDto(result.promotion)
          : undefined,
      };
    },
  });
}

export function useApplyCoupon() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      code,
      orderAmount = 0,
    }: {
      code: string;
      orderAmount?: number;
    }): Promise<{ success: boolean; message: string }> => {
      const { error } = await client.POST("/api/v1/cart/apply-coupon", {
        body: { code, orderAmount },
      });
      if (error) {
        throw new Error("Failed to apply coupon");
      }
      return { success: true, message: "Coupon applied successfully" };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

// =============================================================================
// Mappers
// =============================================================================

function mapDiscountTierFromDto(dto: unknown): DiscountTier {
  const d = dto as DiscountTierResponseDto;
  return {
    id: d.id,
    name: d.name,
    code: d.code,
    description: d.description ?? null,
    level: d.level,
    discountPercent: d.discountPercent,
    minSpend: d.minSpend ?? null,
    minOrders: d.minOrders ?? null,
    isActive: d.isActive,
    color: d.color ?? null,
    icon: d.icon ?? null,
  };
}

function mapUserDiscountTierFromDto(dto: UserDiscountTierResponseDto): UserDiscountTier {
  return {
    id: dto.id,
    userId: dto.userId,
    tier: mapDiscountTierFromDto(dto.tier),
    assignedAt: dto.assignedAt,
    expiresAt: dto.expiresAt ?? null,
    reason: dto.reason ?? null,
    totalSpend: dto.totalSpend,
    totalOrders: dto.totalOrders,
    totalSavings: dto.totalSavings,
  };
}

function mapUserSavingsFromDto(dto: unknown): UserSavings {
  const d = dto as {
    currentTier?: unknown;
    totalSpend?: number;
    totalOrders?: number;
    totalSavings?: number;
    nextTier?: unknown;
    spendToNextTier?: number | null;
    ordersToNextTier?: number | null;
    savingsThisMonth?: number;
    savingsThisYear?: number;
    savingsHistory?: unknown[];
  };

  return {
    currentTier: d.currentTier ? mapDiscountTierFromDto(d.currentTier) : null,
    totalSpend: d.totalSpend ?? 0,
    totalOrders: d.totalOrders ?? 0,
    totalSavings: d.totalSavings ?? 0,
    nextTier: d.nextTier ? mapDiscountTierFromDto(d.nextTier) : null,
    spendToNextTier: d.spendToNextTier ?? null,
    ordersToNextTier: d.ordersToNextTier ?? null,
    savingsThisMonth: d.savingsThisMonth ?? 0,
    savingsThisYear: d.savingsThisYear ?? 0,
    savingsHistory: Array.isArray(d.savingsHistory)
      ? d.savingsHistory.map(mapSavingsHistoryItemFromDto)
      : generateMockSavingsHistory(),
  };
}

function mapSavingsHistoryItemFromDto(dto: unknown): SavingsHistoryItem {
  const d = dto as {
    id?: string;
    month?: string;
    amount?: number;
    ordersCount?: number;
    averageDiscount?: number;
  };
  return {
    id: d.id ?? Math.random().toString(36).slice(2),
    month: d.month ?? new Date().toISOString().slice(0, 7),
    amount: d.amount ?? 0,
    ordersCount: d.ordersCount ?? 0,
    averageDiscount: d.averageDiscount ?? 0,
  };
}

function mapPromotionFromDto(dto: unknown): Promotion {
  const d = dto as {
    id?: string;
    name?: string;
    code?: string;
    description?: string | null;
    type?: "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_SHIPPING";
    discountValue?: number;
    discountType?: "PERCENTAGE" | "FIXED";
    minOrderAmount?: number | null;
    maxDiscount?: number | null;
    usageLimit?: number | null;
    usageCount?: number;
    perUserLimit?: number | null;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  };
  return {
    id: d.id ?? "",
    name: d.name ?? "",
    code: d.code ?? "",
    description: d.description ?? null,
    type: d.type ?? "PERCENTAGE",
    discountValue: d.discountValue ?? 0,
    discountType: d.discountType ?? "PERCENTAGE",
    minOrderAmount: d.minOrderAmount ?? null,
    maxDiscount: d.maxDiscount ?? null,
    usageLimit: d.usageLimit ?? null,
    usageCount: d.usageCount ?? 0,
    perUserLimit: d.perUserLimit ?? null,
    startDate: d.startDate ?? new Date().toISOString(),
    endDate: d.endDate ?? new Date().toISOString(),
    isActive: d.isActive ?? true,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateMockSavingsHistory(): SavingsHistoryItem[] {
  const history: SavingsHistoryItem[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    // Generate some mock data - in real app this would come from API
    const ordersCount = Math.floor(Math.random() * 10) + 1;
    const averageDiscount = Math.floor(Math.random() * 15) + 5;
    const amount = ordersCount * averageDiscount * 10;

    history.push({
      id: `history-${month}`,
      month,
      amount,
      ordersCount,
      averageDiscount,
    });
  }

  return history;
}

export function formatPrice(
  value: string | number,
  currency: string = "USD"
): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(numValue);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(0)}%`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthYear(dateString: string): string {
  const [year, month] = dateString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export function getPromotionTypeLabel(type: Promotion["type"]): string {
  const labels: Record<Promotion["type"], string> = {
    PERCENTAGE: "Percentage Off",
    FIXED_AMOUNT: "Fixed Amount Off",
    BOGO: "Buy One Get One",
    FREE_SHIPPING: "Free Shipping",
  };
  return labels[type] || type;
}

export function getPromotionValueDisplay(promotion: Promotion): string {
  switch (promotion.type) {
    case "PERCENTAGE":
      return `${promotion.discountValue}% off`;
    case "FIXED_AMOUNT":
      return formatPrice(promotion.discountValue) + " off";
    case "BOGO":
      return "Buy One Get One Free";
    case "FREE_SHIPPING":
      return "Free Shipping";
    default:
      return `${promotion.discountValue}% off`;
  }
}

export function getTierColor(tier: DiscountTier | null): string {
  if (!tier) return "gray";
  if (tier.color) return tier.color;

  // Default colors based on tier level
  const defaultColors: Record<number, string> = {
    0: "#6B7280", // gray-500
    1: "#10B981", // emerald-500
    2: "#3B82F6", // blue-500
    3: "#8B5CF6", // violet-500
    4: "#F59E0B", // amber-500
    5: "#EC4899", // pink-500
  };
  return defaultColors[tier.level] || "#6B7280";
}

export function getTierIcon(tier: DiscountTier | null): string {
  if (!tier) return "circle";
  if (tier.icon) return tier.icon;

  // Default icons based on tier level
  const defaultIcons: Record<number, string> = {
    0: "circle",
    1: "star",
    2: "award",
    3: "gem",
    4: "crown",
    5: "trophy",
  };
  return defaultIcons[tier.level] || "circle";
}

export function calculateProgressToNextTier(
  currentSpend: number,
  currentOrders: number,
  nextTier: DiscountTier | null,
  spendToNext: number | null,
  ordersToNext: number | null
): { spendProgress: number; ordersProgress: number } {
  if (!nextTier) {
    return { spendProgress: 100, ordersProgress: 100 };
  }

  let spendProgress = 100;
  let ordersProgress = 100;

  if (nextTier.minSpend && spendToNext !== null) {
    const targetSpend = currentSpend + spendToNext;
    spendProgress = Math.min(100, (currentSpend / targetSpend) * 100);
  }

  if (nextTier.minOrders && ordersToNext !== null) {
    const targetOrders = currentOrders + ordersToNext;
    ordersProgress = Math.min(100, (currentOrders / targetOrders) * 100);
  }

  return { spendProgress, ordersProgress };
}

export function getDaysUntilExpiration(dateString: string | null): number | null {
  if (!dateString) return null;
  const expirationDate = new Date(dateString);
  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}
