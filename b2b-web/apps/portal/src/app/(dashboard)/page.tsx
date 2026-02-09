"use client";

import { RequireAuth, useAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { KpiCards, QuickActions, RecentActivityFeed, RecentOrders } from "./components";
import { useUserDashboard, getGreeting } from "./hooks/use-dashboard";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      <div className="h-8 w-64 bg-muted rounded" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="h-40 bg-muted rounded-lg" />
      <div className="h-64 bg-muted rounded-lg" />
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[400px]">
      <p className="text-sm text-muted-foreground">
        Failed to load dashboard data
      </p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useUserDashboard();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["user-dashboard"] });
    refetch();
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return <DashboardError onRetry={handleRefresh} />;
  }

  const firstName = user?.firstName || "there";
  const greeting = getGreeting();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your account today.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <KpiCards kpis={data.kpis} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Orders */}
      <RecentOrders />

      {/* Recent Activity */}
      <RecentActivityFeed activities={data.recentActivity} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth
      fallback={<DashboardSkeleton />}
      redirectTo="/login"
    >
      <DashboardContent />
    </RequireAuth>
  );
}
