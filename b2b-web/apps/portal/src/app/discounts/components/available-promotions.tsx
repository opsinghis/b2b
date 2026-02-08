"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@b2b/ui";
import {
  Tag,
  Clock,
  Copy,
  Check,
  Percent,
  DollarSign,
  Gift,
  Truck,
} from "lucide-react";
import { useState } from "react";

import {
  useAvailablePromotions,
  formatPrice,
  formatDate,
  getPromotionValueDisplay,
  type Promotion,
} from "../hooks";

const promotionIcons: Record<Promotion["type"], React.ReactNode> = {
  PERCENTAGE: <Percent className="w-5 h-5" />,
  FIXED_AMOUNT: <DollarSign className="w-5 h-5" />,
  BOGO: <Gift className="w-5 h-5" />,
  FREE_SHIPPING: <Truck className="w-5 h-5" />,
};

const promotionColors: Record<Promotion["type"], string> = {
  PERCENTAGE: "bg-blue-500",
  FIXED_AMOUNT: "bg-green-500",
  BOGO: "bg-purple-500",
  FREE_SHIPPING: "bg-amber-500",
};

export function AvailablePromotions() {
  const { data: promotions, isLoading } = useAvailablePromotions();

  if (isLoading) {
    return <AvailablePromotionsSkeleton />;
  }

  if (!promotions || promotions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Available Promotions
          </CardTitle>
          <CardDescription>
            Special offers and discounts available to you
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Tag className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            No promotions available at the moment. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Available Promotions
        </CardTitle>
        <CardDescription>
          {promotions.length} {promotions.length === 1 ? "offer" : "offers"}{" "}
          available to use
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {promotions.map((promotion) => (
          <PromotionCard key={promotion.id} promotion={promotion} />
        ))}
      </CardContent>
    </Card>
  );
}

function PromotionCard({ promotion }: { promotion: Promotion }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(promotion.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const daysRemaining = Math.ceil(
    (new Date(promotion.endDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysRemaining <= 7;

  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-white ${
            promotionColors[promotion.type]
          }`}
        >
          {promotionIcons[promotion.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold">{promotion.name}</h4>
              <p className="text-lg font-bold text-primary">
                {getPromotionValueDisplay(promotion)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  {promotion.code}
                </>
              )}
            </Button>
          </div>

          {promotion.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {promotion.description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
            {/* Expiration */}
            <span
              className={`flex items-center gap-1 ${
                isExpiringSoon
                  ? "text-amber-600 dark:text-amber-400 font-medium"
                  : ""
              }`}
            >
              <Clock className="w-3 h-3" />
              {daysRemaining <= 0
                ? "Expires today"
                : `${daysRemaining} days left`}
            </span>

            {/* Min Order */}
            {promotion.minOrderAmount && (
              <span>
                Min. order: {formatPrice(promotion.minOrderAmount)}
              </span>
            )}

            {/* Max Discount */}
            {promotion.maxDiscount && (
              <span>
                Max discount: {formatPrice(promotion.maxDiscount)}
              </span>
            )}

            {/* Usage Limit */}
            {promotion.perUserLimit && (
              <span>
                {promotion.perUserLimit - promotion.usageCount} uses remaining
              </span>
            )}
          </div>

          {/* Valid Period */}
          <p className="text-xs text-muted-foreground mt-2">
            Valid: {formatDate(promotion.startDate)} - {formatDate(promotion.endDate)}
          </p>
        </div>
      </div>
    </div>
  );
}

function AvailablePromotionsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1">
                <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                <div className="h-6 w-24 bg-muted rounded animate-pulse mt-1" />
                <div className="h-4 w-full bg-muted rounded animate-pulse mt-2" />
                <div className="flex gap-3 mt-3">
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
