"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { History, TrendingUp, ShoppingBag, Calendar } from "lucide-react";
import { useState } from "react";

import {
  useUserSavings,
  formatPrice,
  formatPercent,
  formatMonthYear,
  type SavingsHistoryItem,
} from "../hooks";

export function SavingsHistory() {
  const { data: savings, isLoading } = useUserSavings();
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  if (isLoading) {
    return <SavingsHistorySkeleton />;
  }

  if (!savings || !savings.savingsHistory || savings.savingsHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Savings History
          </CardTitle>
          <CardDescription>
            Your monthly savings breakdown
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <History className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No savings history yet. Start shopping to build your savings history!
          </p>
        </CardContent>
      </Card>
    );
  }

  const history = savings.savingsHistory.slice(0, 12); // Show last 12 months
  const maxSavings = Math.max(...history.map((h) => h.amount), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Savings History
            </CardTitle>
            <CardDescription>
              Your monthly savings over time
            </CardDescription>
          </div>
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as "chart" | "table")}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chart">Chart View</SelectItem>
              <SelectItem value="table">Table View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "chart" ? (
          <SavingsChart history={history} maxSavings={maxSavings} />
        ) : (
          <SavingsTable history={history} />
        )}
      </CardContent>
    </Card>
  );
}

function SavingsChart({
  history,
  maxSavings,
}: {
  history: SavingsHistoryItem[];
  maxSavings: number;
}) {
  return (
    <div className="space-y-4">
      {/* Simple Bar Chart */}
      <div className="h-48 flex items-end gap-2">
        {history
          .slice()
          .reverse()
          .map((item) => {
            const heightPercent = (item.amount / maxSavings) * 100;
            return (
              <div
                key={item.id}
                className="flex-1 flex flex-col items-center gap-1 group"
              >
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-green-500 dark:bg-green-600 rounded-t transition-all duration-300 hover:bg-green-600 dark:hover:bg-green-500"
                    style={{ height: `${Math.max(heightPercent, 5)}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                    <div className="bg-popover text-popover-foreground px-2 py-1 rounded shadow-lg text-xs whitespace-nowrap">
                      {formatPrice(item.amount)}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground transform -rotate-45 origin-top-left whitespace-nowrap">
                  {new Date(item.month + "-01").toLocaleDateString("en-US", {
                    month: "short",
                  })}
                </span>
              </div>
            );
          })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Average
          </p>
          <p className="text-lg font-semibold">
            {formatPrice(
              history.reduce((sum, h) => sum + h.amount, 0) / history.length
            )}
          </p>
          <p className="text-xs text-muted-foreground">per month</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <ShoppingBag className="w-4 h-4" />
            Orders
          </p>
          <p className="text-lg font-semibold">
            {history.reduce((sum, h) => sum + h.ordersCount, 0)}
          </p>
          <p className="text-xs text-muted-foreground">total orders</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Calendar className="w-4 h-4" />
            Best Month
          </p>
          <p className="text-lg font-semibold">
            {formatPrice(maxSavings)}
          </p>
          <p className="text-xs text-muted-foreground">highest savings</p>
        </div>
      </div>
    </div>
  );
}

function SavingsTable({ history }: { history: SavingsHistoryItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
              Month
            </th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
              Orders
            </th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
              Avg. Discount
            </th>
            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">
              Savings
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => (
            <tr
              key={item.id}
              className={`${index !== history.length - 1 ? "border-b" : ""}`}
            >
              <td className="py-3 px-2 font-medium">
                {formatMonthYear(item.month)}
              </td>
              <td className="py-3 px-2 text-right text-muted-foreground">
                {item.ordersCount}
              </td>
              <td className="py-3 px-2 text-right text-muted-foreground">
                {formatPercent(item.averageDiscount)}
              </td>
              <td className="py-3 px-2 text-right font-semibold text-green-600 dark:text-green-400">
                {formatPrice(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-semibold">
            <td className="py-3 px-2">Total</td>
            <td className="py-3 px-2 text-right">
              {history.reduce((sum, h) => sum + h.ordersCount, 0)}
            </td>
            <td className="py-3 px-2 text-right">
              {formatPercent(
                history.reduce((sum, h) => sum + h.averageDiscount, 0) /
                  history.length
              )}
            </td>
            <td className="py-3 px-2 text-right text-green-600 dark:text-green-400">
              {formatPrice(history.reduce((sum, h) => sum + h.amount, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SavingsHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-36 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-[120px] bg-muted rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end gap-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-muted rounded-t animate-pulse"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
              <div className="h-3 w-6 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
