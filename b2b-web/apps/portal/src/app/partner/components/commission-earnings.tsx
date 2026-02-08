"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, cn } from "@b2b/ui";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import {
  useCommissionSummary,
  useCommissionHistory,
  formatPrice,
  formatDate,
  getCommissionStatusColor,
  type Commission,
} from "../hooks";

export function CommissionEarnings() {
  const [showHistory, setShowHistory] = useState(false);
  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useCommissionSummary();
  const { data: history, isLoading: historyLoading } = useCommissionHistory({ limit: 5 });

  if (summaryLoading) {
    return <CommissionEarningsSkeleton />;
  }

  if (summaryError || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Commission Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Commission tracking is not available for your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Commission Earnings
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? "Show Summary" : "View History"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {!showHistory ? (
          <CommissionSummaryView summary={summary} />
        ) : (
          <CommissionHistoryView
            commissions={history?.commissions ?? []}
            isLoading={historyLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CommissionSummaryView({
  summary,
}: {
  summary: {
    totalEarned: number;
    totalPending: number;
    totalPaid: number;
    currentMonth: number;
    lastMonth: number;
    yearToDate: number;
    currency: string;
  };
}) {
  const monthChange = summary.lastMonth > 0
    ? ((summary.currentMonth - summary.lastMonth) / summary.lastMonth) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Wallet className="h-4 w-4" />
            Total Earned
          </div>
          <div className="text-2xl font-bold">
            {formatPrice(summary.totalEarned, summary.currency)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            Pending
          </div>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {formatPrice(summary.totalPending, summary.currency)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <CheckCircle className="h-4 w-4" />
            Paid Out
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatPrice(summary.totalPaid, summary.currency)}
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-3">Monthly Performance</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">This Month</div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">
                {formatPrice(summary.currentMonth, summary.currency)}
              </span>
              {monthChange !== 0 && (
                <span
                  className={cn(
                    "text-xs flex items-center",
                    monthChange > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  <TrendingUp
                    className={cn(
                      "h-3 w-3 mr-0.5",
                      monthChange < 0 && "rotate-180"
                    )}
                  />
                  {Math.abs(monthChange).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Last Month</div>
            <div className="text-xl font-semibold">
              {formatPrice(summary.lastMonth, summary.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Year to Date */}
      <div className="pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Year to Date</span>
          <span className="text-lg font-semibold">
            {formatPrice(summary.yearToDate, summary.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CommissionHistoryView({
  commissions,
  isLoading,
}: {
  commissions: Commission[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="text-center py-8">
        <DollarSign className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No commission history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {commissions.map((commission) => (
        <div
          key={commission.id}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              Order #{commission.orderNumber}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(commission.createdAt)} | {commission.commissionPercent}% of{" "}
              {formatPrice(commission.orderAmount)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold">
              {formatPrice(commission.commissionAmount)}
            </span>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                getCommissionStatusColor(commission.status)
              )}
            >
              {commission.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommissionEarningsSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="pt-4 border-t">
          <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
