"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, Card, CardContent } from "@b2b/ui";
import { Menu, RefreshCw, Tag, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  CategorySidebar,
  Pagination,
  ProductFilters,
  ProductFiltersState,
  ProductGrid,
  ProductQuickView,
  ProductSearch,
  ViewMode,
  ViewToggle,
} from "./components";
import {
  CatalogProduct,
  useCatalogProducts,
  useCategories,
  useUserDiscountTier,
} from "./hooks";

import { Header } from "@/components/layout";

// =============================================================================
// Skeleton Loading
// =============================================================================

function CatalogPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Catalog" />
      <div className="flex-1 p-6">
        <div className="flex gap-6">
          {/* Sidebar Skeleton */}
          <div className="hidden lg:block w-64 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
          {/* Main Content Skeleton */}
          <div className="flex-1 space-y-4">
            <div className="h-10 bg-muted rounded w-full max-w-md animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card animate-pulse">
                  <div className="aspect-square bg-muted rounded-t-lg" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-6 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Content Component
// =============================================================================

function CatalogContent() {
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Category filter
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

  // Filters state
  const [filters, setFilters] = useState<ProductFiltersState>({});

  // Pagination state
  const [page, setPage] = useState(1);
  const limit = 12;

  // Quick view state
  const [quickViewProduct, setQuickViewProduct] = useState<CatalogProduct | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategoryId, filters.availability, filters.minPrice, filters.maxPrice]);

  // Fetch data
  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useCatalogProducts({
    page,
    limit,
    search: debouncedSearch || undefined,
    categoryId: selectedCategoryId,
    availability: filters.availability,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();

  const { data: discountTierData } = useUserDiscountTier();

  // Handlers
  const handleQuickView = useCallback((product: CatalogProduct) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  }, []);

  const handleAddToCart = useCallback((product: CatalogProduct) => {
    // TODO: Implement add to cart functionality
    console.log("Add to cart:", product.id);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handleCategorySelect = useCallback((categoryId: string | undefined) => {
    setSelectedCategoryId(categoryId);
    setSidebarOpen(false);
  }, []);

  const hasActiveFilters =
    debouncedSearch ||
    selectedCategoryId ||
    filters.availability ||
    filters.minPrice ||
    filters.maxPrice;

  const handleClearAll = useCallback(() => {
    setSearch("");
    setSelectedCategoryId(undefined);
    setFilters({});
    setPage(1);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Header title="Catalog" />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
            w-64 bg-card border-r transform transition-transform
            lg:transform-none
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="flex items-center justify-between p-4 lg:hidden border-b">
            <h2 className="font-semibold">Categories</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100%-65px)] lg:h-full">
            <CategorySidebar
              categories={categoriesData?.data || []}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleCategorySelect}
              isLoading={categoriesLoading}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header Bar */}
          <div className="p-4 lg:p-6 border-b bg-card">
            <div className="flex flex-col gap-4">
              {/* Search and View Toggle Row */}
              <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open categories</span>
                </Button>

                {/* Search */}
                <ProductSearch
                  value={search}
                  onChange={setSearch}
                  placeholder="Search products..."
                />

                {/* View Toggle */}
                <ViewToggle viewMode={viewMode} onChange={setViewMode} />
              </div>

              {/* Filters Row */}
              <ProductFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClear={handleClearFilters}
              />

              {/* Discount Tier Info */}
              {discountTierData?.tier && (
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Your tier:</span>
                  <span className="font-medium text-primary">
                    {discountTierData.tier.name} ({discountTierData.tier.discountPercent}% off)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Products Area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  Active filters:
                </span>
                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                    Search: &quot;{debouncedSearch}&quot;
                  </span>
                )}
                {selectedCategoryId && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                    Category selected
                  </span>
                )}
                {filters.availability && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                    Availability: {filters.availability}
                  </span>
                )}
                {(filters.minPrice || filters.maxPrice) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                    Price: ${filters.minPrice || 0} - ${filters.maxPrice || "∞"}
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  Clear all
                </Button>
              </div>
            )}

            {/* Error State */}
            {productsError && (
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="flex items-center justify-between p-4">
                  <p className="text-sm text-destructive">
                    Failed to load products. Please try again.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchProducts()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Products Grid/List */}
            {!productsError && (
              <ProductGrid
                products={productsData?.data || []}
                viewMode={viewMode}
                isLoading={productsLoading && !productsData}
                onQuickView={handleQuickView}
                onAddToCart={handleAddToCart}
              />
            )}

            {/* Pagination */}
            {productsData && productsData.totalPages > 0 && (
              <div className="mt-6">
                <Pagination
                  page={productsData.page}
                  totalPages={productsData.totalPages}
                  total={productsData.total}
                  limit={productsData.limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Quick View Modal */}
      <ProductQuickView
        product={quickViewProduct}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

// =============================================================================
// Page Export
// =============================================================================

export default function CatalogPage() {
  return (
    <RequireAuth fallback={<CatalogPageSkeleton />} redirectTo="/login">
      <CatalogContent />
    </RequireAuth>
  );
}
