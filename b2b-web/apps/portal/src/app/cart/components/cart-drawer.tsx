"use client";

import {
  Button,
  Input,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@b2b/ui";
import {
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import {
  Cart,
  CartItem,
  formatCartPrice,
  useApplyCoupon,
  useCart,
  useClearCart,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartItem,
} from "../hooks";

// =============================================================================
// Cart Item Component
// =============================================================================

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  isUpdating: boolean;
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  isUpdating,
}: CartItemRowProps) {
  const handleDecrease = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  return (
    <div className="flex gap-3 py-4 border-b">
      {/* Product Image Placeholder */}
      <div className="relative w-16 h-16 flex-shrink-0 bg-muted rounded-md overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium line-clamp-2">{item.productName}</h4>
        {item.productSku && (
          <p className="text-xs text-muted-foreground mt-0.5">
            SKU: {item.productSku}
          </p>
        )}
        <p className="text-sm font-semibold text-primary mt-1">
          {formatCartPrice(item.unitPrice)}
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center border rounded">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDecrease}
              disabled={item.quantity <= 1 || isUpdating}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleIncrease}
              disabled={isUpdating}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onRemove(item.id)}
            disabled={isUpdating}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Line Total */}
      <div className="text-right">
        <p className="text-sm font-semibold">{formatCartPrice(item.total)}</p>
        {parseFloat(item.discount) > 0 && (
          <p className="text-xs text-green-600 dark:text-green-400">
            -{formatCartPrice(item.discount)}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Coupon Input Component
// =============================================================================

interface CouponInputProps {
  appliedCoupon?: string | null;
  couponDiscount: string;
  onApply: (code: string) => void;
  onRemove: () => void;
  isApplying: boolean;
  isRemoving: boolean;
}

function CouponInput({
  appliedCoupon,
  couponDiscount,
  onApply,
  onRemove,
  isApplying,
  isRemoving,
}: CouponInputProps) {
  const [code, setCode] = useState("");

  const handleApply = () => {
    if (code.trim()) {
      onApply(code.trim());
      setCode("");
    }
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              {appliedCoupon}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              -{formatCartPrice(couponDiscount)} savings
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRemove}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        placeholder="Coupon code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleApply()}
        className="flex-1"
      />
      <Button
        variant="outline"
        onClick={handleApply}
        disabled={!code.trim() || isApplying}
      >
        {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
      </Button>
    </div>
  );
}

// =============================================================================
// Cart Summary Component
// =============================================================================

interface CartSummaryProps {
  cart: Cart;
}

function CartSummary({ cart }: CartSummaryProps) {
  const hasDiscount =
    parseFloat(cart.discount) > 0 || parseFloat(cart.couponDiscount) > 0;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCartPrice(cart.subtotal)}</span>
      </div>

      {parseFloat(cart.discount) > 0 && (
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>Item Discounts</span>
          <span>-{formatCartPrice(cart.discount)}</span>
        </div>
      )}

      {parseFloat(cart.couponDiscount) > 0 && (
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>Coupon ({cart.couponCode})</span>
          <span>-{formatCartPrice(cart.couponDiscount)}</span>
        </div>
      )}

      {parseFloat(cart.tax) > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCartPrice(cart.tax)}</span>
        </div>
      )}

      <div className="flex justify-between font-semibold text-base pt-2 border-t">
        <span>Total</span>
        <span className="text-primary">{formatCartPrice(cart.total)}</span>
      </div>

      {hasDiscount && (
        <p className="text-xs text-green-600 dark:text-green-400 text-right">
          You save{" "}
          {formatCartPrice(
            parseFloat(cart.discount) + parseFloat(cart.couponDiscount)
          )}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Main Cart Drawer Component
// =============================================================================

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const clearCart = useClearCart();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      setUpdatingItemId(itemId);
      try {
        await updateItem.mutateAsync({ itemId, quantity });
      } finally {
        setUpdatingItemId(null);
      }
    },
    [updateItem]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      setUpdatingItemId(itemId);
      try {
        await removeItem.mutateAsync(itemId);
      } finally {
        setUpdatingItemId(null);
      }
    },
    [removeItem]
  );

  const handleClearCart = useCallback(async () => {
    await clearCart.mutateAsync();
  }, [clearCart]);

  const handleApplyCoupon = useCallback(
    async (code: string) => {
      if (!cart) return;
      await applyCoupon.mutateAsync({
        code,
        orderAmount: parseFloat(cart.subtotal),
      });
    },
    [applyCoupon, cart]
  );

  const handleRemoveCoupon = useCallback(async () => {
    await removeCoupon.mutateAsync();
  }, [removeCoupon]);

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            {cart && cart.itemCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Review your items before checkout
          </SheetDescription>
        </SheetHeader>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <SheetClose asChild>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/catalog">Browse products</Link>
                </Button>
              </SheetClose>
            </div>
          ) : (
            <div>
              {/* Clear Cart Button */}
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleClearCart}
                  disabled={clearCart.isPending}
                >
                  {clearCart.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Clear all
                </Button>
              </div>

              {/* Cart Items */}
              <div className="space-y-0">
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                    isUpdating={updatingItemId === item.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Summary & Checkout */}
        {!isEmpty && cart && (
          <SheetFooter className="flex-col gap-4 sm:flex-col mt-4">
            {/* Coupon Input */}
            <CouponInput
              appliedCoupon={cart.couponCode}
              couponDiscount={cart.couponDiscount}
              onApply={handleApplyCoupon}
              onRemove={handleRemoveCoupon}
              isApplying={applyCoupon.isPending}
              isRemoving={removeCoupon.isPending}
            />

            {/* Cart Summary */}
            <CartSummary cart={cart} />

            {/* Checkout Button */}
            <SheetClose asChild>
              <Button asChild className="w-full" size="lg">
                <Link href="/checkout">Proceed to Checkout</Link>
              </Button>
            </SheetClose>

            {/* Continue Shopping */}
            <SheetClose asChild>
              <Button variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
