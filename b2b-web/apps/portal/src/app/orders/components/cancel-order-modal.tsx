"use client";

import {
  Button,
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Label,
} from "@b2b/ui";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

import type { Order } from "../hooks";

interface CancelOrderModalProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function CancelOrderModal({
  order,
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    await onConfirm(reason);
    setReason("");
  };

  const handleClose = () => {
    if (!isLoading) {
      setReason("");
      onOpenChange(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Cancel Order
          </ModalTitle>
          <ModalDescription>
            Are you sure you want to cancel order{" "}
            <span className="font-mono font-medium">{order.orderNumber}</span>? This
            action cannot be undone.
          </ModalDescription>
        </ModalHeader>

        <div className="px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancellation (optional)</Label>
            <textarea
              id="cancel-reason"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Please let us know why you're cancelling this order..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Order"
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
