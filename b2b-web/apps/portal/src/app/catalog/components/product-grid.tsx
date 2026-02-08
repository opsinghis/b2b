"use client";

import { Package } from "lucide-react";

import { CatalogProduct } from "../hooks";

import { ProductCard } from "./product-card";
import type { ViewMode } from "./view-toggle";

interface ProductGridProps {
  products: CatalogProduct[];
  viewMode: ViewMode;
  isLoading?: boolean;
  onQuickView: (product: CatalogProduct) => void;
  onAddToCart?: (product: CatalogProduct) => void;
}

export function ProductGrid({
  products,
  viewMode,
  isLoading,
  onQuickView,
  onAddToCart,
}: ProductGridProps) {
  if (isLoading) {
    return <ProductGridSkeleton viewMode={viewMode} />;
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No products found</h3>
        <p className="text-muted-foreground mt-1">
          Try adjusting your filters or search term
        </p>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            viewMode="list"
            onQuickView={onQuickView}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          viewMode="grid"
          onQuickView={onQuickView}
          onAddToCart={onAddToCart}
        />
      ))}
    </div>
  );
}

function ProductGridSkeleton({ viewMode }: { viewMode: ViewMode }) {
  const items = Array.from({ length: 8 });

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-4">
        {items.map((_, index) => (
          <div
            key={index}
            className="flex animate-pulse rounded-lg border bg-card"
          >
            <div className="w-48 h-48 bg-muted rounded-l-lg" />
            <div className="flex-1 p-4 space-y-3">
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded w-24" />
                  <div className="h-4 bg-muted rounded w-16" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 bg-muted rounded w-24" />
                  <div className="h-9 bg-muted rounded w-24" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((_, index) => (
        <div key={index} className="animate-pulse rounded-lg border bg-card">
          <div className="aspect-square bg-muted rounded-t-lg" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-9 bg-muted rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
