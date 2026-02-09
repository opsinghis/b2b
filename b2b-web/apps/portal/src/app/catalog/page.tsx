"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, Card, CardContent } from "@b2b/ui";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Package,
  RefreshCw,
  Search,
  Tag,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  Pagination,
  ProductFilters,
  ProductFiltersState,
  ProductGrid,
  ProductQuickView,
  ViewMode,
  ViewToggle,
} from "./components";
import {
  CatalogProduct,
  CategoryDto,
  useCatalogProducts,
  useCategories,
  useUserDiscountTier,
} from "./hooks";

import { useAddProductToCart } from "@/app/cart/hooks";

// =============================================================================
// Categories Sidebar Component
// =============================================================================

function CategoriesSidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading,
}: {
  categories: CategoryDto[];
  selectedCategoryId?: string;
  onSelectCategory: (id: string | undefined) => void;
  isLoading: boolean;
}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleExpanded = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Sort categories by product count descending
  const sortedCategories = [...categories]
    .filter((c) => !c.parentId)
    .sort((a, b) => b.productCount - a.productCount);

  // Take top categories for display
  const displayCategories = sortedCategories.slice(0, 30);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* All Products */}
      <button
        onClick={() => onSelectCategory(undefined)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
          !selectedCategoryId
            ? "bg-primary text-primary-foreground font-medium"
            : "hover:bg-muted"
        }`}
      >
        <span>All Products</span>
        <span className="text-xs opacity-70">
          {categories.reduce((sum, c) => sum + c.productCount, 0)}
        </span>
      </button>

      {/* Category List */}
      {displayCategories.map((category) => {
        const hasChildren =
          category.children && category.children.length > 0;
        const isExpanded = expandedCategories.has(category.id);
        const isSelected = selectedCategoryId === category.id;

        return (
          <div key={category.id}>
            <button
              onClick={() => {
                onSelectCategory(category.id);
                if (hasChildren) {
                  toggleExpanded(category.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                {hasChildren && (
                  <span className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </span>
                )}
                <span className="truncate">{category.name}</span>
              </span>
              <span className="text-xs opacity-70 flex-shrink-0 ml-2">
                {category.productCount}
              </span>
            </button>

            {/* Subcategories */}
            {hasChildren && isExpanded && (
              <div className="ml-4 mt-1 space-y-1">
                {category.children!.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSelectCategory(child.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors ${
                      selectedCategoryId === child.id
                        ? "bg-primary/80 text-primary-foreground font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{child.name}</span>
                    <span className="text-xs opacity-70">
                      {child.productCount}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {sortedCategories.length > 30 && (
        <p className="text-xs text-muted-foreground px-3 pt-2">
          +{sortedCategories.length - 30} more categories
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Main Catalog Content
// =============================================================================

function CatalogContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >();
  const [filters, setFilters] = useState<ProductFiltersState>({});
  const [page, setPage] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const limit = 12;
  const [quickViewProduct, setQuickViewProduct] =
    useState<CatalogProduct | null>(null);
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
  }, [
    selectedCategoryId,
    filters.availability,
    filters.minPrice,
    filters.maxPrice,
  ]);

  // Check URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("category");
    const searchParam = params.get("search");

    if (categoryId) setSelectedCategoryId(categoryId);
    if (searchParam) {
      setSearch(searchParam);
      setDebouncedSearch(searchParam);
    }
  }, []);

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
  const { addProduct } = useAddProductToCart();

  const handleQuickView = useCallback((product: CatalogProduct) => {
    setQuickViewProduct(product);
    setQuickViewOpen(true);
  }, []);

  const handleAddToCart = useCallback(
    (product: CatalogProduct) => {
      addProduct({
        id: product.id,
        name: product.name,
        sku: product.sku,
        effectivePrice: product.effectivePrice,
        quantity: 1,
      });
    },
    [addProduct]
  );

  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const handleClearAll = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategoryId(undefined);
    setFilters({});
    setPage(1);
    // Clear URL
    window.history.pushState({}, "", "/catalog");
  }, []);

  const handleSelectCategory = useCallback((id: string | undefined) => {
    setSelectedCategoryId(id);
    setPage(1);
    // Update URL
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("category", id);
    } else {
      url.searchParams.delete("category");
    }
    window.history.pushState({}, "", url.toString());
    // Close mobile sidebar
    setShowMobileSidebar(false);
  }, []);

  const hasActiveFilters =
    debouncedSearch ||
    selectedCategoryId ||
    filters.availability ||
    filters.minPrice ||
    filters.maxPrice;

  // Find selected category name
  const selectedCategory = categoriesData?.data?.find(
    (c) => c.id === selectedCategoryId
  );

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-card overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <h2 className="font-semibold text-lg mb-4">Categories</h2>
          <CategoriesSidebar
            categories={categoriesData?.data || []}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={handleSelectCategory}
            isLoading={categoriesLoading}
          />
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowMobileSidebar(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-72 bg-card shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Categories</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileSidebar(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CategoriesSidebar
                categories={categoriesData?.data || []}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
                isLoading={categoriesLoading}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 lg:p-6 border-b bg-card space-y-4">
          {/* Search and View Toggle Row */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setShowMobileSidebar(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Categories
            </Button>

            {/* Search */}
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* View Toggle */}
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <ProductFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClear={handleClearFilters}
            />

            {/* Discount Tier Info */}
            {discountTierData?.tier && (
              <div className="flex items-center gap-2 text-sm ml-auto">
                <Tag className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Your tier:</span>
                <span className="font-medium text-primary">
                  {discountTierData.tier.name} (
                  {discountTierData.tier.discountPercent}% off)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Products Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Current Category & Results Summary */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">
                {selectedCategory ? selectedCategory.name : "All Products"}
              </h1>
              {productsData && (
                <p className="text-sm text-muted-foreground">
                  {productsData.total.toLocaleString()} products found
                </p>
              )}
            </div>

            {/* Active Filters Chips */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                {debouncedSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                    &quot;{debouncedSearch}&quot;
                    <button onClick={() => setSearch("")}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.availability && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                    {filters.availability}
                    <button
                      onClick={() => setFilters((f) => ({ ...f, availability: undefined }))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {(filters.minPrice || filters.maxPrice) && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm">
                    ${filters.minPrice || 0} - ${filters.maxPrice || "∞"}
                    <button
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          minPrice: undefined,
                          maxPrice: undefined,
                        }))
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {/* Error State */}
          {productsError && (
            <Card className="border-destructive/50 bg-destructive/10 mb-4">
              <CardContent className="flex items-center justify-between p-4">
                <p className="text-sm text-destructive">
                  Failed to load products. Please try again.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchProducts()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!productsError &&
            !productsLoading &&
            productsData?.data?.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold">No Products Found</h2>
                <p className="text-muted-foreground mt-2">
                  Try adjusting your search or filters
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={handleClearAll}
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            )}

          {/* Products Grid/List */}
          {!productsError && (productsData?.data?.length ?? 0) > 0 && (
            <ProductGrid
              products={productsData?.data || []}
              viewMode={viewMode}
              isLoading={productsLoading && !productsData}
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
            />
          )}

          {/* Loading State */}
          {productsLoading && !productsData && (
            <ProductGrid
              products={[]}
              viewMode={viewMode}
              isLoading={true}
              onQuickView={handleQuickView}
              onAddToCart={handleAddToCart}
            />
          )}

          {/* Pagination */}
          {productsData && productsData.totalPages > 1 && (
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
// Skeleton Loading
// =============================================================================

function CatalogPageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar Skeleton */}
      <aside className="hidden lg:block w-64 border-r bg-card p-4">
        <div className="h-6 bg-muted rounded w-24 mb-4 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main className="flex-1 p-6">
        <div className="h-10 bg-muted rounded w-full max-w-md mb-6 animate-pulse" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-6 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
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
