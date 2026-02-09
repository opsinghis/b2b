"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button, Input } from "@b2b/ui";
import { Plus, Search, RefreshCw, Download, CheckSquare } from "lucide-react";
import * as React from "react";

import {
  OrdersTable,
  OrdersFilters,
  Pagination,
  CreateOrderModal,
  BulkStatusModal,
  RefundModal,
} from "./components";
import {
  useAdminOrders,
  useCreateManualOrder,
  useCancelOrder,
  useProcessRefund,
  useBulkUpdateStatus,
  useConfirmOrder,
  type Order,
  type OrderStatus,
  type CreateManualOrderDto,
} from "./hooks/use-orders";

import { useOrganizations } from "@/app/organizations/hooks/use-organizations";
import { useUsers } from "@/app/users/hooks/use-users";
import { Header } from "@/components/layout";

function OrdersContent() {
  const { hasRole } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "">("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [selectedOrders, setSelectedOrders] = React.useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = React.useState(false);
  const [refundOrder, setRefundOrder] = React.useState<Order | null>(null);
  const limit = 10;

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter, startDate, endDate]);

  const { data, isLoading, error, refetch } = useAdminOrders({
    search: debouncedSearch,
    page,
    limit,
    status: statusFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Fetch users and organizations for create modal
  const { data: usersData } = useUsers({ limit: 100 });
  const { data: organizationsData } = useOrganizations({ limit: 100 });

  const users = (usersData?.data || []).map((u) => ({
    id: u.id,
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
    email: u.email,
  }));

  const organizations = (organizationsData?.data || []).map((o) => ({
    id: o.id,
    name: o.name,
  }));

  // Mutations
  const createMutation = useCreateManualOrder();
  const cancelMutation = useCancelOrder();
  const refundMutation = useProcessRefund();
  const bulkStatusMutation = useBulkUpdateStatus();
  const confirmMutation = useConfirmOrder();

  const handleCreateOrder = async (orderData: CreateManualOrderDto) => {
    try {
      await createMutation.mutateAsync(orderData);
      setIsCreateModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt("Please enter a reason for cancellation:");
    if (reason === null) return; // User clicked cancel

    try {
      await cancelMutation.mutateAsync({ orderId, reason: reason || undefined });
    } catch {
      // Error handled by mutation
    }
  };

  const handleRefundOrder = (orderId: string) => {
    const order = data?.orders.find((o) => o.id === orderId);
    if (order) {
      setRefundOrder(order);
    }
  };

  const handleRefundSubmit = async (refundData: { amount?: number; reason: string }) => {
    if (!refundOrder) return;
    try {
      await refundMutation.mutateAsync({
        orderId: refundOrder.id,
        data: refundData,
      });
      setRefundOrder(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleBulkStatusUpdate = async (status: OrderStatus, notes?: string) => {
    try {
      await bulkStatusMutation.mutateAsync({
        orderIds: selectedOrders,
        status,
        notes,
      });
      setSelectedOrders([]);
      setIsBulkStatusModalOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to confirm this order? This will begin order processing.")) {
      return;
    }
    try {
      await confirmMutation.mutateAsync({ orderId });
    } catch {
      // Error handled by mutation
    }
  };

  const handleSelectOrder = (orderId: string, selected: boolean) => {
    if (selected) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected && data?.orders) {
      setSelectedOrders(data.orders.map((o) => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleExportCSV = () => {
    if (!data?.orders) return;

    const headers = [
      "Order Number",
      "Status",
      "Customer",
      "Email",
      "Organization",
      "Items",
      "Subtotal",
      "Discount",
      "Tax",
      "Total",
      "Currency",
      "Created At",
    ];

    const rows = data.orders.map((order) => [
      order.orderNumber,
      order.status,
      order.userName || "",
      order.userEmail || "",
      order.organizationName || "",
      order.itemCount.toString(),
      order.subtotal,
      order.discount,
      order.tax,
      order.total,
      order.currency,
      new Date(order.createdAt).toISOString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `orders-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Orders" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access order management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Orders" />
      <div className="flex-1 p-6 space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <OrdersFilters
              status={statusFilter}
              onStatusChange={setStatusFilter}
              startDate={startDate}
              onStartDateChange={setStartDate}
              endDate={endDate}
              onEndDateChange={setEndDate}
            />
          </div>
          <div className="flex items-center gap-2">
            {selectedOrders.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setIsBulkStatusModalOpen(true)}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Update Status ({selectedOrders.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={!data?.orders?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load orders. Please try again.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !data && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Table */}
        {data && (
          <>
            <OrdersTable
              orders={data.orders}
              selectedOrders={selectedOrders}
              onSelectOrder={handleSelectOrder}
              onSelectAll={handleSelectAll}
              onCancelOrder={handleCancelOrder}
              onRefundOrder={handleRefundOrder}
              onConfirmOrder={handleConfirmOrder}
              isUpdating={
                cancelMutation.isPending ||
                refundMutation.isPending ||
                bulkStatusMutation.isPending ||
                confirmMutation.isPending
              }
            />
            {data.totalPages > 1 && (
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Create Modal */}
        <CreateOrderModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onSubmit={handleCreateOrder}
          users={users}
          organizations={organizations}
          isLoading={createMutation.isPending}
        />

        {/* Bulk Status Modal */}
        <BulkStatusModal
          open={isBulkStatusModalOpen}
          onOpenChange={setIsBulkStatusModalOpen}
          selectedCount={selectedOrders.length}
          onSubmit={handleBulkStatusUpdate}
          isLoading={bulkStatusMutation.isPending}
        />

        {/* Refund Modal */}
        <RefundModal
          open={!!refundOrder}
          onOpenChange={(open) => !open && setRefundOrder(null)}
          order={refundOrder}
          onSubmit={handleRefundSubmit}
          isLoading={refundMutation.isPending}
        />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Orders" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access order management.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <OrdersContent />
    </RequireAuth>
  );
}
