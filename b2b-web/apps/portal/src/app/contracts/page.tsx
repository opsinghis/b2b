"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, Input } from "@b2b/ui";
import { format } from "date-fns";
import { RefreshCw, Search, FileText, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  ContractsTable,
  ContractsFilters,
  Pagination,
} from "./components";
import {
  useContracts,
  type ContractStatus,
} from "./hooks";

function ContractsPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-4 animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="h-10 w-64 bg-muted rounded" />
          <div className="flex items-center gap-2">
            <div className="h-10 w-48 bg-muted rounded" />
            <div className="h-10 w-10 bg-muted rounded" />
          </div>
        </div>
        <div className="h-96 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

function ContractsContent() {
  // Search state
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = React.useState<ContractStatus | undefined>();
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

  const { data, isLoading, error, refetch } = useContracts({
    page,
    limit,
    status: statusFilter,
    startDate: formattedStartDate,
    endDate: formattedEndDate,
    search: debouncedSearch || undefined,
  });

  const handleClearFilters = () => {
    setStatusFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setSearch("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 space-y-4">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Contracts</h1>
            <p className="text-muted-foreground">
              View and manage your contracts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/contracts/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Contract
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-end gap-4 flex-wrap">
            {/* Search Input */}
            <div className="w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Filters */}
            <ContractsFilters
              statusFilter={statusFilter}
              startDate={startDate}
              endDate={endDate}
              onStatusChange={setStatusFilter}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClearFilters={handleClearFilters}
            />
          </div>

          {/* Refresh Button */}
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

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load contracts. Please try again.
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
            <ContractsTable contracts={data.data} />
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
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <RequireAuth
      fallback={<ContractsPageSkeleton />}
      redirectTo="/login"
    >
      <ContractsContent />
    </RequireAuth>
  );
}
