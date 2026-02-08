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

import type { LimitRequest, ApproveLimitRequestDto } from "../hooks/use-salary-deductions";
import { formatPrice, formatDateTime } from "../hooks/use-salary-deductions";

interface ApproveRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LimitRequest | null;
  onSubmit: (requestId: string, data: ApproveLimitRequestDto) => void;
  isLoading?: boolean;
}

export function ApproveRequestModal({
  open,
  onOpenChange,
  request,
  onSubmit,
  isLoading,
}: ApproveRequestModalProps) {
  const [approvedLimit, setApprovedLimit] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [useRequestedLimit, setUseRequestedLimit] = useState(true);

  const resetForm = () => {
    setApprovedLimit("");
    setReviewNote("");
    setUseRequestedLimit(true);
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

    const data: ApproveLimitRequestDto = {
      reviewNote: reviewNote || undefined,
    };

    if (!useRequestedLimit && approvedLimit) {
      data.approvedLimit = parseFloat(approvedLimit);
    }

    onSubmit(request.id, data);
  };

  if (!request) return null;

  const increase = parseFloat(request.requestedLimit) - parseFloat(request.currentLimit);

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Approve Limit Request</ModalTitle>
            <ModalDescription>
              Review and approve the limit increase request from {request.userName}
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
                <span className="font-medium text-green-600">
                  {formatPrice(request.requestedLimit)}
                  <span className="text-xs ml-1">(+{formatPrice(increase)})</span>
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

            {/* Approval Options */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="useRequested"
                  name="limitOption"
                  checked={useRequestedLimit}
                  onChange={() => setUseRequestedLimit(true)}
                  className="h-4 w-4"
                />
                <Label htmlFor="useRequested" className="font-normal cursor-pointer">
                  Approve requested limit ({formatPrice(request.requestedLimit)})
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="useCustom"
                  name="limitOption"
                  checked={!useRequestedLimit}
                  onChange={() => setUseRequestedLimit(false)}
                  className="h-4 w-4"
                />
                <Label htmlFor="useCustom" className="font-normal cursor-pointer">
                  Approve different limit
                </Label>
              </div>

              {!useRequestedLimit && (
                <div className="pl-6 space-y-2">
                  <Label htmlFor="approvedLimit">Approved Limit ($)</Label>
                  <Input
                    id="approvedLimit"
                    type="number"
                    min={parseFloat(request.currentLimit)}
                    step="100"
                    value={approvedLimit}
                    onChange={(e) => setApprovedLimit(e.target.value)}
                    placeholder={`Min: ${formatPrice(request.currentLimit)}`}
                  />
                </div>
              )}
            </div>

            {/* Review Note */}
            <div className="space-y-2">
              <Label htmlFor="reviewNote">Review Note (Optional)</Label>
              <Input
                id="reviewNote"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Add a note for this approval..."
              />
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
              disabled={isLoading || (!useRequestedLimit && !approvedLimit)}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Approving..." : "Approve Request"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
