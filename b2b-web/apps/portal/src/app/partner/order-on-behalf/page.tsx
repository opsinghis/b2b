"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  useToast,
} from "@b2b/ui";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  CheckCircle,
  Package,
  ShoppingCart,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";

import { useCatalogProducts, type CatalogProduct } from "../../catalog/hooks/use-catalog";
import {
  OrderAttributionTracking,
  OrderAttributionConfirmation,
} from "../components/order-attribution-tracking";
import {
  OrderOnBehalfIndicator,
  OrderOnBehalfBanner,
} from "../components/order-on-behalf-indicator";
import {
  TeamMemberAddressSelector,
} from "../components/team-member-address-selector";
import {
  NotificationToggle,
} from "../components/team-member-notification-preview";
import {
  TeamMemberSelector,
} from "../components/team-member-selector";
import {
  usePartnerProfile,
  useTeamMemberDiscount,
  useCreateOrderOnBehalf,
  formatPrice,
  type TeamMember,
  type TeamMemberAddress,
  type OrderOnBehalfResult,
} from "../hooks";

interface CartItem {
  productId: string;
  productName: string;
  sku: string;
  basePrice: number;
  quantity: number;
}

type OrderStep = "select-member" | "add-products" | "select-address" | "review" | "confirmation";

function OrderOnBehalfPageSkeleton() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
      <div className="h-48 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

