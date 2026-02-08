"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@b2b/ui";
import { format } from "date-fns";
import {
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { QuotesFilters } from "./components";
import {
  useQuotes,
  formatDate,
  formatCurrency,
  getStatusLabel,
  getStatusBadgeColor,
  type QuoteStatus,
} from "./hooks/use-quotes";

function QuotesListSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-10 w-36 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-10 w-full bg-muted rounded animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function QuotesListContent() {
  // Search state
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = React.useState<QuoteStatus | undefined>();
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();

  // Pagination state
  const [page, setPage] = React.useState(1);
  const limit = 10;

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
  }, [statusFilter, startDate, endDate]);

  // Format dates for API
  const formattedStartDate = startDate
    ? format(startDate, "yyyy-MM-dd")
    : undefined;
  const formattedEndDate = endDate
    ? format(endDate, "yyyy-MM-dd")
    : undefined;

  const { data, isLoading, isError, refetch } = useQuotes({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter,
    startDate: formattedStartDate,
    endDate: formattedEndDate,
  });

  const quotes = data?.data ?? [];
  const meta = data?.meta;

  const handleClearFilters = () => {
    setStatusFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setSearch("");
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">
            Manage and track your quotes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/quotes/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Quote
            </Link>
          </Button>
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
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        {/* Search Input */}
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <QuotesFilters
          statusFilter={statusFilter}
          startDate={startDate}
          endDate={endDate}
          onStatusChange={setStatusFilter}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Quotes List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading quotes...</p>
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load quotes</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No quotes found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search
                ? `No quotes matching "${search}"`
                : "Get started by creating your first quote"}
            </p>
            <Button asChild>
              <Link href="/quotes/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Quote
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Link key={quote.id} href={`/quotes/${quote.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{quote.title}</CardTitle>
                      <CardDescription>
                        {quote.quoteNumber} | Created {formatDate(quote.createdAt)}
                      </CardDescription>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        quote.status
                      )}`}
                    >
                      {getStatusLabel(quote.status)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {quote.customerName && (
                      <span className="text-muted-foreground">
                        Customer: {quote.customerName}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      Items: {quote.lineItems.length}
                    </span>
                    <span className="font-medium">
                      Total: {formatCurrency(quote.totalAmount, quote.currency)}
                    </span>
                    {quote.validUntil && (
                      <span className="text-muted-foreground">
                        Valid until: {formatDate(quote.validUntil)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                Page {page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuotesPage() {
  return (
    <RequireAuth
      fallback={<QuotesListSkeleton />}
      redirectTo="/login"
    >
      <QuotesListContent />
    </RequireAuth>
  );
}
