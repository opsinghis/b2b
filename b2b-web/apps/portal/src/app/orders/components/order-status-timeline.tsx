"use client";

import {
  FileText,
  CheckCircle,
  Package,
  Truck,
  PackageCheck,
  XCircle,
  RefreshCw,
} from "lucide-react";

import type { Order, OrderStatus } from "../hooks";
import { formatDateTime } from "../hooks";

interface OrderStatusTimelineProps {
  order: Order;
}

interface TimelineEvent {
  id: string;
  status: OrderStatus;
  label: string;
  description: string;
  date: string | null | undefined;
  icon: React.ReactNode;
  isCompleted: boolean;
  isCurrent: boolean;
}

const STATUS_ORDER: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    const { status } = order;

    // Handle cancelled or refunded orders
    if (status === "CANCELLED") {
      events.push({
        id: "created",
        status: "PENDING",
        label: "Order Placed",
        description: "Your order was placed",
        date: order.createdAt,
        icon: <FileText className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: false,
      });
      events.push({
        id: "cancelled",
        status: "CANCELLED",
        label: "Cancelled",
        description: "Order was cancelled",
        date: order.cancelledAt,
        icon: <XCircle className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: true,
      });
      return events;
    }

    if (status === "REFUNDED") {
      events.push({
        id: "created",
        status: "PENDING",
        label: "Order Placed",
        description: "Your order was placed",
        date: order.createdAt,
        icon: <FileText className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: false,
      });
      events.push({
        id: "refunded",
        status: "REFUNDED",
        label: "Refunded",
        description: "Order was refunded",
        date: order.refundedAt,
        icon: <RefreshCw className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: true,
      });
      return events;
    }

    // Normal order flow
    const currentIndex = STATUS_ORDER.indexOf(status);

    // Order Placed (PENDING)
    events.push({
      id: "pending",
      status: "PENDING",
      label: "Order Placed",
      description: "Your order has been placed",
      date: order.createdAt,
      icon: <FileText className="h-4 w-4" />,
      isCompleted: currentIndex >= 0,
      isCurrent: status === "PENDING",
    });

    // Confirmed
    events.push({
      id: "confirmed",
      status: "CONFIRMED",
      label: "Confirmed",
      description: "Your order has been confirmed",
      date: order.confirmedAt,
      icon: <CheckCircle className="h-4 w-4" />,
      isCompleted: currentIndex >= 1,
      isCurrent: status === "CONFIRMED",
    });

    // Processing
    events.push({
      id: "processing",
      status: "PROCESSING",
      label: "Processing",
      description: "Your order is being prepared",
      date: order.processingAt,
      icon: <Package className="h-4 w-4" />,
      isCompleted: currentIndex >= 2,
      isCurrent: status === "PROCESSING",
    });

    // Shipped
    events.push({
      id: "shipped",
      status: "SHIPPED",
      label: "Shipped",
      description: order.carrier
        ? `Shipped via ${order.carrier}`
        : "Your order has been shipped",
      date: order.shippedAt,
      icon: <Truck className="h-4 w-4" />,
      isCompleted: currentIndex >= 3,
      isCurrent: status === "SHIPPED",
    });

    // Delivered
    events.push({
      id: "delivered",
      status: "DELIVERED",
      label: "Delivered",
      description: "Your order has been delivered",
      date: order.deliveredAt,
      icon: <PackageCheck className="h-4 w-4" />,
      isCompleted: currentIndex >= 4,
      isCurrent: status === "DELIVERED",
    });

    return events;
  };

  const events = getTimelineEvents();

  const getEventColor = (event: TimelineEvent) => {
    if (event.isCurrent) {
      if (event.status === "CANCELLED") {
        return "bg-red-500 text-white";
      }
      if (event.status === "REFUNDED") {
        return "bg-orange-500 text-white";
      }
      if (event.status === "DELIVERED") {
        return "bg-green-500 text-white";
      }
      return "bg-blue-500 text-white";
    }
    if (event.isCompleted) {
      return "bg-green-500 text-white";
    }
    return "bg-muted text-muted-foreground";
  };

  const getLineColor = (event: TimelineEvent, nextEvent: TimelineEvent | undefined) => {
    if (!nextEvent) return "hidden";
    if (event.isCompleted && nextEvent.isCompleted) {
      return "bg-green-500";
    }
    if (event.isCompleted && nextEvent.isCurrent) {
      return "bg-gradient-to-b from-green-500 to-blue-500";
    }
    return "bg-muted";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Order Status</h3>
      <div className="space-y-0">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          const nextEvent = events[index + 1];
          return (
            <div key={event.id} className="flex gap-4">
              {/* Icon and Line */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${getEventColor(event)}`}
                >
                  {event.icon}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-8 ${getLineColor(event, nextEvent)}`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      event.isCurrent || event.isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {event.label}
                  </span>
                  {event.isCurrent && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                {event.date && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(event.date)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
