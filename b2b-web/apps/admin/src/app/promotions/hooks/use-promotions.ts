"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// Types - Promotion & Coupon Management
// =============================================================================

export type PromotionType = "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_SHIPPING";
export type PromotionStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "EXPIRED" | "PAUSED";
export type ConditionType = "MIN_ORDER_VALUE" | "MIN_QUANTITY" | "SPECIFIC_PRODUCTS" | "SPECIFIC_CATEGORIES" | "USER_SEGMENT" | "FIRST_ORDER";

export interface PromotionCondition {
  id: string;
  type: ConditionType;
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "in";
  value: string | number | string[];
  description?: string;
}

export interface BogoConfig {
  buyQuantity: number;
  getQuantity: number;
  getProductIds?: string[];
  discountPercent?: number; // For "buy X get Y at Z% off"
}

export interface Promotion {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type: PromotionType;
  status: PromotionStatus;

  // Discount details
  discountValue: number; // Percentage or fixed amount depending on type
  maxDiscountAmount?: number; // Cap for percentage discounts

  // BOGO specific
  bogoConfig?: BogoConfig;

  // Conditions
  conditions: PromotionCondition[];
  minOrderValue?: number;
  minQuantity?: number;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];

  // Scheduling
  startDate: string;
  endDate?: string;

  // Usage limits
  totalUsageLimit?: number;
  perUserLimit?: number;
  currentUsageCount: number;

  // Coupon specific
  isCouponBased: boolean;
  couponCodes?: CouponCode[];

  // Metadata
  priority: number;
  stackable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CouponCode {
  id: string;
  code: string;
  promotionId: string;
  usageLimit?: number;
  usageCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PromotionAnalytics {
  promotionId: string;
  totalRedemptions: number;
  uniqueUsers: number;
  totalDiscountAmount: number;
  averageOrderValue: number;
  conversionRate: number;
  revenueGenerated: number;
  redemptionsByDate: Array<{
    date: string;
    count: number;
    discountAmount: number;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    redemptionCount: number;
  }>;
}

// Create DTOs
export interface CreatePromotionDto {
  name: string;
  code?: string;
  description?: string;
  type: PromotionType;
  discountValue: number;
  maxDiscountAmount?: number;
  bogoConfig?: BogoConfig;
  conditions?: Omit<PromotionCondition, "id">[];
  minOrderValue?: number;
  minQuantity?: number;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  startDate: string;
  endDate?: string;
  totalUsageLimit?: number;
  perUserLimit?: number;
  isCouponBased?: boolean;
  priority?: number;
  stackable?: boolean;
  isActive?: boolean;
}

export interface UpdatePromotionDto {
  name?: string;
  description?: string;
  discountValue?: number;
  maxDiscountAmount?: number;
  bogoConfig?: BogoConfig;
  conditions?: Omit<PromotionCondition, "id">[];
  minOrderValue?: number;
  minQuantity?: number;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  startDate?: string;
  endDate?: string;
  totalUsageLimit?: number;
  perUserLimit?: number;
  priority?: number;
  stackable?: boolean;
  isActive?: boolean;
}

export interface GenerateCouponsDto {
  promotionId: string;
  count: number;
  prefix?: string;
  usageLimit?: number;
  expiresAt?: string;
}

export interface PromotionsQueryParams {
  search?: string;
  type?: PromotionType;
  status?: PromotionStatus;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PromotionsResponse {
  data: Promotion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CouponsResponse {
  data: CouponCode[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// API Client Hook
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

export function getPromotionStatus(promotion: Promotion): PromotionStatus {
  if (!promotion.isActive) return "PAUSED";

  const now = new Date();
  const startDate = new Date(promotion.startDate);
  const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

  if (now < startDate) return "SCHEDULED";
  if (endDate && now > endDate) return "EXPIRED";
  if (promotion.totalUsageLimit && promotion.currentUsageCount >= promotion.totalUsageLimit) return "EXPIRED";

  return "ACTIVE";
}

export function formatPromotionValue(promotion: Promotion): string {
  switch (promotion.type) {
    case "PERCENTAGE":
      return `${promotion.discountValue}% off`;
    case "FIXED_AMOUNT":
      return `$${promotion.discountValue.toFixed(2)} off`;
    case "BOGO":
      if (promotion.bogoConfig) {
        const { buyQuantity, getQuantity, discountPercent } = promotion.bogoConfig;
        if (discountPercent === 100) {
          return `Buy ${buyQuantity}, Get ${getQuantity} Free`;
        }
        return `Buy ${buyQuantity}, Get ${getQuantity} at ${discountPercent}% off`;
      }
      return "BOGO";
    case "FREE_SHIPPING":
      return "Free Shipping";
    default:
      return `${promotion.discountValue}`;
  }
}

// =============================================================================
// Query Hooks
// =============================================================================

export function usePromotions(params: PromotionsQueryParams = {}) {
  const client = useApiClient();
  const { page = 1, limit = 10, search, type, status, isActive } = params;

  return useQuery({
    queryKey: ["promotions", { page, limit, search, type, status, isActive }],
    queryFn: async (): Promise<PromotionsResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).GET("/api/v1/api/v1/admin/promotions", {
        params: {
          query: {
            page,
            limit,
            search: search || undefined,
            type,
            status,
            isActive,
          },
        },
      });
      if (error) throw new Error("Failed to fetch promotions");
      return data as unknown as PromotionsResponse;
    },
  });
}

export function usePromotion(id: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: ["promotions", id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).GET("/api/v1/api/v1/admin/promotions/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to fetch promotion");
      return data as unknown as Promotion;
    },
    enabled: !!id,
  });
}

