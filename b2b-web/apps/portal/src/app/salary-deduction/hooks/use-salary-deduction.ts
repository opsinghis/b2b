"use client";

import { createApiClient } from "@b2b/api-client";
import type {
  SalaryDeductionResponseDto,
  SalaryDeductionHistoryResponseDto,
} from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

// =============================================================================
// Types
// =============================================================================

export type DeductionStatus = "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";

export interface SalaryDeduction {
  id: string;
  monthlyLimit: string;
  usedAmount: string;
  remainingAmount: string;
  isEnabled: boolean;
  periodStart: string;
  periodEnd: string;
}

export interface DeductionHistoryItem {
  id: string;
  amount: string;
  currency: string;
  description: string;
  status: DeductionStatus;
  orderId?: string | null;
  orderNumber?: string | null;
  payrollDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeductionHistory {
  items: DeductionHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface DeductionHistoryParams {
  page?: number;
  limit?: number;
  status?: DeductionStatus;
  startDate?: string;
  endDate?: string;
  month?: string; // YYYY-MM format
}

export interface UpdatePreferencesParams {
  isEnabled: boolean;
}

export interface LimitRequestParams {
  requestedLimit: number;
  reason: string;
}

export interface LimitRequest {
  id: string;
  requestedLimit: string;
  currentLimit: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
}

// For the pending deductions list
export interface PendingDeduction {
  id: string;
  amount: string;
  currency: string;
  orderId: string;
  orderNumber: string;
  status: "PENDING";
  scheduledPayrollDate: string;
  createdAt: string;
}

// For the upcoming payroll preview
export interface UpcomingPayroll {
  payrollDate: string;
  totalAmount: string;
  currency: string;
  deductions: PendingDeduction[];
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
// Salary Deduction Hooks
// =============================================================================

export function useSalaryDeduction() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["salary-deduction"],
    queryFn: async (): Promise<SalaryDeduction | null> => {
      const { data, error } = await client.GET(
        "/api/v1/users/me/salary-deduction"
      );
      if (error) {
        // User might not be eligible for salary deduction
        return null;
      }
      return mapSalaryDeductionFromDto(
        data as unknown as SalaryDeductionResponseDto
      );
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useDeductionHistory(params: DeductionHistoryParams = {}) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["deduction-history", params],
    queryFn: async (): Promise<DeductionHistory> => {
      const { data, error } = await client.GET(
        "/api/v1/users/me/salary-deduction/history",
        {
          params: {
            query: {
              page: params.page ?? 1,
              limit: params.limit ?? 10,
              status: params.status,
              startDate: params.startDate,
              endDate: params.endDate,
              month: params.month,
            },
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
      const historyData = data as unknown as SalaryDeductionHistoryResponseDto;
      return mapDeductionHistoryFromDto(historyData);
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function usePendingDeductions() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["pending-deductions"],
    queryFn: async (): Promise<PendingDeduction[]> => {
      const { data, error } = await client.GET(
        "/api/v1/users/me/salary-deduction/history",
        {
          params: {
            query: {
              status: "PENDING",
              limit: 50,
            },
          },
        }
      );
      if (error) {
        return [];
      }
      const historyData = data as unknown as SalaryDeductionHistoryResponseDto;
      return historyData.transactions?.map(mapPendingDeductionFromDto) ?? [];
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useUpcomingPayroll() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["upcoming-payroll"],
    queryFn: async (): Promise<UpcomingPayroll | null> => {
      // Get pending deductions and group them by payroll date
      const { data, error } = await client.GET(
        "/api/v1/users/me/salary-deduction/history",
        {
          params: {
            query: {
              status: "PENDING",
              limit: 50,
            },
          },
        }
      );
      if (error) {
        return null;
      }
      const historyData = data as unknown as SalaryDeductionHistoryResponseDto;
      const pendingItems = historyData.transactions?.filter(
        (item) => item.status === "PENDING"
      );

      if (!pendingItems || pendingItems.length === 0) {
        return null;
      }

      // Group by next payroll date (assume end of current month)
      const now = new Date();
      const nextPayrollDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ); // Last day of current month

      const totalAmount = pendingItems.reduce(
        (sum, item) => sum + parseFloat(item.amount ?? "0"),
        0
      );

      return {
        payrollDate: nextPayrollDate.toISOString(),
        totalAmount: totalAmount.toString(),
        currency: "USD",
        deductions: pendingItems.map(mapPendingDeductionFromDto),
      };
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useUpdateDeductionPreferences() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: UpdatePreferencesParams
    ): Promise<SalaryDeduction> => {
      const { data, error } = await client.PATCH(
        "/api/v1/users/me/salary-deduction",
        {
          body: {
            isEnabled: params.isEnabled,
          },
        }
      );
      if (error) throw new Error("Failed to update deduction preferences");
      return mapSalaryDeductionFromDto(
        data as unknown as SalaryDeductionResponseDto
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-deduction"] });
    },
  });
}

export function useRequestLimitIncrease() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LimitRequestParams): Promise<LimitRequest> => {
      const { data, error } = await client.POST(
        "/api/v1/users/me/salary-deduction/limit-request",
        {
          body: {
            requestedLimit: params.requestedLimit,
            reason: params.reason,
          },
        }
      );
      if (error) throw new Error("Failed to submit limit request");
      return mapLimitRequestFromDto(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["limit-requests"] });
    },
  });
}

export function useLimitRequests() {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["limit-requests"],
    queryFn: async (): Promise<LimitRequest[]> => {
      // This endpoint may not exist yet - return empty array if error
      const { data, error } = await client.GET(
        "/api/v1/users/me/salary-deduction/limit-requests" as "/api/v1/users/me/salary-deduction"
      );
      if (error) {
        return [];
      }
      const requests = data as unknown;
      if (Array.isArray(requests)) {
        return requests.map(mapLimitRequestFromDto);
      }
      return [];
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

// =============================================================================
// Mappers
// =============================================================================

function mapSalaryDeductionFromDto(
  dto: SalaryDeductionResponseDto
): SalaryDeduction {
  return {
    id: dto.id,
    monthlyLimit: dto.monthlyLimit,
    usedAmount: dto.usedAmount,
    remainingAmount: dto.remainingAmount,
    isEnabled: dto.isEnabled,
    periodStart: dto.periodStart,
    periodEnd: dto.periodEnd,
  };
}

interface TransactionDto {
  id: string;
  amount: string;
  type: "DEDUCTION" | "REFUND" | "ADJUSTMENT";
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  reference?: string | null;
  description?: string | null;
  processedAt?: string | null;
  orderId?: string | null;
  createdAt: string;
}

function mapDeductionHistoryFromDto(
  dto: SalaryDeductionHistoryResponseDto
): DeductionHistory {
  const total = dto.total ?? 0;
  const limit = dto.limit ?? 10;
  const page = dto.page ?? 1;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    items:
      dto.transactions?.map((item) => ({
        id: item.id,
        amount: item.amount ?? "0",
        currency: "USD",
        description: item.description ?? "Salary deduction",
        status: (item.status as DeductionStatus) ?? "PENDING",
        orderId: item.orderId,
        orderNumber: null,
        payrollDate: item.processedAt,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      })) ?? [],
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

function mapPendingDeductionFromDto(
  dto: TransactionDto
): PendingDeduction {
  return {
    id: dto.id,
    amount: dto.amount ?? "0",
    currency: "USD",
    orderId: dto.orderId ?? "",
    orderNumber: dto.reference ?? `ORD-${dto.id.slice(0, 8).toUpperCase()}`,
    status: "PENDING",
    scheduledPayrollDate: dto.processedAt ?? new Date().toISOString(),
    createdAt: dto.createdAt,
  };
}

function mapLimitRequestFromDto(dto: unknown): LimitRequest {
  const d = dto as Record<string, unknown>;
  return {
    id: (d.id as string) ?? "",
    requestedLimit: (d.requestedLimit as string) ?? "0",
    currentLimit: (d.currentLimit as string) ?? "0",
    reason: (d.reason as string) ?? "",
    status:
      (d.status as "PENDING" | "APPROVED" | "REJECTED") ?? "PENDING",
    reviewedAt: (d.reviewedAt as string) ?? null,
    reviewNote: (d.reviewNote as string) ?? null,
    createdAt: (d.createdAt as string) ?? new Date().toISOString(),
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatPrice(
  value: string | number,
  currency: string = "USD"
): string {
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

export function formatMonthYear(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export function formatPayrollDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function getStatusLabel(status: DeductionStatus): string {
  const labels: Record<DeductionStatus, string> = {
    PENDING: "Pending",
    COMPLETED: "Completed",
    FAILED: "Failed",
    REVERSED: "Reversed",
  };
  return labels[status] || status;
}

export function getStatusColor(status: DeductionStatus): string {
  const colors: Record<DeductionStatus, string> = {
    PENDING:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    COMPLETED:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    FAILED:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    REVERSED:
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
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

export function calculateUsagePercentage(
  used: string | number,
  limit: string | number
): number {
  const usedNum = typeof used === "string" ? parseFloat(used) : used;
  const limitNum = typeof limit === "string" ? parseFloat(limit) : limit;
  if (limitNum === 0) return 0;
  return Math.min(100, (usedNum / limitNum) * 100);
}
