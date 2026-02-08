"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export interface CartItem {
  id: string;
  masterProductId?: string | null;
  productName: string;
  productSku?: string | null;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  couponCode?: string | null;
  couponDiscount: string;
  metadata: Record<string, unknown>;
  items: CartItem[];
  itemCount: number;
  tenantId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartParams {
  masterProductId?: string;
  productName?: string;
  productSku?: string;
  quantity: number;
  unitPrice?: number;
}

export interface UpdateCartItemParams {
  itemId: string;
  quantity: number;
  discount?: number;
}

// =============================================================================
// Local Storage Helpers
// =============================================================================

const CART_STORAGE_KEY = "b2b_cart";

interface LocalCartItem {
  masterProductId?: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  addedAt: string;
}

function getLocalCart(): LocalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalCart(items: LocalCartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Handle quota exceeded or other errors
  }
}

function clearLocalCart(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // Handle errors
  }
}

function addToLocalCart(item: Omit<LocalCartItem, "addedAt">): LocalCartItem[] {
  const cart = getLocalCart();
  const existingIndex = cart.findIndex(
    (i) =>
      i.masterProductId === item.masterProductId &&
      i.productSku === item.productSku
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += item.quantity;
  } else {
    cart.push({ ...item, addedAt: new Date().toISOString() });
  }

  setLocalCart(cart);
  return cart;
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
// Cart Hooks
// =============================================================================

export function useCart() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["cart"],
    queryFn: async (): Promise<Cart | null> => {
      const { data, error } = await client.GET("/api/v1/cart");
      if (error) {
        // Return null if cart doesn't exist yet
        return null;
      }
      return data as unknown as Cart;
    },
    enabled: isAuthenticated && !!user?.tenantId,
    staleTime: 30000, // 30 seconds
  });
}

export function useAddToCart() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  return useMutation({
    mutationFn: async (params: AddToCartParams): Promise<Cart> => {
      if (!isAuthenticated) {
        // Store in localStorage for unauthenticated users
        addToLocalCart({
          masterProductId: params.masterProductId,
          productName: params.productName || "",
          productSku: params.productSku,
          quantity: params.quantity,
          unitPrice: params.unitPrice || 0,
        });
        throw new Error("Please sign in to add items to your cart");
      }

      const { data, error } = await client.POST("/api/v1/cart/items", {
        body: {
          masterProductId: params.masterProductId,
          productName: params.productName,
          productSku: params.productSku,
          quantity: params.quantity,
          unitPrice: params.unitPrice,
        },
      });
      if (error) throw new Error("Failed to add item to cart");
      return data as unknown as Cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useUpdateCartItem() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateCartItemParams): Promise<Cart> => {
      const { data, error } = await client.PATCH("/api/v1/cart/items/{id}", {
        params: { path: { id: params.itemId } },
        body: {
          quantity: params.quantity,
          discount: params.discount,
        },
      });
      if (error) throw new Error("Failed to update cart item");
      return data as unknown as Cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveCartItem() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string): Promise<Cart> => {
      const { data, error } = await client.DELETE("/api/v1/cart/items/{id}", {
        params: { path: { id: itemId } },
      });
      if (error) throw new Error("Failed to remove item from cart");
      return data as unknown as Cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useClearCart() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<Cart> => {
      const { data, error } = await client.DELETE("/api/v1/cart");
      if (error) throw new Error("Failed to clear cart");
      return data as unknown as Cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useApplyCoupon() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      code,
      orderAmount,
    }: {
      code: string;
      orderAmount: number;
    }): Promise<Cart> => {
      const { data, error } = await client.POST("/api/v1/cart/apply-coupon", {
        body: { code, orderAmount },
      });
      if (error) throw new Error("Invalid coupon code");
      return data as unknown as Cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveCoupon() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<Cart> => {
      const { data, error } = await client.DELETE("/api/v1/cart/coupon");
      if (error) throw new Error("Failed to remove coupon");
      return data as unknown as Cart;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

// =============================================================================
// Local Cart Sync Hook (for syncing localStorage cart after login)
// =============================================================================

export function useSyncLocalCart() {
  const { isAuthenticated } = useAuth();
  const addToCart = useAddToCart();
  const queryClient = useQueryClient();

  const syncCart = useCallback(async () => {
    if (!isAuthenticated) return;

    const localCart = getLocalCart();
    if (localCart.length === 0) return;

    // Sync local cart items to server
    for (const item of localCart) {
      try {
        await addToCart.mutateAsync({
          masterProductId: item.masterProductId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });
      } catch {
        // Ignore individual item sync failures
      }
    }

    // Clear local cart after sync
    clearLocalCart();
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  }, [isAuthenticated, addToCart, queryClient]);

  // Sync on login
  useEffect(() => {
    if (isAuthenticated) {
      syncCart();
    }
  }, [isAuthenticated, syncCart]);

  return { syncCart };
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatCartPrice(
  value: string | number,
  currency: string = "USD"
): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(numValue);
}

export function calculateItemTotal(unitPrice: string, quantity: number): number {
  return parseFloat(unitPrice) * quantity;
}
