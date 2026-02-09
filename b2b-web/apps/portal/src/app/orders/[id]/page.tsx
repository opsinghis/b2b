"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, Card, CardContent, CardHeader, useToast } from "@b2b/ui";
import { ArrowLeft, Headphones, RefreshCw, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import {
  OrderStatusTimeline,
  OrderTrackingInfo,
  OrderItemsSummary,
  CancelOrderModal,
} from "../components";
import {
  useOrder,
  useOrderTracking,
  useCancelOrder,
  useReorder,
  formatDate,
  getStatusLabel,
  getStatusColor,
  canCancelOrder,
} from "../hooks";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <RequireAuth fallback={<OrderDetailSkeleton />} redirectTo="/login">
      <OrderDetailContent orderId={id} />
    </RequireAuth>
  );
}

function OrderDetailContent({ orderId }: { orderId: string }) {
  const { addToast } = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: order, isLoading, error, refetch } = useOrder(orderId);
  const { data: tracking } = useOrderTracking(orderId);
  const cancelOrder = useCancelOrder();
  const reorder = useReorder();

  const handleCancelOrder = async (reason: string) => {
    try {
      await cancelOrder.mutateAsync({ orderId, reason });
      setShowCancelModal(false);
      addToast({
        title: "Order cancelled",
        description: "Your order has been successfully cancelled.",
        variant: "success",
      });
    } catch {
      addToast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
        variant: "error",
      });
    }
  };

  const handleReorder = async () => {
    try {
      await reorder.mutateAsync(orderId);
      addToast({
        title: "Items added to cart",
        description: "The order items have been added to your cart.",
        variant: "success",
      });
    } catch {
      addToast({
        title: "Error",
        description: "Failed to add items to cart. Please try again.",
        variant: "error",
      });
    }
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:support@example.com?subject=Order ${order?.orderNumber} - Support Request&body=Order Number: ${order?.orderNumber}%0A%0APlease describe your issue:`;
  };

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            Order Not Found
          </h2>
          <p className="text-muted-foreground mb-4">
            We couldn&apos;t find the order you&apos;re looking for.
          </p>
          <Link href="/orders">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = canCancelOrder(order.status);
  const isTerminalStatus = ["DELIVERED", "CANCELLED", "REFUNDED"].includes(
    order.status
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/orders"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Order {order.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              Placed on {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(order.status)}`}
            >
              {getStatusLabel(order.status)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Timeline & Tracking */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardContent className="pt-6">
              <OrderStatusTimeline order={order} />
            </CardContent>
          </Card>

          {/* Order Items */}
          <OrderItemsSummary order={order} />
        </div>

        {/* Right Column - Tracking & Actions */}
        <div className="space-y-6">
          {/* Tracking Info */}
          <OrderTrackingInfo order={order} tracking={tracking} />

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Actions</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact Support */}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleContactSupport}
              >
                <Headphones className="mr-2 h-4 w-4" />
                Contact Support
              </Button>

              {/* Reorder */}
              {isTerminalStatus && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleReorder}
                  disabled={reorder.isPending}
                >
                  {reorder.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding to Cart...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reorder Items
                    </>
                  )}
                </Button>
              )}

              {/* Cancel Order */}
              {canCancel && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={() => setShowCancelModal(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Order
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Order Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Order Notes</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      {order && (
        <CancelOrderModal
          order={order}
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          onConfirm={handleCancelOrder}
          isLoading={cancelOrder.isPending}
        />
      )}
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 w-24 bg-muted rounded-full animate-pulse" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline Skeleton */}
          <div className="border rounded-lg p-6">
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-40 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Skeleton */}
          <div className="border rounded-lg p-6">
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-10 w-10 bg-muted rounded animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 w-full bg-muted rounded animate-pulse mb-2" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tracking Skeleton */}
          <div className="border rounded-lg p-6">
            <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Skeleton */}
          <div className="border rounded-lg p-6">
            <div className="h-6 w-20 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
