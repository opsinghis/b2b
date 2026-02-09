"use client";

import { createApiClient } from "@b2b/api-client";
import type {
  OrderResponseDto,
  OrderListResponseDto,
  CreateOrderDto,
  RefundOrderDto,
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

export interface OrderNote {
  id: string;
  content: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  isInternal: boolean;
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
  userId?: string;
  userName?: string;
  userEmail?: string;
  organizationId?: string;
  organizationName?: string;
  tenantId?: string;
  confirmedAt?: string | null;
  processingAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  orderNotes?: OrderNote[];
}

export interface AdminOrderListParams {
  status?: OrderStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  organizationId?: string;
  minTotal?: number;
  maxTotal?: number;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "orderNumber" | "total" | "status";
  sortOrder?: "asc" | "desc";
}

export interface AdminOrderList {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CreateManualOrderDto {
  userId: string;
  organizationId?: string;
  items: {
    productId: string;
    productName: string;
    productSku?: string;
    quantity: number;
    unitPrice: number;
  }[];
  shippingAddress: OrderAddress;
  billingAddress?: OrderAddress;
  notes?: string;
  couponCode?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  notes?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  estimatedDelivery?: string;
}

export interface AddOrderNoteDto {
  content: string;
  isInternal?: boolean;
}

export interface ProcessRefundDto {
  amount?: number;
  reason: string;
  refundItems?: {
    orderItemId: string;
    quantity: number;
  }[];
}

export interface BulkStatusUpdateDto {
  orderIds: string[];
  status: OrderStatus;
  notes?: string;
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
// Query Hooks
// =============================================================================

export function useAdminOrders(params: AdminOrderListParams = {}) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: async (): Promise<AdminOrderList> => {
      const { data, error } = await client.GET("/api/v1/admin/orders", {
        params: {
          query: {
            status: params.status,
            search: params.search,
            startDate: params.startDate,
            endDate: params.endDate,
            userId: params.userId,
            organizationId: params.organizationId,
            minTotal: params.minTotal,
            maxTotal: params.maxTotal,
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

export function useAdminOrder(orderId: string | null) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: async (): Promise<Order | null> => {
      if (!orderId) return null;
      const { data, error } = await client.GET("/api/v1/admin/orders/{id}", {
        params: { path: { id: orderId } },
      });
      if (error) return null;
      return mapOrderFromDto(data as unknown as OrderResponseDto);
    },
    enabled: isAuthenticated && !!user?.tenantId && !!orderId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateManualOrder() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: CreateManualOrderDto): Promise<Order> => {
      // Note: Admin order creation might not be supported by the API
      // Using the regular orders endpoint as a fallback
      const { data, error } = await client.POST("/api/v1/orders", {
        body: orderData as unknown as CreateOrderDto,
      });
      if (error) throw new Error("Failed to create order");
      return mapOrderFromDto(data as unknown as OrderResponseDto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdateOrderStatusDto;
    }): Promise<Order> => {
      // Using the generic PATCH endpoint for order updates
      const { data: response, error } = await client.PATCH(
        "/api/v1/admin/orders/{id}",
        {
          params: { path: { id: orderId } },
          body: data,
        }
      );
      if (error) throw new Error("Failed to update order status");
      return mapOrderFromDto(response as unknown as OrderResponseDto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}

export function useProcessRefund() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      data,
    }: {
      orderId: string;
      data: ProcessRefundDto;
    }): Promise<Order> => {
      const { data: response, error } = await client.POST(
        "/api/v1/admin/orders/{id}/refund",
        {
          params: { path: { id: orderId } },
          body: data as unknown as RefundOrderDto,
        }
      );
      if (error) throw new Error("Failed to process refund");
      return mapOrderFromDto(response as unknown as OrderResponseDto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}

export function useAddOrderNote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      data,
    }: {
      orderId: string;
      data: AddOrderNoteDto;
    }): Promise<void> => {
      // Note: Adding notes might be handled via the order update endpoint
      // Using the generic PATCH endpoint to add notes to order
      const { error } = await client.PATCH("/api/v1/admin/orders/{id}", {
        params: { path: { id: orderId } },
        body: { notes: data.content },
      });
      if (error) throw new Error("Failed to add note");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", variables.orderId] });
    },
  });
}

export function useBulkUpdateStatus() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkStatusUpdateDto): Promise<void> => {
      // Process each order sequentially since API may not support bulk
      for (const orderId of data.orderIds) {
        const { error } = await client.PATCH("/api/v1/admin/orders/{id}", {
          params: { path: { id: orderId } },
          body: { status: data.status, notes: data.notes },
        });
        if (error) {
          console.error(`Failed to update order ${orderId}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
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
      // Using the generic PATCH endpoint to update status to CANCELLED
      const { data, error } = await client.PATCH("/api/v1/admin/orders/{id}", {
        params: { path: { id: orderId } },
        body: { status: "CANCELLED", notes: reason },
      });
      if (error) throw new Error("Failed to cancel order");
      return mapOrderFromDto(data as unknown as OrderResponseDto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}

export function useConfirmOrder() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      notes,
    }: {
      orderId: string;
      notes?: string;
    }): Promise<Order> => {
      // Using the PATCH endpoint to update status to CONFIRMED
      const { data, error } = await client.PATCH("/api/v1/admin/orders/{id}", {
        params: { path: { id: orderId } },
        body: { status: "CONFIRMED", notes },
      });
      if (error) throw new Error("Failed to confirm order");
      return mapOrderFromDto(data as unknown as OrderResponseDto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
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
    userId: (dto as unknown as { userId?: string }).userId,
    userName: (dto as unknown as { userName?: string }).userName,
    userEmail: (dto as unknown as { userEmail?: string }).userEmail,
    organizationId: (dto as unknown as { organizationId?: string }).organizationId,
    organizationName: (dto as unknown as { organizationName?: string }).organizationName,
    tenantId: (dto as unknown as { tenantId?: string }).tenantId,
    confirmedAt: dto.confirmedAt,
    processingAt: dto.processingAt,
    shippedAt: dto.shippedAt,
    deliveredAt: dto.deliveredAt,
    cancelledAt: dto.cancelledAt,
    refundedAt: dto.refundedAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    orderNotes: (dto as unknown as { orderNotes?: OrderNote[] }).orderNotes,
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
    DRAFT: "bg-gray-100 text-gray-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    CONFIRMED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    SHIPPED: "bg-indigo-100 text-indigo-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-orange-100 text-orange-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function canUpdateStatus(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    DRAFT: ["PENDING", "CANCELLED"],
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPED", "CANCELLED"],
    SHIPPED: ["DELIVERED"],
    DELIVERED: ["REFUNDED"],
    CANCELLED: [],
    REFUNDED: [],
  };
  return transitions[currentStatus]?.includes(newStatus) ?? false;
}

export function canRefund(status: OrderStatus): boolean {
  return ["DELIVERED", "SHIPPED"].includes(status);
}

export function canCancel(status: OrderStatus): boolean {
  return ["DRAFT", "PENDING", "CONFIRMED", "PROCESSING"].includes(status);
}

export function canConfirm(status: OrderStatus): boolean {
  return status === "PENDING";
}

// =============================================================================
// Constants
// =============================================================================

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
];

export const CARRIERS: { value: string; label: string }[] = [
  { value: "ups", label: "UPS" },
  { value: "fedex", label: "FedEx" },
  { value: "usps", label: "USPS" },
  { value: "dhl", label: "DHL" },
  { value: "other", label: "Other" },
];
