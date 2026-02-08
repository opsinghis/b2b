"use client";

import {
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@b2b/ui";
import { Package } from "lucide-react";

import type { Order } from "../hooks";
import { formatPrice } from "../hooks";

interface OrderItemsSummaryProps {
  order: Order;
}

export function OrderItemsSummary({ order }: OrderItemsSummaryProps) {
  const { items, subtotal, discount, couponDiscount, tax, total, currency } = order;

  const hasDiscount = parseFloat(discount) > 0 || parseFloat(couponDiscount) > 0;
  const totalDiscount = parseFloat(discount) + parseFloat(couponDiscount);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Order Items</h3>
          <span className="text-sm text-muted-foreground">
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items List */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.productName}</p>
                        {item.productSku && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.productSku}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.unitPrice, currency)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(item.total, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Order Summary */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>

          {hasDiscount && (
            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
              <span>Discount</span>
              <span>-{formatPrice(totalDiscount, currency)}</span>
            </div>
          )}

          {order.couponCode && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Coupon: {order.couponCode}</span>
              <span>-{formatPrice(couponDiscount, currency)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatPrice(tax, currency)}</span>
          </div>

          <div className="flex justify-between text-base font-semibold border-t pt-2 mt-2">
            <span>Total</span>
            <span>{formatPrice(total, currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
