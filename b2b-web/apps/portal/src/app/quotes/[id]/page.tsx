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
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Edit,
  FileText,
  Loader2,
  Mail,
  Percent,
  Send,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  useQuote,
  useSubmitQuote,
  formatDate,
  formatDateTime,
  formatCurrency,
  getStatusLabel,
  getStatusBadgeColor,
  canSubmitQuote,
  canEditQuote,
} from "../hooks/use-quotes";

function QuoteDetailSkeleton() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
      <div className="h-48 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

function QuoteDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: quote, isLoading, isError } = useQuote(id);
  const { mutate: submitQuote, isPending: isSubmitting } = useSubmitQuote();

  const handleSubmitForApproval = () => {
    submitQuote(
      { id },
      {
        onSuccess: () => {
          addToast({
            title: "Quote submitted",
            description: "Quote has been submitted for approval",
            variant: "success",
          });
          queryClient.invalidateQueries({ queryKey: ["quotes", id] });
        },
        onError: () => {
          addToast({
            title: "Submission failed",
            description: "Failed to submit quote for approval",
            variant: "error",
          });
        },
      }
    );
  };

  if (isLoading) {
    return <QuoteDetailSkeleton />;
  }

  if (isError || !quote) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">Failed to load quote</p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/quotes">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Link>
        </Button>
      </div>

      {/* Title and Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{quote.title}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                quote.status
              )}`}
            >
              {getStatusLabel(quote.status)}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            {quote.quoteNumber} | Created {formatDateTime(quote.createdAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canEditQuote(quote.status) && (
            <Button variant="outline" asChild>
              <Link href={`/quotes/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
          {canSubmitQuote(quote.status) && (
            <Button onClick={handleSubmitForApproval} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

      {/* Quote Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quote Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {quote.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p>{quote.description}</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {quote.customerName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{quote.customerName}</p>
                </div>
              </div>
            )}
            {quote.customerEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{quote.customerEmail}</p>
                </div>
              </div>
            )}
            {quote.validUntil && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Valid Until</p>
                  <p className="font-medium">{formatDate(quote.validUntil)}</p>
                </div>
              </div>
            )}
            {quote.discountPercent && parseFloat(quote.discountPercent) > 0 && (
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Discount</p>
                  <p className="font-medium">{quote.discountPercent}%</p>
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground pt-2 border-t">
            Created by {quote.createdByName} on {formatDateTime(quote.createdAt)}
            {quote.submittedAt && (
              <span> | Submitted {formatDateTime(quote.submittedAt)}</span>
            )}
            {quote.approvedAt && (
              <span> | Approved {formatDateTime(quote.approvedAt)}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items ({quote.lineItems.length})</CardTitle>
          <CardDescription>Products included in this quote</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg divide-y">
            {quote.lineItems.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.productSku}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.quantity} x {formatCurrency(item.unitPrice, quote.currency)}
                    {item.priceOverride && (
                      <span className="ml-2 text-xs text-blue-600">
                        (custom price - was{" "}
                        {formatCurrency(item.originalPrice, quote.currency)})
                      </span>
                    )}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {item.notes}
                    </p>
                  )}
                </div>
                <p className="font-semibold">
                  {formatCurrency(item.totalPrice, quote.currency)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-4 mt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(quote.subtotal, quote.currency)}</span>
            </div>
            {parseFloat(quote.discountAmount) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({quote.discountPercent}%)</span>
                <span>-{formatCurrency(quote.discountAmount, quote.currency)}</span>
              </div>
            )}
            {parseFloat(quote.taxAmount) > 0 && (
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>{formatCurrency(quote.taxAmount, quote.currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(quote.totalAmount, quote.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function QuoteDetailPage() {
  return (
    <RequireAuth
      fallback={<QuoteDetailSkeleton />}
      redirectTo="/login"
    >
      <QuoteDetailContent />
    </RequireAuth>
  );
}
