import createClient from "openapi-fetch";
import type { paths, components, operations } from "./generated/api";

// =============================================================================
// Configuration
// =============================================================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// =============================================================================
// Type Exports
// =============================================================================

/** All API paths */
export type { paths };

/** All component schemas (DTOs) */
export type { components };

/** All operations (endpoint definitions) */
export type { operations };

/** Shorthand for accessing schema types */
export type Schemas = components["schemas"];

// =============================================================================
// Common Request/Response Types
// =============================================================================

// Auth
export type LoginDto = Schemas["LoginDto"];
export type RegisterDto = Schemas["RegisterDto"];
export type RefreshTokenDto = Schemas["RefreshTokenDto"];
export type AuthResponseDto = Schemas["AuthResponseDto"];

// Users
export type CreateUserDto = Schemas["CreateUserDto"];
export type UpdateUserDto = Schemas["UpdateUserDto"];
export type UpdateProfileDto = Schemas["UpdateProfileDto"];
export type ChangePasswordDto = Schemas["ChangePasswordDto"];
export type UserResponseDto = Schemas["UserResponseDto"];

// Tenants
export type CreateTenantDto = Schemas["CreateTenantDto"];
export type UpdateTenantDto = Schemas["UpdateTenantDto"];
export type TenantResponseDto = Schemas["TenantResponseDto"];

// Organizations
export type CreateOrganizationDto = Schemas["CreateOrganizationDto"];
export type UpdateOrganizationDto = Schemas["UpdateOrganizationDto"];
export type OrganizationResponseDto = Schemas["OrganizationResponseDto"];
export type OrganizationHierarchyResponseDto =
  Schemas["OrganizationHierarchyResponseDto"];

// Contracts
export type CreateContractDto = Schemas["CreateContractDto"];
export type UpdateContractDto = Schemas["UpdateContractDto"];
export type ContractResponseDto = Schemas["ContractResponseDto"];
export type ContractVersionResponseDto = Schemas["ContractVersionResponseDto"];
export type WorkflowActionDto = Schemas["WorkflowActionDto"];

// Quotes
export type CreateQuoteDto = Schemas["CreateQuoteDto"];
export type UpdateQuoteDto = Schemas["UpdateQuoteDto"];
export type QuoteResponseDto = Schemas["QuoteResponseDto"];
export type CreateQuoteLineItemDto = Schemas["CreateQuoteLineItemDto"];
export type QuoteLineItemResponseDto = Schemas["QuoteLineItemResponseDto"];
export type QuoteWorkflowActionDto = Schemas["QuoteWorkflowActionDto"];

// Products & Catalog
export type CreateMasterProductDto = Schemas["CreateMasterProductDto"];
export type UpdateMasterProductDto = Schemas["UpdateMasterProductDto"];
export type MasterProductResponseDto = Schemas["MasterProductResponseDto"];
export type MasterProductListResponseDto = Schemas["MasterProductListResponseDto"];
export type TenantProductResponseDto = Schemas["TenantProductResponseDto"];
export type TenantProductListResponseDto = Schemas["TenantProductListResponseDto"];
export type CategoryResponseDto = Schemas["CategoryResponseDto"];
export type CategoryTreeResponseDto = Schemas["CategoryTreeResponseDto"];

// Cart
export type AddCartItemDto = Schemas["AddCartItemDto"];
export type UpdateCartItemDto = Schemas["UpdateCartItemDto"];
export type ApplyCouponDto = Schemas["ApplyCouponDto"];
export type CartResponseDto = Schemas["CartResponseDto"];
export type CartItemResponseDto = Schemas["CartItemResponseDto"];

// Orders
export type CreateOrderDto = Schemas["CreateOrderDto"];
export type UpdateOrderDto = Schemas["UpdateOrderDto"];
export type CancelOrderDto = Schemas["CancelOrderDto"];
export type RefundOrderDto = Schemas["RefundOrderDto"];
export type OrderResponseDto = Schemas["OrderResponseDto"];
export type OrderItemResponseDto = Schemas["OrderItemResponseDto"];
export type OrderListResponseDto = Schemas["OrderListResponseDto"];
export type TrackingResponseDto = Schemas["TrackingResponseDto"];
export type AddressDto = Schemas["AddressDto"];
export type AddressResponseDto = Schemas["AddressResponseDto"];

