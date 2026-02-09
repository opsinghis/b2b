"use client";

import { Button } from "@b2b/ui";
import {
  CheckCircle,
  Eye,
  FileText,
  Send,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import {
  type Quote,
  getStatusLabel,
  getStatusColor,
  formatPrice,
  formatDate,
  canApprove,
  canReject,
  canSend,
  canAccept,
  canConvert,
} from "../hooks/use-quotes";

interface QuotesTableProps {
  quotes: Quote[];
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string) => void;
  onSend: (quoteId: string) => void;
  onAccept?: (quoteId: string) => void;
  onConvert?: (quoteId: string) => void;
  isUpdating?: boolean;
}

export function QuotesTable({
  quotes,
  onApprove,
  onReject,
  onSend,
  onAccept,
  onConvert,
  isUpdating,
}: QuotesTableProps) {
  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No quotes found</p>
        <p className="text-sm">Quotes from customers will appear here</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-sm font-medium">Quote #</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
            <th className="px-4 py-3 text-right text-sm font-medium">Total</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Valid Until</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
            <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id} className="border-b last:border-0 hover:bg-muted/25">
              <td className="px-4 py-3">
                <Link
                  href={`/quotes/${quote.id}`}
                  className="font-mono text-sm text-primary hover:underline"
                >
                  {quote.quoteNumber}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="max-w-[200px] truncate text-sm">{quote.title}</div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm">
                  {quote.customerName || "-"}
                  {quote.customerEmail && (
                    <div className="text-xs text-muted-foreground">
                      {quote.customerEmail}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                    quote.status
                  )}`}
                >
                  {getStatusLabel(quote.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="font-medium">
                  {formatPrice(quote.total, quote.currency)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {quote.validUntil ? formatDate(quote.validUntil) : "-"}
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(quote.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-1">
                  <Link href={`/quotes/${quote.id}`}>
                    <Button variant="ghost" size="icon" title="View Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>

                  {canApprove(quote.status) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onApprove(quote.id)}
                      disabled={isUpdating}
                      title="Approve Quote"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}

                  {canReject(quote.status) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onReject(quote.id)}
                      disabled={isUpdating}
                      title="Reject Quote"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}

                  {canSend(quote.status) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSend(quote.id)}
                      disabled={isUpdating}
                      title="Send to Customer"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}

                  {canAccept(quote.status) && onAccept && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAccept(quote.id)}
                      disabled={isUpdating}
                      title="Mark as Accepted"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}

                  {canConvert(quote.status) && onConvert && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onConvert(quote.id)}
                      disabled={isUpdating}
                      title="Convert to Contract"
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
