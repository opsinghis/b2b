"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@b2b/ui";

import type { DeductionReportItem } from "../hooks/use-salary-deductions";
import { formatPrice } from "../hooks/use-salary-deductions";

interface ReportTableProps {
  data: DeductionReportItem[];
  currency?: string;
}

export function ReportTable({ data, currency = "USD" }: ReportTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Total Deducted</TableHead>
            <TableHead className="text-center">Deductions</TableHead>
            <TableHead className="text-right">Completed</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="text-right">Failed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No deduction data for this period.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.userId}>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.userName}</div>
                    <div className="text-sm text-muted-foreground">{item.userEmail}</div>
                    {item.employeeId && (
                      <div className="text-xs text-muted-foreground">ID: {item.employeeId}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.organizationName || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPrice(item.totalDeducted, currency)}
                </TableCell>
                <TableCell className="text-center">
                  {item.deductionCount}
                </TableCell>
                <TableCell className="text-right">
                  <div>
                    <span className="text-green-600">{formatPrice(item.completedAmount, currency)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({item.completedCount})</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div>
                    <span className="text-amber-600">{formatPrice(item.pendingAmount, currency)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({item.pendingCount})</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {parseFloat(item.failedAmount) > 0 ? (
                    <div>
                      <span className="text-red-600">{formatPrice(item.failedAmount, currency)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({item.failedCount})</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
