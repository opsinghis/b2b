"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button, Input } from "@b2b/ui";
import { Plus, Search, RefreshCw, Upload } from "lucide-react";
import * as React from "react";

import {
  DiscountTierTable,
  CreateTierModal,
  AssignTierModal,
  BulkAssignModal,
  TierFilters,
  Pagination,
} from "./components";
import {
  useDiscountTiers,
  useCreateDiscountTier,
  useToggleDiscountTierStatus,
  useDeleteDiscountTier,
  useAssignTier,
  useUnassignTier,
  useTierAssignments,
  useBulkAssignTier,
  type DiscountTier,
  type TierLevel,
  type CreateDiscountTierDto,
} from "./hooks/use-discount-tiers";

import { useOrganizations } from "@/app/organizations/hooks/use-organizations";
import { useUsers } from "@/app/users/hooks/use-users";
import { Header } from "@/components/layout";

function DiscountTiersContent() {
  const { hasRole } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [levelFilter, setLevelFilter] = React.useState<TierLevel | "">("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [selectedTierForAssign, setSelectedTierForAssign] = React.useState<DiscountTier | null>(null);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = React.useState(false);
  const limit = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Map status filter to isActive
  const isActive = statusFilter === "all" ? undefined : statusFilter === "active";

  const { data, isLoading, error, refetch } = useDiscountTiers({
    search: debouncedSearch,
    page,
    limit,
    level: levelFilter || undefined,
    isActive,
  });

  // Fetch users and organizations for assignment
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: organizationsData } = useOrganizations({ limit: 100 });

  const users = usersData?.data || [];
  const organizations = organizationsData?.data || [];

  // Mutations
  const createMutation = useCreateDiscountTier();
  const toggleStatusMutation = useToggleDiscountTierStatus();
  const deleteMutation = useDeleteDiscountTier();
  const bulkAssignMutation = useBulkAssignTier();

  // Tier assignments for selected tier
  const { data: assignmentsData, refetch: refetchAssignments } = useTierAssignments(
    selectedTierForAssign?.id || "",
    { limit: 100 }
  );
  const assignMutation = useAssignTier(selectedTierForAssign?.id || "");
  const unassignMutation = useUnassignTier(selectedTierForAssign?.id || "");

  const handleCreateTier = async (tierData: CreateDiscountTierDto) => {
    try {
      await createMutation.mutateAsync(tierData);
      setIsCreateModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    if (!confirm(`Are you sure you want to ${isActive ? "activate" : "deactivate"} this tier?`)) {
      return;
    }
    toggleStatusMutation.mutate({ id, isActive });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tier? This action cannot be undone.")) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleOpenAssignModal = (tier: DiscountTier) => {
    setSelectedTierForAssign(tier);
  };

  const handleAssign = async (userIds: string[], _organizationIds: string[]) => {
    // API assigns one user at a time
    try {
      for (const userId of userIds) {
        await assignMutation.mutateAsync({ userId });
      }
      refetchAssignments();
    } catch {
      // Error handled by mutation
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) {
      return;
    }
    try {
      await unassignMutation.mutateAsync(assignmentId);
      refetchAssignments();
    } catch {
      // Error handled by mutation
    }
  };

  const handleBulkAssign = async (
    tierId: string,
    userIds: string[],
    _organizationIds: string[]
  ) => {
    try {
      await bulkAssignMutation.mutateAsync({
        tierId,
        userIds,
      });
    } catch {
      // Error handled by mutation
    }
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Discount Tiers" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access discount tier management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Discount Tiers" />
      <div className="flex-1 p-6 space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tiers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <TierFilters
              level={levelFilter}
              onLevelChange={setLevelFilter}
              status={statusFilter}
              onStatusChange={setStatusFilter}
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
            <Button variant="outline" onClick={() => setIsBulkAssignModalOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Assign
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tier
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load discount tiers. Please try again.
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
            <DiscountTierTable
              tiers={data.data}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onAssign={handleOpenAssignModal}
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
        <CreateTierModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateTier}
          isLoading={createMutation.isPending}
        />

        {/* Assign Modal */}
        {selectedTierForAssign && (
          <AssignTierModal
            open={!!selectedTierForAssign}
            onOpenChange={(open) => !open && setSelectedTierForAssign(null)}
            tier={selectedTierForAssign}
            assignments={assignmentsData?.data || []}
            users={users.map((u) => ({
              id: u.id,
              firstName: u.firstName || "",
              lastName: u.lastName || "",
              email: u.email,
            }))}
            organizations={organizations.map((o) => ({
              id: o.id,
              name: o.name,
            }))}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
            isLoading={assignMutation.isPending || unassignMutation.isPending}
          />
        )}

        {/* Bulk Assign Modal */}
        <BulkAssignModal
          open={isBulkAssignModalOpen}
          onOpenChange={setIsBulkAssignModalOpen}
          tiers={data?.data || []}
          users={users.map((u) => ({
            id: u.id,
            firstName: u.firstName || "",
            lastName: u.lastName || "",
            email: u.email,
          }))}
          organizations={organizations.map((o) => ({
            id: o.id,
            name: o.name,
          }))}
          onBulkAssign={handleBulkAssign}
          isLoading={bulkAssignMutation.isPending}
        />
      </div>
    </div>
  );
}

export default function DiscountTiersPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Discount Tiers" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access discount tier management.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <DiscountTiersContent />
    </RequireAuth>
  );
}
