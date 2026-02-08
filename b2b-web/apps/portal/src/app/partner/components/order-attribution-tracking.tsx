"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@b2b/ui";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Award,
  Users,
  CheckCircle,
} from "lucide-react";

import type { PartnerProfile, OrderOnBehalfResult } from "../hooks";
import { formatPrice, getTierBgColor } from "../hooks";

interface OrderAttributionTrackingProps {
  partnerProfile: PartnerProfile;
  teamMemberName: string;
  orderTotal?: number;
  className?: string;
}

export function OrderAttributionTracking({
  partnerProfile,
  teamMemberName,
  orderTotal,
  className,
}: OrderAttributionTrackingProps) {
  const estimatedCommission = orderTotal
    ? (orderTotal * (partnerProfile.commissionPercent / 100))
    : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Order Attribution
        </CardTitle>
        <CardDescription>
          This order will be tracked and attributed to your partner account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Partner Info */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{partnerProfile.companyName}</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                getTierBgColor(partnerProfile.tier)
              )}>
                {partnerProfile.tier}
              </span>
              <span className="text-sm text-muted-foreground">
                {partnerProfile.commissionPercent}% Commission
              </span>
            </div>
          </div>
        </div>

        {/* Attribution Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">Sales Tracking</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              Added to your total sales
            </p>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">Commission</span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {orderTotal ? formatPrice(estimatedCommission) : "Based on order"} estimated
            </p>
          </div>
        </div>

        {/* Order Attribution Chain */}
        <div className="p-4 rounded-lg border">
          <p className="text-sm font-medium mb-3">Attribution Chain</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{teamMemberName}</span>
            </div>
            <div className="flex-1 border-t border-dashed" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900">
              <Briefcase className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium">{partnerProfile.companyName}</span>
            </div>
          </div>
        </div>

        {/* Tracking Benefits */}
        <div className="space-y-2">
          <p className="text-sm font-medium">What This Means:</p>
          <ul className="space-y-1">
            {[
              "Order counted toward your monthly sales",
              "Commission calculated at your tier rate",
              "Visible in your partner dashboard",
              "Team member stats updated",
            ].map((benefit, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact attribution badge for order confirmation
interface OrderAttributionBadgeProps {
  partnerName: string;
  commissionPercent: number;
  className?: string;
}

export function OrderAttributionBadge({
  partnerName,
  commissionPercent,
  className,
}: OrderAttributionBadgeProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
      className
    )}>
      <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
      <div className="text-sm">
        <span className="text-green-700 dark:text-green-300">Attributed to </span>
        <span className="font-medium text-green-800 dark:text-green-200">{partnerName}</span>
        <span className="text-green-700 dark:text-green-300"> ({commissionPercent}% commission)</span>
      </div>
    </div>
  );
}

// Order confirmation attribution display
interface OrderAttributionConfirmationProps {
  result: OrderOnBehalfResult;
  className?: string;
}

export function OrderAttributionConfirmation({
  result,
  className,
}: OrderAttributionConfirmationProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">
            Order Attributed Successfully
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Order #{result.orderNumber} attributed to {result.attributedToPartnerName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-green-200 dark:border-green-700">
        <div className="text-center">
          <p className="text-sm text-green-700 dark:text-green-300">Order Total</p>
          <p className="font-semibold text-green-800 dark:text-green-200">{formatPrice(result.total)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-green-700 dark:text-green-300">Discount Applied</p>
          <p className="font-semibold text-green-800 dark:text-green-200">{formatPrice(result.discount)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-green-700 dark:text-green-300">Notified</p>
          <p className="font-semibold text-green-800 dark:text-green-200">
            {result.teamMemberNotified ? "Yes" : "No"}
          </p>
        </div>
      </div>
    </div>
  );
}
