"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "RESTORE"
  | "LOGIN"
  | "LOGOUT"
  | "STATUS_CHANGE";

export type EntityType =
  | "USER"
  | "TENANT"
  | "ORGANIZATION"
  | "PRODUCT"
  | "CONTRACT"
  | "QUOTE"
  | "ORDER";

export interface AuditLogDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditQueryParams {
  page?: number;
  limit?: number;
  userId?: string;
  entityType?: EntityType;
  entityId?: string;
  action?: AuditAction;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogsResponse {
  data: AuditLogDto[];
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

export const AUDIT_ACTIONS: { value: AuditAction; label: string }[] = [
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "RESTORE", label: "Restore" },
  { value: "LOGIN", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "STATUS_CHANGE", label: "Status Change" },
];

export const ENTITY_TYPES: { value: EntityType; label: string }[] = [
  { value: "USER", label: "User" },
  { value: "TENANT", label: "Tenant" },
  { value: "ORGANIZATION", label: "Organization" },
  { value: "PRODUCT", label: "Product" },
  { value: "CONTRACT", label: "Contract" },
  { value: "QUOTE", label: "Quote" },
  { value: "ORDER", label: "Order" },
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

export function useAuditLogs(params: AuditQueryParams = {}) {
  const client = useApiClient();
  const { user } = useAuth();
  const {
    page = 1,
    limit = 10,
    userId,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
  } = params;

  return useQuery({
    queryKey: [
      "audit-logs",
      { page, limit, userId, entityType, entityId, action, startDate, endDate },
    ],
    queryFn: async (): Promise<AuditLogsResponse> => {
      const { data, error } = await client.GET("/api/v1/audit", {
        params: {
          query: {
            page,
            limit,
            userId: userId || undefined,
            entityType: entityType || undefined,
            entityId: entityId || undefined,
            action: action || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        },
      });
      if (error) throw new Error("Failed to fetch audit logs");
      return data as unknown as AuditLogsResponse;
    },
    enabled: !!user?.tenantId,
  });
}

export function useAuditLogsByEntity(entityType: string, entityId: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["audit-logs", "entity", entityType, entityId],
    queryFn: async (): Promise<AuditLogsResponse> => {
      const { data, error } = await client.GET(
        "/api/v1/audit/entity/{entityType}/{entityId}",
        {
          params: {
            query: { entityType, entityId },
          },
        }
      );
      if (error) throw new Error("Failed to fetch entity audit logs");
      return data as unknown as AuditLogsResponse;
    },
    enabled: !!entityType && !!entityId && !!user?.tenantId,
  });
}
