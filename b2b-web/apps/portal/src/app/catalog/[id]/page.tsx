"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@b2b/ui";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  Tag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";

import {
  formatPrice,
  calculateSavings,
  getAvailabilityLabel,
  getAvailabilityBadgeColor,
  isProductAvailable,
  useCatalogProduct,
  useRelatedProducts,
  useUserDiscountTier,
} from "../hooks";

import { Header } from "@/components/layout";

// =============================================================================
// Skeleton Loading
// =============================================================================

function ProductDetailSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Product" />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Back button skeleton */}
          <div className="h-9 w-32 bg-muted rounded animate-pulse mb-6" />

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Gallery Skeleton */}
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg animate-pulse" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 bg-muted rounded animate-pulse"
                  />
                ))}
              </div>
            </div>

            {/* Details Skeleton */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
                <div className="h-5 bg-muted rounded w-1/4 animate-pulse" />
                <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
              </div>
              <div className="h-24 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
                <div className="h-5 bg-muted rounded w-1/4 animate-pulse" />
              </div>
              <div className="h-12 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Image Gallery Component
// =============================================================================

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
        <Package className="h-24 w-24 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
        <Image
          src={images[selectedIndex]}
          alt={`${productName} - Image ${selectedIndex + 1}`}
          fill
          className="object-cover"
          priority
        />
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                selectedIndex === index
                  ? "border-primary"
                  : "border-transparent hover:border-muted-foreground"
              }`}
            >
              <Image
                src={image}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Related Products Component
// =============================================================================

interface RelatedProductsProps {
  productId: string;
}

function RelatedProducts({ productId }: RelatedProductsProps) {
  const { data, isLoading } = useRelatedProducts(productId, 4);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card animate-pulse">
            <div className="aspect-square bg-muted rounded-t-lg" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-5 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-xl font-semibold mb-4">Related Products</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.data.map((product) => (
          <Link
            key={product.id}
            href={`/catalog/${product.id}`}
            className="group"
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
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
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground">{product.sku}</p>
                <div className="mt-2">
                  <span className="font-bold text-primary">
                    {formatPrice(product.effectivePrice || product.listPrice)}
                  </span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-2 ${getAvailabilityBadgeColor(product.availability)}`}
                >
                  {getAvailabilityLabel(product.availability)}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Content Component
// =============================================================================

