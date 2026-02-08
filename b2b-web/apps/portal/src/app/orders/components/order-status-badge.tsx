"use client";

import { type OrderStatus, getStatusLabel, getStatusColor } from "../hooks";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
}

export function OrderStatusBadge({ status, size = "sm" }: OrderStatusBadgeProps) {
  const sizeClasses = size === "sm"
    ? "px-2.5 py-0.5 text-xs"
    : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${getStatusColor(status)}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
