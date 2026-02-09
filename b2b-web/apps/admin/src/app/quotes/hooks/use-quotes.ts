"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

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
  lineNumber: number;
  productName: string;
  productSku?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
  masterProductId?: string | null;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  description?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status: QuoteStatus;
  validUntil?: string | null;
  subtotal: string;
  discount: string;
  discountPercent?: string | null;
  tax: string;
  total: string;
  currency: string;
  notes?: string | null;
  internalNotes?: string | null;
  lineItems: QuoteLineItem[];
  contractId?: string | null;
  createdById?: string;
  approvedById?: string | null;
  tenantId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteListParams {
  search?: string;
  status?: QuoteStatus;
  page?: number;
  limit?: number;
}

export interface QuoteListResponse {
  data: Quote[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkflowActionDto {
  comments?: string;
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

export function useQuotes(params: QuoteListParams = {}) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["admin-quotes", params],
    queryFn: async (): Promise<QuoteListResponse> => {
      const { data, error } = await client.GET("/api/v1/quotes", {
        params: {
          query: {
            search: params.search,
            status: params.status,
            page: params.page ?? 1,
            limit: params.limit ?? 10,
          },
        },
      });
      if (error) {
        return {
          data: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        };
      }
      const response = data as unknown as QuoteListResponse;
      return {
        data: response.data.map(mapQuoteFromDto),
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      };
    },
    enabled: isAuthenticated && !!user?.tenantId,
  });
}

export function useQuote(quoteId: string | null) {
  const client = useApiClient();
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["admin-quote", quoteId],
    queryFn: async (): Promise<Quote | null> => {
      if (!quoteId) return null;
      const { data, error } = await client.GET("/api/v1/quotes/{id}", {
        params: { path: { id: quoteId } },
      });
      if (error) return null;
      return mapQuoteFromDto(data as unknown as Quote);
    },
    enabled: isAuthenticated && !!user?.tenantId && !!quoteId,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useApproveQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quoteId,
      comments,
    }: {
      quoteId: string;
      comments?: string;
    }): Promise<Quote> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/approve", {
        params: { path: { id: quoteId } },
        body: { comments },
      });
      if (error) throw new Error("Failed to approve quote");
      return mapQuoteFromDto(data as unknown as Quote);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
  });
}

export function useRejectQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quoteId,
      comments,
    }: {
      quoteId: string;
      comments?: string;
    }): Promise<Quote> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/reject", {
        params: { path: { id: quoteId } },
        body: { comments },
      });
      if (error) throw new Error("Failed to reject quote");
      return mapQuoteFromDto(data as unknown as Quote);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
  });
}

export function useSendQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quoteId,
      comments,
    }: {
      quoteId: string;
      comments?: string;
    }): Promise<Quote> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/send", {
        params: { path: { id: quoteId } },
        body: { comments },
      });
      if (error) throw new Error("Failed to send quote");
      return mapQuoteFromDto(data as unknown as Quote);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
  });
}

export function useAcceptQuote() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quoteId,
      comments,
    }: {
      quoteId: string;
      comments?: string;
    }): Promise<Quote> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/accept", {
        params: { path: { id: quoteId } },
        body: { comments },
      });
      if (error) throw new Error("Failed to accept quote");
      return mapQuoteFromDto(data as unknown as Quote);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
    },
  });
}

export function useConvertToContract() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quoteId,
      comments,
    }: {
      quoteId: string;
      comments?: string;
    }): Promise<{ quote: Quote; contractId: string }> => {
      const { data, error } = await client.POST("/api/v1/quotes/{id}/convert-to-contract", {
        params: { path: { id: quoteId } },
        body: { comments },
      });
      if (error) throw new Error("Failed to convert quote to contract");
      const result = data as unknown as { quote: Quote; contractId: string };
      return {
        quote: mapQuoteFromDto(result.quote),
        contractId: result.contractId,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-quote", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}

// =============================================================================
// Mappers
// =============================================================================

function mapQuoteFromDto(dto: Quote): Quote {
  return {
    id: dto.id,
    quoteNumber: dto.quoteNumber,
    title: dto.title,
    description: dto.description,
    customerName: dto.customerName,
    customerEmail: dto.customerEmail,
    status: dto.status,
    validUntil: dto.validUntil,
    subtotal: dto.subtotal?.toString() ?? "0",
    discount: dto.discount?.toString() ?? "0",
    discountPercent: dto.discountPercent?.toString(),
    tax: dto.tax?.toString() ?? "0",
    total: dto.total?.toString() ?? "0",
    currency: dto.currency ?? "USD",
    notes: dto.notes,
    internalNotes: dto.internalNotes,
    lineItems: (dto.lineItems || []).map((item) => ({
      id: item.id,
      lineNumber: item.lineNumber ?? 0,
      productName: item.productName,
      productSku: item.productSku,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice?.toString() ?? "0",
      discount: item.discount?.toString() ?? "0",
      total: item.total?.toString() ?? "0",
      masterProductId: item.masterProductId,
    })),
    contractId: dto.contractId,
    createdById: dto.createdById,
    approvedById: dto.approvedById,
    tenantId: dto.tenantId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
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

export function getStatusLabel(status: QuoteStatus): string {
  const labels: Record<QuoteStatus, string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    SENT: "Sent",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    EXPIRED: "Expired",
    CONVERTED: "Converted",
  };
  return labels[status] || status;
}

export function getStatusColor(status: QuoteStatus): string {
  const colors: Record<QuoteStatus, string> = {
    DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    PENDING_APPROVAL: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    SENT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    EXPIRED: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    CONVERTED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function canApprove(status: QuoteStatus): boolean {
  return status === "PENDING_APPROVAL";
}

export function canReject(status: QuoteStatus): boolean {
  return ["PENDING_APPROVAL", "APPROVED", "SENT"].includes(status);
}

export function canSend(status: QuoteStatus): boolean {
  return status === "APPROVED";
}

export function canAccept(status: QuoteStatus): boolean {
  return status === "SENT";
}

export function canConvert(status: QuoteStatus): boolean {
  return status === "ACCEPTED";
}

// =============================================================================
// Constants
// =============================================================================

export const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CONVERTED", label: "Converted" },
];
