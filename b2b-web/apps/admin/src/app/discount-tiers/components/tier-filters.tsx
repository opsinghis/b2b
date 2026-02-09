"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";

import { TIER_LEVELS, type TierLevel } from "../hooks/use-discount-tiers";

interface TierFiltersProps {
  level: TierLevel | "";
  onLevelChange: (level: TierLevel | "") => void;
  status: "all" | "active" | "inactive";
  onStatusChange: (status: "all" | "active" | "inactive") => void;
}

export function TierFilters({
  level,
  onLevelChange,
  status,
  onStatusChange,
}: TierFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <Select
        value={level || "__all__"}
        onValueChange={(value) => onLevelChange(value === "__all__" ? "" : value as TierLevel)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Levels</SelectItem>
          {TIER_LEVELS.map((tier) => (
            <SelectItem key={tier.value} value={tier.value}>
              {tier.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status}
        onValueChange={(value) =>
          onStatusChange(value as "all" | "active" | "inactive")
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
