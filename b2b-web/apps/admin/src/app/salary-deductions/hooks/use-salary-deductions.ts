"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export type DeductionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
export type LimitRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface EmployeeDeduction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  employeeId?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  monthlyLimit: string;
  usedAmount: string;
  remainingAmount: string;
  isEnabled: boolean;
  periodStart: string;
  periodEnd: string;
  lastDeductionDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDeductionListParams {
  search?: string;
  organizationId?: string;
  isEnabled?: boolean;
  minLimit?: number;
  maxLimit?: number;
  page?: number;
  limit?: number;
  sortBy?: "userName" | "monthlyLimit" | "usedAmount" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface AdminDeductionList {
  items: EmployeeDeduction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface LimitRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  employeeId?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  currentLimit: string;
  requestedLimit: string;
  reason: string;
  status: LimitRequestStatus;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LimitRequestListParams {
  status?: LimitRequestStatus;
  search?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "requestedLimit" | "userName";
  sortOrder?: "asc" | "desc";
}

export interface LimitRequestList {
  items: LimitRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface DeductionReportItem {
  userId: string;
  userName: string;
  userEmail: string;
  employeeId?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  totalDeducted: string;
  deductionCount: number;
  pendingAmount: string;
  pendingCount: number;
  completedAmount: string;
  completedCount: number;
  failedAmount: string;
  failedCount: number;
}

export interface MonthlyReport {
  month: string; // YYYY-MM format
  totalDeducted: string;
  totalPending: string;
  totalEmployees: number;
  currency: string;
  items: DeductionReportItem[];
  summary: {
    totalOrders: number;
    averageDeduction: string;
    highestDeduction: string;
    lowestDeduction: string;
  };
}

export interface UpdateDeductionLimitDto {
  monthlyLimit: number;
  isEnabled?: boolean;
  notes?: string;
}

export interface BulkUpdateLimitDto {
  userIds: string[];
  monthlyLimit: number;
  notes?: string;
}

export interface ApproveLimitRequestDto {
  approvedLimit?: number;
  reviewNote?: string;
}

export interface RejectLimitRequestDto {
  reviewNote: string;
}

// =============================================================================
// API Client Hook
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return useMemo(
    () =>
      createApiClient({
        tenantId: user?.tenantId,
        token: user?.accessToken,
      }),
    [user?.tenantId, user?.accessToken]
  );
}

// =============================================================================
// Query Hooks
// =============================================================================

export function useAdminSalaryDeductions(params: AdminDeductionListParams = {}) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["admin-salary-deductions", params],
    queryFn: async (): Promise<AdminDeductionList> => {
      const { data, error } = await client.GET("/api/v1/admin/salary-deductions" as "/api/v1/admin/orders", {
        params: {
          query: {
            search: params.search,
            organizationId: params.organizationId,
            isEnabled: params.isEnabled,
            minLimit: params.minLimit,
            maxLimit: params.maxLimit,
            page: params.page ?? 1,
            limit: params.limit ?? 10,
            sortBy: params.sortBy ?? "userName",
            sortOrder: params.sortOrder ?? "asc",
          } as Record<string, unknown>,
        },
      });
      if (error) {
        return {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        };
      }
      const listData = data as unknown as {
        data?: unknown[];
        items?: unknown[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrevious?: boolean;
      };
      const items = (listData.data || listData.items || []).map(mapEmployeeDeductionFromDto);
      const total = listData.total ?? items.length;
      const limit = listData.limit ?? 10;
      const page = listData.page ?? 1;
      const totalPages = listData.totalPages ?? Math.ceil(total / limit);
      return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasNext: listData.hasNext ?? page < totalPages,
        hasPrevious: listData.hasPrevious ?? page > 1,
      };
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useAdminLimitRequests(params: LimitRequestListParams = {}) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["admin-limit-requests", params],
    queryFn: async (): Promise<LimitRequestList> => {
      const { data, error } = await client.GET(
        "/api/v1/admin/salary-deductions/limit-requests" as "/api/v1/admin/orders",
        {
          params: {
            query: {
              status: params.status,
              search: params.search,
              organizationId: params.organizationId,
              page: params.page ?? 1,
              limit: params.limit ?? 10,
              sortBy: params.sortBy ?? "createdAt",
              sortOrder: params.sortOrder ?? "desc",
            } as Record<string, unknown>,
          },
        }
      );
      if (error) {
        return {
          items: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        };
      }
      const listData = data as unknown as {
        data?: unknown[];
        items?: unknown[];
        total?: number;
        page?: number;
        limit?: number;
        totalPages?: number;
        hasNext?: boolean;
        hasPrevious?: boolean;
      };
      const items = (listData.data || listData.items || []).map(mapLimitRequestFromDto);
      const total = listData.total ?? items.length;
      const limit = listData.limit ?? 10;
      const page = listData.page ?? 1;
      const totalPages = listData.totalPages ?? Math.ceil(total / limit);
      return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasNext: listData.hasNext ?? page < totalPages,
        hasPrevious: listData.hasPrevious ?? page > 1,
      };
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function usePendingLimitRequestsCount() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["admin-limit-requests-pending-count"],
    queryFn: async (): Promise<number> => {
      const { data, error } = await client.GET(
        "/api/v1/admin/salary-deductions/limit-requests" as "/api/v1/admin/orders",
        {
          params: {
            query: {
              status: "PENDING",
              limit: 1,
            } as Record<string, unknown>,
          },
        }
      );
      if (error) return 0;
      const listData = data as unknown as { total?: number };
      return listData.total ?? 0;
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useDeductionReport(month?: string) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  const reportMonth = month || getCurrentMonth();

  return useQuery({
    queryKey: ["admin-deduction-report", reportMonth],
    queryFn: async (): Promise<MonthlyReport> => {
      const { data, error } = await client.GET(
        "/api/v1/admin/salary-deductions/report" as "/api/v1/admin/orders",
        {
          params: {
            query: {
              month: reportMonth,
            } as Record<string, unknown>,
          },
        }
      );
      if (error) {
        return {
          month: reportMonth,
          totalDeducted: "0",
          totalPending: "0",
          totalEmployees: 0,
          currency: "USD",
          items: [],
          summary: {
            totalOrders: 0,
            averageDeduction: "0",
            highestDeduction: "0",
            lowestDeduction: "0",
          },
        };
      }
      return mapMonthlyReportFromDto(data, reportMonth);
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useUpdateDeductionLimit() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: string;
      data: UpdateDeductionLimitDto;
    }): Promise<EmployeeDeduction> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: response, error } = await (client as any).PATCH(
        `/api/v1/admin/salary-deductions/${userId}`,
        {
          params: { path: { id: userId } },
          body: data,
        }
      );
      if (error) throw new Error("Failed to update deduction limit");
      return mapEmployeeDeductionFromDto(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-salary-deductions"] });
    },
  });
}

export function useBulkUpdateLimits() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BulkUpdateLimitDto): Promise<void> => {
      // Process each user sequentially
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyClient = client as any;
      for (const userId of data.userIds) {
        const { error } = await anyClient.PATCH(
          `/api/v1/admin/salary-deductions/${userId}`,
          {
            params: { path: { id: userId } },
            body: {
              monthlyLimit: data.monthlyLimit,
              notes: data.notes,
            },
          }
        );
        if (error) {
          console.error(`Failed to update limit for user ${userId}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-salary-deductions"] });
    },
  });
}

export function useApproveLimitRequest() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      data,
    }: {
      requestId: string;
      data?: ApproveLimitRequestDto;
    }): Promise<LimitRequest> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: response, error } = await (client as any).POST(
        `/api/v1/admin/salary-deductions/limit-requests/${requestId}/approve`,
        {
          params: { path: { id: requestId } },
          body: data,
        }
      );
      if (error) throw new Error("Failed to approve limit request");
      return mapLimitRequestFromDto(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-limit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-limit-requests-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-salary-deductions"] });
    },
  });
}

export function useRejectLimitRequest() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      data,
    }: {
      requestId: string;
      data: RejectLimitRequestDto;
    }): Promise<LimitRequest> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: response, error } = await (client as any).POST(
        `/api/v1/admin/salary-deductions/limit-requests/${requestId}/reject`,
        {
          params: { path: { id: requestId } },
          body: data,
        }
      );
      if (error) throw new Error("Failed to reject limit request");
      return mapLimitRequestFromDto(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-limit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-limit-requests-pending-count"] });
    },
  });
}

export function useBulkApproveLimitRequests() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestIds: string[]): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyClient = client as any;
      for (const requestId of requestIds) {
        const { error } = await anyClient.POST(
          `/api/v1/admin/salary-deductions/limit-requests/${requestId}/approve`,
          {
            params: { path: { id: requestId } },
            body: {},
          }
        );
        if (error) {
          console.error(`Failed to approve request ${requestId}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-limit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-limit-requests-pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-salary-deductions"] });
    },
  });
}

