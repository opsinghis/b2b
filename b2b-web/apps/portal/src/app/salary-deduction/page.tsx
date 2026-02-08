"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, cn } from "@b2b/ui";
import { ArrowLeft, CreditCard, History, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  SalaryDeductionSummary,
  DeductionHistory,
  PendingDeductions,
  UpcomingPayrollPreview,
  DeductionOptToggle,
  LimitRequestForm,
} from "./components";

type TabValue = "overview" | "history" | "settings";

function SalaryDeductionContent() {
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
          <h1 className="text-2xl font-bold">Salary Deduction</h1>
          <p className="text-muted-foreground">
            Manage your salary deduction preferences and view history
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <SalaryDeductionSummary />

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
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
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
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
              activeTab === "settings"
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <UpcomingPayrollPreview />
                <PendingDeductions />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <LimitRequestForm />
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && <DeductionHistory />}

        {activeTab === "settings" && (
          <div className="max-w-2xl">
            <DeductionOptToggle />
          </div>
        )}
      </div>
    </div>
  );
}

function SalaryDeductionSkeleton() {
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-9 w-20 bg-muted rounded animate-pulse" />
        <div>
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </div>
      </div>
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
      <div className="h-12 bg-muted rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

export default function SalaryDeductionPage() {
  return (
    <RequireAuth
      fallback={<SalaryDeductionSkeleton />}
      redirectTo="/login"
    >
      <SalaryDeductionContent />
    </RequireAuth>
  );
}
