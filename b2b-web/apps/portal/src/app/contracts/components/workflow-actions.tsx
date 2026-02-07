"use client";

import { Button } from "@b2b/ui";
import {
  Send,
  CheckCircle,
  XCircle,
  PlayCircle,
} from "lucide-react";
import { useState } from "react";

import {
  ContractStatus,
  useSubmitContract,
  useApproveContract,
  useRejectContract,
  useActivateContract,
} from "../hooks";

import { WorkflowActionModal, WorkflowAction } from "./workflow-action-modal";

interface WorkflowActionsProps {
  contractId: string;
  contractTitle: string;
  status: ContractStatus;
  onSuccess?: () => void;
}

export function WorkflowActions({
  contractId,
  contractTitle,
  status,
  onSuccess,
}: WorkflowActionsProps) {
  const [activeAction, setActiveAction] = useState<WorkflowAction | null>(null);

  const submitMutation = useSubmitContract();
  const approveMutation = useApproveContract();
  const rejectMutation = useRejectContract();
  const activateMutation = useActivateContract();

  const handleAction = async (comments?: string) => {
    if (!activeAction) return;

    try {
      switch (activeAction) {
        case "submit":
          await submitMutation.mutateAsync({ id: contractId, comments });
          break;
        case "approve":
          await approveMutation.mutateAsync({ id: contractId, comments });
          break;
        case "reject":
          await rejectMutation.mutateAsync({ id: contractId, comments });
          break;
        case "activate":
          await activateMutation.mutateAsync({ id: contractId, comments });
          break;
      }
      setActiveAction(null);
      onSuccess?.();
    } catch {
      // Error is handled by mutation state
    }
  };

  const isLoading =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    activateMutation.isPending;

  // Determine available actions based on status
  const getAvailableActions = (): {
    action: WorkflowAction;
    icon: typeof Send;
    label: string;
    variant: "default" | "outline" | "destructive";
  }[] => {
    switch (status) {
      case "DRAFT":
        return [
          {
            action: "submit",
            icon: Send,
            label: "Submit for Review",
            variant: "default",
          },
        ];
      case "PENDING_APPROVAL":
        return [
          {
            action: "approve",
            icon: CheckCircle,
            label: "Approve",
            variant: "default",
          },
          {
            action: "reject",
            icon: XCircle,
            label: "Reject",
            variant: "destructive",
          },
        ];
      case "APPROVED":
        return [
          {
            action: "activate",
            icon: PlayCircle,
            label: "Activate",
            variant: "default",
          },
        ];
      default:
        return [];
    }
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {availableActions.map(({ action, icon: Icon, label, variant }) => (
          <Button
            key={action}
            variant={variant}
            onClick={() => setActiveAction(action)}
            disabled={isLoading}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {activeAction && (
        <WorkflowActionModal
          open={!!activeAction}
          onOpenChange={(open) => !open && setActiveAction(null)}
          action={activeAction}
          contractTitle={contractTitle}
          onConfirm={handleAction}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
