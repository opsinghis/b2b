"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@b2b/ui";
import { History, ChevronDown, ChevronUp, Eye } from "lucide-react";
import * as React from "react";

import {
  type ContractVersionDto,
  formatDateTime,
  formatCurrency,
  getStatusLabel,
  getStatusBadgeColor,
} from "../hooks";

interface VersionHistoryProps {
  versions: ContractVersionDto[];
  isLoading?: boolean;
}

interface DiffViewProps {
  changes: Record<string, unknown>;
}

function DiffView({ changes }: DiffViewProps) {
  if (!changes || Object.keys(changes).length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No changes recorded</p>
    );
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-2">
      {Object.entries(changes).map(([key, change]) => {
        const changeObj = change as { from?: unknown; to?: unknown } | unknown;

        // Check if it's a from/to change object
        if (
          changeObj &&
          typeof changeObj === "object" &&
          ("from" in changeObj || "to" in changeObj)
        ) {
          const typedChange = changeObj as { from?: unknown; to?: unknown };
          return (
            <div
              key={key}
              className="rounded-lg border bg-muted/30 p-3 text-sm"
            >
              <div className="font-medium capitalize text-foreground mb-2">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">From:</span>
                  <div className="mt-1 rounded bg-red-50 dark:bg-red-900/20 px-2 py-1 text-red-700 dark:text-red-300 font-mono text-xs break-all">
                    {formatValue(typedChange.from)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">To:</span>
                  <div className="mt-1 rounded bg-green-50 dark:bg-green-900/20 px-2 py-1 text-green-700 dark:text-green-300 font-mono text-xs break-all">
                    {formatValue(typedChange.to)}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Just display the value if it's not a from/to structure
        return (
          <div key={key} className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-medium capitalize text-foreground">
              {key.replace(/([A-Z])/g, " $1").trim()}
            </div>
            <div className="mt-1 font-mono text-xs text-muted-foreground break-all">
              {formatValue(changeObj)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface VersionDetailModalProps {
  version: ContractVersionDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function VersionDetailModal({
  version,
  open,
  onOpenChange,
}: VersionDetailModalProps) {
  if (!version) return null;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Version {version.version} Details</ModalTitle>
          <ModalDescription>
            Changes made in this version
          </ModalDescription>
        </ModalHeader>
        <div className="space-y-4 p-4 pt-0">
          {/* Version Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Title:</span>
              <p className="font-medium">{version.title}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(version.status)}`}
                >
                  {getStatusLabel(version.status)}
                </span>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Value:</span>
              <p className="font-medium">
                {formatCurrency(version.totalValue, version.currency)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <p className="font-medium">{formatDateTime(version.createdAt)}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Created By:</span>
              <p className="font-medium">{version.createdByName}</p>
            </div>
            {version.comment && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Comment:</span>
                <p className="font-medium">{version.comment}</p>
              </div>
            )}
          </div>

          {/* Changes Diff */}
          {version.changes && Object.keys(version.changes).length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Changes from Previous Version</h4>
              <DiffView changes={version.changes} />
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}

export function VersionHistory({ versions, isLoading }: VersionHistoryProps) {
  const [expanded, setExpanded] = React.useState(true);
  const [selectedVersion, setSelectedVersion] =
    React.useState<ContractVersionDto | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No version history available.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort versions by version number descending (most recent first)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <>
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
              <span className="text-sm font-normal text-muted-foreground">
                ({versions.length} version{versions.length !== 1 ? "s" : ""})
              </span>
            </div>
            <Button variant="ghost" size="icon">
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        {expanded && (
          <CardContent>
            <div className="space-y-3">
              {sortedVersions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      v{version.version}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{version.title}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeColor(version.status)}`}
                        >
                          {getStatusLabel(version.status)}
                        </span>
                        {index === 0 && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{formatDateTime(version.createdAt)}</span>
                        <span>by {version.createdByName}</span>
                        {version.changes && Object.keys(version.changes).length > 0 && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {Object.keys(version.changes).length} change
                            {Object.keys(version.changes).length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedVersion(version)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <VersionDetailModal
        version={selectedVersion}
        open={!!selectedVersion}
        onOpenChange={(open) => {
          if (!open) setSelectedVersion(null);
        }}
      />
    </>
  );
}
