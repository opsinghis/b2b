"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import { Calendar, TrendingUp, Wallet } from "lucide-react";

import {
  useSalaryDeduction,
  formatPrice,
  calculateUsagePercentage,
} from "../hooks";

export function SalaryDeductionSummary() {
  const { data: salaryDeduction, isLoading } = useSalaryDeduction();

  if (isLoading) {
    return <SalaryDeductionSummarySkeleton />;
  }

  if (!salaryDeduction) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">
            Salary Deduction Not Available
          </h3>
          <p className="text-muted-foreground">
            You are not currently enrolled in the salary deduction program.
            Contact your administrator for more information.
          </p>
        </CardContent>
      </Card>
    );
  }

  const limit = parseFloat(salaryDeduction.monthlyLimit);
  const used = parseFloat(salaryDeduction.usedAmount);
  const remaining = parseFloat(salaryDeduction.remainingAmount);
  const usagePercent = calculateUsagePercentage(used, limit);

  const periodStart = new Date(salaryDeduction.periodStart);
  const periodEnd = new Date(salaryDeduction.periodEnd);
  const formattedPeriodStart = periodStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const formattedPeriodEnd = periodEnd.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Calculate days remaining in period
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Monthly Deduction Limit
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formattedPeriodStart} - {formattedPeriodEnd}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-background border">
            <p className="text-sm text-muted-foreground mb-1">Monthly Limit</p>
            <p className="text-2xl font-bold">{formatPrice(limit)}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-background border">
            <p className="text-sm text-muted-foreground mb-1">Used</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatPrice(used)}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-background border">
            <p className="text-sm text-muted-foreground mb-1">Available</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPrice(remaining)}
            </p>
          </div>
        </div>

        {/* Usage Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usage this period</span>
            <span className="font-medium">{usagePercent.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent > 90
                  ? "bg-red-500"
                  : usagePercent > 70
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          {usagePercent > 80 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {usagePercent >= 100
                ? "You've reached your monthly limit"
                : `You're approaching your monthly limit`}
            </p>
          )}
        </div>

        {/* Period Info */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Days remaining</span>
          <span className="font-medium">
            {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          {salaryDeduction.isEnabled ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
              Disabled
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SalaryDeductionSummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-36 bg-muted rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center p-4 rounded-lg bg-background border">
              <div className="h-4 w-24 bg-muted rounded animate-pulse mx-auto mb-2" />
              <div className="h-8 w-32 bg-muted rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-full bg-muted rounded-full animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