// Payments
export type CreatePaymentMethodDto = Schemas["CreatePaymentMethodDto"];
export type UpdatePaymentMethodDto = Schemas["UpdatePaymentMethodDto"];
export type PaymentMethodResponseDto = Schemas["PaymentMethodResponseDto"];
export type ProcessPaymentDto = Schemas["ProcessPaymentDto"];
export type PaymentResponseDto = Schemas["PaymentResponseDto"];
export type PaymentHistoryResponseDto = Schemas["PaymentHistoryResponseDto"];

// Approvals
export type CreateApprovalChainDto = Schemas["CreateApprovalChainDto"];
export type UpdateApprovalChainDto = Schemas["UpdateApprovalChainDto"];
export type ApprovalChainResponseDto = Schemas["ApprovalChainResponseDto"];
export type ApprovalChainListResponseDto = Schemas["ApprovalChainListResponseDto"];
export type ApprovalActionDto = Schemas["ApprovalActionDto"];
export type SubmitApprovalDto = Schemas["SubmitApprovalDto"];
export type ApprovalRequestResponseDto = Schemas["ApprovalRequestResponseDto"];
export type PendingApprovalResponseDto = Schemas["PendingApprovalResponseDto"];

// Delivery Methods
export type CreateDeliveryMethodDto = Schemas["CreateDeliveryMethodDto"];
export type UpdateDeliveryMethodDto = Schemas["UpdateDeliveryMethodDto"];
export type DeliveryMethodResponseDto = Schemas["DeliveryMethodResponseDto"];

// User Addresses
export type CreateUserAddressDto = Schemas["CreateUserAddressDto"];
export type UpdateUserAddressDto = Schemas["UpdateUserAddressDto"];
export type UserAddressResponseDto = Schemas["UserAddressResponseDto"];

// Salary Deductions
export type SalaryDeductionResponseDto = Schemas["SalaryDeductionResponseDto"];
export type SalaryDeductionHistoryResponseDto = Schemas["SalaryDeductionHistoryResponseDto"];

// Discount Tiers
export type DiscountTierResponseDto = Schemas["DiscountTierResponseDto"];
export type UserDiscountTierResponseDto = Schemas["UserDiscountTierResponseDto"];

// =============================================================================
// Client Factory
// =============================================================================

export interface ApiClientOptions {
  /** Base URL for the API (defaults to NEXT_PUBLIC_API_URL or http://localhost:3000) */
  baseUrl?: string;
  /** Default headers to include in all requests */
  headers?: Record<string, string>;
  /** Tenant ID or slug to include in x-tenant-id header */
  tenantId?: string;
  /** Bearer token for authentication */
  token?: string;
}

/**
 * Create a typed API client instance
 *
 * @example
 * ```typescript
 * // Basic usage
 * const api = createApiClient();
 *
 * // With tenant and auth
 * const api = createApiClient({
 *   tenantId: 'acme',
 *   token: 'jwt-token-here'
 * });
 *
 * // Making requests
 * const { data, error } = await api.GET('/api/v1/users');
 * const { data } = await api.POST('/api/v1/auth/login', {
 *   body: { email: 'user@example.com', password: 'secret' }
 * });
 * ```
 */
export function createApiClient(options: ApiClientOptions = {}) {
  const { baseUrl = API_BASE_URL, headers = {}, tenantId, token } = options;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (tenantId) {
    defaultHeaders["x-tenant-id"] = tenantId;
  }

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  return createClient<paths>({
    baseUrl,
    headers: defaultHeaders,
  });
}

// =============================================================================
// Default Client Instance
// =============================================================================

/**
 * Default API client instance
 *
 * Note: For authenticated requests, create a new client with createApiClient()
 * passing tenantId and token, or set headers on each request.
 *
 * @example
 * ```typescript
 * import { apiClient } from '@b2b/api-client';
 *
 * // Unauthenticated request
 * const { data } = await apiClient.GET('/api/v1/health');
 *
 * // With request-level headers
 * const { data } = await apiClient.GET('/api/v1/users', {
 *   headers: {
 *     'x-tenant-id': 'acme',
 *     'Authorization': 'Bearer token'
 *   }
 * });
 * ```
 */
export const apiClient = createApiClient();

// =============================================================================
// Re-exports
// =============================================================================

export { createClient };

export const apiConfig = {
  baseUrl: API_BASE_URL,
};
