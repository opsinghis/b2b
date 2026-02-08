"use client";

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { X } from "lucide-react";

import { Availability, AVAILABILITY_OPTIONS } from "../hooks";

export interface ProductFiltersState {
  availability?: Availability;
  minPrice?: number;
  maxPrice?: number;
}

interface ProductFiltersProps {
  filters: ProductFiltersState;
  onFiltersChange: (filters: ProductFiltersState) => void;
  onClear: () => void;
}

export function ProductFilters({
  filters,
  onFiltersChange,
  onClear,
}: ProductFiltersProps) {
  const hasActiveFilters =
    filters.availability || filters.minPrice || filters.maxPrice;

  const handleAvailabilityChange = (value: string) => {
    onFiltersChange({
      ...filters,
      availability: value === "all" ? undefined : (value as Availability),
    });
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number(e.target.value) : undefined;
    onFiltersChange({ ...filters, minPrice: value });
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number(e.target.value) : undefined;
    onFiltersChange({ ...filters, maxPrice: value });
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Availability Filter */}
      <div className="space-y-1.5">
        <Label htmlFor="availability" className="text-sm">
          Availability
        </Label>
        <Select
          value={filters.availability || "all"}
          onValueChange={handleAvailabilityChange}
        >
          <SelectTrigger id="availability" className="w-40">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {AVAILABILITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-1.5">
        <Label className="text-sm">Price Range</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice || ""}
            onChange={handleMinPriceChange}
            className="w-24"
            min={0}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice || ""}
            onChange={handleMaxPriceChange}
            className="w-24"
            min={0}
          />
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
