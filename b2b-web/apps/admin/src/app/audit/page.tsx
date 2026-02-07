"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import * as React from "react";

import {
  AuditTable,
  AuditFilters,
  AuditDetailModal,
  Pagination,
  ExportButton,
} from "./components";
import {
  useAuditLogs,
  type AuditLogDto,
  type AuditAction,
  type EntityType,
} from "./hooks/use-audit";

import { Header } from "@/components/layout";

function AuditContent() {
  const { hasRole } = useAuth();

  // Filter state
  const [userFilter, setUserFilter] = React.useState<string | undefined>();
  const [actionFilter, setActionFilter] = React.useState<
    AuditAction | undefined
  >();
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<
    EntityType | undefined
  >();
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();

  // Pagination state
  const [page, setPage] = React.useState(1);
  const limit = 10;

  // Modal state
  const [selectedLog, setSelectedLog] = React.useState<AuditLogDto | null>(
    null
  );

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [userFilter, actionFilter, entityTypeFilter, startDate, endDate]);

  // Format dates for API
  const formattedStartDate = startDate
    ? format(startDate, "yyyy-MM-dd")
    : undefined;
  const formattedEndDate = endDate ? format(endDate, "yyyy-MM-dd") : undefined;

  const { data, isLoading, error, refetch } = useAuditLogs({
    page,
    limit,
    userId: userFilter,
    action: actionFilter,
    entityType: entityTypeFilter,
    startDate: formattedStartDate,
    endDate: formattedEndDate,
  });

  const handleClearFilters = () => {
    setUserFilter(undefined);
    setActionFilter(undefined);
    setEntityTypeFilter(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Audit Log" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">
              Access Denied
            </h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access the audit log. This feature
              is only available to Admins.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Audit Log" />
      <div className="flex-1 p-6 space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4">
          <AuditFilters
            userFilter={userFilter}
            actionFilter={actionFilter}
            entityTypeFilter={entityTypeFilter}
            startDate={startDate}
            endDate={endDate}
            onUserChange={setUserFilter}
            onActionChange={setActionFilter}
            onEntityTypeChange={setEntityTypeFilter}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onClearFilters={handleClearFilters}
          />
          <div className="flex items-center gap-2">
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
            <ExportButton logs={data?.data || []} isLoading={isLoading} />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load audit logs. Please try again.
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
            <AuditTable logs={data.data} onViewDetails={setSelectedLog} />
            {data.meta.totalPages > 1 && (
              <Pagination
                currentPage={data.meta.page}
                totalPages={data.meta.totalPages}
                total={data.meta.total}
                limit={data.meta.limit}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Detail Modal */}
        <AuditDetailModal
          log={selectedLog}
          open={!!selectedLog}
          onOpenChange={(open) => {
            if (!open) setSelectedLog(null);
          }}
        />
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Audit Log" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">
                Access Denied
              </h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access the audit log. This feature
                is only available to Admins.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <AuditContent />
    </RequireAuth>
  );
}
