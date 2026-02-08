"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Checkbox,
} from "@b2b/ui";
import { Eye, XCircle, DollarSign } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  type Order,
  formatPrice,
  formatDate,
  canCancel,
  canRefund,
} from "../hooks/use-orders";

import { OrderStatusBadge } from "./order-status-badge";

interface OrdersTableProps {
  orders: Order[];
  selectedOrders: string[];
  onSelectOrder: (orderId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onCancelOrder: (orderId: string) => void;
  onRefundOrder: (orderId: string) => void;
  isUpdating?: boolean;
}

export function OrdersTable({
  orders,
  selectedOrders,
  onSelectOrder,
  onSelectAll,
  onCancelOrder,
  onRefundOrder,
  isUpdating,
}: OrdersTableProps) {
  const router = useRouter();
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < orders.length;

  // Determine checkbox state: true (all), "indeterminate" (some), false (none)
  const headerCheckboxState = allSelected ? true : someSelected ? "indeterminate" : false;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={headerCheckboxState}
                onCheckedChange={(checked) => onSelectAll(checked === true)}
              />
            </TableHead>
            <TableHead>Order Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                No orders found.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => onSelectOrder(order.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <button
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="hover:underline text-primary"
                  >
                    {order.orderNumber}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {order.userName || "Unknown User"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.userEmail || "-"}
                    </span>
                    {order.organizationName && (
                      <span className="text-xs text-muted-foreground">
                        {order.organizationName}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>{order.itemCount} items</TableCell>
                <TableCell className="text-right font-medium">
                  {formatPrice(order.total, order.currency)}
                </TableCell>
                <TableCell>{formatDate(order.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/orders/${order.id}`)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canRefund(order.status) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRefundOrder(order.id)}
                        disabled={isUpdating}
                        title="Process refund"
                      >
                        <DollarSign className="h-4 w-4 text-orange-500" />
                      </Button>
                    )}
                    {canCancel(order.status) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCancelOrder(order.id)}
                        disabled={isUpdating}
                        title="Cancel order"
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
