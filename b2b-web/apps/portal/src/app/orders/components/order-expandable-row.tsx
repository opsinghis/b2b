"use client";

import { Button, TableCell, TableRow, useToast } from "@b2b/ui";
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  type Order,
  formatPrice,
  formatDate,
  formatDateTime,
  formatAddress,
  useReorder,
  useDownloadInvoice,
} from "../hooks";

import { OrderStatusBadge } from "./order-status-badge";

interface OrderExpandableRowProps {
  order: Order;
}

export function OrderExpandableRow({ order }: OrderExpandableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { addToast } = useToast();
  const reorder = useReorder();
  const downloadInvoice = useDownloadInvoice();

  const handleReorder = async () => {
    try {
      await reorder.mutateAsync(order.id);
      addToast({
        title: "Items added to cart",
        description: `${order.itemCount} item(s) from order ${order.orderNumber} have been added to your cart.`,
        variant: "success",
      });
    } catch {
      addToast({
        title: "Failed to reorder",
        description: "Unable to add items to your cart. Please try again.",
        variant: "error",
      });
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const blob = await downloadInvoice.mutateAsync(order.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addToast({
        title: "Invoice downloaded",
        description: `Invoice for order ${order.orderNumber} has been downloaded.`,
        variant: "success",
      });
    } catch {
      addToast({
        title: "Failed to download invoice",
        description: "Unable to download invoice. Please try again.",
        variant: "error",
      });
    }
  };

  return (
    <>
      {/* Main Row */}
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <Link
            href={`/orders/${order.id}`}
            className="font-medium hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {order.orderNumber}
          </Link>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDate(order.createdAt)}
        </TableCell>
        <TableCell>
          <OrderStatusBadge status={order.status} />
        </TableCell>
        <TableCell>{order.itemCount}</TableCell>
        <TableCell className="text-right font-medium">
          {formatPrice(order.total, order.currency)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleReorder();
              }}
              disabled={reorder.isPending}
              title="Reorder"
            >
              <RefreshCw className={`h-4 w-4 ${reorder.isPending ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadInvoice();
              }}
              disabled={downloadInvoice.isPending}
              title="Download Invoice"
            >
              <Download className={`h-4 w-4 ${downloadInvoice.isPending ? "animate-pulse" : ""}`} />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded Detail Row */}
      {isExpanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={7} className="p-0">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Items Preview */}
                <div className="md:col-span-2">
                  <h4 className="font-medium text-sm mb-2">Items</h4>
                  <div className="space-y-2">
                    {order.items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-background border">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{item.productName}</p>
                          {item.productSku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {item.productSku}
                            </p>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          x{item.quantity}
                        </div>
                        <div className="font-medium">
                          {formatPrice(item.total, order.currency)}
                        </div>
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{order.items.length - 3} more item(s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Order Info */}
                <div className="space-y-3">
                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium text-sm mb-1">Shipping Address</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatAddress(order.shippingAddress)}
                    </p>
                  </div>

                  {/* Tracking Info */}
                  {order.trackingNumber && (
                    <div>
                      <h4 className="font-medium text-sm mb-1">Tracking</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span>{order.carrier || "Carrier"}</span>
                        {order.trackingUrl ? (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.trackingNumber}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">
                            {order.trackingNumber}
                          </span>
                        )}
                      </div>
                      {order.estimatedDelivery && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Est. delivery: {formatDate(order.estimatedDelivery)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Timestamps */}
                  <div>
                    <h4 className="font-medium text-sm mb-1">Timeline</h4>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Ordered: {formatDateTime(order.createdAt)}</p>
                      {order.confirmedAt && (
                        <p>Confirmed: {formatDateTime(order.confirmedAt)}</p>
                      )}
                      {order.shippedAt && (
                        <p>Shipped: {formatDateTime(order.shippedAt)}</p>
                      )}
                      {order.deliveredAt && (
                        <p>Delivered: {formatDateTime(order.deliveredAt)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-sm text-muted-foreground">
                  <span>Subtotal: {formatPrice(order.subtotal, order.currency)}</span>
                  {parseFloat(order.discount) > 0 && (
                    <span className="ml-3 text-green-600">
                      Discount: -{formatPrice(order.discount, order.currency)}
                    </span>
                  )}
                  <span className="ml-3">Tax: {formatPrice(order.tax, order.currency)}</span>
                </div>
                <Link
                  href={`/orders/${order.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="outline" size="sm">
                    View Full Details
                  </Button>
                </Link>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
