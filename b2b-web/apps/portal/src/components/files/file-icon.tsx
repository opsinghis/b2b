"use client";

import { cn } from "@b2b/ui";
import {
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  FileVideo,
  FileAudio,
} from "lucide-react";

import { getFileCategory, getFileExtension } from "@/hooks/use-files";

interface FileIconProps {
  filename: string;
  mimeType: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-8 w-8",
};

const iconColors: Record<string, string> = {
  image: "text-purple-500",
  pdf: "text-red-500",
  document: "text-blue-500",
  spreadsheet: "text-green-500",
  archive: "text-amber-500",
  video: "text-pink-500",
  audio: "text-cyan-500",
  code: "text-slate-500",
  other: "text-gray-500",
};

export function FileIcon({
  filename,
  mimeType,
  className,
  size = "md",
}: FileIconProps) {
  const category = getFileCategory(mimeType, filename);
  const ext = getFileExtension(filename);

  // Special handling for code files
  const isCodeFile = ["js", "ts", "jsx", "tsx", "json", "html", "css", "xml", "yml", "yaml", "md"].includes(ext);

  // Special handling for video/audio
  const isVideo = mimeType.startsWith("video/") || ["mp4", "avi", "mov", "mkv", "webm"].includes(ext);
  const isAudio = mimeType.startsWith("audio/") || ["mp3", "wav", "ogg", "flac", "aac"].includes(ext);

  const iconClass = cn(sizeClasses[size], className);

  if (isVideo) {
    return <FileVideo className={cn(iconClass, iconColors.video)} />;
  }

  if (isAudio) {
    return <FileAudio className={cn(iconClass, iconColors.audio)} />;
  }

  if (isCodeFile) {
    return <FileCode className={cn(iconClass, iconColors.code)} />;
  }

  switch (category) {
    case "image":
      return <FileImage className={cn(iconClass, iconColors.image)} />;
    case "pdf":
      return <FileText className={cn(iconClass, iconColors.pdf)} />;
    case "document":
      return <FileText className={cn(iconClass, iconColors.document)} />;
    case "spreadsheet":
      return <FileSpreadsheet className={cn(iconClass, iconColors.spreadsheet)} />;
    case "archive":
      return <FileArchive className={cn(iconClass, iconColors.archive)} />;
    default:
      return <File className={cn(iconClass, iconColors.other)} />;
  }
}

// Badge showing file extension
export function FileExtensionBadge({
  filename,
  className,
}: {
  filename: string;
  className?: string;
}) {
  const ext = getFileExtension(filename);
  if (!ext) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase rounded bg-muted text-muted-foreground",
        className
      )}
    >
      {ext}
    </span>
  );
}
