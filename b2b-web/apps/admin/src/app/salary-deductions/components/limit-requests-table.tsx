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
import { Check, X, Eye } from "lucide-react";

import type { LimitRequest } from "../hooks/use-salary-deductions";
import {
  formatPrice,
  formatDateTime,
  getLimitRequestStatusLabel,
  getLimitRequestStatusColor,
} from "../hooks/use-salary-deductions";

interface LimitRequestsTableProps {
  data: LimitRequest[];
  selectedItems?: string[];
  onSelectItem?: (id: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onApprove?: (item: LimitRequest) => void;
  onReject?: (item: LimitRequest) => void;
  onViewDetails?: (item: LimitRequest) => void;
  isUpdating?: boolean;
}

export function LimitRequestsTable({
  data,
  selectedItems = [],
  onSelectItem,
  onSelectAll,
  onApprove,
  onReject,
  onViewDetails,
  isUpdating,
}: LimitRequestsTableProps) {
  // Filter to only show pending for selection
  const selectableItems = data.filter((item) => item.status === "PENDING");
  const allSelectableSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selectedItems.includes(item.id));
  const someSelectableSelected =
    selectedItems.length > 0 && !allSelectableSelected;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={
                  allSelectableSelected
                    ? true
                    : someSelectableSelected
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(checked) => onSelectAll?.(checked === true)}
                aria-label="Select all pending"
                disabled={selectableItems.length === 0}
              />
            </TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="text-right">Current Limit</TableHead>
            <TableHead className="text-right">Requested Limit</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No limit requests found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const increase = parseFloat(item.requestedLimit) - parseFloat(item.currentLimit);
              const increasePercent = parseFloat(item.currentLimit) > 0
                ? ((increase / parseFloat(item.currentLimit)) * 100).toFixed(0)
                : "N/A";

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={(checked) => onSelectItem?.(item.id, !!checked)}
                      aria-label={`Select ${item.userName}`}
                      disabled={item.status !== "PENDING"}
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
                  <TableCell className="text-right">
                    {formatPrice(item.currentLimit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <div className="font-medium">{formatPrice(item.requestedLimit)}</div>
                      <div className="text-xs text-green-600">
                        +{formatPrice(increase)} ({increasePercent}%)
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={item.reason}>
                      {item.reason}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLimitRequestStatusColor(
                        item.status
                      )}`}
                    >
                      {getLimitRequestStatusLabel(item.status)}
                    </span>
                    {item.reviewedAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(item.reviewedAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDateTime(item.createdAt)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails?.(item)}
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {item.status === "PENDING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onApprove?.(item)}
                            disabled={isUpdating}
                            title="Approve"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onReject?.(item)}
                            disabled={isUpdating}
                            title="Reject"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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