function ProductDetailContent() {
  const params = useParams();
  const productId = params.id as string;

  const [quantity, setQuantity] = useState(1);

  const {
    data: product,
    isLoading,
    error,
    refetch,
  } = useCatalogProduct(productId);

  const { data: discountTierData } = useUserDiscountTier();

  const handleQuantityChange = useCallback(
    (delta: number) => {
      setQuantity((prev) => {
        const newValue = prev + delta;
        const min = product?.tenantPricing?.minQuantity || 1;
        const max = product?.tenantPricing?.maxQuantity || 999;
        return Math.max(min, Math.min(max, newValue));
      });
    },
    [product]
  );

  const handleAddToCart = useCallback(() => {
    if (product && isProductAvailable(product.availability)) {
      // TODO: Implement add to cart
      console.log("Add to cart:", product.id, "quantity:", quantity);
    }
  }, [product, quantity]);

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Product" />
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <Package className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h2 className="text-lg font-semibold">Product Not Found</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  The product you&apos;re looking for doesn&apos;t exist or is no longer
                  available.
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/catalog">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Catalog
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const savings = calculateSavings(product.listPrice, product.effectivePrice);
  const hasSavings = savings.amount > 0;
  const available = isProductAvailable(product.availability);

  // Combine images
  const allImages = [
    product.primaryImage,
    ...(product.images || []),
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col h-full">
      <Header title="Product" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Back Button */}
          <Button variant="ghost" asChild className="mb-6">
            <Link href="/catalog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Catalog
            </Link>
          </Button>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <ImageGallery images={allImages} productName={product.name} />

            {/* Product Details */}
            <div className="space-y-6">
              {/* Title & SKU */}
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">{product.name}</h1>
                <p className="text-muted-foreground mt-1">SKU: {product.sku}</p>
                {product.brand && (
                  <p className="text-muted-foreground">Brand: {product.brand}</p>
                )}
              </div>

              {/* Availability */}
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getAvailabilityBadgeColor(product.availability)}`}
              >
                {getAvailabilityLabel(product.availability)}
              </span>

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
              )}

              {/* Category */}
              {(product.categoryEntity || product.category) && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Category: </span>
                  <span className="font-medium">
                    {product.categoryEntity?.name || product.category}
                    {product.subcategory && ` > ${product.subcategory}`}
                  </span>
                </div>
              )}

              {/* Pricing Card */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {/* Your Discount Tier */}
                  {discountTierData?.tier && (
                    <div className="flex items-center gap-2 text-sm bg-primary/10 rounded-lg p-3">
                      <Tag className="h-4 w-4 text-primary" />
                      <span>Your tier:</span>
                      <span className="font-semibold text-primary">
                        {discountTierData.tier.name} (
                        {discountTierData.tier.discountPercent}% off)
                      </span>
                    </div>
                  )}

                  {/* Price Display */}
                  <div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-3xl font-bold text-primary">
                        {formatPrice(product.effectivePrice, product.currency)}
                      </span>
                      {hasSavings && (
                        <span className="text-xl text-muted-foreground line-through">
                          {formatPrice(product.listPrice, product.currency)}
                        </span>
                      )}
                    </div>
                    {hasSavings && (
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                        You save {formatPrice(savings.amount, product.currency)}{" "}
                        ({savings.percent.toFixed(0)}%)
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      per {product.uom}
                    </p>
                  </div>

                  {/* Tenant Pricing Details */}
                  {product.tenantPricing && (
                    <div className="border-t pt-4 space-y-2 text-sm">
                      {product.tenantPricing.discountPercent && (
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Tenant Discount:
                          </span>{" "}
                          {product.tenantPricing.discountPercent}%
                        </p>
                      )}
                      {product.tenantPricing.minQuantity && (
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Min. Quantity:
                          </span>{" "}
                          {product.tenantPricing.minQuantity}
                        </p>
                      )}
                      {product.tenantPricing.maxQuantity && (
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Max. Quantity:
                          </span>{" "}
                          {product.tenantPricing.maxQuantity}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quantity & Add to Cart */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Qty:</span>
                      <div className="flex items-center border rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(-1)}
                          disabled={
                            quantity <=
                            (product.tenantPricing?.minQuantity || 1)
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(
                              Math.max(
                                product.tenantPricing?.minQuantity || 1,
                                Math.min(
                                  product.tenantPricing?.maxQuantity || 999,
                                  Number(e.target.value) || 1
                                )
                              )
                            )
                          }
                          className="w-16 text-center border-0"
                          min={product.tenantPricing?.minQuantity || 1}
                          max={product.tenantPricing?.maxQuantity || 999}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleQuantityChange(1)}
                          disabled={
                            quantity >=
                            (product.tenantPricing?.maxQuantity || 999)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={handleAddToCart}
                      disabled={!available}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {available ? "Add to Cart" : "Out of Stock"}
                    </Button>
                  </div>

                  {/* Subtotal */}
                  {available && (
                    <div className="text-right text-sm text-muted-foreground pt-2">
                      Subtotal:{" "}
                      <span className="font-semibold text-foreground">
                        {formatPrice(
                          parseFloat(product.effectivePrice) * quantity,
                          product.currency
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Specs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">SKU</dt>
                      <dd className="font-medium">{product.sku}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Unit</dt>
                      <dd className="font-medium">{product.uom}</dd>
                    </div>
                    {product.brand && (
                      <div>
                        <dt className="text-muted-foreground">Brand</dt>
                        <dd className="font-medium">{product.brand}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="font-medium capitalize">
                        {product.status.toLowerCase()}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Related Products */}
          <RelatedProducts productId={productId} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function ProductDetailPage() {
  return (
    <RequireAuth fallback={<ProductDetailSkeleton />} redirectTo="/login">
      <ProductDetailContent />
    </RequireAuth>
  );
}
