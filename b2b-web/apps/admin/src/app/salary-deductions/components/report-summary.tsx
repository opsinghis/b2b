"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import { DollarSign, Users, TrendingUp, AlertTriangle } from "lucide-react";

import type { MonthlyReport } from "../hooks/use-salary-deductions";
import { formatPrice, formatMonthYear } from "../hooks/use-salary-deductions";

interface ReportSummaryProps {
  report: MonthlyReport;
}

export function ReportSummary({ report }: ReportSummaryProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        Report Summary - {formatMonthYear(report.month)}
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deducted</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(report.totalDeducted, report.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {report.summary.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatPrice(report.totalPending, report.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting payroll processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              With deductions this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Deduction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(report.summary.averageDeduction, report.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Range: {formatPrice(report.summary.lowestDeduction, report.currency)} - {formatPrice(report.summary.highestDeduction, report.currency)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
