"use client";

import type { TenantResponseDto } from "@b2b/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@b2b/ui";
import { Edit, Power, PowerOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface TenantTableProps {
  tenants: TenantResponseDto[];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
}

export function TenantTable({
  tenants,
  onToggleStatus,
  onDelete,
  isUpdating,
}: TenantTableProps) {
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
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No tenants found.
              </TableCell>
            </TableRow>
          ) : (
            tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell className="font-medium">{tenant.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {tenant.slug}
                  </code>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      tenant.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {tenant.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>{formatDate(tenant.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/tenants/${tenant.id}`)}
                      title="Edit tenant"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleStatus(tenant.id, !tenant.isActive)}
                      disabled={isUpdating}
                      title={tenant.isActive ? "Deactivate" : "Activate"}
                    >
                      {tenant.isActive ? (
                        <PowerOff className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Power className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(tenant.id)}
                      disabled={isUpdating}
                      title="Delete tenant"
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
