"use client";

import { Button } from "@b2b/ui";
import { useToast } from "@b2b/ui";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  Send,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { WorkflowActionModal } from "../components/workflow-action-modal";
import {
  useQuote,
  useApproveQuote,
  useRejectQuote,
  useSendQuote,
  useAcceptQuote,
  useConvertToContract,
  formatPrice,
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
  canApprove,
  canReject,
  canSend,
  canAccept,
  canConvert,
} from "../hooks/use-quotes";

type WorkflowAction = "approve" | "reject" | "send" | "accept" | "convert" | null;

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const quoteId = params.id as string;

  const { data: quote, isLoading, error } = useQuote(quoteId);

  const [activeAction, setActiveAction] = useState<WorkflowAction>(null);

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

  const handleWorkflowAction = async (comments?: string) => {
    if (!activeAction || !quoteId) return;

    try {
      switch (activeAction) {
        case "approve":
          await approveMutation.mutateAsync({ quoteId, comments });
          addToast({ title: "Quote approved successfully" });
          break;
        case "reject":
          await rejectMutation.mutateAsync({ quoteId, comments });
          addToast({ title: "Quote rejected" });
          break;
        case "send":
          await sendMutation.mutateAsync({ quoteId, comments });
          addToast({ title: "Quote sent to customer" });
          break;
        case "accept":
          await acceptMutation.mutateAsync({ quoteId, comments });
          addToast({ title: "Quote marked as accepted" });
          break;
        case "convert": {
          const result = await convertMutation.mutateAsync({ quoteId, comments });
          addToast({ title: "Quote converted to contract" });
          router.push(`/contracts/${result.contractId}`);
          break;
        }
      }
    } catch {
      addToast({
        title: "Action failed",
        description: "Please try again",
        variant: "error",
      });
    } finally {
      setActiveAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/quotes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Quote Not Found</h1>
        </div>
        <p className="text-muted-foreground">
          The quote you are looking for does not exist or you do not have permission to view it.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
            <p className="text-muted-foreground">{quote.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
              quote.status
            )}`}
          >
            {getStatusLabel(quote.status)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {canApprove(quote.status) && (
          <Button
            onClick={() => setActiveAction("approve")}
            disabled={isUpdating}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        )}
        {canReject(quote.status) && (
          <Button
            onClick={() => setActiveAction("reject")}
            disabled={isUpdating}
            variant="destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        )}
        {canSend(quote.status) && (
          <Button
            onClick={() => setActiveAction("send")}
            disabled={isUpdating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send to Customer
          </Button>
        )}
        {canAccept(quote.status) && (
          <Button
            onClick={() => setActiveAction("accept")}
            disabled={isUpdating}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Accepted
          </Button>
        )}
        {canConvert(quote.status) && (
          <Button
            onClick={() => setActiveAction("convert")}
            disabled={isUpdating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Convert to Contract
          </Button>
        )}
      </div>

      {/* Quote Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Quote Information */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Quote Information</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Quote Number</dt>
                <dd className="font-medium font-mono">{quote.quoteNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                      quote.status
                    )}`}
                  >
                    {getStatusLabel(quote.status)}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Valid Until</dt>
                <dd className="font-medium">
                  {quote.validUntil ? formatDate(quote.validUntil) : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">{formatDateTime(quote.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-medium">{formatDateTime(quote.updatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{quote.customerName || "-"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{quote.customerEmail || "-"}</dd>
              </div>
            </dl>
          </div>

          {(quote.notes || quote.internalNotes) && (
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Notes</h2>
              {quote.notes && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Customer Notes
                  </h3>
                  <p className="text-sm">{quote.notes}</p>
                </div>
              )}
              {quote.internalNotes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Internal Notes
                  </h3>
                  <p className="text-sm">{quote.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Pricing */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Pricing Summary</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium">
                  {formatPrice(quote.subtotal, quote.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="font-medium text-green-600">
                  -{formatPrice(quote.discount, quote.currency)}
                  {quote.discountPercent && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({quote.discountPercent}%)
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="font-medium">
                  {formatPrice(quote.tax, quote.currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="text-xl font-bold">
                  {formatPrice(quote.total, quote.currency)}
                </dd>
              </div>
            </dl>
          </div>

          {quote.contractId && (
            <div className="rounded-lg border p-6 bg-purple-50 dark:bg-purple-900/20">
              <h2 className="text-lg font-semibold mb-2">Linked Contract</h2>
              <p className="text-sm text-muted-foreground mb-3">
                This quote has been converted to a contract.
              </p>
              <Link href={`/contracts/${quote.contractId}`}>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  View Contract
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-sm font-medium">#</th>
                <th className="px-6 py-3 text-left text-sm font-medium">Product</th>
                <th className="px-6 py-3 text-left text-sm font-medium">SKU</th>
                <th className="px-6 py-3 text-right text-sm font-medium">Qty</th>
                <th className="px-6 py-3 text-right text-sm font-medium">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium">
                  Discount
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {item.lineNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{item.productName}</div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono">
                    {item.productSku || "-"}
                  </td>
                  <td className="px-6 py-4 text-right">{item.quantity}</td>
                  <td className="px-6 py-4 text-right">
                    {formatPrice(item.unitPrice, quote.currency)}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600">
                    -{formatPrice(item.discount, quote.currency)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {formatPrice(item.total, quote.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Action Modal */}
      <WorkflowActionModal
        open={activeAction !== null}
        onOpenChange={(open) => !open && setActiveAction(null)}
        onConfirm={handleWorkflowAction}
        action={activeAction || "approve"}
        quoteNumber={quote.quoteNumber}
        isLoading={isUpdating}
      />
    </div>
  );
}
