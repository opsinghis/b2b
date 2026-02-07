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
  Input,
} from "@b2b/ui";
import { X } from "lucide-react";

import {
  type AuditAction,
  type EntityType,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
} from "../hooks/use-audit";

interface AuditFiltersProps {
  userFilter?: string;
  actionFilter?: AuditAction;
  entityTypeFilter?: EntityType;
  startDate?: Date;
  endDate?: Date;
  onUserChange: (userId: string | undefined) => void;
  onActionChange: (action: AuditAction | undefined) => void;
  onEntityTypeChange: (entityType: EntityType | undefined) => void;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onClearFilters: () => void;
}

export function AuditFilters({
  userFilter,
  actionFilter,
  entityTypeFilter,
  startDate,
  endDate,
  onUserChange,
  onActionChange,
  onEntityTypeChange,
  onStartDateChange,
  onEndDateChange,
  onClearFilters,
}: AuditFiltersProps) {
  const hasActiveFilters =
    userFilter || actionFilter || entityTypeFilter || startDate || endDate;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        {/* User ID Filter */}
        <div className="w-48">
          <Label className="text-xs text-muted-foreground">User ID</Label>
          <Input
            placeholder="Filter by user ID"
            value={userFilter || ""}
            onChange={(e) => onUserChange(e.target.value || undefined)}
            className="mt-1"
          />
        </div>

        {/* Action Filter */}
        <div className="w-40">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select
            value={actionFilter || "all"}
            onValueChange={(value) =>
              onActionChange(value === "all" ? undefined : (value as AuditAction))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {AUDIT_ACTIONS.map((action) => (
                <SelectItem key={action.value} value={action.value}>
                  {action.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entity Type Filter */}
        <div className="w-40">
          <Label className="text-xs text-muted-foreground">Entity Type</Label>
          <Select
            value={entityTypeFilter || "all"}
            onValueChange={(value) =>
              onEntityTypeChange(
                value === "all" ? undefined : (value as EntityType)
              )
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="w-44">
          <Label className="text-xs text-muted-foreground">Start Date</Label>
          <DatePicker
            value={startDate}
            onChange={onStartDateChange}
            placeholder="Start date"
            className="mt-1"
          />
        </div>

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
    </div>
  );
}
