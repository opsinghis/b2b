"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { X } from "lucide-react";

import {
  PRODUCT_STATUSES,
  type ProductStatus,
  useCategories,
  useBrands,
} from "../hooks/use-products";

interface ProductFiltersProps {
  categoryFilter?: string;
  brandFilter?: string;
  statusFilter?: ProductStatus;
  onCategoryChange: (category: string | undefined) => void;
  onBrandChange: (brand: string | undefined) => void;
  onStatusChange: (status: ProductStatus | undefined) => void;
}

export function ProductFilters({
  categoryFilter,
  brandFilter,
  statusFilter,
  onCategoryChange,
  onBrandChange,
  onStatusChange,
}: ProductFiltersProps) {
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  return (
    <div className="flex items-center gap-2">
      {/* Category Filter */}
      <div className="relative">
        <Select
          value={categoryFilter || "all"}
          onValueChange={(value) =>
            onCategoryChange(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {categoryFilter && (
          <button
            type="button"
            onClick={() => onCategoryChange(undefined)}
            className="absolute -right-2 -top-2 rounded-full bg-muted p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Brand Filter */}
      <div className="relative">
        <Select
          value={brandFilter || "all"}
          onValueChange={(value) =>
            onBrandChange(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {brandFilter && (
          <button
            type="button"
            onClick={() => onBrandChange(undefined)}
            className="absolute -right-2 -top-2 rounded-full bg-muted p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="relative">
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) =>
            onStatusChange(
              value === "all" ? undefined : (value as ProductStatus)
            )
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {PRODUCT_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter && (
          <button
            type="button"
            onClick={() => onStatusChange(undefined)}
            className="absolute -right-2 -top-2 rounded-full bg-muted p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
