"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import { Package, ArrowRight, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useOrders,
  formatPrice,
  formatDate,
  getStatusLabel,
  getStatusColor,
  type Order,
  type OrderStatus,
} from "../../orders/hooks";

const statusIcons: Record<OrderStatus, typeof Package> = {
  DRAFT: Clock,
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
  REFUNDED: XCircle,
};

function OrderCard({ order }: { order: Order }) {
  const StatusIcon = statusIcons[order.status] || Package;

  return (
    <Link
      href={`/orders/${order.id}`}
      className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-full bg-muted p-2 flex-shrink-0">
            <StatusIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{order.orderNumber}</p>
            <p className="text-sm text-muted-foreground">
              {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-medium">{formatPrice(order.total, order.currency)}</p>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${getStatusColor(order.status)}`}
          >
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RecentOrdersSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-muted rounded-full" />
                  <div>
                    <div className="h-4 w-32 bg-muted rounded mb-2" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-4 w-16 bg-muted rounded mb-2" />
                  <div className="h-5 w-20 bg-muted rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentOrders() {
  const router = useRouter();
  const { data, isLoading, isError } = useOrders({ limit: 5, sortBy: "createdAt", sortOrder: "desc" });

  if (isLoading) {
    return <RecentOrdersSkeleton />;
  }

  if (isError) {
    return null;
  }

  const orders = data?.orders || [];

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No orders yet. Start shopping to see your orders here.
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push("/catalog")}>
              Browse Catalog
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Orders</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
