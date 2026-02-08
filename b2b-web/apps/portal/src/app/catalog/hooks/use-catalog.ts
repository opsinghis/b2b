"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export type ProductStatus = "ACTIVE" | "DISCONTINUED" | "ARCHIVED";
export type Availability =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "PREORDER"
  | "DISCONTINUED";

export interface ProductCategoryDto {
  id: string;
  name: string;
  slug: string;
}

export interface TenantPricingDto {
  agreedPrice?: string | null;
  discountPercent?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  uom: string;
  listPrice: string;
  effectivePrice: string;
  discountedPrice?: string | null;
  currency: string;
  status: ProductStatus;
  availability: Availability;
  primaryImage?: string | null;
  images?: string[];
  categoryEntity?: ProductCategoryDto | null;
  tenantPricing?: TenantPricingDto | null;
  hasAccess: boolean;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  children?: CategoryDto[];
}

export interface ProductsQueryParams {
  search?: string;
  category?: string;
  categoryId?: string;
  subcategory?: string;
  brand?: string;
  status?: ProductStatus;
  availability?: Availability;
  minPrice?: number;
  maxPrice?: number;
  accessOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  data: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoriesResponse {
  data: CategoryDto[];
  total: number;
}

export interface RelatedProduct {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  listPrice: string;
  effectivePrice?: string;
  primaryImage?: string | null;
  availability: Availability;
}

export interface RelatedProductsResponse {
  data: RelatedProduct[];
  relationType: string;
}

export interface SearchSuggestion {
  type: Record<string, never>;
  text: string;
  id?: string;
  count?: number;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
}

export interface DiscountTierDto {
  id: string;
  name: string;
  discountPercent: string;
  minSpend?: string | null;
  description?: string | null;
}

export interface UserDiscountTierResponse {
  userId: string;
  tier: DiscountTierDto;
  assignedAt: string;
}

// =============================================================================
// Constants
// =============================================================================

export const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "IN_STOCK", label: "In Stock" },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "PREORDER", label: "Pre-order" },
  { value: "DISCONTINUED", label: "Discontinued" },
];

// =============================================================================
// Hooks
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

export function useCatalogProducts(params: ProductsQueryParams = {}) {
  const client = useApiClient();
  const { user } = useAuth();
  const {
    page = 1,
    limit = 12,
    search,
    category,
    categoryId,
    subcategory,
    brand,
    status,
    availability,
    minPrice,
    maxPrice,
    accessOnly = true,
  } = params;

  return useQuery({
    queryKey: [
      "catalog-products",
      {
        page,
        limit,
        search,
        category,
        categoryId,
        subcategory,
        brand,
        status,
        availability,
        minPrice,
        maxPrice,
        accessOnly,
      },
    ],
    queryFn: async (): Promise<ProductsResponse> => {
      const { data, error } = await client.GET("/api/v1/catalog/products", {
        params: {
          query: {
            page,
            limit,
            search: search || undefined,
            category: category || undefined,
            categoryId: categoryId || undefined,
            subcategory: subcategory || undefined,
            brand: brand || undefined,
            status: status || undefined,
            availability: availability || undefined,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            accessOnly,
          },
        },
      });
      if (error) throw new Error("Failed to fetch products");
      return data as unknown as ProductsResponse;
    },
    enabled: !!user?.tenantId,
  });
}

export function useCatalogProduct(id: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["catalog-products", id],
    queryFn: async (): Promise<CatalogProduct> => {
      const { data, error } = await client.GET("/api/v1/catalog/products/{id}", {
        params: {
          path: { id },
        },
      });
      if (error) throw new Error("Failed to fetch product");
      return data as unknown as CatalogProduct;
    },
    enabled: !!id && !!user?.tenantId,
  });
}

export function useRelatedProducts(productId: string, limit: number = 4) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["catalog-products", productId, "related", limit],
    queryFn: async (): Promise<RelatedProductsResponse> => {
      const { data, error } = await client.GET(
        "/api/v1/catalog/products/{id}/related",
        {
          params: {
            path: { id: productId },
            query: { limit },
          },
        }
      );
      if (error) throw new Error("Failed to fetch related products");
      return data as unknown as RelatedProductsResponse;
    },
    enabled: !!productId && !!user?.tenantId,
  });
}

export function useCategories() {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["catalog-categories"],
    queryFn: async (): Promise<CategoriesResponse> => {
      const { data, error } = await client.GET("/api/v1/catalog/categories");
      if (error) throw new Error("Failed to fetch categories");
      return data as unknown as CategoriesResponse;
    },
    enabled: !!user?.tenantId,
  });
}

export function useSearchSuggestions(query: string, limit: number = 10) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["catalog-search-suggestions", query, limit],
    queryFn: async (): Promise<SearchSuggestionsResponse> => {
      const { data, error } = await client.GET(
        "/api/v1/catalog/search/suggestions",
        {
          params: {
            query: { q: query, limit },
          },
        }
      );
      if (error) throw new Error("Failed to fetch suggestions");
      return data as unknown as SearchSuggestionsResponse;
    },
    enabled: !!query && query.length >= 2 && !!user?.tenantId,
  });
}

export function useUserDiscountTier() {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-discount-tier"],
    queryFn: async (): Promise<UserDiscountTierResponse | null> => {
      const { data, error } = await client.GET(
        "/api/v1/api/v1/users/me/discount-tier"
      );
      if (error) {
        // User might not have a discount tier, return null instead of throwing
        return null;
      }
      return data as unknown as UserDiscountTierResponse;
    },
    enabled: !!user?.tenantId,
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatPrice(
  value: string | number,
  currency: string = "USD"
): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(numValue);
}

export function calculateSavings(
  listPrice: string,
  effectivePrice: string
): { amount: number; percent: number } {
  const list = parseFloat(listPrice);
  const effective = parseFloat(effectivePrice);
  const amount = list - effective;
  const percent = list > 0 ? (amount / list) * 100 : 0;
  return { amount, percent };
}

export function getAvailabilityLabel(availability: Availability): string {
  const option = AVAILABILITY_OPTIONS.find((o) => o.value === availability);
  return option?.label || availability;
}

export function getAvailabilityBadgeColor(availability: Availability): string {
  switch (availability) {
    case "IN_STOCK":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "LOW_STOCK":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "OUT_OF_STOCK":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "PREORDER":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "DISCONTINUED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export function isProductAvailable(availability: Availability): boolean {
  return availability === "IN_STOCK" || availability === "LOW_STOCK";
}
