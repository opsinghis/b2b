"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Label,
} from "@b2b/ui";
import * as React from "react";

export type WorkflowAction = "approve" | "reject" | "send" | "accept" | "convert";

interface WorkflowActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: WorkflowAction;
  quoteNumber: string;
  onConfirm: (comments?: string) => void;
  isLoading?: boolean;
}

const ACTION_CONFIG: Record<
  WorkflowAction,
  {
    title: string;
    description: string;
    confirmText: string;
    confirmVariant: "default" | "destructive";
    requiresComment: boolean;
  }
> = {
  approve: {
    title: "Approve Quote",
    description: "This will approve the quote and make it ready to send to the customer.",
    confirmText: "Approve",
    confirmVariant: "default",
    requiresComment: false,
  },
  reject: {
    title: "Reject Quote",
    description:
      "This will reject the quote and return it to draft status. Please provide a reason.",
    confirmText: "Reject",
    confirmVariant: "destructive",
    requiresComment: true,
  },
  send: {
    title: "Send to Customer",
    description: "This will mark the quote as sent to the customer.",
    confirmText: "Send",
    confirmVariant: "default",
    requiresComment: false,
  },
  accept: {
    title: "Mark as Accepted",
    description: "This will mark the quote as accepted by the customer.",
    confirmText: "Mark Accepted",
    confirmVariant: "default",
    requiresComment: false,
  },
  convert: {
    title: "Convert to Contract",
    description:
      "This will create a new contract from this quote. The quote status will be changed to Converted.",
    confirmText: "Convert",
    confirmVariant: "default",
    requiresComment: false,
  },
};

export function WorkflowActionModal({
  open,
  onOpenChange,
  action,
  quoteNumber,
  onConfirm,
  isLoading,
}: WorkflowActionModalProps) {
  const [comments, setComments] = React.useState("");
  const config = ACTION_CONFIG[action];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(comments || undefined);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setComments("");
    }
    onOpenChange(open);
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>{config.title}</ModalTitle>
            <ModalDescription>
              Quote: <strong>{quoteNumber}</strong>
              <br />
              <br />
              {config.description}
            </ModalDescription>
          </ModalHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">
                Comments {config.requiresComment ? "(required)" : "(optional)"}
              </Label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Add any comments or notes..."
                required={config.requiresComment}
                disabled={isLoading}
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
              variant={config.confirmVariant}
              disabled={isLoading || (config.requiresComment && !comments.trim())}
            >
              {isLoading ? "Processing..." : config.confirmText}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
