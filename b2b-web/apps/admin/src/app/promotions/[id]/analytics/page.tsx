"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DatePicker,
} from "@b2b/ui";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Percent,
  Download,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import {
  usePromotion,
  usePromotionAnalytics,
  formatPromotionValue,
  getPromotionStatus,
  PROMOTION_STATUSES,
} from "../../hooks/use-promotions";

import { Header } from "@/components/layout";

function PromotionAnalyticsContent() {
  const { hasRole } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [fromDate, setFromDate] = React.useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [toDate, setToDate] = React.useState<Date | undefined>(new Date());

  const { data: promotion, isLoading: promotionLoading } = usePromotion(id);
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error,
    refetch,
  } = usePromotionAnalytics(id, {
    from: fromDate?.toISOString().split("T")[0] || "",
    to: toDate?.toISOString().split("T")[0] || "",
  });

  const isLoading = promotionLoading || analyticsLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const exportCsv = () => {
    if (!analytics) return;

    const headers = ["Date", "Redemptions", "Discount Amount"];
    const rows = analytics.redemptionsByDate.map((r) => [
      r.date,
      r.count.toString(),
      r.discountAmount.toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promotion-analytics-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Promotion Analytics" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to view promotion analytics.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !promotion) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Promotion Analytics" />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Promotion Analytics" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Promotion Not Found</h2>
            <Button asChild className="mt-4">
              <Link href="/promotions">Back to Promotions</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = getPromotionStatus(promotion);
  const statusConfig = PROMOTION_STATUSES.find((s) => s.value === status);

  return (
    <div className="flex flex-col h-full">
      <Header title="Promotion Analytics" />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/promotions/${id}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{promotion.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {formatPromotionValue(promotion)}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig?.color}`}>
                  {statusConfig?.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <DatePicker value={fromDate} onChange={setFromDate} />
              <span className="text-sm text-muted-foreground">To:</span>
              <DatePicker value={toDate} onChange={setToDate} />
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!analytics}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load analytics data. Please try again.
            </p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                  <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {analytics ? formatNumber(analytics.totalRedemptions) : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Redemptions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {analytics ? formatNumber(analytics.uniqueUsers) : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Unique Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                  <DollarSign className="h-5 w-5 text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {analytics ? formatCurrency(analytics.totalDiscountAmount) : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Discounts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {analytics ? formatCurrency(analytics.revenueGenerated) : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Revenue Generated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900">
                  <Percent className="h-5 w-5 text-yellow-600 dark:text-yellow-300" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {analytics ? formatPercent(analytics.conversionRate) : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Redemptions Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Redemptions Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : analytics && analytics.redemptionsByDate.length > 0 ? (
                <div className="space-y-2">
                  {/* Simple bar chart representation */}
                  <div className="space-y-1">
                    {analytics.redemptionsByDate.slice(-14).map((day) => {
                      const maxCount = Math.max(...analytics.redemptionsByDate.map((d) => d.count));
                      const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                      return (
                        <div key={day.date} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-20">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-8 text-right">
                            {day.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No redemption data available for this period.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : analytics && analytics.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {analytics.topProducts.slice(0, 10).map((product, index) => (
                    <div key={product.productId} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {product.productName}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {formatNumber(product.redemptionCount)} uses
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No product data available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Average Order Value</p>
                <p className="text-xl font-semibold mt-1">
                  {analytics ? formatCurrency(analytics.averageOrderValue) : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Usage</p>
                <p className="text-xl font-semibold mt-1">
                  {promotion.currentUsageCount}
                  {promotion.totalUsageLimit && ` / ${promotion.totalUsageLimit}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Per User Limit</p>
                <p className="text-xl font-semibold mt-1">
                  {promotion.perUserLimit || "Unlimited"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className="text-xl font-semibold mt-1">
                  {analytics && analytics.totalDiscountAmount > 0
                    ? `${((analytics.revenueGenerated / analytics.totalDiscountAmount) * 100 - 100).toFixed(0)}%`
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PromotionAnalyticsPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Promotion Analytics" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to view promotion analytics.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <PromotionAnalyticsContent />
    </RequireAuth>
  );
}
