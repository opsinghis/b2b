"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import {
  Percent,
  ShoppingBag,
  DollarSign,
  Sparkles,
  Check,
  X,
} from "lucide-react";

import {
  useUserDiscountTier,
  formatPrice,
  formatPercent,
  getTierColor,
} from "../hooks";

interface Benefit {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  value?: string;
}

export function TierBenefits() {
  const { data: userTier, isLoading } = useUserDiscountTier();

  if (isLoading) {
    return <TierBenefitsSkeleton />;
  }

  const tier = userTier?.tier;
  const tierColor = tier ? getTierColor(tier) : "#6B7280";

  // Define tier benefits based on the current tier
  const benefits: Benefit[] = [
    {
      id: "discount",
      name: "Product Discount",
      description: "Automatic discount on all eligible products",
      icon: <Percent className="w-5 h-5" />,
      available: !!tier,
      value: tier ? formatPercent(tier.discountPercent) : "0%",
    },
    {
      id: "free-shipping",
      name: "Free Shipping",
      description: "Free standard shipping on all orders",
      icon: <ShoppingBag className="w-5 h-5" />,
      available: tier ? tier.level >= 2 : false,
    },
    {
      id: "early-access",
      name: "Early Access",
      description: "Get early access to new products and sales",
      icon: <Sparkles className="w-5 h-5" />,
      available: tier ? tier.level >= 3 : false,
    },
    {
      id: "exclusive-deals",
      name: "Exclusive Deals",
      description: "Access to member-only promotions and offers",
      icon: <DollarSign className="w-5 h-5" />,
      available: tier ? tier.level >= 1 : false,
    },
  ];

  // Calculate additional tier-specific thresholds
  const tierThresholds = tier
    ? [
        tier.minSpend
          ? {
              label: "Minimum Spend",
              value: formatPrice(tier.minSpend),
              met: userTier ? userTier.totalSpend >= tier.minSpend : false,
            }
          : null,
        tier.minOrders
          ? {
              label: "Minimum Orders",
              value: `${tier.minOrders} orders`,
              met: userTier ? userTier.totalOrders >= tier.minOrders : false,
            }
          : null,
      ].filter(Boolean)
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" style={{ color: tierColor }} />
          Tier Benefits
        </CardTitle>
        <CardDescription>
          {tier
            ? `Your ${tier.name} membership includes these benefits`
            : "Unlock benefits by joining a discount tier"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Benefits List */}
        <div className="space-y-3">
          {benefits.map((benefit) => (
            <div
              key={benefit.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                benefit.available
                  ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
                  : "bg-muted/50 border-transparent"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  benefit.available
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {benefit.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`font-medium ${
                      benefit.available ? "" : "text-muted-foreground"
                    }`}
                  >
                    {benefit.name}
                  </h4>
                  {benefit.available ? (
                    benefit.value ? (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: tierColor }}
                      >
                        {benefit.value}
                      </span>
                    ) : (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    )
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <p
                  className={`text-sm ${
                    benefit.available
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tier Requirements */}
        {tierThresholds.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Tier Requirements</h4>
            <div className="grid grid-cols-2 gap-2">
              {tierThresholds.map(
                (threshold) =>
                  threshold && (
                    <div
                      key={threshold.label}
                      className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {threshold.label}
                      </span>
                      <span className="font-medium flex items-center gap-1">
                        {threshold.value}
                        {threshold.met && (
                          <Check className="w-3 h-3 text-green-600" />
                        )}
                      </span>
                    </div>
                  )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TierBenefitsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
          >
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse mt-1" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
