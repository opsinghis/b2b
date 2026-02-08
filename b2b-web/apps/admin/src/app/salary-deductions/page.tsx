"use client";

import { RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import {
  Search,
  RefreshCw,
  Download,
  CheckSquare,
  Users,
  Inbox,
  FileText,
} from "lucide-react";
import * as React from "react";

import {
  DeductionsTable,
  LimitRequestsTable,
  EditLimitModal,
  BulkLimitModal,
  ApproveRequestModal,
  RejectRequestModal,
  RequestDetailModal,
  ReportTable,
  ReportSummary,
  DeductionFilters,
  RequestFilters,
  Pagination,
} from "./components";
import {
  useAdminSalaryDeductions,
  useAdminLimitRequests,
  usePendingLimitRequestsCount,
  useDeductionReport,
  useUpdateDeductionLimit,
  useBulkUpdateLimits,
  useApproveLimitRequest,
  useRejectLimitRequest,
  useBulkApproveLimitRequests,
  type EmployeeDeduction,
  type LimitRequest,
  type LimitRequestStatus,
  type UpdateDeductionLimitDto,
  type BulkUpdateLimitDto,
  type ApproveLimitRequestDto,
  type RejectLimitRequestDto,
  getMonthsForSelect,
  getCurrentMonth,
  generateCSVReport,
  downloadCSV,
  generateExcelReport,
} from "./hooks/use-salary-deductions";

import { Header } from "@/components/layout/header";

function SalaryDeductionsContent() {
  // Tab state
  const [activeTab, setActiveTab] = React.useState("employees");

  // Employees tab state
  const [employeeSearch, setEmployeeSearch] = React.useState("");
  const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = React.useState("");
  const [employeePage, setEmployeePage] = React.useState(1);
  const [enabledFilter, setEnabledFilter] = React.useState<string>("all");
  const [selectedEmployees, setSelectedEmployees] = React.useState<string[]>([]);

  // Limit requests tab state
  const [requestSearch, setRequestSearch] = React.useState("");
  const [debouncedRequestSearch, setDebouncedRequestSearch] = React.useState("");
  const [requestPage, setRequestPage] = React.useState(1);
  const [requestStatusFilter, setRequestStatusFilter] = React.useState<LimitRequestStatus | "">("");
  const [selectedRequests, setSelectedRequests] = React.useState<string[]>([]);

  // Report tab state
  const [reportMonth, setReportMonth] = React.useState(getCurrentMonth());

  // Modal state
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [editingEmployee, setEditingEmployee] = React.useState<EmployeeDeduction | null>(null);
  const [bulkLimitModalOpen, setBulkLimitModalOpen] = React.useState(false);
  const [approveModalOpen, setApproveModalOpen] = React.useState(false);
  const [approvingRequest, setApprovingRequest] = React.useState<LimitRequest | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectingRequest, setRejectingRequest] = React.useState<LimitRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [viewingRequest, setViewingRequest] = React.useState<LimitRequest | null>(null);

  // Debounce search inputs
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmployeeSearch(employeeSearch);
      setEmployeePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeSearch]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRequestSearch(requestSearch);
      setRequestPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [requestSearch]);

  // Reset page when filters change
  React.useEffect(() => {
    setEmployeePage(1);
    setSelectedEmployees([]);
  }, [enabledFilter]);

  React.useEffect(() => {
    setRequestPage(1);
    setSelectedRequests([]);
  }, [requestStatusFilter]);

  // API queries
  const {
    data: employeesData,
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees,
  } = useAdminSalaryDeductions({
    search: debouncedEmployeeSearch || undefined,
    isEnabled: enabledFilter === "all" ? undefined : enabledFilter === "enabled",
    page: employeePage,
    limit: 10,
  });

  const {
    data: requestsData,
    isLoading: requestsLoading,
    error: requestsError,
    refetch: refetchRequests,
  } = useAdminLimitRequests({
    search: debouncedRequestSearch || undefined,
    status: requestStatusFilter || undefined,
    page: requestPage,
    limit: 10,
  });

  const { data: pendingCount } = usePendingLimitRequestsCount();

  const {
    data: reportData,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useDeductionReport(reportMonth);

  // Mutations
  const updateLimitMutation = useUpdateDeductionLimit();
  const bulkUpdateMutation = useBulkUpdateLimits();
  const approveMutation = useApproveLimitRequest();
  const rejectMutation = useRejectLimitRequest();
  const bulkApproveMutation = useBulkApproveLimitRequests();

  // Handlers - Employees
  const handleSelectEmployee = (userId: string, selected: boolean) => {
    setSelectedEmployees((prev) =>
      selected ? [...prev, userId] : prev.filter((id) => id !== userId)
    );
  };

  const handleSelectAllEmployees = (selected: boolean) => {
    if (selected && employeesData) {
      setSelectedEmployees(employeesData.items.map((item) => item.userId));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleEditLimit = (employee: EmployeeDeduction) => {
    setEditingEmployee(employee);
    setEditModalOpen(true);
  };

  const handleToggleEnabled = async (employee: EmployeeDeduction) => {
    try {
      await updateLimitMutation.mutateAsync({
        userId: employee.userId,
        data: {
          monthlyLimit: parseFloat(employee.monthlyLimit),
          isEnabled: !employee.isEnabled,
        },
      });
    } catch (error) {
      console.error("Failed to toggle enabled status:", error);
    }
  };

  const handleUpdateLimit = async (userId: string, data: UpdateDeductionLimitDto) => {
    try {
      await updateLimitMutation.mutateAsync({ userId, data });
      setEditModalOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error("Failed to update limit:", error);
    }
  };

  const handleBulkUpdateLimits = async (data: BulkUpdateLimitDto) => {
    try {
      await bulkUpdateMutation.mutateAsync(data);
      setBulkLimitModalOpen(false);
      setSelectedEmployees([]);
    } catch (error) {
      console.error("Failed to bulk update limits:", error);
    }
  };

  // Handlers - Limit Requests
  const handleSelectRequest = (id: string, selected: boolean) => {
    setSelectedRequests((prev) =>
      selected ? [...prev, id] : prev.filter((rid) => rid !== id)
    );
  };

  const handleSelectAllRequests = (selected: boolean) => {
    if (selected && requestsData) {
      const pendingIds = requestsData.items
        .filter((item) => item.status === "PENDING")
        .map((item) => item.id);
      setSelectedRequests(pendingIds);
    } else {
      setSelectedRequests([]);
    }
  };

  const handleApproveRequest = (request: LimitRequest) => {
    setApprovingRequest(request);
    setApproveModalOpen(true);
  };

  const handleRejectRequest = (request: LimitRequest) => {
    setRejectingRequest(request);
    setRejectModalOpen(true);
  };

  const handleViewRequestDetails = (request: LimitRequest) => {
    setViewingRequest(request);
    setDetailModalOpen(true);
  };

  const handleSubmitApproval = async (requestId: string, data: ApproveLimitRequestDto) => {
    try {
      await approveMutation.mutateAsync({ requestId, data });
      setApproveModalOpen(false);
      setApprovingRequest(null);
    } catch (error) {
      console.error("Failed to approve request:", error);
    }
  };

  const handleSubmitRejection = async (requestId: string, data: RejectLimitRequestDto) => {
    try {
      await rejectMutation.mutateAsync({ requestId, data });
      setRejectModalOpen(false);
      setRejectingRequest(null);
    } catch (error) {
      console.error("Failed to reject request:", error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) return;
    try {
      await bulkApproveMutation.mutateAsync(selectedRequests);
      setSelectedRequests([]);
    } catch (error) {
      console.error("Failed to bulk approve:", error);
    }
  };

  // Handlers - Export
  const handleExportCSV = () => {
    if (!reportData) return;
    const csv = generateCSVReport(reportData);
    downloadCSV(csv, `salary-deductions-${reportData.month}.csv`);
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    generateExcelReport(reportData);
  };

  const months = getMonthsForSelect(12);

  return (
    <div className="flex flex-col h-full">
      <Header title="Salary Deduction Management" />
      <div className="flex-1 p-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Requests
              {pendingCount !== undefined && pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-4 mt-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <DeductionFilters
                  enabledFilter={enabledFilter}
                  onEnabledFilterChange={setEnabledFilter}
                />
              </div>
              <div className="flex items-center gap-2">
                {selectedEmployees.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setBulkLimitModalOpen(true)}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Update Limits ({selectedEmployees.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchEmployees()}
                  disabled={employeesLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${employeesLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Error State */}
            {employeesError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                  Failed to load employees. Please try again.
                </p>
              </div>
            )}

            {/* Loading State */}
            {employeesLoading && !employeesData && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Table */}
            {employeesData && (
              <>
                <DeductionsTable
                  data={employeesData.items}
                  selectedItems={selectedEmployees}
                  onSelectItem={handleSelectEmployee}
                  onSelectAll={handleSelectAllEmployees}
                  onEditLimit={handleEditLimit}
                  onToggleEnabled={handleToggleEnabled}
                  isUpdating={updateLimitMutation.isPending}
                />
                {employeesData.totalPages > 1 && (
                  <Pagination
                    currentPage={employeesData.page}
                    totalPages={employeesData.totalPages}
                    total={employeesData.total}
                    limit={employeesData.limit}
                    onPageChange={setEmployeePage}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* Limit Requests Tab */}
          <TabsContent value="requests" className="space-y-4 mt-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <RequestFilters
                  statusFilter={requestStatusFilter}
                  onStatusFilterChange={setRequestStatusFilter}
                />
              </div>
              <div className="flex items-center gap-2">
                {selectedRequests.length > 0 && (
                  <Button
                    onClick={handleBulkApprove}
                    disabled={bulkApproveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Approve ({selectedRequests.length})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchRequests()}
                  disabled={requestsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${requestsLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Error State */}
            {requestsError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                  Failed to load limit requests. Please try again.
                </p>
              </div>
            )}

            {/* Loading State */}
            {requestsLoading && !requestsData && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Table */}
            {requestsData && (
              <>
                <LimitRequestsTable
                  data={requestsData.items}
                  selectedItems={selectedRequests}
                  onSelectItem={handleSelectRequest}
                  onSelectAll={handleSelectAllRequests}
                  onApprove={handleApproveRequest}
                  onReject={handleRejectRequest}
                  onViewDetails={handleViewRequestDetails}
                  isUpdating={approveMutation.isPending || rejectMutation.isPending}
                />
                {requestsData.totalPages > 1 && (
                  <Pagination
                    currentPage={requestsData.page}
                    totalPages={requestsData.totalPages}
                    total={requestsData.total}
                    limit={requestsData.limit}
                    onPageChange={setRequestPage}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6 mt-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Select value={reportMonth} onValueChange={setReportMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={!reportData || reportLoading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={!reportData || reportLoading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchReport()}
                  disabled={reportLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${reportLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Error State */}
            {reportError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">
                  Failed to load report. Please try again.
                </p>
              </div>
            )}

            {/* Loading State */}
            {reportLoading && !reportData && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Report Content */}
            {reportData && (
              <>
                <ReportSummary report={reportData} />
                <Card>
                  <CardHeader>
                    <CardTitle>Employee Deductions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReportTable data={reportData.items} currency={reportData.currency} />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <EditLimitModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          employee={editingEmployee}
          onSubmit={handleUpdateLimit}
          isLoading={updateLimitMutation.isPending}
        />

        <BulkLimitModal
          open={bulkLimitModalOpen}
          onOpenChange={setBulkLimitModalOpen}
          selectedCount={selectedEmployees.length}
          selectedUserIds={selectedEmployees}
          onSubmit={handleBulkUpdateLimits}
          isLoading={bulkUpdateMutation.isPending}
        />

        <ApproveRequestModal
          open={approveModalOpen}
          onOpenChange={setApproveModalOpen}
          request={approvingRequest}
          onSubmit={handleSubmitApproval}
          isLoading={approveMutation.isPending}
        />

        <RejectRequestModal
          open={rejectModalOpen}
          onOpenChange={setRejectModalOpen}
          request={rejectingRequest}
          onSubmit={handleSubmitRejection}
          isLoading={rejectMutation.isPending}
        />

        <RequestDetailModal
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          request={viewingRequest}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
        />
      </div>
    </div>
  );
}

export default function SalaryDeductionsPage() {
  return (
    <RequireAuth roles={["ADMIN", "SUPER_ADMIN"]}>
      <SalaryDeductionsContent />
    </RequireAuth>
  );
}
