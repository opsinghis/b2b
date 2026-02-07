"use client";

import type { UserResponseDto } from "@b2b/api-client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@b2b/ui";
import { Edit, Power, PowerOff, Trash2, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { USER_ROLES, type UserRole } from "../hooks/use-users";

interface UserTableProps {
  users: UserResponseDto[];
  onToggleStatus: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  onResetPassword: (id: string) => void;
  isUpdating?: boolean;
}

export function UserTable({
  users,
  onToggleStatus,
  onDelete,
  onResetPassword,
  isUpdating,
}: UserTableProps) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleLabel = (role: string) => {
    const roleConfig = USER_ROLES.find((r) => r.value === role);
    return roleConfig?.label || role;
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "ADMIN":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "MANAGER":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "USER":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "VIEWER":
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {user.email}
                  </code>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role as UserRole)}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/users/${user.id}`)}
                      title="Edit user"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onResetPassword(user.id)}
                      disabled={isUpdating}
                      title="Reset password"
                    >
                      <KeyRound className="h-4 w-4 text-amber-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onToggleStatus(user.id, !user.isActive)}
                      disabled={isUpdating}
                      title={user.isActive ? "Deactivate" : "Activate"}
                    >
                      {user.isActive ? (
                        <PowerOff className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Power className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(user.id)}
                      disabled={isUpdating}
                      title="Delete user"
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
