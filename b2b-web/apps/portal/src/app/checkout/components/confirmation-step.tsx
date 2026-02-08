"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  MapPin,
  Package,
  Printer,
  Receipt,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { useCheckout, type PaymentMethod } from "../context";
import {
  useOrder,
  formatPrice,
  formatAddress,
  getFullName,
  getDeliveryEstimate,
} from "../hooks";

// =============================================================================
// Payment Method Label
// =============================================================================

function PaymentMethodLabel({ method }: { method: PaymentMethod }) {
  const labels: Record<PaymentMethod, { label: string; icon: typeof CreditCard }> = {
    invoice: { label: "Invoice (Net 30)", icon: Receipt },
    purchase_order: { label: "Purchase Order", icon: FileText },
    credit_card: { label: "Credit Card", icon: CreditCard },
  };

  const { label, icon: Icon } = labels[method];

  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
}

// =============================================================================
// Main Confirmation Step Component
// =============================================================================

export function ConfirmationStep() {
  const { state, reset } = useCheckout();
  const { data: order, isLoading } = useOrder(state.orderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Order Not Found</h3>
          <p className="text-muted-foreground mb-4">
            We could not find your order details.
          </p>
          <Button asChild onClick={reset}>
            <Link href="/checkout">Start New Order</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const shippingCost = order.deliveryMethod
    ? parseFloat(order.deliveryMethod.price)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Order Placed Successfully!</h1>
        <p className="text-muted-foreground">
          Thank you for your order. We&apos;ve sent a confirmation email to your
          registered email address.
        </p>
      </div>

      {/* Order Number Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="text-xl font-bold">{order.orderNumber}</p>
            </div>
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Shipping Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <p className="font-medium">
                {order.shippingAddress.label || getFullName(order.shippingAddress)}
              </p>
              <p className="text-muted-foreground">
                {formatAddress(order.shippingAddress)}
              </p>
              {order.shippingAddress.phone && (
                <p className="text-muted-foreground">
                  {order.shippingAddress.phone}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Delivery Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.deliveryMethod ? (
              <div className="text-sm">
                <p className="font-medium">{order.deliveryMethod.name}</p>
                <p className="text-muted-foreground">
                  Estimated delivery:{" "}
                  {order.estimatedDelivery ||
                    getDeliveryEstimate(order.deliveryMethod.estimatedDays)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Delivery details will be confirmed
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              <PaymentMethodLabel method={state.paymentMethod} />
            </div>
            {state.paymentMethod === "purchase_order" &&
              state.purchaseOrderNumber && (
                <p className="text-sm text-muted-foreground mt-1">
                  PO#: {state.purchaseOrderNumber}
                </p>
              )}
          </CardContent>
        </Card>

        {/* Order Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                {order.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              You will receive updates as your order progresses.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Order Items
          </CardTitle>
          <CardDescription>
            {order.items.length} item{order.items.length !== 1 ? "s" : ""} in
            your order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 py-3">
                <div className="w-12 h-12 flex-shrink-0 bg-muted rounded-md flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium line-clamp-1">
                    {item.productName}
                  </h4>
                  {item.productSku && (
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.productSku}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatPrice(item.total)}
                  </p>
                  {parseFloat(item.discount) > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      -{formatPrice(item.discount)} off
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {parseFloat(order.discount) > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discounts</span>
                <span>-{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {shippingCost === 0 ? (
                  <span className="text-green-600 dark:text-green-400">
                    FREE
                  </span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>
            {parseFloat(order.tax) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-2 border-t">
              <span>Order Total</span>
              <span className="text-primary">{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Notes */}
      {order.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
        <Button asChild variant="outline" size="lg">
          <Link href={`/orders/${order.id}`}>View Order Details</Link>
        </Button>
        <Button asChild size="lg" onClick={reset}>
          <Link href="/catalog">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
