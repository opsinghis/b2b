"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Label,
} from "@b2b/ui";
import { X } from "lucide-react";

import {
  type ApprovalEntityType,
  ENTITY_TYPES,
} from "../hooks/use-approvals";

interface ApprovalsFiltersProps {
  entityTypeFilter?: ApprovalEntityType;
  onEntityTypeChange: (entityType: ApprovalEntityType | undefined) => void;
  onClearFilters: () => void;
}

export function ApprovalsFilters({
  entityTypeFilter,
  onEntityTypeChange,
  onClearFilters,
}: ApprovalsFiltersProps) {
  const hasActiveFilters = !!entityTypeFilter;

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Entity Type Filter */}
      <div className="w-48">
        <Label className="text-xs text-muted-foreground">Type</Label>
        <Select
          value={entityTypeFilter || "all"}
          onValueChange={(value) =>
            onEntityTypeChange(value === "all" ? undefined : (value as ApprovalEntityType))
          }
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
