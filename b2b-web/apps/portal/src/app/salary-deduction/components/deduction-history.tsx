"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@b2b/ui";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  History,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  useDeductionHistory,
  formatPrice,
  formatDate,
  getStatusLabel,
  getStatusColor,
  getMonthsForSelect,
  type DeductionHistoryItem,
  type DeductionStatus,
} from "../hooks";

const ITEMS_PER_PAGE = 10;

interface DeductionRowProps {
  item: DeductionHistoryItem;
}

function DeductionRow({ item }: DeductionRowProps) {
  const statusClasses = getStatusColor(item.status);

  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      {/* Date */}
      <div className="w-24 flex-shrink-0">
        <p className="text-sm font-medium">{formatDate(item.createdAt)}</p>
        {item.payrollDate && (
          <p className="text-xs text-muted-foreground">
            Payroll: {formatDate(item.payrollDate)}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.description}</p>
        {item.orderNumber && (
          <p className="text-sm text-muted-foreground">
            Order #{item.orderNumber}
          </p>
        )}
      </div>

      {/* Status */}
      <div>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            statusClasses
          )}
        >
          {getStatusLabel(item.status)}
        </span>
      </div>

      {/* Amount */}
      <div className="text-right w-24 flex-shrink-0">
        <p className="font-semibold">{formatPrice(item.amount, item.currency)}</p>
        <p className="text-xs text-muted-foreground">{item.currency}</p>
      </div>

      {/* View Order Link */}
      {item.orderId && (
        <Link
          href={`/orders/${item.orderId}`}
          className="text-primary hover:text-primary/80 transition-colors"
          title="View Order"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export function DeductionHistory() {
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<DeductionStatus | "all">(
    "all"
  );

  const months = getMonthsForSelect(12);

  const { data, isLoading, isFetching } = useDeductionHistory({
    page,
    limit: ITEMS_PER_PAGE,
    month: selectedMonth === "all" ? undefined : selectedMonth,
    status: selectedStatus === "all" ? undefined : selectedStatus,
  });

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value as DeductionStatus | "all");
    setPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Deduction History
            </CardTitle>
            <CardDescription>
              {data?.total
                ? `${data.total} deduction${data.total !== 1 ? "s" : ""} total`
                : "Your salary deduction transactions"}
            </CardDescription>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-12 text-center">
            <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No deduction history</h3>
            <p className="text-muted-foreground">
              {selectedMonth !== "all" || selectedStatus !== "all"
                ? "Try adjusting your filters to see more results."
                : "You don't have any salary deduction transactions yet."}
            </p>
          </div>
        ) : (
          <>
            {/* Loading overlay for refetching */}
            <div className={cn("relative", isFetching && "opacity-50")}>
              <div className="divide-y">
                {data.items.map((item) => (
                  <DeductionRow key={item.id} item={item} />
                ))}
              </div>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(page * ITEMS_PER_PAGE, data.total)} of {data.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!data.hasPrevious || isFetching}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data.hasNext || isFetching}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
