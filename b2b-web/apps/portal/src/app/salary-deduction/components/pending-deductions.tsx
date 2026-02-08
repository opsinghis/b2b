"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import { Clock, ExternalLink, Loader2, ShoppingBag } from "lucide-react";
import Link from "next/link";

import {
  usePendingDeductions,
  formatPrice,
  formatDate,
  type PendingDeduction,
} from "../hooks";

interface PendingDeductionRowProps {
  deduction: PendingDeduction;
}

function PendingDeductionRow({ deduction }: PendingDeductionRowProps) {
  return (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      {/* Icon */}
      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
        <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">Order #{deduction.orderNumber}</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Pending
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Created {formatDate(deduction.createdAt)}
        </p>
      </div>

      {/* Scheduled Date */}
      <div className="text-right hidden sm:block">
        <p className="text-sm text-muted-foreground">Scheduled for</p>
        <p className="text-sm font-medium">
          {formatDate(deduction.scheduledPayrollDate)}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right">
        <p className="font-semibold">
          {formatPrice(deduction.amount, deduction.currency)}
        </p>
      </div>

      {/* View Order Link */}
      <Link
        href={`/orders/${deduction.orderId}`}
        className="text-primary hover:text-primary/80 transition-colors"
        title="View Order"
      >
        <ExternalLink className="w-4 h-4" />
      </Link>
    </div>
  );
}

export function PendingDeductions() {
  const { data: pendingDeductions, isLoading } = usePendingDeductions();

  const totalPending =
    pendingDeductions?.reduce(
      (sum, d) => sum + parseFloat(d.amount),
      0
    ) ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Deductions
            </CardTitle>
            <CardDescription>
              Deductions awaiting your next payroll
            </CardDescription>
          </div>
          {pendingDeductions && pendingDeductions.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total pending</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatPrice(totalPending)}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !pendingDeductions || pendingDeductions.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No pending deductions</h3>
            <p className="text-muted-foreground">
              You don&apos;t have any pending salary deductions at this time.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {pendingDeductions.map((deduction) => (
              <PendingDeductionRow key={deduction.id} deduction={deduction} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
