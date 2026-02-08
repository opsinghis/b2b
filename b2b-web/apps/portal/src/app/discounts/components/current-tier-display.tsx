"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import {
  Award,
  Crown,
  Gem,
  Star,
  Trophy,
  Circle,
  ShieldCheck,
} from "lucide-react";

import {
  useUserDiscountTier,
  formatPrice,
  formatPercent,
  formatDate,
  getTierColor,
  getDaysUntilExpiration,
} from "../hooks";

const tierIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  circle: Circle,
  star: Star,
  award: Award,
  gem: Gem,
  crown: Crown,
  trophy: Trophy,
};

export function CurrentTierDisplay() {
  const { data: userTier, isLoading } = useUserDiscountTier();

  if (isLoading) {
    return <CurrentTierDisplaySkeleton />;
  }

  if (!userTier) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Discount Tier</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            You haven&apos;t been assigned a discount tier yet. Keep shopping to
            unlock exclusive discounts and benefits!
          </p>
        </CardContent>
      </Card>
    );
  }

  const { tier } = userTier;
  const tierColor = getTierColor(tier);
  const iconName = tier.icon || "award";
  const IconComponent = tierIcons[iconName] || Award;
  const daysUntilExpiration = getDaysUntilExpiration(userTier.expiresAt);

  return (
    <Card
      className="overflow-hidden"
      style={{
        borderTopWidth: "4px",
        borderTopColor: tierColor,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
            >
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <CardDescription>{tier.code}</CardDescription>
            </div>
          </div>
          <div
            className="text-3xl font-bold"
            style={{ color: tierColor }}
          >
            {formatPercent(tier.discountPercent)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tier.description && (
          <p className="text-sm text-muted-foreground">{tier.description}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{formatPrice(userTier.totalSpend)}</p>
            <p className="text-xs text-muted-foreground">Total Spent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{userTier.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPrice(userTier.totalSavings)}
            </p>
            <p className="text-xs text-muted-foreground">Total Saved</p>
          </div>
        </div>

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          <span>
            Member since {formatDate(userTier.assignedAt)}
          </span>
          {daysUntilExpiration !== null && (
            <span
              className={
                daysUntilExpiration <= 30
                  ? "text-amber-600 dark:text-amber-400"
                  : ""
              }
            >
              {daysUntilExpiration === 0
                ? "Expires today"
                : `Expires in ${daysUntilExpiration} days`}
            </span>
          )}
          {userTier.reason && (
            <span className="italic">{userTier.reason}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CurrentTierDisplaySkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
            <div>
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse mt-1" />
            </div>
          </div>
          <div className="h-10 w-16 bg-muted rounded animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-20 bg-muted rounded animate-pulse mx-auto" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse mx-auto mt-1" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
