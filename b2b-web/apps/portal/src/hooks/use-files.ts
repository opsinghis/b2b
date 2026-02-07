"use client";

import { createApiClient } from "@b2b/api-client";
import { useAuth } from "@b2b/auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =============================================================================
// Types
// =============================================================================

export interface FileDto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  bucket: string;
  key: string;
  entityType?: string;
  entityId?: string;
  isPublic: boolean;
  createdAt: string;
  downloadUrl?: string;
}

export interface FileUploadResponse {
  file: FileDto;
  message: string;
}

export interface SignedUrlResponse {
  url: string;
  expiresIn: number;
}

export type EntityType = "contract" | "quote" | "order";

// =============================================================================
// Hooks
// =============================================================================

function useApiClient() {
  const { user } = useAuth();
  return createApiClient({
    tenantId: user?.tenantId,
    token: user?.accessToken,
  });
}

/**
 * Hook to fetch files for a specific entity (contract, quote, etc.)
 */
export function useEntityFiles(entityType: EntityType, entityId: string) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["files", entityType, entityId],
    queryFn: async (): Promise<FileDto[]> => {
      const { data, error } = await client.GET(
        "/api/v1/files/entity/{entityType}/{entityId}",
        {
          params: {
            path: { entityType, entityId },
          },
        }
      );
      if (error) throw new Error("Failed to fetch files");
      return data as FileDto[];
    },
    enabled: !!entityId && !!user?.tenantId,
  });
}

/**
 * Hook to upload a file
 */
export function useUploadFile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      entityType,
      entityId,
      isPublic = false,
    }: {
      file: File;
      entityType: EntityType;
      entityId: string;
      isPublic?: boolean;
    }): Promise<FileUploadResponse> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId);
      formData.append("isPublic", String(isPublic));

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/v1/files/upload`, {
        method: "POST",
        headers: {
          ...(user?.tenantId && { "x-tenant-id": user.tenantId }),
          ...(user?.accessToken && {
            Authorization: `Bearer ${user.accessToken}`,
          }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to upload file");
      }

      return response.json();
    },
    onSuccess: (_, { entityType, entityId }) => {
      queryClient.invalidateQueries({
        queryKey: ["files", entityType, entityId],
      });
    },
  });
}

/**
 * Hook to get a signed download URL for a file
 */
export function useSignedUrl(fileId: string, expiresIn = 300, enabled = true) {
  const client = useApiClient();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["files", fileId, "signed-url", expiresIn],
    queryFn: async (): Promise<SignedUrlResponse> => {
      const { data, error } = await client.GET(
        "/api/v1/files/{id}/signed-url",
        {
          params: {
            path: { id: fileId },
            query: { expiresIn },
          },
        }
      );
      if (error) throw new Error("Failed to get download URL");
      return data as SignedUrlResponse;
    },
    enabled: !!fileId && !!user?.tenantId && enabled,
    staleTime: 1000 * 60 * 4, // 4 minutes (URLs typically expire in 5 minutes)
  });
}

/**
 * Hook to delete a file
 */
export function useDeleteFile() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileId,
      entityType: _entityType,
      entityId: _entityId,
    }: {
      fileId: string;
      entityType: EntityType;
      entityId: string;
    }): Promise<void> => {
      const { error } = await client.DELETE("/api/v1/files/{id}", {
        params: {
          path: { id: fileId },
        },
      });
      if (error) throw new Error("Failed to delete file");
    },
    onSuccess: (_, { entityType, entityId }) => {
      queryClient.invalidateQueries({
        queryKey: ["files", entityType, entityId],
      });
    },
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

/**
 * Get file type category from MIME type or filename
 */
export function getFileCategory(
  mimeType: string,
  filename: string
): "image" | "pdf" | "document" | "spreadsheet" | "archive" | "other" {
  const ext = getFileExtension(filename);

  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    ["doc", "docx", "txt", "rtf"].includes(ext)
  )
    return "document";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(ext)
  )
    return "spreadsheet";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("archive") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  )
    return "archive";

  return "other";
}

/**
 * Validate file for upload
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[]; // MIME types or extensions
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options; // Default 10MB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(maxSize)} limit`,
    };
  }

  if (allowedTypes && allowedTypes.length > 0) {
    const ext = getFileExtension(file.name);
    const isAllowed = allowedTypes.some(
      (type) =>
        file.type === type ||
        file.type.startsWith(type.replace("/*", "/")) ||
        type === `.${ext}`
    );
    if (!isAllowed) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(", ")}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Download a file using a signed URL
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to download file");
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(blobUrl);
}
