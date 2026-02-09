"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@b2b/ui";
import {
  Plus,
  Search,
  RefreshCw,
  List,
  GitBranch,
} from "lucide-react";
import * as React from "react";

import {
  OrganizationTable,
  OrganizationTree,
  CreateOrganizationModal,
  Pagination,
} from "./components";
import {
  useOrganizations,
  useOrganizationHierarchy,
  useCreateOrganization,
  useToggleOrganizationStatus,
  useDeleteOrganization,
} from "./hooks/use-organizations";

import { Header } from "@/components/layout";

type ViewMode = "list" | "tree";

function OrganizationsContent() {
  const { hasRole } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const limit = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch organizations list (for table view and create modal parent selection)
  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
    refetch: refetchList,
  } = useOrganizations({
    search: debouncedSearch,
    page,
    limit,
  });

  // Fetch all organizations for parent selection in create modal
  const { data: allOrgsData } = useOrganizations({
    limit: 100, // Get all for parent selection
  });

  // Fetch organization hierarchy (for tree view)
  const {
    data: hierarchyData,
    isLoading: isHierarchyLoading,
    error: hierarchyError,
    refetch: refetchHierarchy,
  } = useOrganizationHierarchy();

  const createMutation = useCreateOrganization();
  const toggleStatusMutation = useToggleOrganizationStatus();
  const deleteMutation = useDeleteOrganization();

  const handleCreateOrganization = async (
    orgData: Parameters<typeof createMutation.mutate>[0]
  ) => {
    try {
      await createMutation.mutateAsync(orgData);
      setIsCreateModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    if (
      !confirm(
        `Are you sure you want to ${isActive ? "activate" : "deactivate"} this organization?`
      )
    ) {
      return;
    }
    toggleStatusMutation.mutate({ id, isActive });
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this organization? This action cannot be undone."
      )
    ) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleRefresh = () => {
    refetchList();
    refetchHierarchy();
  };

  const isLoading = viewMode === "list" ? isListLoading : isHierarchyLoading;
  const error = viewMode === "list" ? listError : hierarchyError;
  const isUpdating =
    toggleStatusMutation.isPending || deleteMutation.isPending;

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Organizations" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">
              Access Denied
            </h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access organization management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Organizations" />
      <div className="flex-1 p-6 space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button
                variant={viewMode === "tree" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tree")}
                className="rounded-l-none"
              >
                <GitBranch className="h-4 w-4 mr-1" />
                Tree
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Organization
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load organizations. Please try again.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !listData && !hierarchyData && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && listData && (
          <>
            <OrganizationTable
              organizations={listData.data}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              isUpdating={isUpdating}
            />
            {listData.totalPages > 1 && (
              <Pagination
                currentPage={listData.page}
                totalPages={listData.totalPages}
                total={listData.total}
                limit={listData.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Tree View */}
        {viewMode === "tree" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Organization Hierarchy
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isHierarchyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : hierarchyData ? (
                <OrganizationTree hierarchy={hierarchyData} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hierarchy data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Modal */}
        <CreateOrganizationModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateOrganization}
          isLoading={createMutation.isPending}
          organizations={allOrgsData?.data || []}
        />
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Organizations" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">
                Access Denied
              </h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access organization management.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <OrganizationsContent />
    </RequireAuth>
  );
}
