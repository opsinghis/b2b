"use client";

import { RequireAuth, useAuth } from "@b2b/auth/react";
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
  ArrowLeft,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  UserPlus,
  XCircle,
  Ban,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { ApprovalActionModal, ApprovalTimeline, type ApprovalAction } from "../components";
import {
  useApprovalRequest,
  useApproveStep,
  useRejectStep,
  useDelegateStep,
  useCancelApproval,
  formatDateTime,
  getRequestStatusLabel,
  getRequestStatusBadgeColor,
  getEntityTypeLabel,
  getEntityTypeBadgeColor,
  getEntityPath,
  isApprovalPending,
  canApproveOrReject,
  type ApprovalStepDto,
} from "../hooks/use-approvals";

function ApprovalDetailSkeleton() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
      <div className="h-48 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

function ApprovalDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();

  // Modal state
  const [modalAction, setModalAction] = useState<ApprovalAction | null>(null);
  const [selectedStep, setSelectedStep] = useState<ApprovalStepDto | null>(null);

  const { data: approval, isLoading, isError, refetch } = useApprovalRequest(id);
  const { mutateAsync: approveStep, isPending: isApproving } = useApproveStep();
  const { mutateAsync: rejectStep, isPending: isRejecting } = useRejectStep();
  const { mutateAsync: delegateStep, isPending: isDelegating } = useDelegateStep();
  const { mutate: cancelApproval, isPending: isCancelling } = useCancelApproval();

  const isProcessing = isApproving || isRejecting || isDelegating || isCancelling;

  // Find the current user's pending step
  const currentUserStep = approval?.steps.find(
    (step) =>
      step.status === "PENDING" &&
      step.approverId === user?.id
  );

  const openActionModal = (step: ApprovalStepDto, action: ApprovalAction) => {
    setSelectedStep(step);
    setModalAction(action);
  };

  const closeModal = () => {
    setSelectedStep(null);
    setModalAction(null);
  };

  const handleAction = async (params: {
    comments?: string;
    delegateToUserId?: string;
  }) => {
    if (!approval || !selectedStep || !modalAction) return;

    try {
      if (modalAction === "approve") {
        await approveStep({
          requestId: approval.id,
          stepId: selectedStep.id,
          comments: params.comments,
        });
        addToast({
          title: "Approved",
          description: "The request has been approved successfully",
          variant: "success",
        });
      } else if (modalAction === "reject") {
        await rejectStep({
          requestId: approval.id,
          stepId: selectedStep.id,
          comments: params.comments,
        });
        addToast({
          title: "Rejected",
          description: "The request has been rejected",
          variant: "success",
        });
      } else if (modalAction === "delegate" && params.delegateToUserId) {
        await delegateStep({
          requestId: approval.id,
          stepId: selectedStep.id,
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

  const handleCancel = () => {
    if (!approval) return;
    cancelApproval(approval.id, {
      onSuccess: () => {
        addToast({
          title: "Cancelled",
          description: "The approval request has been cancelled",
          variant: "success",
        });
      },
      onError: () => {
        addToast({
          title: "Cancellation failed",
          description: "Failed to cancel the approval request",
          variant: "error",
        });
      },
    });
  };

  if (isLoading) {
    return <ApprovalDetailSkeleton />;
  }

  if (isError || !approval) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">
              Failed to load approval request
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canCancel =
    approval.requesterId === user?.id && isApprovalPending(approval.status);

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/approvals">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Approvals
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Title and Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">Approval Request</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRequestStatusBadgeColor(
                approval.status
              )}`}
            >
              {getRequestStatusLabel(approval.status)}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityTypeBadgeColor(
                approval.entityType
              )}`}
            >
              {getEntityTypeLabel(approval.entityType)}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Requested {formatDateTime(approval.requestedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={getEntityPath(approval.entityType, approval.entityId)}>
              <FileText className="h-4 w-4 mr-2" />
              View {getEntityTypeLabel(approval.entityType)}
            </Link>
          </Button>
          {canCancel && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              <Ban className="h-4 w-4 mr-2" />
              Cancel Request
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current User's Pending Step - Action Card */}
          {currentUserStep && canApproveOrReject(currentUserStep.status) && (
            <Card className="border-amber-300 dark:border-amber-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Your Action Required
                </CardTitle>
                <CardDescription>
                  This approval is waiting for your decision at Level{" "}
                  {currentUserStep.level}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => openActionModal(currentUserStep, "delegate")}
                    disabled={isProcessing}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Delegate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openActionModal(currentUserStep, "reject")}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={() => openActionModal(currentUserStep, "approve")}
                    disabled={isProcessing}
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Entity Type</p>
                  <p className="font-medium">
                    {getEntityTypeLabel(approval.entityType)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Level</p>
                  <p className="font-medium">{approval.currentLevel}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {getRequestStatusLabel(approval.status)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Steps</p>
                  <p className="font-medium">{approval.steps.length}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Link
                  href={getEntityPath(approval.entityType, approval.entityId)}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open {getEntityTypeLabel(approval.entityType)} Details
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Step Details */}
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>
                Track the progress of this approval request
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {approval.steps
                  .slice()
                  .sort((a, b) => a.level - b.level)
                  .map((step) => (
                    <div key={step.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Level {step.level}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                step.status === "APPROVED"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : step.status === "REJECTED"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : step.status === "CANCELLED"
                                  ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                              }`}
                            >
                              {step.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Requested: {formatDateTime(step.requestedAt)}
                          </p>
                          {step.respondedAt && (
                            <p className="text-sm text-muted-foreground">
                              Responded: {formatDateTime(step.respondedAt)}
                            </p>
                          )}
                          {step.delegatedFrom && (
                            <p className="text-sm text-blue-600">
                              (Delegated from another user)
                            </p>
                          )}
                          {step.comments && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded italic">
                              &quot;{step.comments}&quot;
                            </p>
                          )}
                        </div>

                        {/* Action buttons for pending steps that belong to current user */}
                        {step.status === "PENDING" &&
                          step.approverId === user?.id && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openActionModal(step, "reject")}
                                disabled={isProcessing}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openActionModal(step, "approve")}
                                disabled={isProcessing}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Timeline and Info */}
        <div className="space-y-6">
          {/* Timeline Card */}
          <Card>
            <CardContent className="pt-6">
              <ApprovalTimeline approval={approval} />
            </CardContent>
          </Card>

          {/* Key Dates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-muted-foreground">Requested</span>
                <span className="text-sm font-medium">
                  {formatDateTime(approval.requestedAt).split(",")[0]}
                </span>
              </div>
              {approval.completedAt && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">
                    Completed
                  </span>
                  <span className="text-sm font-medium">
                    {formatDateTime(approval.completedAt).split(",")[0]}
                  </span>
                </div>
              )}
              {approval.expiresAt && !approval.completedAt && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Expires</span>
                  <span className="text-sm font-medium text-orange-600">
                    {formatDateTime(approval.expiresAt).split(",")[0]}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {approval.steps.filter((s) => s.status === "APPROVED").length}
                  /{approval.steps.length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Steps Completed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Modal */}
      {selectedStep && modalAction && (
        <ApprovalActionModal
          open={true}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
          action={modalAction}
          entityDescription={`${getEntityTypeLabel(
            approval.entityType
          )} - Level ${selectedStep.level}`}
          onConfirm={handleAction}
          isLoading={isProcessing}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
}

export default function ApprovalDetailPage() {
  return (
    <RequireAuth fallback={<ApprovalDetailSkeleton />} redirectTo="/login">
      <ApprovalDetailContent />
    </RequireAuth>
  );
}
