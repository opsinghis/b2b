"use client";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Checkbox,
} from "@b2b/ui";
import { Edit, Power } from "lucide-react";

import type { EmployeeDeduction } from "../hooks/use-salary-deductions";
import {
  formatPrice,
  calculateUsagePercentage,
  getUsageColor,
} from "../hooks/use-salary-deductions";

interface DeductionsTableProps {
  data: EmployeeDeduction[];
  selectedItems?: string[];
  onSelectItem?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onEditLimit?: (item: EmployeeDeduction) => void;
  onToggleEnabled?: (item: EmployeeDeduction) => void;
  isUpdating?: boolean;
}

export function DeductionsTable({
  data,
  selectedItems = [],
  onSelectItem,
  onSelectAll,
  onEditLimit,
  onToggleEnabled,
  isUpdating,
}: DeductionsTableProps) {
  const allSelected = data.length > 0 && selectedItems.length === data.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < data.length;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => onSelectAll?.(checked === true)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Monthly Limit</TableHead>
            <TableHead className="text-right">Used</TableHead>
            <TableHead className="text-right">Remaining</TableHead>
            <TableHead>Usage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No employees found with salary deduction enabled.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const usagePercent = calculateUsagePercentage(item.usedAmount, item.monthlyLimit);
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(item.userId)}
                      onCheckedChange={(checked) => onSelectItem?.(item.userId, !!checked)}
                      aria-label={`Select ${item.userName}`}
                    />
                  </TableCell>
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
                    {item.organizationName || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(item.monthlyLimit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.usedAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(item.remainingAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getUsageColor(usagePercent)} transition-all`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10">
                        {usagePercent.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.isEnabled
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {item.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditLimit?.(item)}
                        disabled={isUpdating}
                        title="Edit limit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleEnabled?.(item)}
                        disabled={isUpdating}
                        title={item.isEnabled ? "Disable deduction" : "Enable deduction"}
                      >
                        <Power
                          className={`h-4 w-4 ${
                            item.isEnabled ? "text-green-600" : "text-gray-400"
                          }`}
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
