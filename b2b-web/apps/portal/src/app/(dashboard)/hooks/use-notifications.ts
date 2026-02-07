"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export interface Notification {
  id: string;
  type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  category: "QUOTE" | "CONTRACT" | "APPROVAL" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkUrl?: string;
  linkText?: string;
}

export interface NotificationsResponse {
  items: Notification[];
  total: number;
  unreadCount: number;
}

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

export function useNotifications(limit = 10) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", { limit }],
    queryFn: async (): Promise<NotificationsResponse> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (client as any).GET("/api/v1/notifications", {
        params: {
          query: { limit },
        },
      });
      if (error) throw new Error("Failed to fetch notifications");
      return data as unknown as NotificationsResponse;
    },
    enabled: !!user?.accessToken,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

export function useMarkNotificationRead() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client as any).PATCH("/api/v1/notifications/{id}/read", {
        params: { path: { id: notificationId } },
      });
      if (error) throw new Error("Failed to mark notification as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (client as any).PATCH("/api/v1/notifications/read/all");
      if (error) throw new Error("Failed to mark all notifications as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

export function getNotificationIcon(category: Notification["category"]) {
  switch (category) {
    case "QUOTE":
      return "FileText";
    case "CONTRACT":
      return "FileCheck";
    case "APPROVAL":
      return "Clock";
    case "SYSTEM":
      return "Bell";
    default:
      return "Bell";
  }
}

export function getNotificationColor(type: Notification["type"]) {
  switch (type) {
    case "SUCCESS":
      return "text-green-500";
    case "WARNING":
      return "text-amber-500";
    case "ERROR":
      return "text-red-500";
    case "INFO":
    default:
      return "text-blue-500";
  }
}
