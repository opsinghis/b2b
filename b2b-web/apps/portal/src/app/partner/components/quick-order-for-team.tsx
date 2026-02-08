"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn,
} from "@b2b/ui";
import {
  ShoppingCart,
  Users,
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Package,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";

import { useCatalogProducts, type CatalogProduct } from "../../catalog/hooks/use-catalog";
import {
  useTeamMembers,
  useCreateOrderOnBehalf,
  formatPrice,
} from "../hooks";

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  price: number;
  quantity: number;
}

export function QuickOrderForTeam() {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");

  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: productsData, isLoading: productsLoading } = useCatalogProducts({
    search: searchQuery,
    limit: 5,
  });
  const {
    mutate: createOrder,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
  } = useCreateOrderOnBehalf();

  const teamMembers = members ?? [];
  const products = productsData?.data ?? [];
  const selectedMember = teamMembers.find((m) => m.userId === selectedMemberId);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const addToCart = (product: {
    id: string;
    name: string;
    sku: string;
    price: number;
  }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
        },
      ];
    });
    setSearchQuery("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleSubmit = () => {
    if (!selectedMemberId || cart.length === 0) return;

    createOrder(
      {
        teamMemberUserId: selectedMemberId,
        items: cart.map((item) => ({
          masterProductId: item.productId,
          quantity: item.quantity,
        })),
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCart([]);
          setNotes("");
          setSelectedMemberId("");
          setTimeout(() => reset(), 3000);
        },
      }
    );
  };

  const clearOrder = () => {
    setCart([]);
    setNotes("");
    setSelectedMemberId("");
    reset();
  };

  if (membersLoading) {
    return <QuickOrderForTeamSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Quick Order for Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isSuccess ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 dark:text-green-400 mb-3" />
            <h3 className="text-lg font-semibold">Order Placed Successfully!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              The order has been created for your team member.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearOrder}>
              Place Another Order
            </Button>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Add team members first to place orders on their behalf
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Select Team Member */}
            <div className="space-y-2">
              <Label>1. Select Team Member</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {teamMembers
                  .filter((m) => m.isActive)
                  .map((member) => (
                    <button
                      key={member.userId}
                      onClick={() => setSelectedMemberId(member.userId)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-colors",
                        selectedMemberId === member.userId
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="text-sm font-medium truncate">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Step 2: Add Products */}
            {selectedMemberId && (
              <div className="space-y-2 pt-4 border-t">
                <Label>2. Add Products</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Search Results */}
                {searchQuery && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {productsLoading ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                        Searching...
                      </div>
                    ) : products.length > 0 ? (
                      products.map((product: CatalogProduct) => (
                        <div
                          key={product.id}
                          className="p-3 flex items-center justify-between hover:bg-muted/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {product.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              SKU: {product.sku} | {formatPrice(product.effectivePrice)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              addToCart({
                                id: product.id,
                                name: product.name,
                                sku: product.sku,
                                price: parseFloat(product.effectivePrice),
                              })
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No products found
                      </div>
                    )}
                  </div>
                )}

                {/* Cart Items */}
                {cart.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <Label>Cart ({cart.length} items)</Label>
                    <div className="border rounded-lg divide-y">
                      {cart.map((item) => (
                        <div
                          key={item.productId}
                          className="p-3 flex items-center justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {item.productName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatPrice(item.price)} each
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Notes */}
                    <div className="pt-2">
                      <Label htmlFor="notes">Order Notes (optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Add any special instructions..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Order Summary */}
                    <div className="pt-4 border-t space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Order for: {selectedMember?.firstName} {selectedMember?.lastName}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatPrice(cartTotal)}</span>
                      </div>
                    </div>

                    {/* Error Message */}
                    {isError && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        {(error as Error)?.message || "Failed to create order"}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1"
                        onClick={handleSubmit}
                        disabled={isPending}
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Placing Order...
                          </>
                        ) : (
                          <>
                            <Package className="h-4 w-4 mr-2" />
                            Place Order
                          </>
                        )}
                      </Button>
                      <Button variant="outline" onClick={clearOrder}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}

                {/* No Items Message */}
                {cart.length === 0 && !searchQuery && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Search for products to add to the order
                  </div>
                )}
              </div>
            )}

            {/* Browse Catalog Link */}
            <div className="pt-4 border-t text-center">
              <Button variant="link" asChild>
                <Link href="/catalog">
                  Or browse the full catalog
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function QuickOrderForTeamSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-muted rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="space-y-2 pt-4 border-t">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
