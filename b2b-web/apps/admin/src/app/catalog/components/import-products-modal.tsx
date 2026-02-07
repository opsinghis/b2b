"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
} from "@b2b/ui";
import { Upload, FileJson, CheckCircle2, AlertCircle, X } from "lucide-react";
import * as React from "react";

import type { ImportResult } from "../hooks/use-products";

interface ImportProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (file: File) => Promise<ImportResult>;
  isLoading?: boolean;
}

export function ImportProductsModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ImportProductsModalProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    setResult(null);

    if (!file.name.endsWith(".json")) {
      setError("Please select a JSON file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    try {
      setError(null);
      const importResult = await onSubmit(selectedFile);
      setResult(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <ModalHeader>
          <ModalTitle>Import Products</ModalTitle>
          <ModalDescription>
            Upload a JSON file containing products to import into the master
            catalog.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4 py-4">
          {/* File Drop Zone */}
          {!result && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                Drop your JSON file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum file size: 10MB
              </p>
            </div>
          )}

          {/* Selected File */}
          {selectedFile && !result && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <FileJson className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Import Error
                </p>
                <p className="text-sm text-destructive/80">{error}</p>
              </div>
            </div>
          )}

          {/* Import Result */}
          {result && (
            <div className="space-y-4">
              <div
                className={`flex items-start gap-2 rounded-lg border p-3 ${
                  result.success
                    ? "border-green-500/50 bg-green-50 dark:bg-green-950"
                    : "border-orange-500/50 bg-orange-50 dark:bg-orange-950"
                }`}
              >
                <CheckCircle2
                  className={`h-5 w-5 shrink-0 ${
                    result.success ? "text-green-600" : "text-orange-600"
                  }`}
                />
                <div>
                  <p
                    className={`font-medium ${
                      result.success ? "text-green-800" : "text-orange-800"
                    }`}
                  >
                    {result.success
                      ? "Import Completed"
                      : "Import Completed with Issues"}
                  </p>
                  {result.message && (
                    <p className="text-sm text-muted-foreground">
                      {result.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold text-green-600">
                    {result.statistics.imported}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Products Imported
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-2xl font-bold text-muted-foreground">
                    {result.statistics.total}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total in File
                  </p>
                </div>
                {result.statistics.skipped > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold text-orange-600">
                      {result.statistics.skipped}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Skipped (Duplicates)
                    </p>
                  </div>
                )}
                {result.statistics.failed > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold text-destructive">
                      {result.statistics.failed}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Failed Validation
                    </p>
                  </div>
                )}
              </div>

              {/* Errors List */}
              {result.statistics.errors &&
                result.statistics.errors.length > 0 && (
                  <div className="rounded-lg border p-3 max-h-32 overflow-y-auto">
                    <p className="text-sm font-medium mb-2">Errors:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {result.statistics.errors.map((err, i) => (
                        <li key={i} className="truncate">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              <p className="text-xs text-muted-foreground text-center">
                Completed in {result.statistics.durationMs}ms
              </p>
            </div>
          )}

          {/* JSON Format Help */}
          {!result && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm font-medium mb-2">Expected JSON format:</p>
              <pre className="text-xs overflow-x-auto">
                {`[
  {
    "sku": "PROD-001",
    "name": "Product Name",
    "listPrice": 99.99,
    "category": "Category",
    "status": "ACTIVE"
  }
]`}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? "Importing..." : "Import Products"}
            </Button>
          )}
          {result && (
            <Button
              onClick={() => {
                resetState();
              }}
            >
              Import More
            </Button>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
