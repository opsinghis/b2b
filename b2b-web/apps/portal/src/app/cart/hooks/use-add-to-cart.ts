"use client";

import { useToast } from "@b2b/ui";
import { useCallback, useState } from "react";

import { useAddToCart } from "./use-cart";

export interface ProductForCart {
  id: string;
  name: string;
  sku: string;
  effectivePrice: string;
  quantity?: number;
}

export function useAddProductToCart() {
  const addToCart = useAddToCart();
  const { addToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const addProduct = useCallback(
    async (product: ProductForCart) => {
      setIsAdding(true);
      try {
        await addToCart.mutateAsync({
          masterProductId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: product.quantity ?? 1,
          unitPrice: parseFloat(product.effectivePrice),
        });

        addToast({
          title: "Added to cart",
          description: `${product.name} has been added to your cart.`,
          variant: "success",
          duration: 3000,
        });

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to add item to cart";
        addToast({
          title: "Error",
          description: message,
          variant: "error",
          duration: 5000,
        });
        return false;
      } finally {
        setIsAdding(false);
      }
    },
    [addToCart, addToast]
  );

  return {
    addProduct,
    isAdding,
  };
}
