"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";

import type { PromotionType, PromotionStatus } from "../hooks/use-promotions";
import { PROMOTION_TYPES, PROMOTION_STATUSES } from "../hooks/use-promotions";

interface PromotionFiltersProps {
  type: PromotionType | "";
  onTypeChange: (type: PromotionType | "") => void;
  status: PromotionStatus | "";
  onStatusChange: (status: PromotionStatus | "") => void;
  activeFilter: "all" | "active" | "inactive";
  onActiveFilterChange: (filter: "all" | "active" | "inactive") => void;
}

export function PromotionFilters({
  type,
  onTypeChange,
  status,
  onStatusChange,
  activeFilter,
  onActiveFilterChange,
}: PromotionFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={type || "all"}
        onValueChange={(value) => onTypeChange(value === "all" ? "" : (value as PromotionType))}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {PROMOTION_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status || "all"}
        onValueChange={(value) => onStatusChange(value === "all" ? "" : (value as PromotionStatus))}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {PROMOTION_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${s.color.split(" ")[0]}`} />
                {s.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeFilter}
        onValueChange={(value) => onActiveFilterChange(value as "all" | "active" | "inactive")}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active Only</SelectItem>
          <SelectItem value="inactive">Inactive Only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
