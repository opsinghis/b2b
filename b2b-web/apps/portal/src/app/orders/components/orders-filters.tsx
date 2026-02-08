"use client";

import {
  Button,
  Card,
  CardContent,
  DatePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { Download, Search, X } from "lucide-react";

import type { OrderStatus } from "../hooks";

export interface OrdersFiltersState {
  search: string;
  status: OrderStatus | "ALL";
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface OrdersFiltersProps {
  filters: OrdersFiltersState;
  onFiltersChange: (filters: Partial<OrdersFiltersState>) => void;
  onExportCSV: () => void;
  isExporting?: boolean;
  totalOrders?: number;
}

export function OrdersFilters({
  filters,
  onFiltersChange,
  onExportCSV,
  isExporting = false,
  totalOrders = 0,
}: OrdersFiltersProps) {
  const hasActiveFilters =
    filters.search ||
    filters.status !== "ALL" ||
    filters.startDate ||
    filters.endDate;

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "ALL",
      startDate: undefined,
      endDate: undefined,
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Row 1: Search and Status */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order number..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({ status: value as OrderStatus | "ALL" })
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Date Range and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Date Range */}
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
                <DatePicker
                  value={filters.startDate}
                  onChange={(date) => onFiltersChange({ startDate: date })}
                  placeholder="Start date"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
                <DatePicker
                  value={filters.endDate}
                  onChange={(date) => onFiltersChange({ endDate: date })}
                  placeholder="End date"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onExportCSV}
                disabled={isExporting || totalOrders === 0}
              >
                <Download className={`h-4 w-4 mr-1 ${isExporting ? "animate-pulse" : ""}`} />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {filters.search && (
                <FilterTag
                  label={`Search: "${filters.search}"`}
                  onRemove={() => onFiltersChange({ search: "" })}
                />
              )}
              {filters.status !== "ALL" && (
                <FilterTag
                  label={`Status: ${filters.status}`}
                  onRemove={() => onFiltersChange({ status: "ALL" })}
                />
              )}
              {filters.startDate && (
                <FilterTag
                  label={`From: ${filters.startDate.toLocaleDateString()}`}
                  onRemove={() => onFiltersChange({ startDate: undefined })}
                />
              )}
              {filters.endDate && (
                <FilterTag
                  label={`To: ${filters.endDate.toLocaleDateString()}`}
                  onRemove={() => onFiltersChange({ endDate: undefined })}
                />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-muted-foreground/20 rounded p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
