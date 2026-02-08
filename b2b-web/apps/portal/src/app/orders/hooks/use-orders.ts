"use client";

import { createApiClient } from "@b2b/api-client";
import type {
  OrderResponseDto,
  OrderListResponseDto,
  TrackingResponseDto,
  CancelOrderDto,
} from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderAddress {
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  lineNumber: number;
  productName: string;
  productSku?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  masterProductId?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string;
  discount: string;
  couponCode?: string | null;
  couponDiscount: string;
  tax: string;
  total: string;
  currency: string;
  notes?: string | null;
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  items: OrderItem[];
  itemCount: number;
  confirmedAt?: string | null;
  processingAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTracking {
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export interface OrderListParams {
  status?: OrderStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "orderNumber" | "total" | "status";
  sortOrder?: "asc" | "desc";
}

export interface OrderList {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// =============================================================================
// API Client Hook
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return useMemo(
    () =>
      createApiClient({
        tenantId: user?.tenantId,
        token: user?.accessToken,
      }),
    [user?.tenantId, user?.accessToken]
  );
}

// =============================================================================
// Order Hooks
// =============================================================================

export function useOrders(params: OrderListParams = {}) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["orders", params],
    queryFn: async (): Promise<OrderList> => {
      const { data, error } = await client.GET("/api/v1/orders", {
        params: {
          query: {
            status: params.status,
            search: params.search,
            startDate: params.startDate,
            endDate: params.endDate,
            page: params.page ?? 1,
            limit: params.limit ?? 10,
            sortBy: params.sortBy ?? "createdAt",
            sortOrder: params.sortOrder ?? "desc",
          },
        },
      });
      if (error) {
        return {
          orders: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        };
      }
      const listData = data as unknown as OrderListResponseDto;
      return {
        orders: listData.data.map(mapOrderFromDto),
        total: listData.total,
        page: listData.page,
        limit: listData.limit,
        totalPages: listData.totalPages,
        hasNext: listData.hasNext,
        hasPrevious: listData.hasPrevious,
      };
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useOrder(orderId: string | null) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async (): Promise<Order | null> => {
      if (!orderId) return null;
      const { data, error } = await client.GET("/api/v1/orders/{id}", {
        params: { path: { id: orderId } },
      });
      if (error) return null;
      return mapOrderFromDto(data as unknown as OrderResponseDto);
    },
    enabled: isAuthenticated && !!user?.tenantId && !!orderId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

export function useOrderTracking(orderId: string | null) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["order", orderId, "tracking"],
    queryFn: async (): Promise<OrderTracking | null> => {
      if (!orderId) return null;
      const { data, error } = await client.GET("/api/v1/orders/{id}/tracking", {
        params: { path: { id: orderId } },
      });
      if (error) return null;
      return mapTrackingFromDto(data as unknown as TrackingResponseDto);
    },
    enabled: isAuthenticated && !!user?.tenantId && !!orderId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

export function useCancelOrder() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
    }: {
      orderId: string;
      reason?: string;
    }): Promise<Order> => {
      const { data, error } = await client.POST("/api/v1/orders/{id}/cancel", {
        params: { path: { id: orderId } },
        body: { reason } as CancelOrderDto,
      });
      if (error) throw new Error("Failed to cancel order");
      return mapOrderFromDto(data as unknown as OrderResponseDto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useReorder() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string): Promise<void> => {
      const { error } = await client.POST("/api/v1/orders/{id}/reorder", {
        params: { path: { id: orderId } },
      });
      if (error) throw new Error("Failed to reorder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

// =============================================================================
// Mappers
// =============================================================================

function mapOrderFromDto(dto: OrderResponseDto): Order {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber || `ORD-${dto.id.slice(0, 8).toUpperCase()}`,
    status: dto.status as OrderStatus,
    subtotal: dto.subtotal?.toString() ?? "0",
    discount: dto.discount?.toString() ?? "0",
    couponCode: dto.couponCode,
    couponDiscount: dto.couponDiscount?.toString() ?? "0",
    tax: dto.tax?.toString() ?? "0",
    total: dto.total?.toString() ?? "0",
    currency: dto.currency ?? "USD",
    notes: dto.notes,
    shippingAddress: dto.shippingAddress
      ? {
          street1: dto.shippingAddress.street1 ?? "",
          street2: dto.shippingAddress.street2,
          city: dto.shippingAddress.city ?? "",
          state: dto.shippingAddress.state,
          postalCode: dto.shippingAddress.postalCode ?? "",
          country: dto.shippingAddress.country ?? "",
        }
      : {
          street1: "",
          city: "",
          postalCode: "",
          country: "",
        },
    billingAddress: dto.billingAddress
      ? {
          street1: dto.billingAddress.street1 ?? "",
          street2: dto.billingAddress.street2,
          city: dto.billingAddress.city ?? "",
          state: dto.billingAddress.state,
          postalCode: dto.billingAddress.postalCode ?? "",
          country: dto.billingAddress.country ?? "",
        }
      : null,
    trackingNumber: dto.trackingNumber,
    trackingUrl: dto.trackingUrl,
    carrier: dto.carrier,
    estimatedDelivery: dto.estimatedDelivery,
    items: (dto.items || []).map((item) => ({
      id: item.id,
      lineNumber: item.lineNumber ?? 0,
      productName: item.productName,
      productSku: item.productSku,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice?.toString() ?? "0",
      discount: item.discount?.toString() ?? "0",
      total: item.total?.toString() ?? "0",
      masterProductId: item.masterProductId,
    })),
    itemCount: dto.itemCount ?? dto.items?.length ?? 0,
    confirmedAt: dto.confirmedAt,
    processingAt: dto.processingAt,
    shippedAt: dto.shippedAt,
    deliveredAt: dto.deliveredAt,
    cancelledAt: dto.cancelledAt,
    refundedAt: dto.refundedAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function mapTrackingFromDto(dto: TrackingResponseDto): OrderTracking {
  return {
    trackingNumber: dto.trackingNumber,
    trackingUrl: dto.trackingUrl,
    carrier: dto.carrier,
    estimatedDelivery: dto.estimatedDelivery,
    shippedAt: dto.shippedAt,
    deliveredAt: dto.deliveredAt,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatPrice(
  value: string | number,
  currency: string = "USD"
): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(numValue);
}

export function formatAddress(address: OrderAddress): string {
  const parts = [
    address.street1,
    address.street2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.join(", ");
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    DRAFT: "Draft",
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    REFUNDED: "Refunded",
  };
  return labels[status] || status;
}

export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    CONFIRMED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    SHIPPED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    REFUNDED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function canCancelOrder(status: OrderStatus): boolean {
  return ["PENDING", "CONFIRMED"].includes(status);
}

export function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const carriers: Record<string, string> = {
    ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
    fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
  };
  const normalizedCarrier = carrier.toLowerCase().replace(/[^a-z]/g, "");
  return carriers[normalizedCarrier] || null;
}
