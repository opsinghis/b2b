"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from "@b2b/ui";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";

import {
  OrderExpandableRow,
  OrdersFilters,
  type OrdersFiltersState,
} from "./components";
import { useOrders, type Order, formatDate } from "./hooks";

export default function OrdersPage() {
  return (
    <RequireAuth fallback={<OrdersPageSkeleton />} redirectTo="/login">
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const { addToast } = useToast();
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<OrdersFiltersState>({
    search: "",
    status: "ALL",
    startDate: undefined,
    endDate: undefined,
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.startDate, filters.endDate]);

  const { data, isLoading, error } = useOrders({
    page,
    limit: 10,
    search: debouncedSearch || undefined,
    status: filters.status === "ALL" ? undefined : filters.status,
    startDate: filters.startDate?.toISOString().split("T")[0],
    endDate: filters.endDate?.toISOString().split("T")[0],
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const orders = useMemo(() => data?.orders ?? [], [data?.orders]);
  const totalPages = data?.totalPages ?? 0;
  const total = data?.total ?? 0;

  const handleFiltersChange = useCallback(
    (newFilters: Partial<OrdersFiltersState>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const exportToCSV = useCallback(async () => {
    if (orders.length === 0) return;

    setIsExporting(true);
    try {
      // Generate CSV content
      const headers = [
        "Order Number",
        "Date",
        "Status",
        "Items",
        "Subtotal",
        "Discount",
        "Tax",
        "Total",
        "Currency",
        "Shipping Address",
        "Tracking Number",
        "Carrier",
      ];

      const rows = orders.map((order: Order) => [
        order.orderNumber,
        formatDate(order.createdAt),
        order.status,
        order.itemCount.toString(),
        order.subtotal,
        order.discount,
        order.tax,
        order.total,
        order.currency,
        `"${[
          order.shippingAddress.street1,
          order.shippingAddress.street2,
          order.shippingAddress.city,
          order.shippingAddress.state,
          order.shippingAddress.postalCode,
          order.shippingAddress.country,
        ]
          .filter(Boolean)
          .join(", ")}"`,
        order.trackingNumber || "",
        order.carrier || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      addToast({
        title: "Export successful",
        description: `Exported ${orders.length} orders to CSV.`,
        variant: "success",
      });
    } catch {
      addToast({
        title: "Export failed",
        description: "Unable to export orders. Please try again.",
        variant: "error",
      });
    } finally {
      setIsExporting(false);
    }
  }, [orders, addToast]);

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
      <OrdersFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onExportCSV={exportToCSV}
        isExporting={isExporting}
        totalOrders={total}
      />

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
                {debouncedSearch ||
                filters.status !== "ALL" ||
                filters.startDate ||
                filters.endDate
                  ? "Try adjusting your search or filter criteria."
                  : "You haven't placed any orders yet."}
              </p>
              {!debouncedSearch &&
                filters.status === "ALL" &&
                !filters.startDate &&
                !filters.endDate && (
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
                    <TableHead className="w-8"></TableHead>
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
                    <OrderExpandableRow key={order.id} order={order} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, total)} of{" "}
              {total} orders
            </p>
            {totalPages > 1 && (
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
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
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
            )}
          </div>
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
            <div className="h-10 w-[180px] bg-muted rounded animate-pulse" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="h-10 w-[200px] bg-muted rounded animate-pulse" />
            <div className="h-10 w-[200px] bg-muted rounded animate-pulse" />
            <div className="flex-1" />
            <div className="h-10 w-[120px] bg-muted rounded animate-pulse" />
          </div>
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
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
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
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
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
