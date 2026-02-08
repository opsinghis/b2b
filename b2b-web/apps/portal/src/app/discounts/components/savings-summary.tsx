"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import {
  PiggyBank,
  TrendingUp,
  Calendar,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import {
  useUserSavings,
  formatPrice,
  formatPercent,
} from "../hooks";

export function SavingsSummary() {
  const { data: savings, isLoading } = useUserSavings();

  if (isLoading) {
    return <SavingsSummarySkeleton />;
  }

  if (!savings) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <PiggyBank className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No savings data available yet. Start shopping to see your savings!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate month-over-month change
  const history = savings.savingsHistory || [];
  const currentMonthSavings = savings.savingsThisMonth;
  const lastMonthSavings = history.length > 1 ? history[1].amount : 0;
  const monthChange = lastMonthSavings > 0
    ? ((currentMonthSavings - lastMonthSavings) / lastMonthSavings) * 100
    : 0;

  // Calculate average order discount
  const averageDiscount = savings.totalOrders > 0
    ? (savings.totalSavings / savings.totalOrders)
    : 0;

  const stats = [
    {
      id: "month",
      label: "This Month",
      value: formatPrice(savings.savingsThisMonth),
      icon: <Calendar className="w-5 h-5" />,
      change: monthChange,
      subtext: "vs last month",
    },
    {
      id: "year",
      label: "This Year",
      value: formatPrice(savings.savingsThisYear),
      icon: <TrendingUp className="w-5 h-5" />,
      subtext: `from ${savings.totalOrders} orders`,
    },
    {
      id: "total",
      label: "All Time",
      value: formatPrice(savings.totalSavings),
      icon: <PiggyBank className="w-5 h-5" />,
      subtext: "total saved",
    },
    {
      id: "average",
      label: "Avg. Per Order",
      value: formatPrice(averageDiscount),
      icon: <ShoppingBag className="w-5 h-5" />,
      subtext: "discount saved",
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <PiggyBank className="w-5 h-5" />
          Your Savings
        </CardTitle>
        <CardDescription>
          Track how much you&apos;ve saved with your discount tier
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="p-4 rounded-lg bg-white/60 dark:bg-gray-900/40 border border-green-100 dark:border-green-800/50"
            >
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                {stat.icon}
                <span className="text-sm font-medium">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stat.value}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {stat.change !== undefined && (
                  <>
                    {stat.change > 0 ? (
                      <ArrowUpRight className="w-3 h-3 text-green-600" />
                    ) : stat.change < 0 ? (
                      <ArrowDownRight className="w-3 h-3 text-red-500" />
                    ) : null}
                    {stat.change !== 0 && (
                      <span
                        className={`text-xs font-medium ${
                          stat.change > 0
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {formatPercent(Math.abs(stat.change))}
                      </span>
                    )}
                  </>
                )}
                <span className="text-xs text-muted-foreground">
                  {stat.subtext}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total Spend Context */}
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Total orders placed
            </span>
            <span className="font-medium">{savings.totalOrders}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">
              Total amount spent
            </span>
            <span className="font-medium">{formatPrice(savings.totalSpend)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">
              Effective discount rate
            </span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {savings.totalSpend > 0
                ? formatPercent((savings.totalSavings / (savings.totalSpend + savings.totalSavings)) * 100)
                : "0%"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SavingsSummarySkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded bg-muted animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
              <div className="h-3 w-20 bg-muted rounded animate-pulse mt-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
