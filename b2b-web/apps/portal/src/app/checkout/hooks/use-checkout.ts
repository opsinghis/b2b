"use client";

import { createApiClient } from "@b2b/api-client";
import type {
  UserAddressResponseDto,
  AddressResponseDto,
  CreateUserAddressDto,
  DeliveryMethodResponseDto,
  OrderResponseDto,
  PaymentMethodResponseDto,
  SalaryDeductionResponseDto,
  PaymentHistoryResponseDto,
  PaymentResponseDto,
} from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export interface UserAddress {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
  phone?: string | null;
  isShipping: boolean;
  isBilling: boolean;
}

export interface DeliveryMethod {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  estimatedDays: number;
  isActive: boolean;
}

export interface CreateAddressParams {
  label?: string;
  firstName: string;
  lastName: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
  isShipping?: boolean;
  isBilling?: boolean;
}

export interface CreateOrderParams {
  shippingAddressId: string;
  billingAddressId?: string;
  deliveryMethodId: string;
  paymentMethodId?: string;
  notes?: string;
  termsAccepted: boolean;
}

// =============================================================================
// Payment Method Types
// =============================================================================

export type PaymentMethodType =
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BANK_TRANSFER"
  | "SALARY_DEDUCTION"
  | "INVOICE"
  | "WALLET";

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: PaymentMethodType;
  isActive: boolean;
  sortOrder: number;
  minAmount?: string | null;
  maxAmount?: string | null;
}

export interface SalaryDeduction {
  id: string;
  monthlyLimit: string;
  usedAmount: string;
  remainingAmount: string;
  isEnabled: boolean;
  periodStart: string;
  periodEnd: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  amount: string;
  currency: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REFUNDED" | "CANCELLED";
  externalRef?: string | null;
  orderId: string;
  paymentMethodId: string;
  paymentMethod: {
    id?: string;
    code?: string;
    name?: string;
    type?: PaymentMethodType;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentHistory {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface ProcessPaymentParams {
  orderId: string;
  paymentMethodId: string;
  externalRef?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  total: string;
  shippingAddress: UserAddress;
  billingAddress?: UserAddress | null;
  deliveryMethod?: DeliveryMethod | null;
  notes?: string | null;
  items: OrderItem[];
  createdAt: string;
  estimatedDelivery?: string | null;
}

export interface OrderItem {
  id: string;
  productName: string;
  productSku?: string | null;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
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
// Address Hooks
// =============================================================================

export function useUserAddresses() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    // Include tenantId in queryKey to ensure refetch when user session changes
    queryKey: ["user-addresses", user?.tenantId],
    queryFn: async (): Promise<UserAddress[]> => {
      // Double-check we have valid auth before making request
      if (!user?.accessToken || !user?.tenantId) {
        return [];
      }
      const { data, error } = await client.GET("/api/v1/users/me/addresses");
      if (error) {
        // Check if it's an auth error
        const errorObj = error as { status?: number };
        if (errorObj.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        return [];
      }
      return (data as unknown as UserAddressResponseDto[]).map(mapAddressFromDto);
    },
    enabled: isAuthenticated && !!user?.tenantId && !!user?.accessToken,
    // Retry on network errors but not on auth errors
    retry: (failureCount, error) => {
      if (error.message.includes("Session expired")) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateAddress() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateAddressParams): Promise<UserAddress> => {
      const { data, error } = await client.POST("/api/v1/users/me/addresses", {
        body: params as CreateUserAddressDto,
      });
      if (error) {
        const errorObj = error as { status?: number };
        if (errorObj.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error("Failed to create address");
      }
      return mapAddressFromDto(data as unknown as UserAddressResponseDto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-addresses", user?.tenantId] });
    },
  });
}

export function useUpdateAddress() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      ...params
    }: CreateAddressParams & { id: string }): Promise<UserAddress> => {
      const { data, error } = await client.PATCH(
        "/api/v1/users/me/addresses/{id}",
        {
          params: { path: { id } },
          body: params,
        }
      );
      if (error) {
        const errorObj = error as { status?: number };
        if (errorObj.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error("Failed to update address");
      }
      return mapAddressFromDto(data as unknown as UserAddressResponseDto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-addresses", user?.tenantId] });
    },
  });
}

export function useDeleteAddress() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client.DELETE("/api/v1/users/me/addresses/{id}", {
        params: { path: { id } },
      });
      if (error) {
        const errorObj = error as { status?: number };
        if (errorObj.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        throw new Error("Failed to delete address");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-addresses", user?.tenantId] });
    },
  });
}

