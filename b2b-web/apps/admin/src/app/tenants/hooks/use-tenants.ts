"use client";

import {
  createApiClient,
  type TenantResponseDto,
  type CreateTenantDto,
  type UpdateTenantDto,
} from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface TenantsQueryParams {
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface TenantsResponse {
  data: TenantResponseDto[];
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

export function useTenants(params: TenantsQueryParams = {}) {
  const client = useApiClient();
  const { page = 1, limit = 10, search, isActive, includeDeleted } = params;

  return useQuery({
    queryKey: ["tenants", { page, limit, search, isActive, includeDeleted }],
    queryFn: async (): Promise<TenantsResponse> => {
      const { data, error } = await client.GET("/api/v1/tenants", {
        params: {
          query: {
            page,
            limit,
            search: search || undefined,
            isActive,
            includeDeleted,
          },
        },
      });
      if (error) throw new Error("Failed to fetch tenants");
      return data as TenantsResponse;
    },
  });
}

export function useTenant(id: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: ["tenants", id],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/tenants/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to fetch tenant");
      return data as TenantResponseDto;
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTenantDto) => {
      const { data: response, error } = await client.POST("/api/v1/tenants", {
        body: data,
      });
      if (error) throw new Error("Failed to create tenant");
      return response as TenantResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useUpdateTenant(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTenantDto) => {
      const { data: response, error } = await client.PATCH(
        "/api/v1/tenants/{id}",
        {
          params: { path: { id } },
          body: data,
        }
      );
      if (error) throw new Error("Failed to update tenant");
      return response as TenantResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenants", id] });
    },
  });
}

export function useDeleteTenant() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/api/v1/tenants/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to delete tenant");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useRestoreTenant() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.POST("/api/v1/tenants/{id}/restore", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to restore tenant");
      return data as TenantResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useToggleTenantStatus() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await client.PATCH("/api/v1/tenants/{id}", {
        params: { path: { id } },
        body: { isActive },
      });
      if (error) throw new Error("Failed to update tenant status");
      return data as TenantResponseDto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenants", variables.id] });
    },
  });
}
