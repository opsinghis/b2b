"use client";

import {
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  UserPlus,
} from "lucide-react";

import {
  type ApprovalRequestDto,
  type ApprovalStepDto,
  formatDateTime,
  getStepStatusLabel,
} from "../hooks/use-approvals";

interface ApprovalTimelineProps {
  approval: ApprovalRequestDto;
}

function getStepIcon(status: ApprovalStepDto["status"]) {
  switch (status) {
    case "APPROVED":
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case "REJECTED":
      return <XCircle className="h-5 w-5 text-red-600" />;
    case "CANCELLED":
      return <Ban className="h-5 w-5 text-gray-600" />;
    case "PENDING":
    default:
      return <Clock className="h-5 w-5 text-amber-600" />;
  }
}

function getStepLineColor(status: ApprovalStepDto["status"]) {
  switch (status) {
    case "APPROVED":
      return "bg-green-600";
    case "REJECTED":
      return "bg-red-600";
    case "CANCELLED":
      return "bg-gray-400";
    case "PENDING":
    default:
      return "bg-amber-400";
  }
}

export function ApprovalTimeline({ approval }: ApprovalTimelineProps) {
  const sortedSteps = [...approval.steps].sort((a, b) => a.level - b.level);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Approval Steps</h3>
      <div className="relative">
        {sortedSteps.map((step, index) => {
          const isLast = index === sortedSteps.length - 1;

          return (
            <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
              {/* Timeline line and icon */}
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-muted z-10">
                  {getStepIcon(step.status)}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 ${getStepLineColor(step.status)}`} />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pt-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    Level {step.level}
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        step.status === "APPROVED"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : step.status === "REJECTED"
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          : step.status === "CANCELLED"
                          ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                      }`}
                    >
                      {getStepStatusLabel(step.status)}
                    </span>
                  </p>
                </div>

                <p className="text-sm text-muted-foreground mt-1">
                  Requested: {formatDateTime(step.requestedAt)}
                </p>

                {step.respondedAt && (
                  <p className="text-sm text-muted-foreground">
                    Responded: {formatDateTime(step.respondedAt)}
                  </p>
                )}

                {step.delegatedFrom && (
                  <div className="flex items-center gap-1 mt-1 text-sm text-blue-600">
                    <UserPlus className="h-3 w-3" />
                    <span>Delegated</span>
                  </div>
                )}

                {step.comments && (
                  <div className="mt-2 p-2 rounded bg-muted text-sm">
                    <p className="text-muted-foreground italic">&quot;{step.comments}&quot;</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall approval info */}
      <div className="border-t pt-4 mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Requested</span>
          <span>{formatDateTime(approval.requestedAt)}</span>
        </div>
        {approval.completedAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completed</span>
            <span>{formatDateTime(approval.completedAt)}</span>
          </div>
        )}
        {approval.expiresAt && !approval.completedAt && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expires</span>
            <span>{formatDateTime(approval.expiresAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
