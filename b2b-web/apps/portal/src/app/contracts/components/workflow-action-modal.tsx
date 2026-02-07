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
import { Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";

export type WorkflowAction = "submit" | "approve" | "reject" | "activate";

interface WorkflowActionConfig {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "destructive";
  requiresComment: boolean;
  commentPlaceholder: string;
}

const ACTION_CONFIGS: Record<WorkflowAction, WorkflowActionConfig> = {
  submit: {
    title: "Submit for Review",
    description:
      "Are you sure you want to submit this contract for review? Once submitted, it will be sent to approvers for evaluation.",
    confirmLabel: "Submit",
    variant: "default",
    requiresComment: false,
    commentPlaceholder: "Add any notes for reviewers (optional)...",
  },
  approve: {
    title: "Approve Contract",
    description:
      "Are you sure you want to approve this contract? This will advance it to the approved stage.",
    confirmLabel: "Approve",
    variant: "default",
    requiresComment: false,
    commentPlaceholder: "Add approval notes (optional)...",
  },
  reject: {
    title: "Reject Contract",
    description:
      "Are you sure you want to reject this contract? It will be returned to draft status for revisions.",
    confirmLabel: "Reject",
    variant: "destructive",
    requiresComment: true,
    commentPlaceholder: "Please provide a reason for rejection...",
  },
  activate: {
    title: "Activate Contract",
    description:
      "Are you sure you want to activate this contract? Once activated, the contract will become effective.",
    confirmLabel: "Activate",
    variant: "default",
    requiresComment: false,
    commentPlaceholder: "Add activation notes (optional)...",
  },
};

interface WorkflowActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: WorkflowAction;
  contractTitle: string;
  onConfirm: (comments?: string) => Promise<void>;
  isLoading?: boolean;
}

export function WorkflowActionModal({
  open,
  onOpenChange,
  action,
  contractTitle,
  onConfirm,
  isLoading = false,
}: WorkflowActionModalProps) {
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  const config = ACTION_CONFIGS[action];

  const handleConfirm = async () => {
    if (config.requiresComment && !comments.trim()) {
      setError("Comment is required for this action");
      return;
    }

    setError("");
    await onConfirm(comments.trim() || undefined);
  };

  const handleClose = (newOpen: boolean) => {
    if (!isLoading) {
      setComments("");
      setError("");
      onOpenChange(newOpen);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            {action === "reject" && (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            )}
            {config.title}
          </ModalTitle>
          <ModalDescription>{config.description}</ModalDescription>
        </ModalHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-medium">Contract</p>
            <p className="text-sm text-muted-foreground">{contractTitle}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">
              Comments
              {config.requiresComment && (
                <span className="text-destructive"> *</span>
              )}
            </Label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => {
                setComments(e.target.value);
                setError("");
              }}
              placeholder={config.commentPlaceholder}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant={config.variant}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              config.confirmLabel
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