// =============================================================================
// Delivery Methods Hook
// =============================================================================

export function useDeliveryMethods() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["delivery-methods", user?.tenantId],
    queryFn: async (): Promise<DeliveryMethod[]> => {
      if (!user?.accessToken || !user?.tenantId) {
        return [];
      }
      const { data, error } = await client.GET("/api/v1/delivery-methods");
      if (error) {
        const errorObj = error as { status?: number };
        if (errorObj.status === 401) {
          throw new Error("Session expired. Please log in again.");
        }
        return [];
      }
      return (data as unknown as DeliveryMethodResponseDto[]).map(
        mapDeliveryMethodFromDto
      );
    },
    enabled: isAuthenticated && !!user?.tenantId && !!user?.accessToken,
  });
}

// =============================================================================
// Order Hooks
// =============================================================================

export function useCreateOrder() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateOrderParams): Promise<Order> => {
      const { data, error } = await client.POST("/api/v1/orders", {
        body: {
          shippingAddressId: params.shippingAddressId,
          billingAddressId: params.billingAddressId,
          deliveryMethodId: params.deliveryMethodId,
          paymentMethodId: params.paymentMethodId,
          notes: params.notes,
        },
      });
      if (error) throw new Error("Failed to create order");
      return mapOrderFromDto(data as unknown as OrderResponseDto);
    },
    onSuccess: () => {
      // Invalidate cart and orders
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
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
  });
}

// =============================================================================
// Payment Methods Hooks
// =============================================================================

export function usePaymentMethods(orderAmount?: number) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["payment-methods", orderAmount],
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await client.GET("/api/v1/payment-methods", {
        params: { query: { orderAmount: orderAmount ?? 0 } },
      });
      if (error) {
        return [];
      }
      return (data as unknown as PaymentMethodResponseDto[]).map(
        mapPaymentMethodFromDto
      );
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useSalaryDeduction() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["salary-deduction"],
    queryFn: async (): Promise<SalaryDeduction | null> => {
      const { data, error } = await client.GET(
        "/api/v1/users/me/salary-deduction"
      );
      if (error) {
        // User might not be eligible for salary deduction
        return null;
      }
      return mapSalaryDeductionFromDto(
        data as unknown as SalaryDeductionResponseDto
      );
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useProcessPayment() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ProcessPaymentParams): Promise<Payment> => {
      const { data, error } = await client.POST("/api/v1/orders/{id}/pay", {
        params: { path: { id: params.orderId } },
        body: {
          paymentMethodId: params.paymentMethodId,
          externalRef: params.externalRef,
        },
      });
      if (error) throw new Error("Failed to process payment");
      return mapPaymentFromDto(data as unknown as PaymentResponseDto);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["order", variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["salary-deduction"] });
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
    },
  });
}

export function usePaymentHistory(page: number = 1, limit: number = 10) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["payment-history", page, limit],
    queryFn: async (): Promise<PaymentHistory> => {
      const { data, error } = await client.GET(
        "/api/v1/users/me/payment-history",
        {
          params: { query: { page, limit } },
        }
      );
      if (error) {
        return { payments: [], total: 0, page, limit };
      }
      const historyData = data as unknown as PaymentHistoryResponseDto;
      return {
        payments: historyData.payments.map(mapPaymentFromDto),
        total: historyData.total,
        page: historyData.page,
        limit: historyData.limit,
      };
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

// =============================================================================
// Mappers
// =============================================================================

function mapAddressFromDto(dto: UserAddressResponseDto): UserAddress {
  return {
    id: dto.id,
    label: dto.label || "Address",
    firstName: dto.firstName,
    lastName: dto.lastName,
    company: dto.company,
    street1: dto.street1,
    street2: dto.street2,
    city: dto.city,
    state: dto.state,
    postalCode: dto.postalCode,
    country: dto.country,
    isDefault: dto.isDefault ?? false,
    phone: dto.phone,
    isShipping: dto.isShipping ?? true,
    isBilling: dto.isBilling ?? true,
  };
}

function mapDeliveryMethodFromDto(dto: DeliveryMethodResponseDto): DeliveryMethod {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    price: dto.baseCost?.toString() ?? "0",
    estimatedDays: dto.maxDays ?? dto.minDays ?? 5,
    isActive: dto.isActive ?? true,
  };
}

