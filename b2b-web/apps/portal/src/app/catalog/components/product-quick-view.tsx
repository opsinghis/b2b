"use client";

import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@b2b/ui";
import { ExternalLink, Package, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  CatalogProduct,
  formatPrice,
  calculateSavings,
  getAvailabilityLabel,
  getAvailabilityBadgeColor,
  isProductAvailable,
} from "../hooks";

interface ProductQuickViewProps {
  product: CatalogProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart?: (product: CatalogProduct) => void;
}

export function ProductQuickView({
  product,
  open,
  onOpenChange,
  onAddToCart,
}: ProductQuickViewProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!product) return null;

  const savings = calculateSavings(product.listPrice, product.effectivePrice);
  const hasSavings = savings.amount > 0;
  const available = isProductAvailable(product.availability);

  // Combine primary image with additional images
  const allImages = [
    product.primaryImage,
    ...(product.images || []),
  ].filter(Boolean) as string[];

  const currentImage = allImages[selectedImageIndex] || null;

  const handleAddToCart = () => {
    if (onAddToCart && available) {
      onAddToCart(product);
      onOpenChange(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-3xl">
        <ModalHeader>
          <ModalTitle className="line-clamp-1">{product.name}</ModalTitle>
          <ModalDescription>
            SKU: {product.sku}
            {product.brand && ` | Brand: ${product.brand}`}
          </ModalDescription>
        </ModalHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {currentImage ? (
                <Image
                  src={currentImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-20 w-20 text-muted-foreground" />
                </div>
              )}
              {hasSavings && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-sm font-semibold px-3 py-1 rounded">
                  {savings.percent.toFixed(0)}% OFF
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                      selectedImageIndex === index
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            {/* Availability Badge */}
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getAvailabilityBadgeColor(product.availability)}`}
            >
              {getAvailabilityLabel(product.availability)}
            </span>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-4">
                {product.description}
              </p>
            )}

            {/* Category */}
            {(product.categoryEntity || product.category) && (
              <div className="text-sm">
                <span className="text-muted-foreground">Category: </span>
                <span className="font-medium">
                  {product.categoryEntity?.name || product.category}
                </span>
              </div>
            )}

            {/* Pricing */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(product.effectivePrice, product.currency)}
                </span>
                {hasSavings && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.listPrice, product.currency)}
                  </span>
                )}
              </div>
              {hasSavings && (
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  You save {formatPrice(savings.amount, product.currency)} (
                  {savings.percent.toFixed(0)}%)
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                per {product.uom}
              </p>
            </div>

            {/* Tenant Pricing Info */}
            {product.tenantPricing && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">Your Special Pricing</p>
                {product.tenantPricing.discountPercent && (
                  <p className="text-xs text-muted-foreground">
                    {product.tenantPricing.discountPercent}% tenant discount
                    applied
                  </p>
                )}
                {product.tenantPricing.minQuantity && (
                  <p className="text-xs text-muted-foreground">
                    Min. quantity: {product.tenantPricing.minQuantity}
                  </p>
                )}
                {product.tenantPricing.maxQuantity && (
                  <p className="text-xs text-muted-foreground">
                    Max. quantity: {product.tenantPricing.maxQuantity}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <ModalFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href={`/catalog/${product.id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Details
            </Link>
          </Button>
          {onAddToCart && (
            <Button
              onClick={handleAddToCart}
              disabled={!available}
              className="flex-1 sm:flex-none"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
