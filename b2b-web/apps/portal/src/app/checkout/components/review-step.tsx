"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  cn,
} from "@b2b/ui";
import {
  AlertCircle,
  Banknote,
  ChevronLeft,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Receipt,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { useCheckout } from "../context";
import {
  useCreateOrder,
  useProcessPayment,
  formatAddress,
  getFullName,
  getDeliveryEstimate,
  type PaymentMethodType as ApiPaymentMethodType,
} from "../hooks";

import { useCart, formatCartPrice, type Cart } from "@/app/cart/hooks";

// =============================================================================
// Icon Mapping
// =============================================================================

const PAYMENT_METHOD_ICONS: Record<ApiPaymentMethodType, typeof CreditCard> = {
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  BANK_TRANSFER: Banknote,
  SALARY_DEDUCTION: Wallet,
  INVOICE: Receipt,
  WALLET: Wallet,
};

// =============================================================================
// Order Item Row Component
// =============================================================================

interface OrderItemRowProps {
  item: Cart["items"][number];
}

function OrderItemRow({ item }: OrderItemRowProps) {
  const hasDiscount = parseFloat(item.discount) > 0;

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      {/* Product Image Placeholder */}
      <div className="w-12 h-12 flex-shrink-0 bg-muted rounded-md flex items-center justify-center">
        <Package className="w-6 h-6 text-muted-foreground" />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium line-clamp-1">{item.productName}</h4>
        {item.productSku && (
          <p className="text-xs text-muted-foreground">SKU: {item.productSku}</p>
        )}
        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
      </div>

      {/* Line Total */}
      <div className="text-right">
        <p className="text-sm font-medium">{formatCartPrice(item.total)}</p>
        {hasDiscount && (
          <p className="text-xs text-green-600 dark:text-green-400">
            -{formatCartPrice(item.discount)} off
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Payment Method Label
// =============================================================================

function PaymentMethodLabel({
  method,
  methodName,
  poNumber,
}: {
  method?: ApiPaymentMethodType;
  methodName?: string;
  poNumber?: string;
}) {
  const Icon = method ? PAYMENT_METHOD_ICONS[method] : Receipt;
  const displayName = methodName || (method ? method.replace(/_/g, " ") : "Unknown");

  return (
    <div className="text-sm">
      <div className="font-medium flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span>{displayName}</span>
      </div>
      {poNumber && (
        <p className="text-muted-foreground mt-1">
          PO#: {poNumber}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Order Summary Component
// =============================================================================

interface OrderSummaryProps {
  cart: Cart;
  shippingCost: number;
}

function OrderSummary({ cart, shippingCost }: OrderSummaryProps) {
  const subtotal = parseFloat(cart.subtotal);
  const discount = parseFloat(cart.discount);
  const couponDiscount = parseFloat(cart.couponDiscount);
  const tax = parseFloat(cart.tax);
  const total = subtotal - discount - couponDiscount + tax + shippingCost;

  const hasDiscount = discount > 0 || couponDiscount > 0;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal ({cart.itemCount} items)</span>
        <span>{formatCartPrice(subtotal)}</span>
      </div>

      {discount > 0 && (
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>Item Discounts</span>
          <span>-{formatCartPrice(discount)}</span>
        </div>
      )}

      {couponDiscount > 0 && (
        <div className="flex justify-between text-green-600 dark:text-green-400">
          <span>Coupon ({cart.couponCode})</span>
          <span>-{formatCartPrice(couponDiscount)}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-muted-foreground">Shipping</span>
        <span>
          {shippingCost === 0 ? (
            <span className="text-green-600 dark:text-green-400">FREE</span>
          ) : (
            formatCartPrice(shippingCost)
          )}
        </span>
      </div>

      {tax > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCartPrice(tax)}</span>
        </div>
      )}

      <div className="flex justify-between font-semibold text-base pt-2 border-t">
        <span>Order Total</span>
        <span className="text-primary">{formatCartPrice(total)}</span>
      </div>

      {hasDiscount && (
        <p className="text-xs text-green-600 dark:text-green-400 text-right">
          You save {formatCartPrice(discount + couponDiscount)}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Main Review Step Component
// =============================================================================

export function ReviewStep() {
  const {
    state,
    setOrderNotes,
    setTermsAccepted,
    setOrderId,
    setProcessing,
    setError,
    goToStep,
    prevStep,
  } = useCheckout();

  const { data: cart, isLoading: isLoadingCart } = useCart();
  const createOrder = useCreateOrder();
  const processPayment = useProcessPayment();

  const shippingCost = state.deliveryMethod
    ? parseFloat(state.deliveryMethod.price)
    : 0;

  const handlePlaceOrder = async () => {
    if (!state.shippingAddress || !state.deliveryMethod || !state.termsAccepted) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Step 1: Create the order
      const order = await createOrder.mutateAsync({
        shippingAddressId: state.shippingAddress.id,
        billingAddressId: state.useSameAsBilling
          ? state.shippingAddress.id
          : state.billingAddress?.id,
        deliveryMethodId: state.deliveryMethod.id,
        paymentMethodId: state.selectedPaymentMethod?.id,
        notes: state.orderNotes || undefined,
        termsAccepted: state.termsAccepted,
      });

      // Step 2: Process payment if a payment method is selected
      if (state.selectedPaymentMethod) {
        try {
          await processPayment.mutateAsync({
            orderId: order.id,
            paymentMethodId: state.selectedPaymentMethod.id,
          });
        } catch (paymentError) {
          // Payment failed but order was created
          // Still proceed to confirmation - payment can be retried
          console.error("Payment processing error:", paymentError);
        }
      }

      setOrderId(order.id);
      goToStep("confirmation");
    } catch {
      setError("Failed to place order. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoadingCart) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
          <p className="text-muted-foreground mb-4">
            Add some items to your cart before checking out.
          </p>
          <Button asChild>
            <Link href="/catalog">Browse Products</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {state.error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{state.error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Shipping Address
                </CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => goToStep("address")}
                >
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {state.shippingAddress && (
                <div className="text-sm">
                  <p className="font-medium">
                    {state.shippingAddress.label || getFullName(state.shippingAddress)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatAddress(state.shippingAddress)}
                  </p>
                  {state.shippingAddress.phone && (
                    <p className="text-muted-foreground">
                      {state.shippingAddress.phone}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Method */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Delivery Method
                </CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => goToStep("delivery")}
                >
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {state.deliveryMethod && (
                <div className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{state.deliveryMethod.name}</p>
                    <p className="font-medium">
                      {shippingCost === 0
                        ? "FREE"
                        : formatCartPrice(shippingCost)}
                    </p>
                  </div>
                  <p className="text-muted-foreground">
                    Estimated delivery:{" "}
                    {getDeliveryEstimate(state.deliveryMethod.estimatedDays)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => goToStep("payment")}
                >
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {state.selectedPaymentMethod ? (
                <PaymentMethodLabel
                  method={state.selectedPaymentMethod.type}
                  methodName={state.selectedPaymentMethod.name}
                  poNumber={state.paymentMethodType === "purchase_order" ? state.purchaseOrderNumber : undefined}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No payment method selected</p>
              )}

              {/* Salary deduction notice */}
              {state.selectedPaymentMethod?.type === "SALARY_DEDUCTION" && (
                <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground">
                    This amount will be deducted from your next salary.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Order Items ({cart.itemCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {cart.items.map((item) => (
                  <OrderItemRow key={item.id} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Order Notes (Optional)
              </CardTitle>
              <CardDescription>
                Add any special instructions for your order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g., Please leave at reception"
                value={state.orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrderSummary cart={cart} shippingCost={shippingCost} />

              {/* Terms Acceptance */}
              <div
                className={cn(
                  "flex items-start gap-2 p-3 rounded-lg border",
                  state.termsAccepted
                    ? "border-primary bg-primary/5"
                    : "border-border"
                )}
              >
                <Checkbox
                  id="terms"
                  checked={state.termsAccepted}
                  onCheckedChange={(checked) =>
                    setTermsAccepted(checked === true)
                  }
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-primary underline"
                    target="_blank"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-primary underline"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              {/* Place Order Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={!state.termsAccepted || state.isProcessing || !state.selectedPaymentMethod}
              >
                {state.isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Place Order"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-start">
        <Button variant="outline" size="lg" onClick={prevStep}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Payment
        </Button>
      </div>
    </div>
  );
}
