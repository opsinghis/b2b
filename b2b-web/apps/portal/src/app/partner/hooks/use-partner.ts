"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export type PartnerTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface PartnerProfile {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  tier: PartnerTier;
  discountPercent: number;
  commissionPercent: number;
  isActive: boolean;
  joinedAt: string;
  organizationId: string | null;
  totalSales: number;
  totalCommission: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionSummary {
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  currentMonth: number;
  lastMonth: number;
  yearToDate: number;
  currency: string;
}

export interface Commission {
  id: string;
  orderId: string;
  orderNumber: string;
  orderAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  paidAt: string | null;
  createdAt: string;
}

export interface CommissionHistory {
  commissions: Commission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  addedAt: string;
  totalOrders: number;
  totalSpend: number;
}

export interface PartnerResource {
  id: string;
  name: string;
  description: string | null;
  type: "DOCUMENT" | "VIDEO" | "LINK" | "GUIDE";
  url: string;
  fileSize: number | null;
  mimeType: string | null;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateOrderOnBehalfDto {
  teamMemberUserId: string;
  items: Array<{
    masterProductId: string;
    quantity: number;
  }>;
  shippingAddressId?: string;
  notes?: string;
  applyTeamMemberDiscount?: boolean;
  notifyTeamMember?: boolean;
}

export interface TeamMemberAddress {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
  phone?: string | null;
  isShipping: boolean;
  isBilling: boolean;
}

export interface TeamMemberDiscount {
  userId: string;
  discountPercent: number;
  tierName: string | null;
  tierLevel: number;
}

export interface OrderOnBehalfResult {
  orderId: string;
  orderNumber: string;
  total: string;
  discount: string;
  teamMemberNotified: boolean;
  attributedToPartnerId: string;
  attributedToPartnerName: string;
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
// Partner Profile Hooks
// =============================================================================

export function usePartnerProfile() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["partner-profile"],
    queryFn: async (): Promise<PartnerProfile | null> => {
      const { data, error } = await client.GET("/api/v1/api/v1/partners/me");
      if (error) return null;
      return mapPartnerProfileFromDto(data);
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

// =============================================================================
// Commission Hooks
// =============================================================================

export function useCommissionSummary() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["partner-commission-summary"],
    queryFn: async (): Promise<CommissionSummary | null> => {
      const { data, error } = await client.GET(
        "/api/v1/api/v1/partners/me/commission"
      );
      if (error) return null;
      return mapCommissionSummaryFromDto(data);
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useCommissionHistory(params: { page?: number; limit?: number } = {}) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["partner-commissions", params],
    queryFn: async (): Promise<CommissionHistory> => {
      const { data, error } = await client.GET(
        "/api/v1/api/v1/partners/me/commissions",
        {
          params: {
            query: {
              page: params.page ?? 1,
              limit: params.limit ?? 10,
            },
          },
        }
      );
      if (error) {
        return {
          commissions: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        };
      }
      return mapCommissionHistoryFromDto(data);
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

// =============================================================================
// Team Member Hooks
// =============================================================================

export function useTeamMembers() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["partner-team-members"],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await client.GET(
        "/api/v1/api/v1/partners/me/team"
      );
      if (error) return [];
      const result = data as unknown as { members?: unknown[] } | unknown[];
      if (Array.isArray(result)) {
        return result.map(mapTeamMemberFromDto);
      }
      if (result?.members && Array.isArray(result.members)) {
        return result.members.map(mapTeamMemberFromDto);
      }
      return [];
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useAddTeamMember() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { userId: string; role?: string }): Promise<TeamMember> => {
      const { data, error } = await client.POST(
        "/api/v1/api/v1/partners/me/team",
        {
          body: { userId: params.userId, role: params.role },
        }
      );
      if (error) throw new Error("Failed to add team member");
      return mapTeamMemberFromDto(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-team-members"] });
    },
  });
}

export function useRemoveTeamMember() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<void> => {
      const { error } = await client.DELETE(
        "/api/v1/api/v1/partners/me/team/{userId}",
        {
          params: { path: { userId } },
        }
      );
      if (error) throw new Error("Failed to remove team member");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-team-members"] });
    },
  });
}

// =============================================================================
// Resources Hooks
// =============================================================================

