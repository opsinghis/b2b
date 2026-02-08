"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export type ApprovalRequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export type ApprovalStepStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type ApprovalEntityType = "CONTRACT" | "QUOTE";

export interface ApprovalStepDto {
  id: string;
  level: number;
  status: ApprovalStepStatus;
  comments?: string | null;
  delegatedFrom?: string | null;
  approverId: string;
  requestedAt: string;
  respondedAt?: string | null;
}

export interface ApprovalRequestDto {
  id: string;
  entityType: ApprovalEntityType;
  entityId: string;
  status: ApprovalRequestStatus;
  currentLevel: number;
  metadata?: Record<string, unknown>;
  chainId: string;
  requesterId: string;
  steps: ApprovalStepDto[];
  requestedAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
}

export interface PendingApprovalDto {
  id: string;
  stepId: string;
  entityType: ApprovalEntityType;
  entityId: string;
  level: number;
  levelName: string;
  allowDelegation: boolean;
  delegatedFrom?: string | null;
  requestedAt: string;
  expiresAt?: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  isActive: boolean;
}

export interface UsersResponse {
  data: UserDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

export const APPROVAL_REQUEST_STATUSES: {
  value: ApprovalRequestStatus;
  label: string;
}[] = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

export const APPROVAL_STEP_STATUSES: {
  value: ApprovalStepStatus;
  label: string;
}[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const ENTITY_TYPES: { value: ApprovalEntityType; label: string }[] = [
  { value: "CONTRACT", label: "Contract" },
  { value: "QUOTE", label: "Quote" },
];

// =============================================================================
// API Client Hook
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

// =============================================================================
// Query Hooks
// =============================================================================

export function usePendingApprovals() {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: async (): Promise<PendingApprovalDto[]> => {
      const { data, error } = await client.GET("/api/v1/approvals/pending");
      if (error) throw new Error("Failed to fetch pending approvals");
      return data as unknown as PendingApprovalDto[];
    },
    enabled: !!user?.tenantId,
  });
}

export function useApprovalRequest(id: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["approvals", id],
    queryFn: async (): Promise<ApprovalRequestDto> => {
      const { data, error } = await client.GET("/api/v1/approvals/{id}", {
        params: {
          path: { id },
        },
      });
      if (error) throw new Error("Failed to fetch approval request");
      return data as unknown as ApprovalRequestDto;
    },
    enabled: !!id && !!user?.tenantId,
  });
}

export function useUsers(search?: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["users", { search }],
    queryFn: async (): Promise<UsersResponse> => {
      const { data, error } = await client.GET("/api/v1/users", {
        params: {
          query: {
            search: search || undefined,
            isActive: true,
            limit: 20,
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

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useApproveStep() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      stepId,
      comments,
    }: {
      requestId: string;
      stepId: string;
      comments?: string;
    }): Promise<ApprovalRequestDto> => {
      const { data, error } = await client.POST(
        "/api/v1/approvals/{requestId}/steps/{stepId}/approve",
        {
          params: { path: { requestId, stepId } },
          body: { comments },
        }
      );
      if (error) throw new Error("Failed to approve step");
      return data as unknown as ApprovalRequestDto;
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["approvals", requestId] });
      // Also invalidate the related entity queries
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useRejectStep() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      stepId,
      comments,
    }: {
      requestId: string;
      stepId: string;
      comments?: string;
    }): Promise<ApprovalRequestDto> => {
      const { data, error } = await client.POST(
        "/api/v1/approvals/{requestId}/steps/{stepId}/reject",
        {
          params: { path: { requestId, stepId } },
          body: { comments },
        }
      );
      if (error) throw new Error("Failed to reject step");
      return data as unknown as ApprovalRequestDto;
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["approvals", requestId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useDelegateStep() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      stepId,
      delegateToUserId,
      reason,
    }: {
      requestId: string;
      stepId: string;
      delegateToUserId: string;
      reason?: string;
    }): Promise<ApprovalRequestDto> => {
      const { data, error } = await client.POST(
        "/api/v1/approvals/{requestId}/steps/{stepId}/delegate",
        {
          params: { path: { requestId, stepId } },
          body: { delegateToUserId, reason },
        }
      );
      if (error) throw new Error("Failed to delegate step");
      return data as unknown as ApprovalRequestDto;
    },
    onSuccess: (_, { requestId }) => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["approvals", requestId] });
    },
  });
}

export function useCancelApproval() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<ApprovalRequestDto> => {
      const { data, error } = await client.POST("/api/v1/approvals/{id}/cancel", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to cancel approval request");
      return data as unknown as ApprovalRequestDto;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["approvals", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["approvals", id] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
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

export function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return formatDate(dateString);
}

export function getRequestStatusLabel(status: ApprovalRequestStatus) {
  const statusConfig = APPROVAL_REQUEST_STATUSES.find((s) => s.value === status);
  return statusConfig?.label || status;
}

export function getStepStatusLabel(status: ApprovalStepStatus) {
  const statusConfig = APPROVAL_STEP_STATUSES.find((s) => s.value === status);
  return statusConfig?.label || status;
}

export function getEntityTypeLabel(entityType: ApprovalEntityType) {
  const config = ENTITY_TYPES.find((e) => e.value === entityType);
  return config?.label || entityType;
}

export function getRequestStatusBadgeColor(status: ApprovalRequestStatus) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "APPROVED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "EXPIRED":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export function getStepStatusBadgeColor(status: ApprovalStepStatus) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "APPROVED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export function getEntityTypeBadgeColor(entityType: ApprovalEntityType) {
  switch (entityType) {
    case "CONTRACT":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "QUOTE":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export function isApprovalPending(status: ApprovalRequestStatus): boolean {
  return status === "PENDING" || status === "IN_PROGRESS";
}

export function canApproveOrReject(stepStatus: ApprovalStepStatus): boolean {
  return stepStatus === "PENDING";
}

export function getEntityPath(entityType: ApprovalEntityType, entityId: string): string {
  switch (entityType) {
    case "CONTRACT":
      return `/contracts/${entityId}`;
    case "QUOTE":
      return `/quotes/${entityId}`;
    default:
      return "#";
  }
}
