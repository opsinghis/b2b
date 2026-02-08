"use client";

import { cn } from "@b2b/ui";
import {
  UserCheck,
  Users,
  Percent,
  MapPin,
  Bell,
  Briefcase,
} from "lucide-react";

import type { TeamMember, TeamMemberDiscount } from "../hooks";

interface OrderOnBehalfIndicatorProps {
  teamMember: TeamMember;
  discount?: TeamMemberDiscount | null;
  showDeliveryInfo?: boolean;
  showNotificationInfo?: boolean;
  partnerName?: string;
  className?: string;
}

export function OrderOnBehalfIndicator({
  teamMember,
  discount,
  showDeliveryInfo = true,
  showNotificationInfo = true,
  partnerName,
  className,
}: OrderOnBehalfIndicatorProps) {
  const fullName = `${teamMember.firstName} ${teamMember.lastName}`.trim() || teamMember.email;

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCheck className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-primary">Order on Behalf</p>
          <p className="text-xs text-muted-foreground">
            Placing order for team member
          </p>
        </div>
      </div>

      {/* Team Member Info */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-background">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
          {teamMember.firstName?.[0]?.toUpperCase() || teamMember.email[0]?.toUpperCase()}
          {teamMember.lastName?.[0]?.toUpperCase() || ""}
        </div>
        <div className="flex-1">
          <p className="font-medium">{fullName}</p>
          <p className="text-sm text-muted-foreground">{teamMember.email}</p>
        </div>
      </div>

      {/* Info Items */}
      <div className="space-y-2">
        {/* Discount Applied */}
        {discount && discount.discountPercent > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Percent className="h-4 w-4 text-green-600" />
            <span className="text-muted-foreground">Discount Applied:</span>
            <span className="font-medium text-green-600">
              {discount.discountPercent}% off
              {discount.tierName && ` (${discount.tierName})`}
            </span>
          </div>
        )}

        {/* Delivery Info */}
        {showDeliveryInfo && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-muted-foreground">Delivery to:</span>
            <span className="font-medium">Team member&apos;s address</span>
          </div>
        )}

        {/* Notification Info */}
        {showNotificationInfo && (
          <div className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-amber-600" />
            <span className="text-muted-foreground">Notification:</span>
            <span className="font-medium">Team member will be notified</span>
          </div>
        )}

        {/* Attribution */}
        {partnerName && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-purple-600" />
            <span className="text-muted-foreground">Attributed to:</span>
            <span className="font-medium">{partnerName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for inline use
interface OrderOnBehalfBadgeProps {
  teamMemberName: string;
  className?: string;
}

export function OrderOnBehalfBadge({
  teamMemberName,
  className,
}: OrderOnBehalfBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm",
        className
      )}
    >
      <Users className="h-4 w-4" />
      <span className="font-medium">On behalf of {teamMemberName}</span>
    </div>
  );
}

// Banner version for page headers
interface OrderOnBehalfBannerProps {
  teamMember: TeamMember;
  onCancel?: () => void;
  className?: string;
}

export function OrderOnBehalfBanner({
  teamMember,
  onCancel,
  className,
}: OrderOnBehalfBannerProps) {
  const fullName = `${teamMember.firstName} ${teamMember.lastName}`.trim() || teamMember.email;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Ordering on behalf of {fullName}</p>
          <p className="text-sm text-muted-foreground">
            This order will be attributed to your partner account
          </p>
        </div>
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