export function usePromotionAnalytics(id: string, dateRange?: { from: string; to: string }) {
  const client = useApiClient();

  return useQuery({
    queryKey: ["promotions", id, "analytics", dateRange],
    queryFn: async (): Promise<PromotionAnalytics> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).GET("/api/v1/api/v1/admin/promotions/{id}/analytics", {
        params: {
          path: { id },
          query: dateRange ? { from: dateRange.from, to: dateRange.to } : undefined,
        },
      });
      if (error) throw new Error("Failed to fetch promotion analytics");
      return data as unknown as PromotionAnalytics;
    },
    enabled: !!id,
  });
}

export function usePromotionCoupons(promotionId: string, params: { page?: number; limit?: number } = {}) {
  const client = useApiClient();
  const { page = 1, limit = 10 } = params;

  return useQuery({
    queryKey: ["promotions", promotionId, "coupons", { page, limit }],
    queryFn: async (): Promise<CouponsResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).GET("/api/v1/api/v1/admin/promotions/{id}/coupons", {
        params: {
          path: { id: promotionId },
          query: { page, limit },
        },
      });
      if (error) throw new Error("Failed to fetch coupons");
      return data as unknown as CouponsResponse;
    },
    enabled: !!promotionId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreatePromotion() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePromotionDto) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: response, error } = await (client as any).POST("/api/v1/api/v1/admin/promotions", {
        body: data,
      });
      if (error) throw new Error("Failed to create promotion");
      return response as unknown as Promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useUpdatePromotion(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePromotionDto) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: response, error } = await (client as any).PATCH("/api/v1/api/v1/admin/promotions/{id}", {
        params: { path: { id } },
        body: data,
      });
      if (error) throw new Error("Failed to update promotion");
      return response as unknown as Promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotions", id] });
    },
  });
}

export function useDeletePromotion() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client as any).DELETE("/api/v1/api/v1/admin/promotions/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to delete promotion");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useTogglePromotionStatus() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).PATCH("/api/v1/api/v1/admin/promotions/{id}", {
        params: { path: { id } },
        body: { isActive },
      });
      if (error) throw new Error("Failed to update promotion status");
      return data as unknown as Promotion;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      queryClient.invalidateQueries({ queryKey: ["promotions", variables.id] });
    },
  });
}

export function useGenerateCoupons() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateCouponsDto) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: response, error } = await (client as any).POST("/api/v1/api/v1/admin/coupons/generate", {
        body: data,
      });
      if (error) throw new Error("Failed to generate coupons");
      return response as unknown as { coupons: CouponCode[] };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["promotions", variables.promotionId, "coupons"] });
    },
  });
}

export function useDeactivateCoupon() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ couponId }: { promotionId: string; couponId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client as any).PATCH("/api/v1/api/v1/admin/coupons/{id}", {
        params: { path: { id: couponId } },
        body: { isActive: false },
      });
      if (error) throw new Error("Failed to deactivate coupon");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["promotions", variables.promotionId, "coupons"] });
    },
  });
}

// =============================================================================
// Constants
// =============================================================================

export const PROMOTION_TYPES: { value: PromotionType; label: string; description: string }[] = [
  { value: "PERCENTAGE", label: "Percentage Discount", description: "Discount by percentage off the order total" },
  { value: "FIXED_AMOUNT", label: "Fixed Amount", description: "Fixed dollar amount off the order" },
  { value: "BOGO", label: "Buy One Get One", description: "Buy X items, get Y items free or discounted" },
  { value: "FREE_SHIPPING", label: "Free Shipping", description: "Waive shipping costs on qualifying orders" },
];

export const PROMOTION_STATUSES: { value: PromotionStatus; label: string; color: string }[] = [
  { value: "DRAFT", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "SCHEDULED", label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  { value: "ACTIVE", label: "Active", color: "bg-green-100 text-green-800" },
  { value: "EXPIRED", label: "Expired", color: "bg-red-100 text-red-800" },
  { value: "PAUSED", label: "Paused", color: "bg-yellow-100 text-yellow-800" },
];

export const CONDITION_TYPES: { value: ConditionType; label: string; description: string }[] = [
  { value: "MIN_ORDER_VALUE", label: "Minimum Order Value", description: "Order must meet a minimum value" },
  { value: "MIN_QUANTITY", label: "Minimum Quantity", description: "Must purchase a minimum number of items" },
  { value: "SPECIFIC_PRODUCTS", label: "Specific Products", description: "Only applies to selected products" },
  { value: "SPECIFIC_CATEGORIES", label: "Specific Categories", description: "Only applies to selected categories" },
  { value: "USER_SEGMENT", label: "User Segment", description: "Only for specific user groups" },
  { value: "FIRST_ORDER", label: "First Order Only", description: "Only valid for first-time customers" },
];
