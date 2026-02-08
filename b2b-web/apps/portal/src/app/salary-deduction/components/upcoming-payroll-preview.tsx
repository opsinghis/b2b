"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import { Banknote, CalendarClock, Info } from "lucide-react";

import {
  useUpcomingPayroll,
  formatPrice,
  formatPayrollDate,
} from "../hooks";

export function UpcomingPayrollPreview() {
  const { data: upcomingPayroll, isLoading } = useUpcomingPayroll();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-36 bg-muted rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!upcomingPayroll) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Upcoming Payroll Deduction
          </CardTitle>
          <CardDescription>Your next scheduled payroll deduction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Banknote className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              No deductions scheduled for the upcoming payroll.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAmount = parseFloat(upcomingPayroll.totalAmount);
  const deductionCount = upcomingPayroll.deductions.length;

  return (
    <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-transparent dark:from-indigo-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Upcoming Payroll Deduction
        </CardTitle>
        <CardDescription>
          Scheduled for {formatPayrollDate(upcomingPayroll.payrollDate)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Amount */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
          <div>
            <p className="text-sm text-muted-foreground">Total to be deducted</p>
            <p className="text-sm text-muted-foreground mt-1">
              {deductionCount} {deductionCount === 1 ? "order" : "orders"}
            </p>
          </div>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatPrice(totalAmount, upcomingPayroll.currency)}
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Breakdown:</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {upcomingPayroll.deductions.map((deduction) => (
              <div
                key={deduction.id}
                className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
              >
                <span className="text-muted-foreground">
                  Order #{deduction.orderNumber}
                </span>
                <span className="font-medium">
                  {formatPrice(deduction.amount, deduction.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-100/50 dark:bg-indigo-900/20">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 dark:text-indigo-300">
            This amount will be automatically deducted from your upcoming payroll
            on {formatPayrollDate(upcomingPayroll.payrollDate)}. If you have any
            questions, please contact your HR department.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
