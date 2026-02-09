"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export type ContractStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ACTIVE"
  | "EXPIRED"
  | "TERMINATED"
  | "CANCELLED";

export interface ContractDto {
  id: string;
  contractNumber: string;
  title: string;
  description?: string;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  totalValue: string;
  currency: string;
  organizationId: string;
  organizationName: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  activatedAt?: string;
  version: number;
}

export interface ContractVersionDto {
  id: string;
  contractId: string;
  version: number;
  title: string;
  description?: string;
  status: ContractStatus;
  totalValue: string;
  currency: string;
  changes?: Record<string, unknown>;
  createdById: string;
  createdByName: string;
  createdAt: string;
  comment?: string;
}

export interface ContractQueryParams {
  page?: number;
  limit?: number;
  status?: ContractStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ContractsResponse {
  data: ContractDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContractVersionsResponse {
  data: ContractVersionDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// Constants
// =============================================================================

export const CONTRACT_STATUSES: { value: ContractStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "CANCELLED", label: "Cancelled" },
];

// =============================================================================
// Hooks
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

export function useContracts(params: ContractQueryParams = {}) {
  const client = useApiClient();
  const { user } = useAuth();
  const {
    page = 1,
    limit = 10,
    status,
    startDate,
    endDate,
    search,
  } = params;

  return useQuery({
    queryKey: [
      "contracts",
      { page, limit, status, startDate, endDate, search },
    ],
    queryFn: async (): Promise<ContractsResponse> => {
      const { data, error } = await client.GET("/api/v1/contracts", {
        params: {
          query: {
            page,
            limit,
            status: status || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            search: search || undefined,
          },
        },
      });
      if (error) throw new Error("Failed to fetch contracts");
      return data as unknown as ContractsResponse;
    },
    enabled: !!user?.tenantId,
  });
}

export function useContract(id: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contracts", id],
    queryFn: async (): Promise<ContractDto> => {
      const { data, error } = await client.GET("/api/v1/contracts/{id}", {
        params: {
          path: { id },
        },
      });
      if (error) throw new Error("Failed to fetch contract");
      return data as unknown as ContractDto;
    },
    enabled: !!id && !!user?.tenantId,
  });
}

export function useContractVersions(contractId: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contracts", contractId, "versions"],
    queryFn: async (): Promise<ContractVersionsResponse> => {
      const { data, error } = await client.GET(
        "/api/v1/contracts/{id}/versions",
        {
          params: {
            path: { id: contractId },
          },
        }
      );
      if (error) throw new Error("Failed to fetch contract versions");
      return data as unknown as ContractVersionsResponse;
    },
    enabled: !!contractId && !!user?.tenantId,
  });
}

// =============================================================================
// Create Contract Types
// =============================================================================

export interface CreateContractData {
  title: string;
  description?: string;
  effectiveDate?: string;
  expirationDate?: string;
  totalValue?: number;
  currency?: string;
  organizationId?: string;
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateContract() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContractData): Promise<ContractDto> => {
      const { data: result, error } = await client.POST("/api/v1/contracts", {
        body: data,
      });
      if (error) throw new Error("Failed to create contract");
      return result as unknown as ContractDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

export function useSubmitContract() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }): Promise<ContractDto> => {
      const { data, error } = await client.POST(
        "/api/v1/contracts/{id}/submit",
        {
          params: { path: { id } },
          body: { comments },
        }
      );
      if (error) throw new Error("Failed to submit contract");
      return data as unknown as ContractDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["contracts", id, "versions"] });
    },
  });
}

export function useApproveContract() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }): Promise<ContractDto> => {
      const { data, error } = await client.POST(
        "/api/v1/contracts/{id}/approve",
        {
          params: { path: { id } },
          body: { comments },
        }
      );
      if (error) throw new Error("Failed to approve contract");
      return data as unknown as ContractDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["contracts", id, "versions"] });
    },
  });
}

export function useRejectContract() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }): Promise<ContractDto> => {
      const { data, error } = await client.POST(
        "/api/v1/contracts/{id}/reject",
        {
          params: { path: { id } },
          body: { comments },
        }
      );
      if (error) throw new Error("Failed to reject contract");
      return data as unknown as ContractDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["contracts", id, "versions"] });
    },
  });
}

export function useActivateContract() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }): Promise<ContractDto> => {
      const { data, error } = await client.POST(
        "/api/v1/contracts/{id}/activate",
        {
          params: { path: { id } },
          body: { comments },
        }
      );
      if (error) throw new Error("Failed to activate contract");
      return data as unknown as ContractDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["contracts", id, "versions"] });
    },
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(value: string | number, currency: string) {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(numValue);
}

export function getStatusLabel(status: ContractStatus) {
  const statusConfig = CONTRACT_STATUSES.find((s) => s.value === status);
  return statusConfig?.label || status;
}

export function getStatusBadgeColor(status: ContractStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "PENDING_APPROVAL":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "APPROVED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "ACTIVE":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "EXPIRED":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "TERMINATED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "CANCELLED":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}
