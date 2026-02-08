"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useToast,
} from "@b2b/ui";
import {
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  XCircle,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ApprovalsFilters, ApprovalActionModal, type ApprovalAction } from "./components";
import {
  usePendingApprovals,
  useApproveStep,
  useRejectStep,
  useDelegateStep,
  formatRelativeTime,
  getEntityTypeLabel,
  getEntityTypeBadgeColor,
  getEntityPath,
  type ApprovalEntityType,
  type PendingApprovalDto,
} from "./hooks/use-approvals";

function ApprovalsListSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-10 w-10 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-10 w-48 bg-muted rounded animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function ApprovalsListContent() {
  // Filter state
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<
    ApprovalEntityType | undefined
  >();

  // Modal state
  const [selectedApproval, setSelectedApproval] =
    React.useState<PendingApprovalDto | null>(null);
  const [modalAction, setModalAction] = React.useState<ApprovalAction | null>(
    null
  );

  const { addToast } = useToast();

  const { data: pendingApprovals, isLoading, isError, refetch } = usePendingApprovals();
  const { mutateAsync: approveStep, isPending: isApproving } = useApproveStep();
  const { mutateAsync: rejectStep, isPending: isRejecting } = useRejectStep();
  const { mutateAsync: delegateStep, isPending: isDelegating } = useDelegateStep();

  const isProcessing = isApproving || isRejecting || isDelegating;

  // Filter approvals
  const filteredApprovals = React.useMemo(() => {
    if (!pendingApprovals) return [];
    if (!entityTypeFilter) return pendingApprovals;
    return pendingApprovals.filter(
      (approval) => approval.entityType === entityTypeFilter
    );
  }, [pendingApprovals, entityTypeFilter]);

  const handleClearFilters = () => {
    setEntityTypeFilter(undefined);
  };

  const openActionModal = (
    approval: PendingApprovalDto,
    action: ApprovalAction
  ) => {
    setSelectedApproval(approval);
    setModalAction(action);
  };

  const closeModal = () => {
    setSelectedApproval(null);
    setModalAction(null);
  };

  const handleAction = async (params: {
    comments?: string;
    delegateToUserId?: string;
  }) => {
    if (!selectedApproval || !modalAction) return;

    try {
      if (modalAction === "approve") {
        await approveStep({
          requestId: selectedApproval.id,
          stepId: selectedApproval.stepId,
          comments: params.comments,
        });
        addToast({
          title: "Approved",
          description: "The request has been approved successfully",
          variant: "success",
        });
      } else if (modalAction === "reject") {
        await rejectStep({
          requestId: selectedApproval.id,
          stepId: selectedApproval.stepId,
          comments: params.comments,
        });
        addToast({
          title: "Rejected",
          description: "The request has been rejected",
          variant: "success",
        });
      } else if (modalAction === "delegate" && params.delegateToUserId) {
        await delegateStep({
          requestId: selectedApproval.id,
          stepId: selectedApproval.stepId,
          delegateToUserId: params.delegateToUserId,
          reason: params.comments,
        });
        addToast({
          title: "Delegated",
          description: "The approval has been delegated to another user",
          variant: "success",
        });
      }
      closeModal();
    } catch {
      addToast({
        title: "Action failed",
        description: `Failed to ${modalAction} the request`,
        variant: "error",
      });
    }
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Approvals Inbox</h1>
          <p className="text-muted-foreground">
            Review and manage pending approval requests
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      {/* Filters */}
      <ApprovalsFilters
        entityTypeFilter={entityTypeFilter}
        onEntityTypeChange={setEntityTypeFilter}
        onClearFilters={handleClearFilters}
      />

      {/* Pending Count Badge */}
      {!isLoading && !isError && pendingApprovals && (
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-sm font-medium">
            <Clock className="h-4 w-4 mr-1" />
            {filteredApprovals.length} pending approval
            {filteredApprovals.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Approvals List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">
            Loading approvals...
          </p>
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load approvals</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredApprovals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h3 className="font-semibold mb-1">All caught up!</h3>
            <p className="text-sm text-muted-foreground">
              {entityTypeFilter
                ? `No pending ${getEntityTypeLabel(entityTypeFilter).toLowerCase()} approvals`
                : "You have no pending approvals at this time"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApprovals.map((approval) => (
            <Card
              key={`${approval.id}-${approval.stepId}`}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityTypeBadgeColor(
                          approval.entityType
                        )}`}
                      >
                        {getEntityTypeLabel(approval.entityType)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        Level {approval.level}: {approval.levelName}
                      </span>
                    </div>
                    <CardTitle className="text-base">
                      {getEntityTypeLabel(approval.entityType)} Approval Request
                    </CardTitle>
                    <CardDescription>
                      Requested {formatRelativeTime(approval.requestedAt)}
                      {approval.delegatedFrom && (
                        <span className="ml-2 text-blue-600">
                          (Delegated to you)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Link
                    href={`/approvals/${approval.id}`}
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    View Details
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
                  {/* Entity link */}
                  <Link
                    href={getEntityPath(approval.entityType, approval.entityId)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View {getEntityTypeLabel(approval.entityType)}
                  </Link>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {approval.allowDelegation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openActionModal(approval, "delegate")}
                        disabled={isProcessing}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Delegate
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openActionModal(approval, "reject")}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openActionModal(approval, "approve")}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>

                {/* Expiration warning */}
                {approval.expiresAt && (
                  <div className="mt-3 text-sm text-orange-600 dark:text-orange-400">
                    Expires: {new Date(approval.expiresAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {selectedApproval && modalAction && (
        <ApprovalActionModal
          open={true}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
          action={modalAction}
          entityDescription={`${getEntityTypeLabel(
            selectedApproval.entityType
          )} - Level ${selectedApproval.level}: ${selectedApproval.levelName}`}
          onConfirm={handleAction}
          isLoading={isProcessing}
        />
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <RequireAuth fallback={<ApprovalsListSkeleton />} redirectTo="/login">
      <ApprovalsListContent />
    </RequireAuth>
  );
}
