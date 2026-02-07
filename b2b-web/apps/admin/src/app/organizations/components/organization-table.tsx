"use client";

import type { OrganizationResponseDto } from "@b2b/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@b2b/ui";
import { Edit, Power, PowerOff, Trash2, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";

interface OrganizationTableProps {
  organizations: OrganizationResponseDto[];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
}

export function OrganizationTable({
  organizations,
  onToggleStatus,
  onDelete,
  isUpdating,
}: OrganizationTableProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No organizations found.
              </TableCell>
            </TableRow>
          ) : (
            organizations.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {org.code}
                  </code>
                </TableCell>
                <TableCell>
                  {org.parentId ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <GitBranch className="h-3 w-3" />
                      <span className="text-sm">Has parent</span>
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Root</span>
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      org.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {org.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>{formatDate(org.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/organizations/${org.id}`)}
                      title="Edit organization"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleStatus(org.id, !org.isActive)}
                      disabled={isUpdating}
                      title={org.isActive ? "Deactivate" : "Activate"}
                    >
                      {org.isActive ? (
                        <PowerOff className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Power className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(org.id)}
                      disabled={isUpdating}
                      title="Delete organization"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
