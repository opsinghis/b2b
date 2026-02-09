"use client";

import {
  createApiClient,
  type UserResponseDto,
  type CreateUserDto,
  type UpdateUserDto,
} from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "USER" | "VIEWER";

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "USER", label: "User" },
  { value: "VIEWER", label: "Viewer" },
];

export interface UsersQueryParams {
  search?: string;
  isActive?: boolean;
  role?: UserRole;
  organizationId?: string;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface UsersResponse {
  data: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

export function useUsers(params: UsersQueryParams = {}) {
  const client = useApiClient();
  const { user } = useAuth();
  const {
    page = 1,
    limit = 10,
    search,
    isActive,
    role,
    organizationId,
    includeDeleted,
  } = params;

  return useQuery({
    queryKey: [
      "users",
      { page, limit, search, isActive, role, organizationId, includeDeleted },
    ],
    queryFn: async (): Promise<UsersResponse> => {
      const { data, error } = await client.GET("/api/v1/users", {
        params: {
          query: {
            page,
            limit,
            search: search || undefined,
            isActive,
            role,
            organizationId: organizationId || undefined,
            includeDeleted,
          },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
      });
      if (error) throw new Error("Failed to fetch users");
      return data as unknown as UsersResponse;
    },
    enabled: !!user?.tenantId,
  });
}

export function useUser(id: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["users", id],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/users/{id}", {
        params: {
          path: { id },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
      });
      if (error) throw new Error("Failed to fetch user");
      return data as UserResponseDto;
    },
    enabled: !!id && !!user?.tenantId,
  });
}

export function useCreateUser() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const { data: response, error } = await client.POST("/api/v1/users", {
        params: {
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
        body: data,
      });
      if (error) throw new Error("Failed to create user");
      return response as UserResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser(id: string) {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserDto) => {
      const { data: response, error } = await client.PATCH(
        "/api/v1/users/{id}",
        {
          params: {
            path: { id },
            header: {
              "x-tenant-id": user?.tenantId || "",
            },
          },
          body: data,
        }
      );
      if (error) throw new Error("Failed to update user");
      return response as UserResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", id] });
    },
  });
}

export function useDeleteUser() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/api/v1/users/{id}", {
        params: {
          path: { id },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
      });
      if (error) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useRestoreUser() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.POST("/api/v1/users/{id}/restore", {
        params: {
          path: { id },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
      });
      if (error) throw new Error("Failed to restore user");
      return data as UserResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useToggleUserStatus() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await client.PATCH("/api/v1/users/{id}", {
        params: {
          path: { id },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
        body: { isActive },
      });
      if (error) throw new Error("Failed to update user status");
      return data as UserResponseDto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
    },
  });
}

export function useUpdateUserRole() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { data, error } = await client.PATCH("/api/v1/users/{id}", {
        params: {
          path: { id },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
        body: { role },
      });
      if (error) throw new Error("Failed to update user role");
      return data as UserResponseDto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
    },
  });
}

export function useResetUserPassword() {
  // Note: The API doesn't currently support admin-initiated password reset.
  // This is a placeholder that simulates the action. In production, this would
  // typically send a password reset email to the user or use a dedicated admin endpoint.
  return useMutation({
    mutationFn: async ({ id, newPassword: _newPassword }: { id: string; newPassword: string }) => {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      // In a real implementation, this would call an endpoint like:
      // POST /api/v1/admin/users/{id}/reset-password
      console.log(`Password reset requested for user ${id}`);
      // Return a mock success - in production this would be the actual API response
      return { success: true, userId: id };
    },
  });
}
