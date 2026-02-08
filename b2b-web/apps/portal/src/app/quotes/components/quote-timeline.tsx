"use client";

import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Mail,
  ThumbsUp,
  Clock,
  RefreshCw,
} from "lucide-react";

import {
  type QuoteDto,
  formatDateTime,
} from "../hooks/use-quotes";

interface QuoteTimelineProps {
  quote: QuoteDto;
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

export function QuoteTimeline({ quote }: QuoteTimelineProps) {
  // Build timeline events based on quote status
  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    const { status, createdAt, submittedAt, approvedAt, sentAt } = quote;

    // Draft - always first
    events.push({
      id: "draft",
      status: "DRAFT",
      label: "Draft Created",
      description: "Quote was created",
      date: createdAt,
      icon: <FileText className="h-4 w-4" />,
      isCompleted: true,
      isCurrent: status === "DRAFT",
    });

    // Submitted for approval
    const submittedCompleted = [
      "PENDING_APPROVAL",
      "APPROVED",
      "SENT",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CONVERTED",
    ].includes(status);
    events.push({
      id: "submitted",
      status: "PENDING_APPROVAL",
      label: "Submitted for Approval",
      description: submittedAt ? "Quote submitted for review" : "Awaiting submission",
      date: submittedAt,
      icon: <Send className="h-4 w-4" />,
      isCompleted: submittedCompleted,
      isCurrent: status === "PENDING_APPROVAL",
    });

    // Check if rejected early
    if (status === "REJECTED") {
      events.push({
        id: "rejected",
        status: "REJECTED",
        label: "Rejected",
        description: "Quote was rejected",
        date: undefined,
        icon: <XCircle className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: true,
      });
      return events;
    }

    // Approved
    const approvedCompleted = ["APPROVED", "SENT", "ACCEPTED", "EXPIRED", "CONVERTED"].includes(
      status
    );
    events.push({
      id: "approved",
      status: "APPROVED",
      label: "Approved",
      description: approvedAt ? "Quote was approved" : "Awaiting approval",
      date: approvedAt,
      icon: <CheckCircle className="h-4 w-4" />,
      isCompleted: approvedCompleted,
      isCurrent: status === "APPROVED",
    });

    // Sent to customer
    const sentCompleted = ["SENT", "ACCEPTED", "EXPIRED", "CONVERTED"].includes(status);
    events.push({
      id: "sent",
      status: "SENT",
      label: "Sent to Customer",
      description: sentAt ? "Quote sent to customer" : "Awaiting send",
      date: sentAt,
      icon: <Mail className="h-4 w-4" />,
      isCompleted: sentCompleted,
      isCurrent: status === "SENT",
    });

    // Check for expired
    if (status === "EXPIRED") {
      events.push({
        id: "expired",
        status: "EXPIRED",
        label: "Expired",
        description: "Quote has expired",
        date: quote.validUntil,
        icon: <Clock className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: true,
      });
      return events;
    }

    // Accepted
    const acceptedCompleted = ["ACCEPTED", "CONVERTED"].includes(status);
    events.push({
      id: "accepted",
      status: "ACCEPTED",
      label: "Accepted",
      description: acceptedCompleted ? "Customer accepted the quote" : "Awaiting customer response",
      date: undefined,
      icon: <ThumbsUp className="h-4 w-4" />,
      isCompleted: acceptedCompleted,
      isCurrent: status === "ACCEPTED",
    });

    // Converted (if applicable)
    if (status === "CONVERTED") {
      events.push({
        id: "converted",
        status: "CONVERTED",
        label: "Converted to Contract",
        description: "Quote was converted to a contract",
        date: undefined,
        icon: <RefreshCw className="h-4 w-4" />,
        isCompleted: true,
        isCurrent: true,
      });
    }

    return events;
  };

  const events = getTimelineEvents();

  const getEventColor = (event: TimelineEvent) => {
    if (event.isCurrent) {
      if (event.status === "REJECTED") {
        return "bg-red-500 text-white";
      }
      if (event.status === "EXPIRED") {
        return "bg-orange-500 text-white";
      }
      if (event.status === "CONVERTED") {
        return "bg-teal-500 text-white";
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
      <h3 className="text-lg font-semibold">Quote Timeline</h3>
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
