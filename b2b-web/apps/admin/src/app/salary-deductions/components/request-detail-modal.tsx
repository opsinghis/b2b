"use client";

import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@b2b/ui";

import type { LimitRequest } from "../hooks/use-salary-deductions";
import {
  formatPrice,
  formatDateTime,
  getLimitRequestStatusLabel,
  getLimitRequestStatusColor,
} from "../hooks/use-salary-deductions";

interface RequestDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LimitRequest | null;
  onApprove?: (request: LimitRequest) => void;
  onReject?: (request: LimitRequest) => void;
}

export function RequestDetailModal({
  open,
  onOpenChange,
  request,
  onApprove,
  onReject,
}: RequestDetailModalProps) {
  if (!request) return null;

  const increase = parseFloat(request.requestedLimit) - parseFloat(request.currentLimit);
  const increasePercent = parseFloat(request.currentLimit) > 0
    ? ((increase / parseFloat(request.currentLimit)) * 100).toFixed(0)
    : "N/A";

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <ModalHeader>
          <ModalTitle>Limit Request Details</ModalTitle>
        </ModalHeader>

        <div className="space-y-6 py-4">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getLimitRequestStatusColor(
                request.status
              )}`}
            >
              {getLimitRequestStatusLabel(request.status)}
            </span>
          </div>

          {/* Employee Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Employee Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{request.userName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{request.userEmail}</p>
              </div>
              {request.employeeId && (
                <div>
                  <span className="text-muted-foreground">Employee ID:</span>
                  <p className="font-medium">{request.employeeId}</p>
                </div>
              )}
              {request.organizationName && (
                <div>
                  <span className="text-muted-foreground">Organization:</span>
                  <p className="font-medium">{request.organizationName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Limit Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Limit Details</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground block">Current</span>
                <p className="font-semibold text-lg">{formatPrice(request.currentLimit)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <span className="text-muted-foreground block">Requested</span>
                <p className="font-semibold text-lg text-green-600">{formatPrice(request.requestedLimit)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground block">Increase</span>
                <p className="font-semibold text-lg text-green-600">+{increasePercent}%</p>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold border-b pb-2">Request Reason</h3>
            <p className="text-sm bg-muted/50 p-3 rounded-lg">{request.reason}</p>
          </div>

          {/* Timestamps */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold border-b pb-2">Timeline</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted:</span>
                <span>{formatDateTime(request.createdAt)}</span>
              </div>
              {request.reviewedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reviewed:</span>
                  <span>{formatDateTime(request.reviewedAt)}</span>
                </div>
              )}
              {request.reviewedByName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reviewed By:</span>
                  <span>{request.reviewedByName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Review Note */}
          {request.reviewNote && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold border-b pb-2">Review Note</h3>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{request.reviewNote}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {request.status === "PENDING" && (
            <>
              <Button
                variant="destructive"
                onClick={() => {
                  onOpenChange(false);
                  onReject?.(request);
                }}
              >
                Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  onOpenChange(false);
                  onApprove?.(request);
                }}
              >
                Approve
              </Button>
            </>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
