"use client";

import { Button, cn } from "@b2b/ui";
import { Upload, X, AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import {
  useUploadFile,
  validateFile,
  formatFileSize,
  type EntityType,
} from "@/hooks/use-files";

interface FileUploadProps {
  entityType: EntityType;
  entityId: string;
  onUploadComplete?: () => void;
  maxSize?: number;
  allowedTypes?: string[];
  multiple?: boolean;
  className?: string;
}

interface QueuedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export function FileUpload({
  entityType,
  entityId,
  onUploadComplete,
  maxSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes,
  multiple = true,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: uploadFile } = useUploadFile();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      // Validate all files first
      const validatedFiles: QueuedFile[] = [];
      for (const file of fileArray) {
        const validation = validateFile(file, { maxSize, allowedTypes });
        validatedFiles.push({
          file,
          status: validation.valid ? "pending" : "error",
          error: validation.error,
        });
      }

      setQueuedFiles(validatedFiles);

      // Upload valid files
      const validFiles = validatedFiles.filter((f) => f.status === "pending");

      for (let i = 0; i < validFiles.length; i++) {
        const queuedFile = validFiles[i];

        setQueuedFiles((prev) =>
          prev.map((f) =>
            f.file === queuedFile.file ? { ...f, status: "uploading" } : f
          )
        );

        try {
          await uploadFile({
            file: queuedFile.file,
            entityType,
            entityId,
          });

          setQueuedFiles((prev) =>
            prev.map((f) =>
              f.file === queuedFile.file ? { ...f, status: "success" } : f
            )
          );
        } catch (err) {
          setQueuedFiles((prev) =>
            prev.map((f) =>
              f.file === queuedFile.file
                ? {
                    ...f,
                    status: "error",
                    error:
                      err instanceof Error ? err.message : "Upload failed",
                  }
                : f
            )
          );
        }
      }

      // Clear successful uploads after a delay
      setTimeout(() => {
        setQueuedFiles((prev) => prev.filter((f) => f.status !== "success"));
        onUploadComplete?.();
      }, 2000);
    },
    [entityType, entityId, maxSize, allowedTypes, uploadFile, onUploadComplete]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        if (!multiple && files.length > 1) {
          setError("Only one file can be uploaded at a time");
          return;
        }
        handleFiles(files);
      }
    },
    [handleFiles, multiple]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input value to allow re-selecting the same file
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeQueuedFile = useCallback((file: File) => {
    setQueuedFiles((prev) => prev.filter((f) => f.file !== file));
  }, []);

  const isUploading = queuedFiles.some((f) => f.status === "uploading");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isUploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          onChange={handleFileInput}
          accept={allowedTypes?.join(",")}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "p-3 rounded-full",
              isDragging ? "bg-primary/10" : "bg-muted"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6",
                isDragging ? "text-primary" : "text-muted-foreground"
              )}
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragging ? (
                "Drop files here"
              ) : (
                <>
                  Drag and drop files here, or{" "}
                  <button
                    type="button"
                    onClick={handleBrowseClick}
                    className="text-primary hover:underline focus:outline-none"
                    disabled={isUploading}
                  >
                    browse
                  </button>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Max file size: {formatFileSize(maxSize)}
              {allowedTypes && allowedTypes.length > 0 && (
                <> | Allowed: {allowedTypes.join(", ")}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Upload Queue */}
      {queuedFiles.length > 0 && (
        <div className="space-y-2">
          {queuedFiles.map((queuedFile, index) => (
            <div
              key={`${queuedFile.file.name}-${index}`}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                queuedFile.status === "error" && "border-destructive/50 bg-destructive/5",
                queuedFile.status === "success" && "border-green-500/50 bg-green-500/5",
                queuedFile.status === "uploading" && "border-primary/50 bg-primary/5",
                queuedFile.status === "pending" && "border-muted"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {queuedFile.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(queuedFile.file.size)}
                  {queuedFile.error && (
                    <span className="text-destructive ml-2">
                      {queuedFile.error}
                    </span>
                  )}
                  {queuedFile.status === "success" && (
                    <span className="text-green-600 ml-2">Uploaded</span>
                  )}
                </p>
              </div>

              {queuedFile.status === "uploading" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}

              {(queuedFile.status === "pending" ||
                queuedFile.status === "error") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeQueuedFile(queuedFile.file)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