// =============================================================================
// Mappers
// =============================================================================

function mapEmployeeDeductionFromDto(dto: unknown): EmployeeDeduction {
  const d = dto as Record<string, unknown>;
  return {
    id: (d.id as string) ?? "",
    userId: (d.userId as string) ?? (d.id as string) ?? "",
    userName: (d.userName as string) ?? (d.name as string) ?? "Unknown",
    userEmail: (d.userEmail as string) ?? (d.email as string) ?? "",
    employeeId: (d.employeeId as string) ?? null,
    organizationId: (d.organizationId as string) ?? null,
    organizationName: (d.organizationName as string) ?? null,
    monthlyLimit: (d.monthlyLimit as string) ?? "0",
    usedAmount: (d.usedAmount as string) ?? "0",
    remainingAmount: (d.remainingAmount as string) ?? "0",
    isEnabled: (d.isEnabled as boolean) ?? true,
    periodStart: (d.periodStart as string) ?? new Date().toISOString(),
    periodEnd: (d.periodEnd as string) ?? new Date().toISOString(),
    lastDeductionDate: (d.lastDeductionDate as string) ?? null,
    createdAt: (d.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (d.updatedAt as string) ?? new Date().toISOString(),
  };
}

function mapLimitRequestFromDto(dto: unknown): LimitRequest {
  const d = dto as Record<string, unknown>;
  return {
    id: (d.id as string) ?? "",
    userId: (d.userId as string) ?? "",
    userName: (d.userName as string) ?? (d.name as string) ?? "Unknown",
    userEmail: (d.userEmail as string) ?? (d.email as string) ?? "",
    employeeId: (d.employeeId as string) ?? null,
    organizationId: (d.organizationId as string) ?? null,
    organizationName: (d.organizationName as string) ?? null,
    currentLimit: (d.currentLimit as string) ?? "0",
    requestedLimit: (d.requestedLimit as string) ?? "0",
    reason: (d.reason as string) ?? "",
    status: (d.status as LimitRequestStatus) ?? "PENDING",
    reviewedBy: (d.reviewedBy as string) ?? null,
    reviewedByName: (d.reviewedByName as string) ?? null,
    reviewedAt: (d.reviewedAt as string) ?? null,
    reviewNote: (d.reviewNote as string) ?? null,
    createdAt: (d.createdAt as string) ?? new Date().toISOString(),
    updatedAt: (d.updatedAt as string) ?? new Date().toISOString(),
  };
}

function mapMonthlyReportFromDto(dto: unknown, month: string): MonthlyReport {
  const d = dto as Record<string, unknown>;
  const items = ((d.items as unknown[]) ?? []).map(mapReportItemFromDto);
  return {
    month,
    totalDeducted: (d.totalDeducted as string) ?? "0",
    totalPending: (d.totalPending as string) ?? "0",
    totalEmployees: (d.totalEmployees as number) ?? items.length,
    currency: (d.currency as string) ?? "USD",
    items,
    summary: {
      totalOrders: ((d.summary as Record<string, unknown>)?.totalOrders as number) ?? 0,
      averageDeduction: ((d.summary as Record<string, unknown>)?.averageDeduction as string) ?? "0",
      highestDeduction: ((d.summary as Record<string, unknown>)?.highestDeduction as string) ?? "0",
      lowestDeduction: ((d.summary as Record<string, unknown>)?.lowestDeduction as string) ?? "0",
    },
  };
}

function mapReportItemFromDto(dto: unknown): DeductionReportItem {
  const d = dto as Record<string, unknown>;
  return {
    userId: (d.userId as string) ?? "",
    userName: (d.userName as string) ?? "Unknown",
    userEmail: (d.userEmail as string) ?? "",
    employeeId: (d.employeeId as string) ?? null,
    organizationId: (d.organizationId as string) ?? null,
    organizationName: (d.organizationName as string) ?? null,
    totalDeducted: (d.totalDeducted as string) ?? "0",
    deductionCount: (d.deductionCount as number) ?? 0,
    pendingAmount: (d.pendingAmount as string) ?? "0",
    pendingCount: (d.pendingCount as number) ?? 0,
    completedAmount: (d.completedAmount as string) ?? "0",
    completedCount: (d.completedCount as number) ?? 0,
    failedAmount: (d.failedAmount as string) ?? "0",
    failedCount: (d.failedCount as number) ?? 0,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatPrice(value: string | number, currency: string = "USD"): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(numValue);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMonthYear(dateString: string): string {
  const date = dateString.includes("-") && dateString.length === 7
    ? new Date(`${dateString}-01`)
    : new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthsForSelect(count: number = 12): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    months.push({ value, label });
  }

  return months;
}

export function calculateUsagePercentage(used: string | number, limit: string | number): number {
  const usedNum = typeof used === "string" ? parseFloat(used) : used;
  const limitNum = typeof limit === "string" ? parseFloat(limit) : limit;
  if (limitNum === 0) return 0;
  return Math.min(100, (usedNum / limitNum) * 100);
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 75) return "bg-amber-500";
  return "bg-green-500";
}

export function getLimitRequestStatusLabel(status: LimitRequestStatus): string {
  const labels: Record<LimitRequestStatus, string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return labels[status] || status;
}

export function getLimitRequestStatusColor(status: LimitRequestStatus): string {
  const colors: Record<LimitRequestStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

// =============================================================================
// Export Functions
// =============================================================================

export function generateCSVReport(report: MonthlyReport): string {
  const headers = [
    "Employee Name",
    "Email",
    "Employee ID",
    "Organization",
    "Total Deducted",
    "Deduction Count",
    "Pending Amount",
    "Pending Count",
    "Completed Amount",
    "Completed Count",
  ];

  const rows = report.items.map((item) => [
    item.userName,
    item.userEmail,
    item.employeeId ?? "",
    item.organizationName ?? "",
    item.totalDeducted,
    item.deductionCount.toString(),
    item.pendingAmount,
    item.pendingCount.toString(),
    item.completedAmount,
    item.completedCount.toString(),
  ]);

  const csvContent = [
    `Salary Deduction Report - ${formatMonthYear(report.month)}`,
    "",
    `Total Deducted: ${formatPrice(report.totalDeducted, report.currency)}`,
    `Total Pending: ${formatPrice(report.totalPending, report.currency)}`,
    `Total Employees: ${report.totalEmployees}`,
    "",
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ];

  return csvContent.join("\n");
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateExcelReport(report: MonthlyReport): void {
  // For Excel export, we generate a CSV that Excel can open
  // In a production app, you'd use a library like xlsx or exceljs
  const csv = generateCSVReport(report);
  downloadCSV(csv, `salary-deduction-report-${report.month}.csv`);
}

// =============================================================================
// Constants
// =============================================================================

export const LIMIT_REQUEST_STATUSES: { value: LimitRequestStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export const DEFAULT_MONTHLY_LIMITS: { value: number; label: string }[] = [
  { value: 500, label: "$500" },
  { value: 1000, label: "$1,000" },
  { value: 1500, label: "$1,500" },
  { value: 2000, label: "$2,000" },
  { value: 2500, label: "$2,500" },
  { value: 3000, label: "$3,000" },
  { value: 5000, label: "$5,000" },
];
