"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import { Package, ArrowRight, ShoppingCart, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

import { useOrders } from "../../orders/hooks/use-orders";
import { formatPrice } from "../hooks";

export function PartnerOrdersSummary() {
  const { data: ordersData, isLoading, isError } = useOrders({ limit: 5 });

  if (isLoading) {
    return <PartnerOrdersSummarySkeleton />;
  }

  if (isError || !ordersData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Organization Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load orders data
          </p>
        </CardContent>
      </Card>
    );
  }

  const orders = ordersData.orders;
  const totalOrders = ordersData.total;

  // Calculate summary stats
  const pendingOrders = orders.filter(
    (o) => o.status === "PENDING" || o.status === "CONFIRMED" || o.status === "PROCESSING"
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
  const totalValue = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Organization Orders
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pb-4 border-b">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              {totalOrders}
            </div>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              <Clock className="h-4 w-4" />
              {pendingOrders}
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-2xl font-bold text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              {deliveredOrders}
            </div>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
        </div>

        {/* Recent Orders */}
        {orders.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Recent Orders</h4>
            {orders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{order.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium">
                    {formatPrice(order.total, order.currency)}
                  </span>
                  <span
                    className={`text-xs ${
                      order.status === "DELIVERED"
                        ? "text-green-600 dark:text-green-400"
                        : order.status === "CANCELLED"
                        ? "text-red-600 dark:text-red-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No orders yet</p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/catalog">Browse Catalog</Link>
            </Button>
          </div>
        )}

        {/* Total Value */}
        {orders.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Order Value</span>
              <span className="text-lg font-semibold">
                {formatPrice(totalValue)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PartnerOrdersSummarySkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 pb-4 border-b">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-12 mx-auto bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 mx-auto bg-muted rounded animate-pulse mt-1" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <div className="space-y-1">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-3 w-12 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
