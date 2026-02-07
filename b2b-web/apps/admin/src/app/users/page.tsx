"use client";

import type { CreateUserDto, UserResponseDto } from "@b2b/api-client";
import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button, Input } from "@b2b/ui";
import { Plus, Search, RefreshCw } from "lucide-react";
import * as React from "react";

import {
  UserTable,
  CreateUserModal,
  ResetPasswordModal,
  UserFilters,
  Pagination,
} from "./components";
import {
  useUsers,
  useCreateUser,
  useToggleUserStatus,
  useDeleteUser,
  useResetUserPassword,
  type UserRole,
} from "./hooks/use-users";

import { Header } from "@/components/layout";

function UsersContent() {
  const { hasRole } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [roleFilter, setRoleFilter] = React.useState<UserRole | undefined>();
  const [statusFilter, setStatusFilter] = React.useState<boolean | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [resetPasswordUser, setResetPasswordUser] = React.useState<UserResponseDto | null>(null);
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
  }, [roleFilter, statusFilter]);

  const { data, isLoading, error, refetch } = useUsers({
    search: debouncedSearch,
    page,
    limit,
    role: roleFilter,
    isActive: statusFilter,
  });

  const createMutation = useCreateUser();
  const toggleStatusMutation = useToggleUserStatus();
  const deleteMutation = useDeleteUser();
  const resetPasswordMutation = useResetUserPassword();

  const handleCreateUser = async (userData: CreateUserDto) => {
    try {
      await createMutation.mutateAsync(userData);
      setIsCreateModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    if (
      !confirm(
        `Are you sure you want to ${isActive ? "activate" : "deactivate"} this user?`
      )
    ) {
      return;
    }
    toggleStatusMutation.mutate({ id, isActive });
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleResetPasswordClick = (userId: string) => {
    const user = data?.data.find((u) => u.id === userId);
    if (user) {
      setResetPasswordUser(user);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetPasswordUser) return;
    try {
      await resetPasswordMutation.mutateAsync({
        id: resetPasswordUser.id,
        newPassword,
      });
      setResetPasswordUser(null);
    } catch {
      // Error handled by mutation
    }
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Users" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">
              Access Denied
            </h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access user management. This feature
              is only available to Admins.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Users" />
      <div className="flex-1 p-6 space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <UserFilters
              roleFilter={roleFilter}
              statusFilter={statusFilter}
              onRoleChange={setRoleFilter}
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
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load users. Please try again.
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
            <UserTable
              users={data.data}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onResetPassword={handleResetPasswordClick}
              isUpdating={
                toggleStatusMutation.isPending ||
                deleteMutation.isPending ||
                resetPasswordMutation.isPending
              }
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
        <CreateUserModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateUser}
          isLoading={createMutation.isPending}
        />

        {/* Reset Password Modal */}
        <ResetPasswordModal
          open={!!resetPasswordUser}
          onOpenChange={(open) => {
            if (!open) setResetPasswordUser(null);
          }}
          onSubmit={handleResetPassword}
          isLoading={resetPasswordMutation.isPending}
          userName={
            resetPasswordUser
              ? `${resetPasswordUser.firstName} ${resetPasswordUser.lastName}`
              : undefined
          }
        />
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Users" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">
                Access Denied
              </h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access user management. This
                feature is only available to Admins.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <UsersContent />
    </RequireAuth>
  );
}
