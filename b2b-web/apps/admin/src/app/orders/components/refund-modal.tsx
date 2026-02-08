"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
  Label,
} from "@b2b/ui";
import * as React from "react";

import { type Order, formatPrice } from "../hooks/use-orders";

interface RefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSubmit: (data: { amount?: number; reason: string }) => void;
  isLoading?: boolean;
}

interface FormErrors {
  reason?: string;
  amount?: string;
}

export function RefundModal({
  open,
  onOpenChange,
  order,
  onSubmit,
  isLoading,
}: RefundModalProps) {
  const [refundType, setRefundType] = React.useState<"full" | "partial">("full");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const resetForm = () => {
    setRefundType("full");
    setAmount("");
    setReason("");
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!reason.trim()) {
      newErrors.reason = "Reason is required";
    }

    if (refundType === "partial") {
      const numAmount = parseFloat(amount);
      const orderTotal = parseFloat(order?.total || "0");
      if (isNaN(numAmount) || numAmount <= 0) {
        newErrors.amount = "Amount must be greater than 0";
      } else if (numAmount > orderTotal) {
        newErrors.amount = `Amount cannot exceed order total (${formatPrice(orderTotal, order?.currency)})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSubmit({
      amount: refundType === "partial" ? parseFloat(amount) : undefined,
      reason,
    });
  };

  if (!order) return null;

  const orderTotal = parseFloat(order.total);

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Process Refund</ModalTitle>
            <ModalDescription>
              Process a refund for order {order.orderNumber}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            {/* Order Summary */}
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Order Number:</span>
                  <span className="ml-2 font-medium">{order.orderNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <span className="ml-2 font-medium">
                    {formatPrice(order.total, order.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="ml-2 font-medium">
                    {order.userName || "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Items:</span>
                  <span className="ml-2 font-medium">{order.itemCount}</span>
                </div>
              </div>
            </div>

            {/* Refund Type */}
            <div className="space-y-2">
              <Label>Refund Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="refundType"
                    value="full"
                    checked={refundType === "full"}
                    onChange={() => setRefundType("full")}
                    className="rounded border-input"
                    disabled={isLoading}
                  />
                  <span>Full Refund ({formatPrice(orderTotal, order.currency)})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="refundType"
                    value="partial"
                    checked={refundType === "partial"}
                    onChange={() => setRefundType("partial")}
                    className="rounded border-input"
                    disabled={isLoading}
                  />
                  <span>Partial Refund</span>
                </label>
              </div>
            </div>

            {/* Partial Amount */}
            {refundType === "partial" && (
              <div className="space-y-2">
                <Label htmlFor="refund-amount">Refund Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="refund-amount"
                    type="number"
                    min="0.01"
                    max={orderTotal}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                    error={!!errors.amount}
                    disabled={isLoading}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maximum refund: {formatPrice(orderTotal, order.currency)}
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason for Refund *</Label>
              <textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter the reason for this refund..."
                disabled={isLoading}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason}</p>
              )}
            </div>

            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <p className="text-sm text-orange-800">
                <strong>Warning:</strong> This action will process a refund of{" "}
                <strong>
                  {refundType === "full"
                    ? formatPrice(orderTotal, order.currency)
                    : formatPrice(parseFloat(amount) || 0, order.currency)}
                </strong>{" "}
                to the customer. This action cannot be undone.
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
              variant="destructive"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Process Refund"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
