"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";

interface DeductionFiltersProps {
  enabledFilter: string;
  onEnabledFilterChange: (value: string) => void;
}

export function DeductionFilters({
  enabledFilter,
  onEnabledFilterChange,
}: DeductionFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <Select value={enabledFilter} onValueChange={onEnabledFilterChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Employees</SelectItem>
          <SelectItem value="enabled">Enabled Only</SelectItem>
          <SelectItem value="disabled">Disabled Only</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
