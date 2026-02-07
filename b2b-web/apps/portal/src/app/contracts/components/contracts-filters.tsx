"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DatePicker,
  Button,
  Label,
} from "@b2b/ui";
import { X } from "lucide-react";

import { type ContractStatus, CONTRACT_STATUSES } from "../hooks";

interface ContractsFiltersProps {
  statusFilter?: ContractStatus;
  startDate?: Date;
  endDate?: Date;
  onStatusChange: (status: ContractStatus | undefined) => void;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onClearFilters: () => void;
}

export function ContractsFilters({
  statusFilter,
  startDate,
  endDate,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
}: ContractsFiltersProps) {
  const hasActiveFilters = statusFilter || startDate || endDate;

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Status Filter */}
      <div className="w-48">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) =>
            onStatusChange(value === "all" ? undefined : (value as ContractStatus))
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CONTRACT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Start Date Filter */}
      <div className="w-44">
        <Label className="text-xs text-muted-foreground">Start Date</Label>
        <DatePicker
          value={startDate}
          onChange={onStartDateChange}
          placeholder="Start date"
          className="mt-1"
        />
      </div>

      {/* End Date Filter */}
      <div className="w-44">
        <Label className="text-xs text-muted-foreground">End Date</Label>
        <DatePicker
          value={endDate}
          onChange={onEndDateChange}
          placeholder="End date"
          className="mt-1"
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-10"
        >
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
