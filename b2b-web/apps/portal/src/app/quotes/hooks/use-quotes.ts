"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export type QuoteStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CONVERTED";

export interface QuoteLineItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: string;
  originalPrice: string;
  priceOverride: boolean;
  totalPrice: string;
  notes?: string;
}

export interface QuoteDto {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string;
  status: QuoteStatus;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  lineItems: QuoteLineItem[];
  subtotal: string;
  discountAmount: string;
  discountPercent?: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  validUntil?: string;
  notes?: string;
  internalNotes?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  sentAt?: string;
}

export interface QuoteQueryParams {
  page?: number;
  limit?: number;
  status?: QuoteStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface QuotesResponse {
  data: QuoteDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateQuoteLineItemData {
  productId: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface CreateQuoteData {
  title: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  lineItems: CreateQuoteLineItemData[];
  discountPercent?: number;
  validUntil?: string;
  notes?: string;
  internalNotes?: string;
}

export interface UpdateQuoteData {
  title?: string;
  description?: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  lineItems?: CreateQuoteLineItemData[];
  discountPercent?: number;
  validUntil?: string;
  notes?: string;
  internalNotes?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "SENT", label: "Sent to Customer" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CONVERTED", label: "Converted" },
];

// =============================================================================
// API Client Hook
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

// =============================================================================
// Query Hooks
// =============================================================================

export function useQuotes(params: QuoteQueryParams = {}) {
  const client = useApiClient();
  const { user } = useAuth();
  const {
    page = 1,
    limit = 10,
    status,
    search,
    startDate,
    endDate,
  } = params;

  return useQuery({
    queryKey: ["quotes", { page, limit, status, search, startDate, endDate }],
    queryFn: async (): Promise<QuotesResponse> => {
      const { data, error } = await client.GET("/api/v1/quotes", {
        params: {
          query: {
            page,
            limit,
            status: status || undefined,
            search: search || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          },
        },
      });
      if (error) throw new Error("Failed to fetch quotes");
      return data as unknown as QuotesResponse;
    },
    enabled: !!user?.tenantId,
  });
}

export function useQuote(id: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quotes", id],
    queryFn: async (): Promise<QuoteDto> => {
      const { data, error } = await client.GET("/api/v1/quotes/{id}", {
        params: {
          path: { id },
        },
      });
      if (error) throw new Error("Failed to fetch quote");
      return data as unknown as QuoteDto;
    },
    enabled: !!id && !!user?.tenantId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateQuoteData): Promise<QuoteDto> => {
      const { data: result, error } = await client.POST("/api/v1/quotes", {
        body: data,
      });
      if (error) throw new Error("Failed to create quote");
      return result as unknown as QuoteDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useUpdateQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateQuoteData;
    }): Promise<QuoteDto> => {
      const { data: result, error } = await client.PATCH("/api/v1/quotes/{id}", {
        params: { path: { id } },
        body: data,
      });
      if (error) throw new Error("Failed to update quote");
      return result as unknown as QuoteDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
    },
  });
}

export function useDeleteQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client.DELETE("/api/v1/quotes/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error("Failed to delete quote");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}

export function useSubmitQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }): Promise<QuoteDto> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/submit", {
        params: { path: { id } },
        body: { comments },
      });
      if (error) throw new Error("Failed to submit quote for approval");
      return data as unknown as QuoteDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
    },
  });
}

export function useApproveQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }): Promise<QuoteDto> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/approve", {
        params: { path: { id } },
        body: { comments },
      });
      if (error) throw new Error("Failed to approve quote");
      return data as unknown as QuoteDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
    },
  });
}

export function useRejectQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }): Promise<QuoteDto> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/reject", {
        params: { path: { id } },
        body: { comments },
      });
      if (error) throw new Error("Failed to reject quote");
      return data as unknown as QuoteDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
    },
  });
}

export function useSendQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      comments,
    }: {
      id: string;
      comments?: string;
    }): Promise<QuoteDto> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/send", {
        params: { path: { id } },
        body: { comments },
      });
      if (error) throw new Error("Failed to send quote");
      return data as unknown as QuoteDto;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quotes", id] });
    },
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(value: string | number, currency: string = "USD") {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(numValue);
}

export function getStatusLabel(status: QuoteStatus) {
  const statusConfig = QUOTE_STATUSES.find((s) => s.value === status);
  return statusConfig?.label || status;
}

export function getStatusBadgeColor(status: QuoteStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "PENDING_APPROVAL":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "APPROVED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "SENT":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "ACCEPTED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "EXPIRED":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "CONVERTED":
      return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

export function canEditQuote(status: QuoteStatus): boolean {
  return status === "DRAFT";
}

export function canSubmitQuote(status: QuoteStatus): boolean {
  return status === "DRAFT";
}

export function canApproveQuote(status: QuoteStatus): boolean {
  return status === "PENDING_APPROVAL";
}

export function canSendQuote(status: QuoteStatus): boolean {
  return status === "APPROVED";
}
