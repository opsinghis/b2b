"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, cn } from "@b2b/ui";
import {
  ArrowLeft,
  Award,
  Tag,
  History,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  CurrentTierDisplay,
  TierBenefits,
  TierProgress,
  SavingsSummary,
  AvailablePromotions,
  ApplyCoupon,
  SavingsHistory,
} from "./components";

type TabValue = "overview" | "promotions" | "history";

function DiscountsContent() {
  const [activeTab, setActiveTab] = useState<TabValue>("overview");

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">My Discounts & Savings</h1>
          <p className="text-muted-foreground">
            View your discount tier, savings, and available promotions
          </p>
        </div>
      </div>

      {/* Savings Summary Card - Always visible */}
      <SavingsSummary />

      {/* Custom Tabs */}
      <div className="space-y-6">
        {/* Tab List */}
        <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              activeTab === "overview"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">My Tier</span>
          </button>
          <button
            onClick={() => setActiveTab("promotions")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              activeTab === "promotions"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">Promotions</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              activeTab === "history"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <CurrentTierDisplay />
                <TierProgress />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <TierBenefits />
              </div>
            </div>
          </div>
        )}

        {activeTab === "promotions" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Available Promotions */}
              <AvailablePromotions />

              {/* Right Column - Apply Coupon */}
              <ApplyCoupon />
            </div>
          </div>
        )}

        {activeTab === "history" && <SavingsHistory />}
      </div>
    </div>
  );
}

function DiscountsSkeleton() {
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 bg-muted rounded animate-pulse" />
        <div>
          <div className="h-8 w-56 bg-muted rounded animate-pulse" />
          <div className="h-4 w-72 bg-muted rounded animate-pulse mt-2" />
        </div>
      </div>
      <div className="h-40 bg-muted rounded-lg animate-pulse" />
      <div className="h-12 bg-muted rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export default function DiscountsPage() {
  return (
    <RequireAuth fallback={<DiscountsSkeleton />} redirectTo="/login">
      <DiscountsContent />
    </RequireAuth>
  );
}
