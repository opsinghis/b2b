"use client";

import { RequireAuth } from "@b2b/auth/react";
import { RefreshCw } from "lucide-react";

import {
  KpiCards,
  DashboardCharts,
  RecentActivityFeed,
  QuickActions,
} from "./(dashboard)/components";
import { useDashboardKpis } from "./(dashboard)/hooks";

import { Header } from "@/components/layout";

function DashboardContent() {
  const { data, isLoading, error, refetch, isFetching } = useDashboardKpis();

  if (isLoading && !data) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Dashboard" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
            <p className="text-sm text-destructive">
              Failed to load dashboard data. Please try again later.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Refresh indicator */}
        {isFetching && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Refreshing...</span>
          </div>
        )}

        {/* KPI Cards */}
        {data && (
          <KpiCards
            contracts={data.contracts}
            quotes={data.quotes}
            financial={data.financial}
          />
        )}

        {/* Charts Section */}
        {data && (
          <DashboardCharts contracts={data.contracts} quotes={data.quotes} />
        )}

        {/* Bottom Section: Quick Actions & Activity Feed */}
        <div className="grid gap-6 lg:grid-cols-2">
          <QuickActions />
          {data && <RecentActivityFeed activities={data.recentActivity} />}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Dashboard" />
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </RequireAuth>
  );
}
