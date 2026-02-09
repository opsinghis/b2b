"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";

import { QUOTE_STATUSES, type QuoteStatus } from "../hooks/use-quotes";

interface QuotesFiltersProps {
  status: QuoteStatus | "";
  onStatusChange: (status: QuoteStatus | "") => void;
}

export function QuotesFilters({ status, onStatusChange }: QuotesFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <Select
        value={status || "__all__"}
        onValueChange={(value) =>
          onStatusChange(value === "__all__" ? "" : (value as QuoteStatus))
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Status</SelectItem>
          {QUOTE_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
