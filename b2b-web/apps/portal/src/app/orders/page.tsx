"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@b2b/ui";
import { Search, ChevronLeft, ChevronRight, Package, Eye } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

import {
  useOrders,
  formatPrice,
  formatDate,
  getStatusLabel,
  getStatusColor,
  type OrderStatus,
} from "./hooks";

export default function OrdersPage() {
  return (
    <RequireAuth fallback={<OrdersPageSkeleton />} redirectTo="/login">
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const { data, isLoading, error } = useOrders({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const orders = data?.orders ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground">
          View and track your order history
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as OrderStatus | "ALL")
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 mb-6">
          <p className="text-destructive">
            Failed to load orders. Please try again.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && <OrdersTableSkeleton />}

      {/* Empty State */}
      {!isLoading && !error && orders.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No orders found</h3>
              <p className="text-muted-foreground mt-2">
                {debouncedSearch || statusFilter !== "ALL"
                  ? "Try adjusting your search or filter criteria."
                  : "You haven't placed any orders yet."}
              </p>
              {!debouncedSearch && statusFilter === "ALL" && (
                <Link href="/catalog">
                  <Button className="mt-4">Browse Products</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      {!isLoading && !error && orders.length > 0 && (
        <>
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </TableCell>
                      <TableCell>{order.itemCount}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(order.total, order.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrdersPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
      </div>

      <div className="border rounded-lg p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
          <div className="h-10 w-[180px] bg-muted rounded animate-pulse" />
        </div>
      </div>

      <OrdersTableSkeleton />
    </div>
  );
}

function OrdersTableSkeleton() {
  return (
    <div className="border rounded-lg">
      <div className="p-4 border-b">
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-4 bg-muted rounded animate-pulse"
              style={{ width: `${60 + Math.random() * 40}px` }}
            />
          ))}
        </div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 border-b last:border-b-0">
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div
                key={j}
                className="h-4 bg-muted rounded animate-pulse"
                style={{ width: `${40 + Math.random() * 60}px` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
