"use client";

import { RequireAuth, useAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

import {
  PartnerWelcome,
  PartnerWelcomeSkeleton,
  PartnerOrdersSummary,
  PartnerOrdersSummarySkeleton,
  CommissionEarnings,
  CommissionEarningsSkeleton,
  TeamMembersList,
  TeamMembersListSkeleton,
  QuickOrderForTeam,
  QuickOrderForTeamSkeleton,
  PartnerResources,
  PartnerResourcesSkeleton,
} from "./components";
import { usePartnerProfile } from "./hooks";

function PartnerDashboardSkeleton() {
  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 bg-muted rounded animate-pulse" />
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse mt-2" />
        </div>
      </div>

      {/* Welcome Skeleton */}
      <PartnerWelcomeSkeleton />

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PartnerOrdersSummarySkeleton />
        <CommissionEarningsSkeleton />
      </div>

      {/* Team Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamMembersListSkeleton />
        <QuickOrderForTeamSkeleton />
      </div>

      {/* Resources Skeleton */}
      <PartnerResourcesSkeleton />
    </div>
  );
}

function PartnerDashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="container max-w-7xl py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Partner Dashboard Unavailable</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            You may not have partner access, or there was an error loading your partner profile.
            Please contact your administrator if you believe you should have partner access.
          </p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  );
}

function PartnerDashboardContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, refetch } = usePartnerProfile();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["partner-profile"] });
    queryClient.invalidateQueries({ queryKey: ["partner-commission-summary"] });
    queryClient.invalidateQueries({ queryKey: ["partner-team-members"] });
    queryClient.invalidateQueries({ queryKey: ["partner-resources"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    refetch();
  };

  if (isLoading) {
    return <PartnerDashboardSkeleton />;
  }

  if (isError || !profile) {
    return <PartnerDashboardError onRetry={handleRefresh} />;
  }

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Partner Welcome Section */}
      <PartnerWelcome
        profile={profile}
        firstName={user?.firstName}
      />

      {/* Orders and Commission Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PartnerOrdersSummary />
        <CommissionEarnings />
      </div>

      {/* Team Management Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamMembersList />
        <QuickOrderForTeam />
      </div>

      {/* Partner Resources */}
      <PartnerResources />
    </div>
  );
}

export default function PartnerDashboardPage() {
  return (
    <RequireAuth
      fallback={<PartnerDashboardSkeleton />}
      redirectTo="/login"
    >
      <PartnerDashboardContent />
    </RequireAuth>
  );
}
