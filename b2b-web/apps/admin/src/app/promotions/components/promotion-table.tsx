"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@b2b/ui";
import {
  BarChart3,
  Edit,
  Power,
  PowerOff,
  Trash2,
  Ticket,
  Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import type { Promotion, PromotionType, PromotionStatus } from "../hooks/use-promotions";
import {
  PROMOTION_TYPES,
  PROMOTION_STATUSES,
  getPromotionStatus,
  formatPromotionValue,
} from "../hooks/use-promotions";

interface PromotionTableProps {
  promotions: Promotion[];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onViewCoupons: (promotion: Promotion) => void;
  isUpdating?: boolean;
}

function getTypeBadgeColor(type: PromotionType): string {
  switch (type) {
    case "PERCENTAGE":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "FIXED_AMOUNT":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "BOGO":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "FREE_SHIPPING":
      return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusBadge(status: PromotionStatus): { label: string; className: string } {
  const statusConfig = PROMOTION_STATUSES.find((s) => s.value === status);
  return statusConfig
    ? { label: statusConfig.label, className: statusConfig.color }
    : { label: status, className: "bg-gray-100 text-gray-800" };
}

function getTypeLabel(type: PromotionType): string {
  const typeConfig = PROMOTION_TYPES.find((t) => t.value === type);
  return typeConfig?.label || type;
}

export function PromotionTable({
  promotions,
  onToggleStatus,
  onDelete,
  onViewCoupons,
  isUpdating,
}: PromotionTableProps) {
  const router = useRouter();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Promotion</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {promotions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No promotions found.
              </TableCell>
            </TableRow>
          ) : (
            promotions.map((promotion) => {
              const status = getPromotionStatus(promotion);
              const statusBadge = getStatusBadge(status);
              return (
                <TableRow key={promotion.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{promotion.name}</p>
                      {promotion.code && (
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {promotion.code}
                          </code>
                          <button
                            onClick={() => copyCode(promotion.code!)}
                            className="text-muted-foreground hover:text-foreground"
                            title="Copy code"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {promotion.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {promotion.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeColor(promotion.type)}`}
                    >
                      {getTypeLabel(promotion.type)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-green-600">
                      {formatPromotionValue(promotion)}
                    </span>
                    {promotion.maxDiscountAmount && promotion.type === "PERCENTAGE" && (
                      <p className="text-xs text-muted-foreground">
                        Max: ${promotion.maxDiscountAmount.toFixed(2)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{formatDate(promotion.startDate)}</p>
                      {promotion.endDate && (
                        <p className="text-muted-foreground">
                          to {formatDate(promotion.endDate)}
                        </p>
                      )}
                      {!promotion.endDate && (
                        <p className="text-muted-foreground">No end date</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>
                        {promotion.currentUsageCount}
                        {promotion.totalUsageLimit
                          ? ` / ${promotion.totalUsageLimit}`
                          : ""}
                      </p>
                      {promotion.perUserLimit && (
                        <p className="text-xs text-muted-foreground">
                          {promotion.perUserLimit} per user
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                    >
                      {statusBadge.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {promotion.isCouponBased && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewCoupons(promotion)}
                          title="Manage coupons"
                        >
                          <Ticket className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/promotions/${promotion.id}/analytics`)}
                        title="View analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/promotions/${promotion.id}`)}
                        title="Edit promotion"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleStatus(promotion.id, !promotion.isActive)}
                        disabled={isUpdating}
                        title={promotion.isActive ? "Pause" : "Activate"}
                      >
                        {promotion.isActive ? (
                          <PowerOff className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Power className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(promotion.id)}
                        disabled={isUpdating}
                        title="Delete promotion"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
