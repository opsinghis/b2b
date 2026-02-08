"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";

import { LIMIT_REQUEST_STATUSES, type LimitRequestStatus } from "../hooks/use-salary-deductions";

interface RequestFiltersProps {
  statusFilter: LimitRequestStatus | "";
  onStatusFilterChange: (value: LimitRequestStatus | "") => void;
}

export function RequestFilters({
  statusFilter,
  onStatusFilterChange,
}: RequestFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <Select
        value={statusFilter || "all"}
        onValueChange={(value) => onStatusFilterChange(value === "all" ? "" : (value as LimitRequestStatus))}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {LIMIT_REQUEST_STATUSES.filter((s) => s.value).map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
