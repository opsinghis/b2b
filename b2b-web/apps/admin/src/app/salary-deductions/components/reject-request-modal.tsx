"use client";

import {
  Button,
  Input,
  Label,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@b2b/ui";
import { useState, type FormEvent } from "react";

import type { LimitRequest, RejectLimitRequestDto } from "../hooks/use-salary-deductions";
import { formatPrice, formatDateTime } from "../hooks/use-salary-deductions";

interface RejectRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LimitRequest | null;
  onSubmit: (requestId: string, data: RejectLimitRequestDto) => void;
  isLoading?: boolean;
}

export function RejectRequestModal({
  open,
  onOpenChange,
  request,
  onSubmit,
  isLoading,
}: RejectRequestModalProps) {
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    setReviewNote("");
    setError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!reviewNote.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    onSubmit(request.id, {
      reviewNote: reviewNote.trim(),
    });
  };

  if (!request) return null;

  const increase = parseFloat(request.requestedLimit) - parseFloat(request.currentLimit);

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Reject Limit Request</ModalTitle>
            <ModalDescription>
              Reject the limit increase request from {request.userName}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-6 py-4">
            {/* Request Info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-medium">{request.userName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Limit:</span>
                <span>{formatPrice(request.currentLimit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Requested Limit:</span>
                <span className="font-medium">
                  {formatPrice(request.requestedLimit)}
                  <span className="text-xs text-green-600 ml-1">(+{formatPrice(increase)})</span>
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Submitted:</span>
                <span>{formatDateTime(request.createdAt)}</span>
              </div>
              <div className="pt-2 border-t">
                <span className="text-sm text-muted-foreground">Reason:</span>
                <p className="text-sm mt-1">{request.reason}</p>
              </div>
            </div>

            {/* Rejection Reason */}
            <div className="space-y-2">
              <Label htmlFor="rejectReviewNote">Rejection Reason *</Label>
              <Input
                id="rejectReviewNote"
                value={reviewNote}
                onChange={(e) => {
                  setReviewNote(e.target.value);
                  setError("");
                }}
                placeholder="Explain why this request is being rejected..."
                className={error ? "border-destructive" : ""}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">
                This message will be visible to the employee.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="destructive"
            >
              {isLoading ? "Rejecting..." : "Reject Request"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
