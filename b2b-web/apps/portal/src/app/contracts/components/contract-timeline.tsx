"use client";

import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  PlayCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

import {
  type ContractDto,
  formatDateTime,
} from "../hooks";

interface ContractTimelineProps {
  contract: ContractDto;
}

interface TimelineEvent {
  id: string;
  status: string;
  label: string;
  description: string;
  date: string | undefined;
  icon: React.ReactNode;
  isCompleted: boolean;
  isCurrent: boolean;
}

export function ContractTimeline({ contract }: ContractTimelineProps) {
  // Build timeline events based on contract status
  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    const { status, createdAt, submittedAt, approvedAt, activatedAt } = contract;

    // Draft - always first
    events.push({
      id: "draft",
      status: "DRAFT",
      label: "Draft Created",
      description: "Contract was created",
      date: createdAt,
      icon: <FileText className="h-4 w-4" />,
      isCompleted: true,
      isCurrent: status === "DRAFT",
    });

    // Submitted for approval
    const submittedCompleted = [
      "PENDING_APPROVAL",
      "APPROVED",
      "ACTIVE",
      "EXPIRED",
      "TERMINATED",
      "CANCELLED",
    ].includes(status);
    events.push({
      id: "submitted",
      status: "PENDING_APPROVAL",
      label: "Submitted for Approval",
      description: submittedAt ? "Contract submitted for review" : "Awaiting submission",
      date: submittedAt,
      icon: <Send className="h-4 w-4" />,
      isCompleted: submittedCompleted,
      isCurrent: status === "PENDING_APPROVAL",
    });

    // Check if cancelled
    if (status === "CANCELLED") {
      events.push({
        id: "cancelled",
        status: "CANCELLED",
        label: "Cancelled",
        description: "Contract was cancelled",
        date: undefined,
        icon: <XCircle className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: true,
      });
      return events;
    }

    // Approved
    const approvedCompleted = ["APPROVED", "ACTIVE", "EXPIRED", "TERMINATED"].includes(
      status
    );
    events.push({
      id: "approved",
      status: "APPROVED",
      label: "Approved",
      description: approvedAt ? "Contract was approved" : "Awaiting approval",
      date: approvedAt,
      icon: <CheckCircle className="h-4 w-4" />,
      isCompleted: approvedCompleted,
      isCurrent: status === "APPROVED",
    });

    // Activated
    const activatedCompleted = ["ACTIVE", "EXPIRED", "TERMINATED"].includes(status);
    events.push({
      id: "active",
      status: "ACTIVE",
      label: "Activated",
      description: activatedAt ? "Contract is now active" : "Awaiting activation",
      date: activatedAt,
      icon: <PlayCircle className="h-4 w-4" />,
      isCompleted: activatedCompleted,
      isCurrent: status === "ACTIVE",
    });

    // Expired or Terminated (if applicable)
    if (status === "EXPIRED") {
      events.push({
        id: "expired",
        status: "EXPIRED",
        label: "Expired",
        description: "Contract has expired",
        date: contract.endDate,
        icon: <Clock className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: true,
      });
    } else if (status === "TERMINATED") {
      events.push({
        id: "terminated",
        status: "TERMINATED",
        label: "Terminated",
        description: "Contract was terminated",
        date: undefined,
        icon: <AlertTriangle className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: true,
      });
    }

    return events;
  };

  const events = getTimelineEvents();

  const getEventColor = (event: TimelineEvent) => {
    if (event.isCurrent) {
      if (event.status === "CANCELLED" || event.status === "TERMINATED") {
        return "bg-red-500 text-white";
      }
      if (event.status === "EXPIRED") {
        return "bg-orange-500 text-white";
      }
      return "bg-blue-500 text-white";
    }
    if (event.isCompleted) {
      return "bg-green-500 text-white";
    }
    return "bg-muted text-muted-foreground";
  };

  const getLineColor = (event: TimelineEvent, isLast: boolean) => {
    if (isLast) return "hidden";
    if (event.isCompleted && !event.isCurrent) {
      return "bg-green-500";
    }
    return "bg-muted";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contract Timeline</h3>
      <div className="space-y-0">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          return (
            <div key={event.id} className="flex gap-4">
              {/* Icon and Line */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${getEventColor(event)}`}
                >
                  {event.icon}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-8 ${getLineColor(event, isLast)}`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      event.isCurrent ? "text-foreground" : event.isCompleted ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {event.label}
                  </span>
                  {event.isCurrent && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.description}
                </p>
                {event.date && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(event.date)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
