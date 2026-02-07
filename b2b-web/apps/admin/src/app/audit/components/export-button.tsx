"use client";

import { Button } from "@b2b/ui";
import { Download, RefreshCw } from "lucide-react";
import * as React from "react";

import {
  type AuditLogDto,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
} from "../hooks/use-audit";

interface ExportButtonProps {
  logs: AuditLogDto[];
  isLoading?: boolean;
}

export function ExportButton({ logs, isLoading }: ExportButtonProps) {
  const [exporting, setExporting] = React.useState(false);

  const getActionLabel = (action: string) => {
    return AUDIT_ACTIONS.find((a) => a.value === action)?.label || action;
  };

  const getEntityTypeLabel = (entityType: string) => {
    return ENTITY_TYPES.find((t) => t.value === entityType)?.label || entityType;
  };

  const escapeCsvField = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      // CSV headers
      const headers = [
        "Timestamp",
        "User Name",
        "User Email",
        "User ID",
        "Action",
        "Entity Type",
        "Entity ID",
        "Entity Name",
        "IP Address",
        "Previous Data",
        "New Data",
      ];

      // CSV rows
      const rows = logs.map((log) => [
        new Date(log.createdAt).toISOString(),
        escapeCsvField(log.userName),
        escapeCsvField(log.userEmail),
        log.userId,
        getActionLabel(log.action),
        getEntityTypeLabel(log.entityType),
        log.entityId,
        escapeCsvField(log.entityName || ""),
        log.ipAddress || "",
        escapeCsvField(
          log.previousData ? JSON.stringify(log.previousData) : ""
        ),
        escapeCsvField(log.newData ? JSON.stringify(log.newData) : ""),
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `audit-logs-${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={exporting || isLoading || logs.length === 0}
    >
      {exporting ? (
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export CSV
    </Button>
  );
}
