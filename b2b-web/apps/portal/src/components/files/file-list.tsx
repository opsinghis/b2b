"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  cn,
} from "@b2b/ui";
import {
  Download,
  Trash2,
  Loader2,
  RefreshCw,
  FileX,
} from "lucide-react";
import { useState } from "react";

import { DeleteFileModal } from "./delete-file-modal";
import { FileIcon, FileExtensionBadge } from "./file-icon";

import {
  useEntityFiles,
  useDeleteFile,
  formatFileSize,
  downloadFile,
  type FileDto,
  type EntityType,
} from "@/hooks/use-files";

interface FileListProps {
  entityType: EntityType;
  entityId: string;
  title?: string;
  variant?: "card" | "inline";
  className?: string;
}

export function FileList({
  entityType,
  entityId,
  title = "Attachments",
  variant = "card",
  className,
}: FileListProps) {
  const {
    data: files,
    isLoading,
    error,
    refetch,
  } = useEntityFiles(entityType, entityId);

  // Inline variant - no card wrapper
  if (variant === "inline") {
    if (isLoading) {
      return (
        <div className={cn("space-y-3", className)}>
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border animate-pulse"
            >
              <div className="h-10 w-10 bg-muted rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className={cn("flex flex-col items-center gap-3 py-6 text-center", className)}>
          <FileX className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Failed to load files</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      );
    }

    if (!files || files.length === 0) {
      return (
        <div className={cn("flex flex-col items-center gap-2 py-6 text-center", className)}>
          <FileX className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No files attached yet</p>
        </div>
      );
    }

    return (
      <div className={cn("space-y-2", className)}>
        {files.map((file) => (
          <FileListItem
            key={file.id}
            file={file}
            entityType={entityType}
            entityId={entityId}
          />
        ))}
      </div>
    );
  }

  // Card variant (default)
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border animate-pulse"
              >
                <div className="h-10 w-10 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <FileX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Failed to load files
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        {files && files.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {!files || files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No files attached yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <FileListItem
                key={file.id}
                file={file}
                entityType={entityType}
                entityId={entityId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FileListItemProps {
  file: FileDto;
  entityType: EntityType;
  entityId: string;
}

function FileListItem({ file, entityType, entityId }: FileListItemProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const { mutateAsync: deleteFile, isPending: isDeleting } = useDeleteFile();

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      // Use the downloadUrl if available, otherwise fetch signed URL
      const url = file.downloadUrl;
      if (!url) {
        // Fallback: construct direct download URL
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        const directUrl = `${baseUrl}/api/v1/files/${file.id}/download`;
        await downloadFile(directUrl, file.originalName);
      } else {
        await downloadFile(url, file.originalName);
      }
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Download failed"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    await deleteFile({
      fileId: file.id,
      entityType,
      entityId,
    });
    setShowDeleteModal(false);
  };

  const formattedDate = new Date(file.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50",
          downloadError && "border-destructive/30"
        )}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* File Icon */}
        <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
          <FileIcon
            filename={file.originalName}
            mimeType={file.mimeType}
            size="lg"
          />
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{file.originalName}</p>
            <FileExtensionBadge filename={file.originalName} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
          {downloadError && (
            <p className="text-xs text-destructive mt-1">{downloadError}</p>
          )}
        </div>

        {/* Actions */}
        <div
          className={cn(
            "flex items-center gap-1 transition-opacity",
            showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-8 w-8 p-0"
            title="Download"
          >
            {isDownloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            disabled={isDeleting}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteFileModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        fileName={file.originalName}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}

// Compact version for inline display
export function FileListCompact({
  entityType,
  entityId,
  maxDisplay = 3,
  className,
}: {
  entityType: EntityType;
  entityId: string;
  maxDisplay?: number;
  className?: string;
}) {
  const { data: files, isLoading } = useEntityFiles(entityType, entityId);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading files...</span>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        No attachments
      </span>
    );
  }

  const displayFiles = files.slice(0, maxDisplay);
  const remainingCount = files.length - maxDisplay;

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {displayFiles.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-sm"
          title={file.originalName}
        >
          <FileIcon
            filename={file.originalName}
            mimeType={file.mimeType}
            size="sm"
          />
          <span className="max-w-[100px] truncate">{file.originalName}</span>
        </div>
      ))}
      {remainingCount > 0 && (
        <span className="text-sm text-muted-foreground">
          +{remainingCount} more
        </span>
      )}
    </div>
  );
}
