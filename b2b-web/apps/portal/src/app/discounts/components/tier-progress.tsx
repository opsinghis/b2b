"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import { TrendingUp, DollarSign, ShoppingCart, ChevronRight } from "lucide-react";

import {
  useUserSavings,
  formatPrice,
  formatPercent,
  getTierColor,
  calculateProgressToNextTier,
} from "../hooks";

export function TierProgress() {
  const { data: savings, isLoading } = useUserSavings();

  if (isLoading) {
    return <TierProgressSkeleton />;
  }

  if (!savings) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            Start shopping to track your progress to the next tier!
          </p>
        </CardContent>
      </Card>
    );
  }

  const { currentTier, nextTier, spendToNextTier, ordersToNextTier } = savings;
  const currentColor = getTierColor(currentTier);
  const nextColor = getTierColor(nextTier);

  // If no next tier, user is at the highest tier
  if (!nextTier) {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <TrendingUp className="w-5 h-5" />
            Maximum Tier Achieved!
          </CardTitle>
          <CardDescription>
            Congratulations! You&apos;ve reached our highest discount tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div
              className="text-center p-6 rounded-xl"
              style={{ backgroundColor: `${currentColor}15` }}
            >
              <p className="text-sm text-muted-foreground mb-1">Current Tier</p>
              <p
                className="text-2xl font-bold"
                style={{ color: currentColor }}
              >
                {currentTier?.name || "Elite"}
              </p>
              <p className="text-lg font-semibold mt-1" style={{ color: currentColor }}>
                {currentTier ? formatPercent(currentTier.discountPercent) : "25%"} discount
              </p>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Enjoy your exclusive benefits and maximum savings!
          </p>
        </CardContent>
      </Card>
    );
  }

  const { spendProgress, ordersProgress } = calculateProgressToNextTier(
    savings.totalSpend,
    savings.totalOrders,
    nextTier,
    spendToNextTier,
    ordersToNextTier
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Progress to Next Tier
        </CardTitle>
        <CardDescription>
          Keep shopping to unlock more benefits and higher discounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tier Transition Visual */}
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{ backgroundColor: `${currentColor}20`, color: currentColor }}
            >
              <span className="text-xl font-bold">
                {currentTier ? formatPercent(currentTier.discountPercent) : "0%"}
              </span>
            </div>
            <p className="text-sm font-medium">
              {currentTier?.name || "No Tier"}
            </p>
          </div>

          <ChevronRight className="w-8 h-8 text-muted-foreground" />

          <div className="text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ring-2 ring-offset-2"
              style={{
                backgroundColor: `${nextColor}20`,
                color: nextColor,
                // Use CSS variable for ring color
                ["--tw-ring-color" as string]: nextColor,
              }}
            >
              <span className="text-xl font-bold">
                {formatPercent(nextTier.discountPercent)}
              </span>
            </div>
            <p className="text-sm font-medium">{nextTier.name}</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-4">
          {/* Spend Progress */}
          {spendToNextTier !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  Total Spend
                </span>
                <span className="font-medium">
                  {formatPrice(savings.totalSpend)} / {formatPrice(savings.totalSpend + spendToNextTier)}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${spendProgress}%`,
                    backgroundColor: nextColor,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Spend {formatPrice(spendToNextTier)} more to reach {nextTier.name}
              </p>
            </div>
          )}

          {/* Orders Progress */}
          {ordersToNextTier !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ShoppingCart className="w-4 h-4" />
                  Total Orders
                </span>
                <span className="font-medium">
                  {savings.totalOrders} / {savings.totalOrders + ordersToNextTier}
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${ordersProgress}%`,
                    backgroundColor: nextColor,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {ordersToNextTier} more {ordersToNextTier === 1 ? "order" : "orders"} to reach {nextTier.name}
              </p>
            </div>
          )}
        </div>

        {/* Next Tier Benefits Preview */}
        {nextTier.description && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium" style={{ color: nextColor }}>
                {nextTier.name}
              </span>{" "}
              unlocks: {nextTier.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TierProgressSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-4 w-56 bg-muted rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
          <div className="w-8 h-8 bg-muted rounded animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-3 w-full bg-muted rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
