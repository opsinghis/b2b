"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button, Input, useToast } from "@b2b/ui";
import { RefreshCw, Search, FileText } from "lucide-react";
import * as React from "react";

import {
  QuotesTable,
  QuotesFilters,
  Pagination,
  WorkflowActionModal,
  type WorkflowAction,
} from "./components";
import {
  useQuotes,
  useApproveQuote,
  useRejectQuote,
  useSendQuote,
  useAcceptQuote,
  useConvertToContract,
  type Quote,
  type QuoteStatus,
} from "./hooks/use-quotes";

import { Header } from "@/components/layout";

function QuotesContent() {
  const { hasRole } = useAuth();
  const { addToast } = useToast();

  // Filter and search state
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState<QuoteStatus | "">("");
  const limit = 10;

  // Modal state
  const [selectedQuote, setSelectedQuote] = React.useState<Quote | null>(null);
  const [modalAction, setModalAction] = React.useState<WorkflowAction | null>(null);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Fetch quotes
  const { data, isLoading, error, refetch } = useQuotes({
    search: debouncedSearch,
    page,
    limit,
    status: statusFilter || undefined,
  });

  // Mutations
  const approveMutation = useApproveQuote();
  const rejectMutation = useRejectQuote();
  const sendMutation = useSendQuote();
  const acceptMutation = useAcceptQuote();
  const convertMutation = useConvertToContract();

  const isUpdating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    sendMutation.isPending ||
    acceptMutation.isPending ||
    convertMutation.isPending;

  // Action handlers
  const openActionModal = (quoteId: string, action: WorkflowAction) => {
    const quote = data?.data.find((q) => q.id === quoteId);
    if (quote) {
      setSelectedQuote(quote);
      setModalAction(action);
    }
  };

  const closeModal = () => {
    setSelectedQuote(null);
    setModalAction(null);
  };

  const handleAction = async (comments?: string) => {
    if (!selectedQuote || !modalAction) return;

    try {
      switch (modalAction) {
        case "approve":
          await approveMutation.mutateAsync({
            quoteId: selectedQuote.id,
            comments,
          });
          addToast({
            title: "Quote Approved",
            description: `Quote ${selectedQuote.quoteNumber} has been approved`,
            variant: "success",
          });
          break;
        case "reject":
          await rejectMutation.mutateAsync({
            quoteId: selectedQuote.id,
            comments,
          });
          addToast({
            title: "Quote Rejected",
            description: `Quote ${selectedQuote.quoteNumber} has been rejected`,
            variant: "success",
          });
          break;
        case "send":
          await sendMutation.mutateAsync({
            quoteId: selectedQuote.id,
            comments,
          });
          addToast({
            title: "Quote Sent",
            description: `Quote ${selectedQuote.quoteNumber} has been sent to the customer`,
            variant: "success",
          });
          break;
        case "accept":
          await acceptMutation.mutateAsync({
            quoteId: selectedQuote.id,
            comments,
          });
          addToast({
            title: "Quote Accepted",
            description: `Quote ${selectedQuote.quoteNumber} has been marked as accepted`,
            variant: "success",
          });
          break;
        case "convert": {
          await convertMutation.mutateAsync({
            quoteId: selectedQuote.id,
            comments,
          });
          addToast({
            title: "Contract Created",
            description: `Quote ${selectedQuote.quoteNumber} has been converted to a contract`,
            variant: "success",
          });
          break;
        }
      }
      closeModal();
    } catch (err) {
      addToast({
        title: "Action Failed",
        description: `Failed to ${modalAction} the quote. Please try again.`,
        variant: "error",
      });
    }
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN") && !hasRole("MANAGER")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Quotes" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to manage quotes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Quotes" />
      <div className="flex-1 p-6 space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4">
          <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Quote Approval Workflow
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              Quotes in &quot;Pending Approval&quot; status require your review. Approve to send to
              customers, or reject to return to draft.
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <QuotesFilters status={statusFilter} onStatusChange={setStatusFilter} />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load quotes. Please try again.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !data && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Table */}
        {data && (
          <>
            <QuotesTable
              quotes={data.data}
              onApprove={(id) => openActionModal(id, "approve")}
              onReject={(id) => openActionModal(id, "reject")}
              onSend={(id) => openActionModal(id, "send")}
              onAccept={(id) => openActionModal(id, "accept")}
              onConvert={(id) => openActionModal(id, "convert")}
              isUpdating={isUpdating}
            />
            {data.totalPages > 1 && (
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                total={data.total}
                limit={data.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Workflow Action Modal */}
        {selectedQuote && modalAction && (
          <WorkflowActionModal
            open={true}
            onOpenChange={(open) => {
              if (!open) closeModal();
            }}
            action={modalAction}
            quoteNumber={selectedQuote.quoteNumber}
            onConfirm={handleAction}
            isLoading={isUpdating}
          />
        )}
      </div>
    </div>
  );
}

export default function QuotesPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN", "MANAGER"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Quotes" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to manage quotes.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <QuotesContent />
    </RequireAuth>
  );
}
