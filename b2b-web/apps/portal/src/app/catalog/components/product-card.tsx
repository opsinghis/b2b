"use client";

import { Button, Card, CardContent } from "@b2b/ui";
import { Eye, Package, ShoppingCart } from "lucide-react";
import Image from "next/image";

import {
  CatalogProduct,
  formatPrice,
  calculateSavings,
  getAvailabilityLabel,
  getAvailabilityBadgeColor,
  isProductAvailable,
} from "../hooks";

interface ProductCardProps {
  product: CatalogProduct;
  onQuickView: (product: CatalogProduct) => void;
  onAddToCart?: (product: CatalogProduct) => void;
  viewMode?: "grid" | "list";
}

export function ProductCard({
  product,
  onQuickView,
  onAddToCart,
  viewMode = "grid",
}: ProductCardProps) {
  const savings = calculateSavings(product.listPrice, product.effectivePrice);
  const hasSavings = savings.amount > 0;
  const available = isProductAvailable(product.availability);

  if (viewMode === "list") {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex">
          {/* Image */}
          <div className="relative w-48 h-48 flex-shrink-0 bg-muted">
            {product.primaryImage ? (
              <Image
                src={product.primaryImage}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            {hasSavings && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                {savings.percent.toFixed(0)}% OFF
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    SKU: {product.sku}
                  </p>
                  {product.brand && (
                    <p className="text-sm text-muted-foreground">
                      Brand: {product.brand}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${getAvailabilityBadgeColor(product.availability)}`}
                >
                  {getAvailabilityLabel(product.availability)}
                </span>
              </div>

              {product.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {product.description}
                </p>
              )}
            </div>

            <div className="flex items-end justify-between mt-4">
              {/* Price */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-primary">
                    {formatPrice(product.effectivePrice, product.currency)}
                  </span>
                  {hasSavings && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatPrice(product.listPrice, product.currency)}
                    </span>
                  )}
                </div>
                {hasSavings && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Save {formatPrice(savings.amount, product.currency)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  per {product.uom}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQuickView(product)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Quick View
                </Button>
                {onAddToCart && (
                  <Button
                    size="sm"
                    onClick={() => onAddToCart(product)}
                    disabled={!available}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Add to Cart
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative aspect-square bg-muted">
        {product.primaryImage ? (
          <Image
            src={product.primaryImage}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        {hasSavings && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
            {savings.percent.toFixed(0)}% OFF
          </div>
        )}
        {/* Quick view button overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onQuickView(product)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Quick View
          </Button>
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold line-clamp-2 flex-1">{product.name}</h3>
        </div>

        <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>

        {product.brand && (
          <p className="text-xs text-muted-foreground">{product.brand}</p>
        )}

        {/* Availability badge */}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-2 ${getAvailabilityBadgeColor(product.availability)}`}
        >
          {getAvailabilityLabel(product.availability)}
        </span>

        {/* Price */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-lg font-bold text-primary">
              {formatPrice(product.effectivePrice, product.currency)}
            </span>
            {hasSavings && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.listPrice, product.currency)}
              </span>
            )}
          </div>
          {hasSavings && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              Save {formatPrice(savings.amount, product.currency)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">per {product.uom}</p>
        </div>

        {/* Add to cart button */}
        {onAddToCart && (
          <Button
            className="w-full mt-3"
            size="sm"
            onClick={() => onAddToCart(product)}
            disabled={!available}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Add to Cart
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