function OrderOnBehalfContent() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [currentStep, setCurrentStep] = useState<OrderStep>("select-member");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<TeamMemberAddress | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState("");
  const [notifyTeamMember, setNotifyTeamMember] = useState(true);
  const [applyDiscount] = useState(true);
  const [orderResult, setOrderResult] = useState<OrderOnBehalfResult | null>(null);

  // API Hooks
  const { data: profile, isLoading: profileLoading } = usePartnerProfile();
  const { data: productsData, isLoading: productsLoading } = useCatalogProducts({
    search: searchQuery,
    limit: 6,
  });
  const { data: memberDiscount } = useTeamMemberDiscount(selectedMember?.userId ?? null);
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrderOnBehalf();

  const products = productsData?.data ?? [];

  // Computed values
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!applyDiscount || !memberDiscount) return 0;
    return subtotal * (memberDiscount.discountPercent / 100);
  }, [subtotal, applyDiscount, memberDiscount]);

  const total = subtotal - discountAmount;

  // Handlers
  const handleSelectMember = useCallback((member: TeamMember | null) => {
    setSelectedMember(member);
    setSelectedAddress(null); // Reset address when member changes
    if (member) {
      setCurrentStep("add-products");
    }
  }, []);

  const addToCart = useCallback((product: CatalogProduct) => {
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
          basePrice: parseFloat(product.effectivePrice),
          quantity: 1,
        },
      ];
    });
    setSearchQuery("");
  }, []);

  const updateQuantity = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const handleContinueToAddress = useCallback(() => {
    if (cart.length === 0) {
      addToast({
        title: "Cart is empty",
        description: "Please add at least one product to continue",
        variant: "error",
      });
      return;
    }
    setCurrentStep("select-address");
  }, [cart.length, addToast]);

  const handleContinueToReview = useCallback(() => {
    if (!selectedAddress) {
      addToast({
        title: "No address selected",
        description: "Please select a delivery address",
        variant: "error",
      });
      return;
    }
    setCurrentStep("review");
  }, [selectedAddress, addToast]);

  const handlePlaceOrder = useCallback(() => {
    if (!selectedMember || cart.length === 0) return;

    createOrder(
      {
        teamMemberUserId: selectedMember.userId,
        items: cart.map((item) => ({
          masterProductId: item.productId,
          quantity: item.quantity,
        })),
        shippingAddressId: selectedAddress?.id,
        notes: notes.trim() || undefined,
        applyTeamMemberDiscount: applyDiscount,
        notifyTeamMember,
      },
      {
        onSuccess: (result) => {
          setOrderResult(result);
          setCurrentStep("confirmation");
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["partner-team-members"] });
          addToast({
            title: "Order placed successfully",
            description: `Order #${result.orderNumber} has been created`,
            variant: "success",
          });
        },
        onError: () => {
          addToast({
            title: "Failed to place order",
            description: "Please try again",
            variant: "error",
          });
        },
      }
    );
  }, [
    selectedMember,
    cart,
    selectedAddress,
    notes,
    applyDiscount,
    notifyTeamMember,
    createOrder,
    queryClient,
    addToast,
  ]);

  const handleNewOrder = useCallback(() => {
    setSelectedMember(null);
    setSelectedAddress(null);
    setCart([]);
    setNotes("");
    setOrderResult(null);
    setCurrentStep("select-member");
  }, []);

  if (profileLoading) {
    return <OrderOnBehalfPageSkeleton />;
  }

  if (!profile) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Partner Access Required</h2>
          <p className="text-muted-foreground mb-4">
            You need partner access to place orders on behalf of team members.
          </p>
          <Button asChild>
            <Link href="/partner">Go to Partner Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/partner">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Partner Dashboard
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Order on Behalf</h1>
        <p className="text-muted-foreground">
          Place an order for a team member with their discount applied
        </p>
      </div>

      {/* Progress Steps */}
      <OrderSteps currentStep={currentStep} />

      {/* Order On Behalf Banner */}
      {selectedMember && currentStep !== "confirmation" && (
        <OrderOnBehalfBanner
          teamMember={selectedMember}
          onCancel={() => {
            setSelectedMember(null);
            setCurrentStep("select-member");
          }}
        />
      )}

      {/* Step Content */}
      {currentStep === "select-member" && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Team Member</CardTitle>
            <CardDescription>
              Choose the team member you want to place an order for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMemberSelector
              selectedMemberId={selectedMember?.userId ?? null}
              onSelectMember={handleSelectMember}
              label=""
              showStats={true}
            />
          </CardContent>
        </Card>
      )}

      {currentStep === "add-products" && selectedMember && (
        <div className="space-y-6">
          {/* Product Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Step 2: Add Products
              </CardTitle>
              <CardDescription>
                Search and add products to the order
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
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
                          onClick={() => addToCart(product)}
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
              {cart.length > 0 ? (
                <div className="space-y-3">
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
                            {formatPrice(item.basePrice)} each
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

                  {/* Subtotal */}
                  <div className="flex justify-between text-sm pt-2">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Search for products to add to the order</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Member Discount Preview */}
          {memberDiscount && memberDiscount.discountPercent > 0 && (
            <OrderOnBehalfIndicator
              teamMember={selectedMember}
              discount={memberDiscount}
              showDeliveryInfo={false}
              showNotificationInfo={false}
              partnerName={profile.companyName}
            />
          )}

          {/* Continue Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleContinueToAddress}
              disabled={cart.length === 0}
            >
              Continue to Address
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {currentStep === "select-address" && selectedMember && (
        <div className="space-y-6">
          <TeamMemberAddressSelector
            teamMemberUserId={selectedMember.userId}
            selectedAddressId={selectedAddress?.id ?? null}
            onSelectAddress={setSelectedAddress}
            title="Step 3: Select Delivery Address"
            description={`Choose where to deliver this order for ${selectedMember.firstName}`}
          />

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("add-products")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
            <Button
              size="lg"
              onClick={handleContinueToReview}
              disabled={!selectedAddress}
            >
              Continue to Review
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {currentStep === "review" && selectedMember && (
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Step 4: Review Order</CardTitle>
              <CardDescription>
                Review the order details before placing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Items */}
              <div>
                <Label className="mb-2 block">Order Items</Label>
                <div className="border rounded-lg divide-y">
                  {cart.map((item) => (
                    <div key={item.productId} className="p-3 flex justify-between">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} x {formatPrice(item.basePrice)}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.basePrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Totals */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>
                      Team Member Discount ({memberDiscount?.discountPercent}%)
                    </span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Order Notes (optional)</Label>
                <Input
                  id="notes"
                  placeholder="Add any special instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Notification Toggle */}
              <NotificationToggle
                enabled={notifyTeamMember}
                onEnabledChange={setNotifyTeamMember}
                teamMemberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
              />
            </CardContent>
          </Card>

          {/* Attribution Tracking */}
          <OrderAttributionTracking
            partnerProfile={profile}
            teamMemberName={`${selectedMember.firstName} ${selectedMember.lastName}`}
            orderTotal={total}
          />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep("select-address")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Address
            </Button>
            <Button
              size="lg"
              onClick={handlePlaceOrder}
              disabled={isCreatingOrder}
            >
              {isCreatingOrder ? (
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
          </div>
        </div>
      )}

      {currentStep === "confirmation" && orderResult && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
                <h2 className="text-2xl font-bold">Order Placed Successfully!</h2>
                <p className="text-muted-foreground mt-2">
                  Order #{orderResult.orderNumber} has been created for{" "}
                  {selectedMember?.firstName} {selectedMember?.lastName}
                </p>
              </div>

              <OrderAttributionConfirmation result={orderResult} />
            </CardContent>
          </Card>

          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={handleNewOrder}>
              Place Another Order
            </Button>
            <Button asChild>
              <Link href="/partner">Back to Partner Dashboard</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderSteps({ currentStep }: { currentStep: OrderStep }) {
  const steps = [
    { id: "select-member", label: "Select Member" },
    { id: "add-products", label: "Add Products" },
    { id: "select-address", label: "Address" },
    { id: "review", label: "Review" },
    { id: "confirmation", label: "Done" },
  ];

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              index < currentIndex
                ? "bg-green-600 text-white"
                : index === currentIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index < currentIndex ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </div>
          <span
            className={`ml-2 text-sm ${
              index === currentIndex
                ? "font-medium"
                : "text-muted-foreground"
            } hidden sm:inline`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-2 ${
                index < currentIndex ? "bg-green-600" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OrderOnBehalfPage() {
  return (
    <RequireAuth
      fallback={<OrderOnBehalfPageSkeleton />}
      redirectTo="/login"
    >
      <OrderOnBehalfContent />
    </RequireAuth>
  );
}
