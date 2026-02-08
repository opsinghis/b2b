"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  useToast,
  cn,
} from "@b2b/ui";
import {
  ArrowUpCircle,
  CheckCircle,
  Clock,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import {
  useSalaryDeduction,
  useRequestLimitIncrease,
  useLimitRequests,
  formatPrice,
  formatDate,
  type LimitRequest,
} from "../hooks";

interface LimitRequestRowProps {
  request: LimitRequest;
}

function LimitRequestRow({ request }: LimitRequestRowProps) {
  const statusConfig = {
    PENDING: {
      icon: Clock,
      label: "Pending Review",
      className:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    },
    APPROVED: {
      icon: CheckCircle,
      label: "Approved",
      className:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    },
    REJECTED: {
      icon: XCircle,
      label: "Rejected",
      className:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    },
  };

  const config = statusConfig[request.status];
  const Icon = config.icon;

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              config.className
            )}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDate(request.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Requested limit:</span>
        <span className="font-semibold">{formatPrice(request.requestedLimit)}</span>
      </div>
      {request.reason && (
        <p className="text-sm text-muted-foreground">
          Reason: {request.reason}
        </p>
      )}
      {request.reviewNote && (
        <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
          Review note: {request.reviewNote}
        </p>
      )}
    </div>
  );
}

export function LimitRequestForm() {
  const { addToast } = useToast();
  const { data: salaryDeduction, isLoading: isLoadingDeduction } =
    useSalaryDeduction();
  const { data: limitRequests, isLoading: isLoadingRequests } =
    useLimitRequests();
  const requestLimitIncrease = useRequestLimitIncrease();

  const [requestedLimit, setRequestedLimit] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const currentLimit = salaryDeduction
    ? parseFloat(salaryDeduction.monthlyLimit)
    : 0;

  const hasPendingRequest = limitRequests?.some(
    (r) => r.status === "PENDING"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const limitValue = parseFloat(requestedLimit);

    if (isNaN(limitValue) || limitValue <= 0) {
      addToast({
        title: "Invalid amount",
        description: "Please enter a valid limit amount.",
        variant: "error",
      });
      return;
    }

    if (limitValue <= currentLimit) {
      addToast({
        title: "Invalid amount",
        description: "Requested limit must be greater than your current limit.",
        variant: "error",
      });
      return;
    }

    if (!reason.trim()) {
      addToast({
        title: "Reason required",
        description: "Please provide a reason for your limit increase request.",
        variant: "error",
      });
      return;
    }

    try {
      await requestLimitIncrease.mutateAsync({
        requestedLimit: limitValue,
        reason: reason.trim(),
      });

      addToast({
        title: "Request submitted",
        description:
          "Your limit increase request has been submitted for review.",
        variant: "success",
      });

      setRequestedLimit("");
      setReason("");
      setShowForm(false);
    } catch {
      addToast({
        title: "Failed to submit request",
        description: "Please try again later.",
        variant: "error",
      });
    }
  };

  if (isLoadingDeduction || isLoadingRequests) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!salaryDeduction) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5" />
          Request Limit Increase
        </CardTitle>
        <CardDescription>
          Current limit: {formatPrice(currentLimit)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Request Warning */}
        {hasPendingRequest && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <p className="font-medium text-amber-800 dark:text-amber-200">
                You have a pending request
              </p>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Please wait for your current request to be reviewed before
              submitting a new one.
            </p>
          </div>
        )}

        {/* Request Form */}
        {!hasPendingRequest && (
          <>
            {!showForm ? (
              <Button
                onClick={() => setShowForm(true)}
                className="w-full"
                variant="outline"
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" />
                Request Higher Limit
              </Button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="requestedLimit">New Limit Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="requestedLimit"
                      type="number"
                      min={currentLimit + 1}
                      step="100"
                      placeholder={`Min: ${(currentLimit + 100).toFixed(0)}`}
                      value={requestedLimit}
                      onChange={(e) => setRequestedLimit(e.target.value)}
                      className="pl-7"
                      disabled={requestLimitIncrease.isPending}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be greater than your current limit of{" "}
                    {formatPrice(currentLimit)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Request</Label>
                  <textarea
                    id="reason"
                    placeholder="Please explain why you need a higher limit..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    disabled={requestLimitIncrease.isPending}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setRequestedLimit("");
                      setReason("");
                    }}
                    disabled={requestLimitIncrease.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={requestLimitIncrease.isPending}
                  >
                    {requestLimitIncrease.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Submit Request
                  </Button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Previous Requests */}
        {limitRequests && limitRequests.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-sm font-medium">Previous Requests</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {limitRequests.map((request) => (
                <LimitRequestRow key={request.id} request={request} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
