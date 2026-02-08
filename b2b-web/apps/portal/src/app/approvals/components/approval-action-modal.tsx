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
  Input,
} from "@b2b/ui";
import { Loader2, AlertTriangle, CheckCircle, XCircle, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";

import { useUsers, type UserDto } from "../hooks/use-approvals";

export type ApprovalAction = "approve" | "reject" | "delegate";

interface ApprovalActionConfig {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "destructive";
  requiresComment: boolean;
  commentPlaceholder: string;
  icon: React.ReactNode;
}

const ACTION_CONFIGS: Record<ApprovalAction, ApprovalActionConfig> = {
  approve: {
    title: "Approve Request",
    description:
      "Are you sure you want to approve this request? This action will move the approval to the next step or complete it.",
    confirmLabel: "Approve",
    variant: "default",
    requiresComment: false,
    commentPlaceholder: "Add approval notes (optional)...",
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
  },
  reject: {
    title: "Reject Request",
    description:
      "Are you sure you want to reject this request? The entity will be returned to draft status for revisions.",
    confirmLabel: "Reject",
    variant: "destructive",
    requiresComment: true,
    commentPlaceholder: "Please provide a reason for rejection...",
    icon: <XCircle className="h-5 w-5 text-destructive" />,
  },
  delegate: {
    title: "Delegate Approval",
    description:
      "Delegate this approval step to another user. They will be responsible for approving or rejecting the request.",
    confirmLabel: "Delegate",
    variant: "default",
    requiresComment: false,
    commentPlaceholder: "Add a reason for delegation (optional)...",
    icon: <UserPlus className="h-5 w-5 text-blue-600" />,
  },
};

interface ApprovalActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ApprovalAction;
  entityDescription: string;
  onConfirm: (params: {
    comments?: string;
    delegateToUserId?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  currentUserId?: string;
}

export function ApprovalActionModal({
  open,
  onOpenChange,
  action,
  entityDescription,
  onConfirm,
  isLoading = false,
  currentUserId,
}: ApprovalActionModalProps) {
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDto | null>(null);

  const { data: usersData, isLoading: isLoadingUsers } = useUsers(
    action === "delegate" && userSearch.length >= 2 ? userSearch : undefined
  );

  const config = ACTION_CONFIGS[action];

  // Filter out current user from delegation options
  const availableUsers = usersData?.data?.filter(
    (user) => user.id !== currentUserId
  ) || [];

  useEffect(() => {
    if (!open) {
      setComments("");
      setError("");
      setUserSearch("");
      setSelectedUser(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (config.requiresComment && !comments.trim()) {
      setError("Comment is required for this action");
      return;
    }

    if (action === "delegate" && !selectedUser) {
      setError("Please select a user to delegate to");
      return;
    }

    setError("");
    await onConfirm({
      comments: comments.trim() || undefined,
      delegateToUserId: selectedUser?.id,
    });
  };

  const handleClose = (newOpen: boolean) => {
    if (!isLoading) {
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
            {action === "approve" && config.icon}
            {action === "delegate" && config.icon}
            {config.title}
          </ModalTitle>
          <ModalDescription>{config.description}</ModalDescription>
        </ModalHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-medium">Request</p>
            <p className="text-sm text-muted-foreground">{entityDescription}</p>
          </div>

          {/* Delegate user selection */}
          {action === "delegate" && (
            <div className="space-y-2">
              <Label htmlFor="delegate-user">
                Delegate To
                <span className="text-destructive"> *</span>
              </Label>
              {selectedUser ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="delegate-user"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name or email..."
                    disabled={isLoading}
                  />
                  {userSearch.length >= 2 && (
                    <div className="max-h-48 overflow-auto rounded-md border">
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2 text-sm">Searching...</span>
                        </div>
                      ) : availableUsers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No users found
                        </div>
                      ) : (
                        availableUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setUserSearch("");
                              setError("");
                            }}
                            className="w-full p-3 text-left hover:bg-muted transition-colors border-b last:border-b-0"
                          >
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comments">
              {action === "delegate" ? "Reason" : "Comments"}
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
