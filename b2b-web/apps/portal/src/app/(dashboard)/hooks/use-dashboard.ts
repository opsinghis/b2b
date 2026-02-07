"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export interface UserKpis {
  myQuotes: {
    total: number;
    draft: number;
    pendingApproval: number;
    approved: number;
  };
  myContracts: {
    total: number;
    active: number;
    pendingApproval: number;
    expiringThisMonth: number;
  };
  pendingApprovals: {
    total: number;
    quotes: number;
    contracts: number;
  };
}

export interface RecentActivity {
  id: string;
  type: "QUOTE" | "CONTRACT" | "ORDER" | "APPROVAL";
  action: "CREATE" | "UPDATE" | "APPROVE" | "REJECT" | "SUBMIT";
  entityId: string;
  entityName: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export interface UserDashboardResponse {
  kpis: UserKpis;
  recentActivity: RecentActivity[];
  generatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  organizationName: string;
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

export function useUserProfile() {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-profile"],
    queryFn: async (): Promise<UserProfile> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).GET("/api/v1/users/me");
      if (error) throw new Error("Failed to fetch user profile");
      return data as unknown as UserProfile;
    },
    enabled: !!user?.accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserDashboard(refresh = false) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-dashboard", { refresh }],
    queryFn: async (): Promise<UserDashboardResponse> => {
      const { data, error } = await client.GET("/api/v1/dashboard/kpis", {
        params: {
          query: { refresh },
        },
      });
      if (error) throw new Error("Failed to fetch dashboard data");

      // Transform the response to user-specific KPIs
      const response = data as Record<string, unknown>;
      return {
        kpis: {
          myQuotes: {
            total: (response.quotes as Record<string, number>)?.total ?? 0,
            draft: (response.quotes as Record<string, number>)?.draft ?? 0,
            pendingApproval: (response.quotes as Record<string, number>)?.pendingApproval ?? 0,
            approved: (response.quotes as Record<string, number>)?.approved ?? 0,
          },
          myContracts: {
            total: (response.contracts as Record<string, number>)?.total ?? 0,
            active: (response.contracts as Record<string, number>)?.active ?? 0,
            pendingApproval: (response.contracts as Record<string, number>)?.pendingApproval ?? 0,
            expiringThisMonth: (response.contracts as Record<string, number>)?.expiringThisMonth ?? 0,
          },
          pendingApprovals: {
            total: ((response.quotes as Record<string, number>)?.pendingApproval ?? 0) +
                   ((response.contracts as Record<string, number>)?.pendingApproval ?? 0),
            quotes: (response.quotes as Record<string, number>)?.pendingApproval ?? 0,
            contracts: (response.contracts as Record<string, number>)?.pendingApproval ?? 0,
          },
        },
        recentActivity: (response.recentActivity as RecentActivity[]) ?? [],
        generatedAt: (response.generatedAt as string) ?? new Date().toISOString(),
      };
    },
    enabled: !!user?.tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num);
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

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