function mapOrderAddressFromDto(dto: AddressResponseDto): UserAddress {
  return {
    id: "",
    label: "",
    firstName: "",
    lastName: "",
    company: null,
    street1: dto.street1 ?? "",
    street2: dto.street2 ?? null,
    city: dto.city ?? "",
    state: dto.state ?? null,
    postalCode: dto.postalCode ?? "",
    country: dto.country ?? "",
    isDefault: false,
    phone: null,
    isShipping: true,
    isBilling: true,
  };
}

function mapOrderFromDto(dto: OrderResponseDto): Order {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber || dto.id.slice(0, 8).toUpperCase(),
    status: dto.status,
    subtotal: dto.subtotal?.toString() ?? "0",
    discount: dto.discount?.toString() ?? "0",
    tax: dto.tax?.toString() ?? "0",
    shipping: "0", // Order doesn't have shipping field - calculated from delivery method
    total: dto.total?.toString() ?? "0",
    shippingAddress: dto.shippingAddress
      ? mapOrderAddressFromDto(dto.shippingAddress)
      : {
          id: "",
          label: "Shipping Address",
          firstName: "",
          lastName: "",
          company: null,
          street1: "",
          street2: null,
          city: "",
          state: null,
          postalCode: "",
          country: "",
          isDefault: false,
          phone: null,
          isShipping: true,
          isBilling: false,
        },
    billingAddress: dto.billingAddress
      ? mapOrderAddressFromDto(dto.billingAddress)
      : null,
    deliveryMethod: null, // Order doesn't include delivery method details
    notes: dto.notes,
    items: (dto.items || []).map((item) => ({
      id: item.id,
      productName: item.productName,
      productSku: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice?.toString() ?? "0",
      discount: item.discount?.toString() ?? "0",
      total: item.total?.toString() ?? "0",
    })),
    createdAt: dto.createdAt,
    estimatedDelivery: dto.estimatedDelivery,
  };
}

function mapPaymentMethodFromDto(dto: PaymentMethodResponseDto): PaymentMethod {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    type: dto.type,
    isActive: dto.isActive,
    sortOrder: dto.sortOrder,
    minAmount: dto.minAmount,
    maxAmount: dto.maxAmount,
  };
}

function mapSalaryDeductionFromDto(
  dto: SalaryDeductionResponseDto
): SalaryDeduction {
  return {
    id: dto.id,
    monthlyLimit: dto.monthlyLimit,
    usedAmount: dto.usedAmount,
    remainingAmount: dto.remainingAmount,
    isEnabled: dto.isEnabled,
    periodStart: dto.periodStart,
    periodEnd: dto.periodEnd,
  };
}

function mapPaymentFromDto(dto: PaymentResponseDto): Payment {
  return {
    id: dto.id,
    paymentNumber: dto.paymentNumber,
    amount: dto.amount,
    currency: dto.currency,
    status: dto.status,
    externalRef: dto.externalRef,
    orderId: dto.orderId,
    paymentMethodId: dto.paymentMethodId,
    paymentMethod: {
      id: dto.paymentMethod?.id,
      code: dto.paymentMethod?.code,
      name: dto.paymentMethod?.name,
      type: dto.paymentMethod?.type as PaymentMethodType | undefined,
    },
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
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

export function formatAddress(address: UserAddress): string {
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

export function getFullName(address: UserAddress): string {
  return [address.firstName, address.lastName].filter(Boolean).join(" ");
}

export function getDeliveryEstimate(days: number): string {
  const today = new Date();
  const delivery = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  return delivery.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
