"use client";

import { createApiClient } from "@b2b/api-client";
import type {
  UserAddressResponseDto,
  AddressResponseDto,
  CreateUserAddressDto,
  DeliveryMethodResponseDto,
  OrderResponseDto,
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
    queryKey: ["user-addresses"],
    queryFn: async (): Promise<UserAddress[]> => {
      const { data, error } = await client.GET("/api/v1/users/me/addresses");
      if (error) {
        return [];
      }
      return (data as unknown as UserAddressResponseDto[]).map(mapAddressFromDto);
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useCreateAddress() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAddressParams): Promise<UserAddress> => {
      const { data, error } = await client.POST("/api/v1/users/me/addresses", {
        body: params as CreateUserAddressDto,
      });
      if (error) throw new Error("Failed to create address");
      return mapAddressFromDto(data as unknown as UserAddressResponseDto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-addresses"] });
    },
  });
}

export function useUpdateAddress() {
  const client = useApiClient();
  const queryClient = useQueryClient();

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
      if (error) throw new Error("Failed to update address");
      return mapAddressFromDto(data as unknown as UserAddressResponseDto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-addresses"] });
    },
  });
}

export function useDeleteAddress() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client.DELETE("/api/v1/users/me/addresses/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to delete address");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-addresses"] });
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
    queryKey: ["delivery-methods"],
    queryFn: async (): Promise<DeliveryMethod[]> => {
      const { data, error } = await client.GET("/api/v1/delivery-methods");
      if (error) {
        return [];
      }
      return (data as unknown as DeliveryMethodResponseDto[]).map(
        mapDeliveryMethodFromDto
      );
    },
    enabled: isAuthenticated && !!user?.tenantId,
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
