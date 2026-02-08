"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, Input, Label } from "@b2b/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Package,
  Truck,
  DollarSign,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import { OrderStatusBadge } from "../components/order-status-badge";
import { RefundModal } from "../components/refund-modal";
import {
  useAdminOrder,
  useUpdateOrderStatus,
  useAddOrderNote,
  useCancelOrder,
  useProcessRefund,
  type OrderStatus,
  type UpdateOrderStatusDto,
  ORDER_STATUSES,
  CARRIERS,
  formatPrice,
  formatAddress,
  formatDateTime,
  canUpdateStatus,
  canRefund,
  canCancel,
} from "../hooks/use-orders";

import { Header } from "@/components/layout";

function OrderDetailContent() {
  const params = useParams();
  const id = params.id as string;

  const { data: order, isLoading, error, refetch } = useAdminOrder(id);
  const updateStatusMutation = useUpdateOrderStatus();
  const addNoteMutation = useAddOrderNote();
  const cancelMutation = useCancelOrder();
  const refundMutation = useProcessRefund();

  // Status update form state
  const [newStatus, setNewStatus] = React.useState<OrderStatus | "">("");
  const [statusNotes, setStatusNotes] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");
  const [trackingUrl, setTrackingUrl] = React.useState("");
  const [carrier, setCarrier] = React.useState("");
  const [estimatedDelivery, setEstimatedDelivery] = React.useState("");

  // Notes form state
  const [noteContent, setNoteContent] = React.useState("");
  const [isInternalNote, setIsInternalNote] = React.useState(true);

  // Refund modal state
  const [isRefundModalOpen, setIsRefundModalOpen] = React.useState(false);

  // Initialize status form when order loads
  React.useEffect(() => {
    if (order) {
      setNewStatus(order.status);
      setTrackingNumber(order.trackingNumber || "");
      setTrackingUrl(order.trackingUrl || "");
      setCarrier(order.carrier || "");
      setEstimatedDelivery(order.estimatedDelivery?.split("T")[0] || "");
    }
  }, [order]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !order) return;

    const updateData: UpdateOrderStatusDto = {
      status: newStatus,
      notes: statusNotes || undefined,
    };

    // Include shipping details if updating to SHIPPED
    if (newStatus === "SHIPPED") {
      updateData.trackingNumber = trackingNumber || undefined;
      updateData.trackingUrl = trackingUrl || undefined;
      updateData.carrier = carrier || undefined;
      updateData.estimatedDelivery = estimatedDelivery || undefined;
    }

    try {
      await updateStatusMutation.mutateAsync({
        orderId: id,
        data: updateData,
      });
      setStatusNotes("");
    } catch {
      // Error handled by mutation
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;

    try {
      await addNoteMutation.mutateAsync({
        orderId: id,
        data: {
          content: noteContent,
          isInternal: isInternalNote,
        },
      });
      setNoteContent("");
      refetch();
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelOrder = async () => {
    const reason = prompt("Please enter a reason for cancellation:");
    if (reason === null) return;

    try {
      await cancelMutation.mutateAsync({ orderId: id, reason: reason || undefined });
    } catch {
      // Error handled by mutation
    }
  };

  const handleRefundSubmit = async (data: { amount?: number; reason: string }) => {
    try {
      await refundMutation.mutateAsync({
        orderId: id,
        data,
      });
      setIsRefundModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Loading..." />
        <div className="flex-1 p-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Order Not Found" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Order Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              The requested order could not be found.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/orders">Back to Orders</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const canUpdateToStatus = (status: OrderStatus) => canUpdateStatus(order.status, status);

  return (
    <div className="flex flex-col h-full">
      <Header title={`Order: ${order.orderNumber}`} />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Breadcrumb and Actions */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            {canRefund(order.status) && (
              <Button
                variant="outline"
                onClick={() => setIsRefundModalOpen(true)}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Process Refund
              </Button>
            )}
            {canCancel(order.status) && (
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Order
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="col-span-2 space-y-6">
            {/* Order Summary */}
            <div className="rounded-lg border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </h3>
                <OrderStatusBadge status={order.status} />
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Number</p>
                  <p className="font-medium">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDateTime(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Items</p>
                  <p className="font-medium">{order.itemCount} items</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium text-lg">
                    {formatPrice(order.total, order.currency)}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="rounded-lg border p-6 space-y-4">
              <h3 className="text-lg font-semibold">Order Items</h3>
              <div className="divide-y">
                {order.items.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      {item.productSku && (
                        <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                      )}
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(item.unitPrice, order.currency)} x {item.quantity}
                      </p>
                      {parseFloat(item.discount) > 0 && (
                        <p className="text-sm text-green-600">
                          -{formatPrice(item.discount, order.currency)} discount
                        </p>
                      )}
                      <p className="font-semibold">
                        {formatPrice(item.total, order.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2 text-right">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(order.subtotal, order.currency)}</span>
                </div>
                {parseFloat(order.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatPrice(order.discount, order.currency)}</span>
                  </div>
                )}
                {order.couponCode && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon ({order.couponCode})</span>
                    <span>-{formatPrice(order.couponDiscount, order.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(order.tax, order.currency)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>{formatPrice(order.total, order.currency)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            <div className="rounded-lg border p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Shipping Address</p>
                  <p className="font-medium">{formatAddress(order.shippingAddress)}</p>
                </div>
                {order.billingAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Billing Address</p>
                    <p className="font-medium">{formatAddress(order.billingAddress)}</p>
                  </div>
                )}
              </div>
              {order.trackingNumber && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Carrier</p>
                    <p className="font-medium">{order.carrier || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    {order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {order.trackingNumber}
                      </a>
                    ) : (
                      <p className="font-medium">{order.trackingNumber}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Delivery</p>
                    <p className="font-medium">
                      {order.estimatedDelivery
                        ? new Date(order.estimatedDelivery).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Notes */}
            <div className="rounded-lg border p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Order Notes
              </h3>

              {/* Existing notes */}
              {order.orderNotes && order.orderNotes.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {order.orderNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg ${
                        note.isInternal
                          ? "bg-yellow-50 border border-yellow-200"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {note.createdByName || "Admin"}
                        </span>
                        <div className="flex items-center gap-2">
                          {note.isInternal && (
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                              Internal
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(note.createdAt)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}

              {/* Add new note */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="internal-note"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="internal-note" className="font-normal text-sm">
                    Internal note (not visible to customer)
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add a note..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                    disabled={addNoteMutation.isPending}
                  />
                  <Button
                    onClick={handleAddNote}
                    disabled={!noteContent.trim() || addNoteMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="rounded-lg border p-6 space-y-4">
              <h3 className="font-semibold">Customer</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{order.userName || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{order.userEmail || "-"}</p>
                </div>
                {order.organizationName && (
                  <div>
                    <p className="text-muted-foreground">Organization</p>
                    <p className="font-medium">{order.organizationName}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Management */}
            <div className="rounded-lg border p-6 space-y-4">
              <h3 className="font-semibold">Update Status</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select
                    value={newStatus}
                    onValueChange={(value) => setNewStatus(value as OrderStatus)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((s) => (
                        <SelectItem
                          key={s.value}
                          value={s.value}
                          disabled={s.value !== order.status && !canUpdateToStatus(s.value)}
                        >
                          {s.label}
                          {s.value !== order.status && !canUpdateToStatus(s.value) && " (N/A)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shipping details when updating to SHIPPED */}
                {newStatus === "SHIPPED" && order.status !== "SHIPPED" && (
                  <div className="space-y-3 pt-3 border-t">
                    <p className="text-sm font-medium">Shipping Details</p>
                    <div className="space-y-2">
                      <Label>Carrier</Label>
                      <Select
                        value={carrier}
                        onValueChange={setCarrier}
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                        <SelectContent>
                          {CARRIERS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tracking Number</Label>
                      <Input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking number"
                        disabled={updateStatusMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tracking URL (optional)</Label>
                      <Input
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        placeholder="https://..."
                        disabled={updateStatusMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Est. Delivery Date (optional)</Label>
                      <Input
                        type="date"
                        value={estimatedDelivery}
                        onChange={(e) => setEstimatedDelivery(e.target.value)}
                        disabled={updateStatusMutation.isPending}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Add a note about this status change..."
                    disabled={updateStatusMutation.isPending}
                  />
                </div>

                <Button
                  onClick={handleStatusUpdate}
                  disabled={
                    !newStatus ||
                    newStatus === order.status ||
                    (newStatus !== order.status && !canUpdateToStatus(newStatus as OrderStatus)) ||
                    updateStatusMutation.isPending
                  }
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-lg border p-6 space-y-4">
              <h3 className="font-semibold">Order Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
                {order.confirmedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmed</span>
                    <span>{formatDateTime(order.confirmedAt)}</span>
                  </div>
                )}
                {order.processingAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing</span>
                    <span>{formatDateTime(order.processingAt)}</span>
                  </div>
                )}
                {order.shippedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipped</span>
                    <span>{formatDateTime(order.shippedAt)}</span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivered</span>
                    <span>{formatDateTime(order.deliveredAt)}</span>
                  </div>
                )}
                {order.cancelledAt && (
                  <div className="flex justify-between text-red-600">
                    <span>Cancelled</span>
                    <span>{formatDateTime(order.cancelledAt)}</span>
                  </div>
                )}
                {order.refundedAt && (
                  <div className="flex justify-between text-orange-600">
                    <span>Refunded</span>
                    <span>{formatDateTime(order.refundedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="rounded-lg border p-6 space-y-4 bg-muted/30">
              <h3 className="font-semibold">Metadata</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-mono text-xs break-all">{order.id}</p>
                </div>
                {order.userId && (
                  <div>
                    <p className="text-muted-foreground">User ID</p>
                    <p className="font-mono text-xs break-all">{order.userId}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p>{formatDateTime(order.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      <RefundModal
        open={isRefundModalOpen}
        onOpenChange={setIsRefundModalOpen}
        order={order}
        onSubmit={handleRefundSubmit}
        isLoading={refundMutation.isPending}
      />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Order Details" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to view order details.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <OrderDetailContent />
    </RequireAuth>
  );
}