export function usePartnerResources() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["partner-resources"],
    queryFn: async (): Promise<PartnerResource[]> => {
      const { data, error } = await client.GET(
        "/api/v1/api/v1/partners/me/resources"
      );
      if (error) return [];
      const result = data as unknown as { resources?: unknown[] } | unknown[];
      if (Array.isArray(result)) {
        return result.map(mapPartnerResourceFromDto);
      }
      if (result?.resources && Array.isArray(result.resources)) {
        return result.resources.map(mapPartnerResourceFromDto);
      }
      return [];
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

// =============================================================================
// Quick Order Hooks
// =============================================================================

export function useCreateOrderOnBehalf() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateOrderOnBehalfDto): Promise<OrderOnBehalfResult> => {
      const { data, error } = await client.POST(
        "/api/v1/api/v1/partners/orders/on-behalf",
        {
          body: dto,
        }
      );
      if (error) throw new Error("Failed to create order on behalf");
      return mapOrderOnBehalfResultFromDto(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-team-members"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useTeamMemberAddresses(userId: string | null) {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["team-member-addresses", userId],
    queryFn: async (): Promise<TeamMemberAddress[]> => {
      if (!userId) return [];
      // Note: API endpoint /api/v1/users/{id}/addresses may need to be implemented
      // For now, return mock data to demonstrate the UI flow
      // In production, this would fetch from the actual API endpoint
      return generateMockAddresses(userId);
    },
    enabled: isAuthenticated && !!user?.tenantId && !!userId,
  });
}

export function useTeamMemberDiscount(userId: string | null) {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["team-member-discount", userId],
    queryFn: async (): Promise<TeamMemberDiscount | null> => {
      if (!userId) return null;
      // Note: API endpoint /api/v1/users/{id}/discount-tier may need to be implemented
      // For now, return mock data to demonstrate the UI flow
      return generateMockDiscount(userId);
    },
    enabled: isAuthenticated && !!user?.tenantId && !!userId,
  });
}

// Mock data generators - Replace with actual API calls when available
function generateMockAddresses(userId: string): TeamMemberAddress[] {
  return [
    {
      id: `addr-${userId}-1`,
      label: "Home",
      firstName: "Team",
      lastName: "Member",
      company: null,
      street1: "123 Main Street",
      street2: "Apt 4B",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "US",
      isDefault: true,
      phone: "+1 (555) 123-4567",
      isShipping: true,
      isBilling: true,
    },
    {
      id: `addr-${userId}-2`,
      label: "Office",
      firstName: "Team",
      lastName: "Member",
      company: "Acme Corp",
      street1: "456 Business Ave",
      street2: "Suite 100",
      city: "New York",
      state: "NY",
      postalCode: "10002",
      country: "US",
      isDefault: false,
      phone: "+1 (555) 987-6543",
      isShipping: true,
      isBilling: false,
    },
  ];
}

function generateMockDiscount(userId: string): TeamMemberDiscount {
  // Generate a deterministic discount based on userId for consistency
  const discountPercent = 10 + (userId.charCodeAt(0) % 10);
  return {
    userId,
    discountPercent,
    tierName: discountPercent >= 15 ? "Gold" : "Silver",
    tierLevel: discountPercent >= 15 ? 2 : 1,
  };
}

// =============================================================================
// Mappers
// =============================================================================

