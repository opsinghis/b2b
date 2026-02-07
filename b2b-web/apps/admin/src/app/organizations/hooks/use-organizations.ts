"use client";

import {
  createApiClient,
  type OrganizationResponseDto,
  type OrganizationHierarchyResponseDto,
  type CreateOrganizationDto,
  type UpdateOrganizationDto,
} from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface OrganizationsQueryParams {
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface OrganizationsResponse {
  data: OrganizationResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

export function useOrganizations(params: OrganizationsQueryParams = {}) {
  const client = useApiClient();
  const { user } = useAuth();
  const { page = 1, limit = 10, search, isActive, includeDeleted } = params;

  return useQuery({
    queryKey: [
      "organizations",
      { page, limit, search, isActive, includeDeleted },
    ],
    queryFn: async (): Promise<OrganizationsResponse> => {
      const { data, error } = await client.GET("/api/v1/organizations", {
        params: {
          query: {
            page,
            limit,
            search: search || undefined,
            isActive,
            includeDeleted,
          },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
      });
      if (error) throw new Error("Failed to fetch organizations");
      return data as unknown as OrganizationsResponse;
    },
    enabled: !!user?.tenantId,
  });
}

export function useOrganization(id: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["organizations", id],
    queryFn: async () => {
      const { data, error } = await client.GET("/api/v1/organizations/{id}", {
        params: {
          path: { id },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
      });
      if (error) throw new Error("Failed to fetch organization");
      return data as OrganizationResponseDto;
    },
    enabled: !!id && !!user?.tenantId,
  });
}

// Helper to build hierarchy from flat list
function buildHierarchy(
  orgs: OrganizationResponseDto[]
): OrganizationHierarchyResponseDto[] {
  const orgMap = new Map<string, OrganizationHierarchyResponseDto>();
  const roots: OrganizationHierarchyResponseDto[] = [];

  // First pass: create hierarchy nodes
  orgs.forEach((org) => {
    orgMap.set(org.id, {
      id: org.id,
      name: org.name,
      code: org.code,
      description: org.description,
      isActive: org.isActive,
      children: [],
    });
  });

  // Second pass: build tree structure
  orgs.forEach((org) => {
    const node = orgMap.get(org.id)!;
    if (org.parentId && orgMap.has(org.parentId)) {
      const parent = orgMap.get(org.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function useOrganizationHierarchy() {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["organizations", "hierarchy"],
    queryFn: async (): Promise<OrganizationHierarchyResponseDto[]> => {
      // Fetch all organizations to build hierarchy client-side
      const { data, error } = await client.GET("/api/v1/organizations", {
        params: {
          query: {
            limit: 500, // Get all organizations
          },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
      });
      if (error) throw new Error("Failed to fetch organizations");
      const response = data as unknown as OrganizationsResponse;
      return buildHierarchy(response.data);
    },
    enabled: !!user?.tenantId,
  });
}

export function useOrganizationSubHierarchy(id: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["organizations", id, "hierarchy"],
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/organizations/{id}/hierarchy",
        {
          params: {
            path: { id },
            header: {
              "x-tenant-id": user?.tenantId || "",
            },
          },
        }
      );
      if (error) throw new Error("Failed to fetch organization hierarchy");
      return data as OrganizationHierarchyResponseDto[];
    },
    enabled: !!id && !!user?.tenantId,
  });
}

export function useCreateOrganization() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrganizationDto) => {
      const { data: response, error } = await client.POST(
        "/api/v1/organizations",
        {
          params: {
            header: {
              "x-tenant-id": user?.tenantId || "",
            },
          },
          body: data,
        }
      );
      if (error) throw new Error("Failed to create organization");
      return response as OrganizationResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useUpdateOrganization(id: string) {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateOrganizationDto) => {
      const { data: response, error } = await client.PATCH(
        "/api/v1/organizations/{id}",
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
      if (error) throw new Error("Failed to update organization");
      return response as OrganizationResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations", id] });
    },
  });
}

export function useDeleteOrganization() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/api/v1/organizations/{id}", {
        params: {
          path: { id },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
      });
      if (error) throw new Error("Failed to delete organization");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useRestoreOrganization() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.POST(
        "/api/v1/organizations/{id}/restore",
        {
          params: {
            path: { id },
            header: {
              "x-tenant-id": user?.tenantId || "",
            },
          },
        }
      );
      if (error) throw new Error("Failed to restore organization");
      return data as OrganizationResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useToggleOrganizationStatus() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await client.PATCH(
        "/api/v1/organizations/{id}",
        {
          params: {
            path: { id },
            header: {
              "x-tenant-id": user?.tenantId || "",
            },
          },
          body: { isActive },
        }
      );
      if (error) throw new Error("Failed to update organization status");
      return data as OrganizationResponseDto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({
        queryKey: ["organizations", variables.id],
      });
    },
  });
}

export function useAssignUserToOrganization() {
  const client = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      organizationId,
    }: {
      userId: string;
      organizationId: string | null;
    }) => {
      const { data, error } = await client.PATCH("/api/v1/users/{id}", {
        params: {
          path: { id: userId },
          header: {
            "x-tenant-id": user?.tenantId || "",
          },
        },
        body: { organizationId: organizationId || undefined },
      });
      if (error) throw new Error("Failed to assign user to organization");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}
