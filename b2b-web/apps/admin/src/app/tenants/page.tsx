"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button, Input } from "@b2b/ui";
import { Plus, Search, RefreshCw } from "lucide-react";
import * as React from "react";

import {
  TenantTable,
  CreateTenantModal,
  Pagination,
} from "./components";
import {
  useTenants,
  useCreateTenant,
  useToggleTenantStatus,
  useDeleteTenant,
} from "./hooks/use-tenants";

import { Header } from "@/components/layout";

function TenantsContent() {
  const { hasRole } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const limit = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, error, refetch } = useTenants({
    search: debouncedSearch,
    page,
    limit,
  });

  const createMutation = useCreateTenant();
  const toggleStatusMutation = useToggleTenantStatus();
  const deleteMutation = useDeleteTenant();

  const handleCreateTenant = async (tenantData: Parameters<typeof createMutation.mutate>[0]) => {
    try {
      await createMutation.mutateAsync(tenantData);
      setIsCreateModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    if (!confirm(`Are you sure you want to ${isActive ? "activate" : "deactivate"} this tenant?`)) {
      return;
    }
    toggleStatusMutation.mutate({ id, isActive });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) {
      return;
    }
    deleteMutation.mutate(id);
  };

  // Check super admin access
  if (!hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tenants" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access tenant management. This feature is only available to Super Admins.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Tenants" />
      <div className="flex-1 p-6 space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tenant
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load tenants. Please try again.
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
            <TenantTable
              tenants={data.data}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              isUpdating={toggleStatusMutation.isPending || deleteMutation.isPending}
            />
            {data.meta.totalPages > 1 && (
              <Pagination
                currentPage={data.meta.page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                limit={data.meta.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Create Modal */}
        <CreateTenantModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateTenant}
          isLoading={createMutation.isPending}
        />
      </div>
    </div>
  );
}

export default function TenantsPage() {
  return (
    <RequireAuth
      roles="SUPER_ADMIN"
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Tenants" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access tenant management. This feature is only available to Super Admins.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <TenantsContent />
    </RequireAuth>
  );
}
