"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
} from "@b2b/ui";
import { Calendar } from "lucide-react";

import { type OrderStatus, ORDER_STATUSES } from "../hooks/use-orders";

interface OrdersFiltersProps {
  status: OrderStatus | "";
  onStatusChange: (status: OrderStatus | "") => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
}

export function OrdersFilters({
  status,
  onStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: OrdersFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <Select
        value={status || "__all__"}
        onValueChange={(value) => onStatusChange(value === "__all__" ? "" : value as OrderStatus)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Status</SelectItem>
          {ORDER_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="pl-9 w-[150px]"
            placeholder="Start date"
          />
        </div>
        <span className="text-muted-foreground">to</span>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="pl-9 w-[150px]"
            placeholder="End date"
          />
        </div>
      </div>
    </div>
  );
}