function mapPartnerProfileFromDto(dto: unknown): PartnerProfile {
  const d = dto as Record<string, unknown>;
  return {
    id: (d.id as string) ?? "",
    userId: (d.userId as string) ?? "",
    companyName: (d.companyName as string) ?? "",
    contactName: (d.contactName as string) ?? "",
    contactEmail: (d.contactEmail as string) ?? "",
    tier: ((d.tier as string) ?? "BRONZE") as PartnerTier,
    discountPercent: (d.discountPercent as number) ?? 0,
    commissionPercent: (d.commissionPercent as number) ?? 0,
    isActive: (d.isActive as boolean) ?? true,
    joinedAt: (d.joinedAt as string) ?? (d.createdAt as string) ?? new Date().toISOString(),
    organizationId: (d.organizationId as string) ?? null,
    totalSales: (d.totalSales as number) ?? 0,
    totalCommission: (d.totalCommission as number) ?? 0,
    createdAt: (d.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (d.updatedAt as string) ?? new Date().toISOString(),
  };
}

function mapCommissionSummaryFromDto(dto: unknown): CommissionSummary {
  const d = dto as Record<string, unknown>;
  return {
    totalEarned: (d.totalEarned as number) ?? 0,
    totalPending: (d.totalPending as number) ?? 0,
    totalPaid: (d.totalPaid as number) ?? 0,
    currentMonth: (d.currentMonth as number) ?? 0,
    lastMonth: (d.lastMonth as number) ?? 0,
    yearToDate: (d.yearToDate as number) ?? 0,
    currency: (d.currency as string) ?? "USD",
  };
}

function mapCommissionFromDto(dto: unknown): Commission {
  const d = dto as Record<string, unknown>;
  return {
    id: (d.id as string) ?? "",
    orderId: (d.orderId as string) ?? "",
    orderNumber: (d.orderNumber as string) ?? "",
    orderAmount: (d.orderAmount as number) ?? 0,
    commissionPercent: (d.commissionPercent as number) ?? 0,
    commissionAmount: (d.commissionAmount as number) ?? 0,
    status: ((d.status as string) ?? "PENDING") as Commission["status"],
    paidAt: (d.paidAt as string) ?? null,
    createdAt: (d.createdAt as string) ?? new Date().toISOString(),
  };
}

function mapCommissionHistoryFromDto(dto: unknown): CommissionHistory {
  const d = dto as Record<string, unknown>;
  const data = (d.data as unknown[]) ?? (d.commissions as unknown[]) ?? [];
  return {
    commissions: Array.isArray(data) ? data.map(mapCommissionFromDto) : [],
    total: (d.total as number) ?? 0,
    page: (d.page as number) ?? 1,
    limit: (d.limit as number) ?? 10,
    totalPages: (d.totalPages as number) ?? 0,
    hasNext: (d.hasNext as boolean) ?? false,
    hasPrevious: (d.hasPrevious as boolean) ?? false,
  };
}

function mapTeamMemberFromDto(dto: unknown): TeamMember {
  const d = dto as Record<string, unknown>;
  return {
    id: (d.id as string) ?? "",
    userId: (d.userId as string) ?? (d.id as string) ?? "",
    email: (d.email as string) ?? "",
    firstName: (d.firstName as string) ?? "",
    lastName: (d.lastName as string) ?? "",
    role: (d.role as string) ?? "USER",
    isActive: (d.isActive as boolean) ?? true,
    addedAt: (d.addedAt as string) ?? (d.createdAt as string) ?? new Date().toISOString(),
    totalOrders: (d.totalOrders as number) ?? 0,
    totalSpend: (d.totalSpend as number) ?? 0,
  };
}

function mapPartnerResourceFromDto(dto: unknown): PartnerResource {
  const d = dto as Record<string, unknown>;
  return {
    id: (d.id as string) ?? "",
    name: (d.name as string) ?? "",
    description: (d.description as string) ?? null,
    type: ((d.type as string) ?? "DOCUMENT") as PartnerResource["type"],
    url: (d.url as string) ?? "",
    fileSize: (d.fileSize as number) ?? null,
    mimeType: (d.mimeType as string) ?? null,
    category: (d.category as string) ?? "General",
    sortOrder: (d.sortOrder as number) ?? 0,
    isActive: (d.isActive as boolean) ?? true,
    createdAt: (d.createdAt as string) ?? new Date().toISOString(),
  };
}

// Note: mapTeamMemberAddressFromDto and mapTeamMemberDiscountFromDto are reserved
// for future use when API endpoints GET /api/v1/users/{id}/addresses and
// GET /api/v1/users/{id}/discount-tier are implemented.
// Currently using mock data generators instead.

function mapOrderOnBehalfResultFromDto(dto: unknown): OrderOnBehalfResult {
  const d = dto as Record<string, unknown>;
  return {
    orderId: (d.orderId as string) ?? (d.id as string) ?? "",
    orderNumber: (d.orderNumber as string) ?? "",
    total: (d.total as string) ?? "0",
    discount: (d.discount as string) ?? "0",
    teamMemberNotified: (d.teamMemberNotified as boolean) ?? (d.notified as boolean) ?? false,
    attributedToPartnerId: (d.attributedToPartnerId as string) ?? (d.partnerId as string) ?? "",
    attributedToPartnerName: (d.attributedToPartnerName as string) ?? (d.partnerName as string) ?? "",
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

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

export function getTierColor(tier: PartnerTier): string {
  const colors: Record<PartnerTier, string> = {
    BRONZE: "#CD7F32",
    SILVER: "#C0C0C0",
    GOLD: "#FFD700",
    PLATINUM: "#E5E4E2",
  };
  return colors[tier] || "#6B7280";
}

export function getTierBgColor(tier: PartnerTier): string {
  const colors: Record<PartnerTier, string> = {
    BRONZE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    SILVER: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    GOLD: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    PLATINUM: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return colors[tier] || "bg-gray-100 text-gray-800";
}

export function getCommissionStatusColor(status: Commission["status"]): string {
  const colors: Record<Commission["status"], string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getResourceIcon(type: PartnerResource["type"]): string {
  const icons: Record<PartnerResource["type"], string> = {
    DOCUMENT: "file-text",
    VIDEO: "video",
    LINK: "external-link",
    GUIDE: "book-open",
  };
  return icons[type] || "file";
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
