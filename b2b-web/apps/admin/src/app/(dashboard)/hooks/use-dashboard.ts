"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export interface ContractKpis {
  total: number;
  draft: number;
  pendingApproval: number;
  active: number;
  expired: number;
  expiringThisMonth: number;
}

export interface QuoteKpis {
  total: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  converted: number;
  rejected: number;
  conversionRate: number;
}

export interface FinancialKpis {
  totalContractValue: number;
  totalQuoteValue: number;
  pendingApprovalValue: number;
  currency: string;
}

export interface RecentActivity {
  id: string;
  type: string;
  action: string;
  entityId: string;
  entityName: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface KpiResponse {
  contracts: ContractKpis;
  quotes: QuoteKpis;
  financial: FinancialKpis;
  recentActivity: RecentActivity[];
  generatedAt: string;
  cachedUntil: string;
}

// =============================================================================
// Hooks
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

export function useDashboardKpis(refresh = false) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["dashboard-kpis", { refresh }],
    queryFn: async (): Promise<KpiResponse> => {
      const { data, error } = await client.GET("/api/v1/dashboard/kpis", {
        params: {
          query: { refresh },
        },
      });
      if (error) throw new Error("Failed to fetch dashboard KPIs");
      return data as unknown as KpiResponse;
    },
    enabled: !!user?.tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Chart Data Helpers
// =============================================================================

export function getContractStatusData(contracts: ContractKpis) {
  return [
    { name: "Draft", value: contracts.draft, color: "#94a3b8" },
    { name: "Pending", value: contracts.pendingApproval, color: "#f59e0b" },
    { name: "Active", value: contracts.active, color: "#22c55e" },
    { name: "Expired", value: contracts.expired, color: "#ef4444" },
  ];
}

export function getQuoteStatusData(quotes: QuoteKpis) {
  return [
    { name: "Draft", value: quotes.draft, color: "#94a3b8" },
    { name: "Pending", value: quotes.pendingApproval, color: "#f59e0b" },
    { name: "Approved", value: quotes.approved, color: "#22c55e" },
    { name: "Converted", value: quotes.converted, color: "#3b82f6" },
    { name: "Rejected", value: quotes.rejected, color: "#ef4444" },
  ];
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercentage(num: number) {
  return `${(num * 100).toFixed(1)}%`;
}

export function getTimeAgo(timestamp: string) {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
