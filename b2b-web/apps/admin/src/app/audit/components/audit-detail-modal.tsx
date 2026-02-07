"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  cn,
} from "@b2b/ui";
import { Copy, Check } from "lucide-react";
import * as React from "react";

import {
  type AuditLogDto,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
} from "../hooks/use-audit";

interface AuditDetailModalProps {
  log: AuditLogDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DiffResult = {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  type: "added" | "removed" | "changed" | "unchanged";
};

function computeDiff(
  oldData: Record<string, unknown> | undefined,
  newData: Record<string, unknown> | undefined
): DiffResult[] {
  const results: DiffResult[] = [];
  const allKeys = Array.from(
    new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ])
  );

  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    if (oldValue === undefined && newValue !== undefined) {
      results.push({ key, oldValue, newValue, type: "added" });
    } else if (oldValue !== undefined && newValue === undefined) {
      results.push({ key, oldValue, newValue, type: "removed" });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      results.push({ key, oldValue, newValue, type: "changed" });
    } else {
      results.push({ key, oldValue, newValue, type: "unchanged" });
    }
  }

  return results.sort((a, b) => {
    const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
    return order[a.type] - order[b.type];
  });
}

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function DiffView({
  previousData,
  newData,
}: {
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  const diff = computeDiff(previousData, newData);
  const hasChanges = diff.some((d) => d.type !== "unchanged");

  if (!hasChanges) {
    return (
      <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        No data changes recorded
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="grid grid-cols-3 gap-px bg-muted text-xs font-medium">
        <div className="bg-background px-3 py-2">Field</div>
        <div className="bg-background px-3 py-2">Previous Value</div>
        <div className="bg-background px-3 py-2">New Value</div>
      </div>
      <div className="divide-y">
        {diff
          .filter((d) => d.type !== "unchanged")
          .map((item) => (
            <div
              key={item.key}
              className={cn(
                "grid grid-cols-3 gap-px text-sm",
                item.type === "added" && "bg-green-50 dark:bg-green-950/20",
                item.type === "removed" && "bg-red-50 dark:bg-red-950/20",
                item.type === "changed" && "bg-amber-50 dark:bg-amber-950/20"
              )}
            >
              <div className="px-3 py-2 font-medium">{item.key}</div>
              <div className="px-3 py-2">
                <pre className="whitespace-pre-wrap break-all text-xs text-muted-foreground">
                  {item.type === "added" ? (
                    <span className="italic">—</span>
                  ) : (
                    formatValue(item.oldValue)
                  )}
                </pre>
              </div>
              <div className="px-3 py-2">
                <pre className="whitespace-pre-wrap break-all text-xs">
                  {item.type === "removed" ? (
                    <span className="italic text-muted-foreground">—</span>
                  ) : (
                    formatValue(item.newValue)
                  )}
                </pre>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export function AuditDetailModal({
  log,
  open,
  onOpenChange,
}: AuditDetailModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionLabel = (action: string) => {
    return AUDIT_ACTIONS.find((a) => a.value === action)?.label || action;
  };

  const getEntityTypeLabel = (entityType: string) => {
    return ENTITY_TYPES.find((t) => t.value === entityType)?.label || entityType;
  };

  const handleCopyJson = async () => {
    const jsonData = JSON.stringify(log, null, 2);
    await navigator.clipboard.writeText(jsonData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Audit Log Details</ModalTitle>
          <ModalDescription>
            {getActionLabel(log.action)} on {getEntityTypeLabel(log.entityType)}
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Timestamp</span>
              <p className="font-medium">{formatDate(log.createdAt)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Log ID</span>
              <code className="block rounded bg-muted px-2 py-1 text-xs">
                {log.id}
              </code>
            </div>
          </div>

          {/* User Info */}
          <div className="rounded-md border p-4">
            <h4 className="mb-2 text-sm font-medium">User</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name</span>
                <p className="font-medium">{log.userName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{log.userEmail}</p>
              </div>
              <div>
                <span className="text-muted-foreground">User ID</span>
                <code className="block rounded bg-muted px-2 py-1 text-xs">
                  {log.userId}
                </code>
              </div>
              {log.ipAddress && (
                <div>
                  <span className="text-muted-foreground">IP Address</span>
                  <p className="font-medium">{log.ipAddress}</p>
                </div>
              )}
            </div>
          </div>

          {/* Entity Info */}
          <div className="rounded-md border p-4">
            <h4 className="mb-2 text-sm font-medium">Entity</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium">
                  {getEntityTypeLabel(log.entityType)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Action</span>
                <p className="font-medium">{getActionLabel(log.action)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Entity ID</span>
                <code className="block rounded bg-muted px-2 py-1 text-xs">
                  {log.entityId}
                </code>
              </div>
              {log.entityName && (
                <div>
                  <span className="text-muted-foreground">Entity Name</span>
                  <p className="font-medium">{log.entityName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Data Changes (JSON Diff) */}
          {(log.previousData || log.newData) && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Data Changes</h4>
              <DiffView previousData={log.previousData} newData={log.newData} />
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Metadata</h4>
              <pre className="rounded-md bg-muted p-3 text-xs overflow-auto">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* User Agent */}
          {log.userAgent && (
            <div>
              <h4 className="mb-2 text-sm font-medium">User Agent</h4>
              <p className="text-sm text-muted-foreground break-all">
                {log.userAgent}
              </p>
            </div>
          )}

          {/* Copy JSON Button */}
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={handleCopyJson}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy as JSON
                </>
              )}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
