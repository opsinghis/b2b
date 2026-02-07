"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@b2b/ui";
import { Eye } from "lucide-react";

import {
  type AuditLogDto,
  type AuditAction,
  type EntityType,
  AUDIT_ACTIONS,
  ENTITY_TYPES,
} from "../hooks/use-audit";

interface AuditTableProps {
  logs: AuditLogDto[];
  onViewDetails: (log: AuditLogDto) => void;
}

export function AuditTable({ logs, onViewDetails }: AuditTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionLabel = (action: string) => {
    const actionConfig = AUDIT_ACTIONS.find((a) => a.value === action);
    return actionConfig?.label || action;
  };

  const getEntityTypeLabel = (entityType: string) => {
    const typeConfig = ENTITY_TYPES.find((t) => t.value === entityType);
    return typeConfig?.label || entityType;
  };

  const getActionBadgeColor = (action: AuditAction) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "UPDATE":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "DELETE":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "RESTORE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "LOGIN":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "LOGOUT":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "STATUS_CHANGE":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getEntityTypeBadgeColor = (entityType: EntityType) => {
    switch (entityType) {
      case "USER":
        return "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200";
      case "TENANT":
        return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200";
      case "ORGANIZATION":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "PRODUCT":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "CONTRACT":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200";
      case "QUOTE":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      case "ORDER":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity Type</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead className="text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No audit logs found.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{log.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {log.userEmail}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionBadgeColor(log.action)}`}
                  >
                    {getActionLabel(log.action)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getEntityTypeBadgeColor(log.entityType)}`}
                  >
                    {getEntityTypeLabel(log.entityType)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    {log.entityName && (
                      <span className="font-medium">{log.entityName}</span>
                    )}
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {log.entityId.slice(0, 8)}...
                    </code>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewDetails(log)}
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
