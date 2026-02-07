"use client";

import type { CreateMasterProductDto } from "@b2b/api-client";
import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button, Input } from "@b2b/ui";
import { Plus, Search, RefreshCw, Upload } from "lucide-react";
import * as React from "react";

import {
  ProductTable,
  ProductFilters,
  Pagination,
  CreateProductModal,
  ImportProductsModal,
} from "./components";
import {
  useProducts,
  useCreateProduct,
  useUpdateProductStatus,
  useDeleteProduct,
  useImportProducts,
  type ProductStatus,
} from "./hooks/use-products";

import { Header } from "@/components/layout";

function CatalogContent() {
  const { hasRole } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [categoryFilter, setCategoryFilter] = React.useState<
    string | undefined
  >();
  const [brandFilter, setBrandFilter] = React.useState<string | undefined>();
  const [statusFilter, setStatusFilter] = React.useState<
    ProductStatus | undefined
  >();
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const limit = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [categoryFilter, brandFilter, statusFilter]);

  const { data, isLoading, error, refetch } = useProducts({
    search: debouncedSearch,
    page,
    limit,
    category: categoryFilter,
    brand: brandFilter,
    status: statusFilter,
  });

  const createMutation = useCreateProduct();
  const updateStatusMutation = useUpdateProductStatus();
  const deleteMutation = useDeleteProduct();
  const importMutation = useImportProducts();

  const handleCreateProduct = async (productData: CreateMasterProductDto) => {
    try {
      await createMutation.mutateAsync(productData);
      setIsCreateModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleUpdateStatus = async (id: string, status: ProductStatus) => {
    const statusLabel =
      status === "ACTIVE"
        ? "activate"
        : status === "DISCONTINUED"
          ? "discontinue"
          : "archive";
    if (!confirm(`Are you sure you want to ${statusLabel} this product?`)) {
      return;
    }
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleImport = async (file: File) => {
    return importMutation.mutateAsync(file);
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Master Catalog" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">
              Access Denied
            </h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access the master catalog. This
              feature is only available to Admins.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Master Catalog" />
      <div className="flex-1 p-6 space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <ProductFilters
              categoryFilter={categoryFilter}
              brandFilter={brandFilter}
              statusFilter={statusFilter}
              onCategoryChange={setCategoryFilter}
              onBrandChange={setBrandFilter}
              onStatusChange={setStatusFilter}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Product
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load products. Please try again.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !data && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Table */}
        {data && (
          <>
            <ProductTable
              products={data.data}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              isUpdating={
                updateStatusMutation.isPending || deleteMutation.isPending
              }
            />
            {data.totalPages > 1 && (
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Create Modal */}
        <CreateProductModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateProduct}
          isLoading={createMutation.isPending}
        />

        {/* Import Modal */}
        <ImportProductsModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
          onSubmit={handleImport}
          isLoading={importMutation.isPending}
        />
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Master Catalog" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">
                Access Denied
              </h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access the master catalog. This
                feature is only available to Admins.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <CatalogContent />
    </RequireAuth>
  );
}
