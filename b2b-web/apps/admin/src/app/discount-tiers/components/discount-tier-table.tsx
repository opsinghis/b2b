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
import { Edit, Power, PowerOff, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

import type { DiscountTier } from "../hooks/use-discount-tiers";
import { TIER_LEVELS, LEVEL_TO_TIER } from "../hooks/use-discount-tiers";

interface DiscountTierTableProps {
  tiers: DiscountTier[];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onAssign: (tier: DiscountTier) => void;
  isUpdating?: boolean;
}

function getTierBadgeColor(level: number): string {
  const tierLabel = LEVEL_TO_TIER[level] || "BRONZE";
  const tier = TIER_LEVELS.find((t) => t.value === tierLabel);
  return tier?.color || "bg-gray-500";
}

function getTierLabel(level: number): string {
  return LEVEL_TO_TIER[level] || "BRONZE";
}

export function DiscountTierTable({
  tiers,
  onToggleStatus,
  onDelete,
  onAssign,
  isUpdating,
}: DiscountTierTableProps) {
  const router = useRouter();

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Validity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No discount tiers found.
              </TableCell>
            </TableRow>
          ) : (
            tiers.map((tier) => (
              <TableRow key={tier.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{tier.name}</p>
                    {tier.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {tier.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${getTierBadgeColor(tier.level)}`}
                  >
                    {getTierLabel(tier.level)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-green-600">
                    {formatPercentage(tier.discountPercentage)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {tier.validFrom || tier.validTo ? (
                      <>
                        <p>{formatDate(tier.validFrom)} -</p>
                        <p>{formatDate(tier.validTo)}</p>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Always valid</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      tier.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {tier.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAssign(tier)}
                      title="Manage assignments"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/discount-tiers/${tier.id}`)}
                      title="Edit tier"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleStatus(tier.id, !tier.isActive)}
                      disabled={isUpdating}
                      title={tier.isActive ? "Deactivate" : "Activate"}
                    >
                      {tier.isActive ? (
                        <PowerOff className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Power className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(tier.id)}
                      disabled={isUpdating}
                      title="Delete tier"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
