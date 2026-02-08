"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// Types - Aligned with Backend API
// =============================================================================

// Frontend display labels for tier levels (numeric levels from API)
export type TierLevel = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

// Maps numeric API levels to frontend tier levels
export const LEVEL_TO_TIER: Record<number, TierLevel> = {
  0: "BRONZE",
  1: "SILVER",
  2: "GOLD",
  3: "PLATINUM",
};

export const TIER_TO_LEVEL: Record<TierLevel, number> = {
  BRONZE: 0,
  SILVER: 1,
  GOLD: 2,
  PLATINUM: 3,
};

export interface EligibilityRule {
  id: string;
  type: "min_order_value" | "min_orders" | "organization" | "user_role" | "custom";
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: string | number | string[];
  description?: string;
}

// Response type from API (matches DiscountTierResponseDto)
export interface DiscountTier {
  id: string;
  name: string;
  code: string;
  description?: string;
  level: number; // 0 = lowest
  discountPercentage: number; // Mapped from discountPercent
  minSpend?: number;
  minOrders?: number;
  isActive: boolean;
  color?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
  eligibilityRules: EligibilityRule[]; // Stored in metadata or separate
  validFrom?: string; // May be in metadata
  validTo?: string; // May be in metadata
  createdAt: string;
  updatedAt: string;
}

// Create DTO aligned with API schema
export interface CreateDiscountTierDto {
  name: string;
  code: string;
  description?: string;
  level?: number; // 0 = lowest
  discountPercent: number;
  minSpend?: number;
  minOrders?: number;
  isActive?: boolean;
  color?: string;
  icon?: string;
  metadata?: Record<string, never>;
}

// Update DTO aligned with API schema
export interface UpdateDiscountTierDto {
  name?: string;
  description?: string;
  level?: number;
  discountPercent?: number;
  minSpend?: number;
  minOrders?: number;
  isActive?: boolean;
  color?: string;
  icon?: string;
  metadata?: Record<string, never>;
}

export interface AssignTierDto {
  userId: string;
  expiresAt?: string;
  reason?: string;
}

export interface DiscountTiersQueryParams {
  search?: string;
  level?: TierLevel;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface DiscountTiersResponse {
  data: DiscountTier[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TierAssignment {
  id: string;
  tierId: string;
  userId?: string;
  organizationId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  assignedAt: string;
}

export interface TierAssignmentsResponse {
  data: TierAssignment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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
// Query Hooks
// =============================================================================

export function useDiscountTiers(params: DiscountTiersQueryParams = {}) {
  const client = useApiClient();
  const { page = 1, limit = 10, search, level, isActive } = params;

  // Convert TierLevel string to numeric level for API
  const numericLevel = level ? TIER_TO_LEVEL[level] : undefined;

  return useQuery({
    queryKey: ["discount-tiers", { page, limit, search, level, isActive }],
    queryFn: async (): Promise<DiscountTiersResponse> => {
      const { data, error } = await client.GET("/api/v1/api/v1/admin/discount-tiers", {
        params: {
          query: {
            page,
            limit,
            search: search || undefined,
            level: numericLevel,
            isActive,
          },
        },
      });
      if (error) throw new Error("Failed to fetch discount tiers");
      return data as unknown as DiscountTiersResponse;
    },
  });
}

export function useDiscountTier(id: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: ["discount-tiers", id],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/api/v1/admin/discount-tiers/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to fetch discount tier");
      return data as unknown as DiscountTier;
    },
    enabled: !!id,
  });
}

export function useTierAssignments(tierId: string, params: { page?: number; limit?: number } = {}) {
  const client = useApiClient();
  const { page = 1, limit = 10 } = params;

  return useQuery({
    queryKey: ["discount-tiers", tierId, "assignments", { page, limit }],
    queryFn: async (): Promise<TierAssignmentsResponse> => {
      const { data, error } = await client.GET("/api/v1/api/v1/admin/discount-tiers/{id}/assignments", {
        params: {
          path: { id: tierId },
          query: { page, limit },
        },
      });
      if (error) throw new Error("Failed to fetch tier assignments");
      return data as unknown as TierAssignmentsResponse;
    },
    enabled: !!tierId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateDiscountTier() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDiscountTierDto) => {
      const { data: response, error } = await client.POST("/api/v1/api/v1/admin/discount-tiers", {
        body: data,
      });
      if (error) throw new Error("Failed to create discount tier");
      return response as unknown as DiscountTier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-tiers"] });
    },
  });
}

export function useUpdateDiscountTier(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDiscountTierDto) => {
      const { data: response, error } = await client.PATCH(
        "/api/v1/api/v1/admin/discount-tiers/{id}",
        {
          params: { path: { id } },
          body: data,
        }
      );
      if (error) throw new Error("Failed to update discount tier");
      return response as unknown as DiscountTier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["discount-tiers", id] });
    },
  });
}

export function useDeleteDiscountTier() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/api/v1/api/v1/admin/discount-tiers/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to delete discount tier");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-tiers"] });
    },
  });
}

export function useToggleDiscountTierStatus() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await client.PATCH("/api/v1/api/v1/admin/discount-tiers/{id}", {
        params: { path: { id } },
        body: { isActive },
      });
      if (error) throw new Error("Failed to update discount tier status");
      return data as unknown as DiscountTier;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["discount-tiers"] });
      queryClient.invalidateQueries({ queryKey: ["discount-tiers", variables.id] });
    },
  });
}

export function useAssignTier(tierId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssignTierDto) => {
      const { data: response, error } = await client.POST(
        "/api/v1/api/v1/admin/discount-tiers/{id}/assign",
        {
          params: { path: { id: tierId } },
          body: data,
        }
      );
      if (error) throw new Error("Failed to assign tier");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-tiers", tierId, "assignments"] });
    },
  });
}

export function useUnassignTier(tierId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await client.DELETE(
        "/api/v1/api/v1/admin/discount-tiers/{id}/assign/{userId}",
        {
          params: { path: { id: tierId, userId: assignmentId } },
        }
      );
      if (error) throw new Error("Failed to unassign tier");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-tiers", tierId, "assignments"] });
    },
  });
}

export function useBulkAssignTier() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tierId,
      userIds,
    }: {
      tierId: string;
      userIds: string[];
    }) => {
      // Assign users sequentially (API accepts one user at a time)
      const results = [];
      for (const userId of userIds) {
        const { data: response, error } = await client.POST(
          "/api/v1/api/v1/admin/discount-tiers/{id}/assign",
          {
            params: { path: { id: tierId } },
            body: { userId },
          }
        );
        if (error) {
          console.error(`Failed to assign tier to user ${userId}`);
        } else {
          results.push(response);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-tiers"] });
    },
  });
}

// =============================================================================
// Constants
// =============================================================================

export const TIER_LEVELS: { value: TierLevel; label: string; color: string }[] = [
  { value: "BRONZE", label: "Bronze", color: "bg-amber-700" },
  { value: "SILVER", label: "Silver", color: "bg-gray-400" },
  { value: "GOLD", label: "Gold", color: "bg-yellow-500" },
  { value: "PLATINUM", label: "Platinum", color: "bg-slate-600" },
];

export const RULE_TYPES = [
  { value: "min_order_value", label: "Minimum Order Value" },
  { value: "min_orders", label: "Minimum Number of Orders" },
  { value: "organization", label: "Organization Membership" },
  { value: "user_role", label: "User Role" },
  { value: "custom", label: "Custom Rule" },
];

export const RULE_OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater than or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less than or equal" },
  { value: "in", label: "In list" },
  { value: "contains", label: "Contains" },
];
