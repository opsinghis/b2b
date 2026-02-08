"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import * as React from "react";

import { type OrderStatus, ORDER_STATUSES } from "../hooks/use-orders";

interface BulkStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSubmit: (status: OrderStatus, notes?: string) => void;
  isLoading?: boolean;
}

export function BulkStatusModal({
  open,
  onOpenChange,
  selectedCount,
  onSubmit,
  isLoading,
}: BulkStatusModalProps) {
  const [status, setStatus] = React.useState<OrderStatus | "">("");
  const [notes, setNotes] = React.useState("");

  const resetForm = () => {
    setStatus("");
    setNotes("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;
    onSubmit(status, notes || undefined);
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Update Status</ModalTitle>
            <ModalDescription>
              Update the status of {selectedCount} selected order{selectedCount !== 1 ? "s" : ""}.
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-status">New Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as OrderStatus)}
                disabled={isLoading}
              >
                <SelectTrigger id="bulk-status">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-notes">Notes (optional)</Label>
              <textarea
                id="bulk-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Add a note about this status change..."
                disabled={isLoading}
              />
            </div>

            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm text-yellow-800">
                This will update all {selectedCount} selected orders to the same status.
                This action cannot be undone.
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
            <Button type="submit" disabled={!status || isLoading}>
              {isLoading ? "Updating..." : `Update ${selectedCount} Orders`}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
