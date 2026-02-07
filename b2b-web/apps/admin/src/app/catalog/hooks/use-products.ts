"use client";

import {
  createApiClient,
  type MasterProductResponseDto,
  type CreateMasterProductDto,
  type UpdateMasterProductDto,
} from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ProductStatus = "ACTIVE" | "DISCONTINUED" | "ARCHIVED";

export const PRODUCT_STATUSES: { value: ProductStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "DISCONTINUED", label: "Discontinued" },
  { value: "ARCHIVED", label: "Archived" },
];

export interface ProductsQueryParams {
  search?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  data: MasterProductResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

export function useProducts(params: ProductsQueryParams = {}) {
  const client = useApiClient();
  const { user } = useAuth();
  const {
    page = 1,
    limit = 10,
    search,
    category,
    subcategory,
    brand,
    status,
  } = params;

  return useQuery({
    queryKey: [
      "products",
      { page, limit, search, category, subcategory, brand, status },
    ],
    queryFn: async (): Promise<ProductsResponse> => {
      const { data, error } = await client.GET(
        "/api/v1/master-catalog/products",
        {
          params: {
            query: {
              page,
              limit,
              search: search || undefined,
              category: category || undefined,
              subcategory: subcategory || undefined,
              brand: brand || undefined,
              status: status || undefined,
            },
          },
        }
      );
      if (error) throw new Error("Failed to fetch products");
      return data as ProductsResponse;
    },
    enabled: !!user?.tenantId,
  });
}

export function useProduct(id: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/master-catalog/products/{id}",
        {
          params: {
            path: { id },
          },
        }
      );
      if (error) throw new Error("Failed to fetch product");
      return data as MasterProductResponseDto;
    },
    enabled: !!id && !!user?.tenantId,
  });
}

export function useCategories() {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/master-catalog/products/categories"
      );
      if (error) throw new Error("Failed to fetch categories");
      return data as string[];
    },
    enabled: !!user?.tenantId,
  });
}

export function useBrands() {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["product-brands"],
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/master-catalog/products/brands"
      );
      if (error) throw new Error("Failed to fetch brands");
      return data as string[];
    },
    enabled: !!user?.tenantId,
  });
}

export function useCreateProduct() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMasterProductDto) => {
      const { data: response, error } = await client.POST(
        "/api/v1/master-catalog/products",
        {
          body: data,
        }
      );
      if (error) throw new Error("Failed to create product");
      return response as MasterProductResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["product-brands"] });
    },
  });
}

export function useUpdateProduct(id: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateMasterProductDto) => {
      const { data: response, error } = await client.PATCH(
        "/api/v1/master-catalog/products/{id}",
        {
          params: {
            path: { id },
          },
          body: data,
        }
      );
      if (error) throw new Error("Failed to update product");
      return response as MasterProductResponseDto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", id] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["product-brands"] });
    },
  });
}

export function useUpdateProductStatus() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ProductStatus;
    }) => {
      const { data, error } = await client.PATCH(
        "/api/v1/master-catalog/products/{id}",
        {
          params: {
            path: { id },
          },
          body: { status },
        }
      );
      if (error) throw new Error("Failed to update product status");
      return data as MasterProductResponseDto;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE(
        "/api/v1/master-catalog/products/{id}",
        {
          params: {
            path: { id },
          },
        }
      );
      if (error) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export interface ImportResult {
  success: boolean;
  statistics: {
    total: number;
    imported: number;
    skipped: number;
    failed: number;
    errors?: string[];
    durationMs: number;
  };
  message?: string;
}

export function useImportProducts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      const formData = new FormData();
      formData.append("file", file);

      // Use fetch directly for multipart form data upload since openapi-fetch
      // has issues with FormData body types
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/admin/master-catalog/import`,
        {
          method: "POST",
          headers: {
            ...(user?.accessToken
              ? { Authorization: `Bearer ${user.accessToken}` }
              : {}),
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to import products");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      queryClient.invalidateQueries({ queryKey: ["product-brands"] });
    },
  });
}
