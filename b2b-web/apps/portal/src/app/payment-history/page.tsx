"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@b2b/ui";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  Receipt,
  RefreshCw,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  usePaymentHistory,
  useSalaryDeduction,
  formatPrice,
  type Payment,
  type PaymentMethodType,
} from "../checkout/hooks";

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10;

const PAYMENT_STATUS_CONFIG: Record<
  Payment["status"],
  { label: string; className: string }
> = {
  PENDING: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  REFUNDED: { label: "Refunded", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
};

const PAYMENT_METHOD_ICONS: Record<PaymentMethodType, typeof CreditCard> = {
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  BANK_TRANSFER: Banknote,
  SALARY_DEDUCTION: Wallet,
  INVOICE: Receipt,
  WALLET: Wallet,
};

// =============================================================================
// Salary Deduction Summary Card
// =============================================================================

function SalaryDeductionSummary() {
  const { data: salaryDeduction, isLoading } = useSalaryDeduction();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!salaryDeduction || !salaryDeduction.isEnabled) {
    return null;
  }

  const limit = parseFloat(salaryDeduction.monthlyLimit);
  const used = parseFloat(salaryDeduction.usedAmount);
  const remaining = parseFloat(salaryDeduction.remainingAmount);
  const usagePercent = limit > 0 ? (used / limit) * 100 : 0;

  const periodEndDate = new Date(salaryDeduction.periodEnd);
  const periodStartDate = new Date(salaryDeduction.periodStart);
  const formattedPeriodStart = periodStartDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const formattedPeriodEnd = periodEndDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          Salary Deduction Limit
        </CardTitle>
        <CardDescription>
          Current period: {formattedPeriodStart} - {formattedPeriodEnd}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Monthly Limit</p>
            <p className="text-lg font-semibold">{formatPrice(limit)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Used</p>
            <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
              {formatPrice(used)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {formatPrice(remaining)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-medium">{usagePercent.toFixed(1)}%</span>
          </div>
          {/* Simple progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Your salary deduction limit resets at the start of each month.
            Deductions will be applied to your next payroll.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Payment Row Component
// =============================================================================

interface PaymentRowProps {
  payment: Payment;
}

function PaymentRow({ payment }: PaymentRowProps) {
  const statusConfig = PAYMENT_STATUS_CONFIG[payment.status];
  const Icon = payment.paymentMethod?.type
    ? PAYMENT_METHOD_ICONS[payment.paymentMethod.type as PaymentMethodType] || Receipt
    : Receipt;

  const createdDate = new Date(payment.createdAt);
  const formattedDate = createdDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = createdDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      {/* Payment Method Icon */}
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Payment Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">
            {payment.paymentMethod?.name || "Payment"}
          </p>
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            statusConfig.className
          )}>
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formattedDate} at {formattedTime}
          </span>
          <span>•</span>
          <span>#{payment.paymentNumber}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className="font-semibold">{formatPrice(payment.amount)}</p>
        <p className="text-xs text-muted-foreground">{payment.currency}</p>
      </div>

      {/* View Order Link */}
      <Link
        href={`/orders/${payment.orderId}`}
        className="text-primary hover:text-primary/80 transition-colors"
        title="View Order"
      >
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No payment history</h3>
        <p className="text-muted-foreground mb-4">
          You haven&apos;t made any payments yet. Start shopping to see your payment history here.
        </p>
        <Button asChild>
          <Link href="/catalog">Browse Products</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Pagination Component
// =============================================================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground px-4">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

// =============================================================================
// Main Payment History Page Component
// =============================================================================

function PaymentHistoryContent() {
  const [page, setPage] = useState(1);
  const { data: history, isLoading, isRefetching, refetch } = usePaymentHistory(page, ITEMS_PER_PAGE);

  const totalPages = history ? Math.ceil(history.total / ITEMS_PER_PAGE) : 0;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/checkout">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payment History</h1>
            <p className="text-muted-foreground">
              View your past payments and salary deduction usage
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Salary Deduction Summary */}
      <SalaryDeductionSummary />

      {/* Payment History List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                {history?.total
                  ? `${history.total} payment${history.total !== 1 ? "s" : ""} total`
                  : "Your payment transactions"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !history || history.payments.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="divide-y">
                {history.payments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))}
              </div>
              <div className="p-4 border-t">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Need help with a payment?</p>
              <p>
                If you have questions about a specific payment or need to dispute a charge,
                please contact our support team or visit your order details page.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentHistoryPage() {
  return (
    <RequireAuth>
      <PaymentHistoryContent />
    </RequireAuth>
  );
}
