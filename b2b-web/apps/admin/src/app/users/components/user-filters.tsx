"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { X } from "lucide-react";

import { USER_ROLES, type UserRole } from "../hooks/use-users";

interface UserFiltersProps {
  roleFilter?: UserRole;
  statusFilter?: boolean;
  onRoleChange: (role: UserRole | undefined) => void;
  onStatusChange: (status: boolean | undefined) => void;
}

export function UserFilters({
  roleFilter,
  statusFilter,
  onRoleChange,
  onStatusChange,
}: UserFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Select
          value={roleFilter || "all"}
          onValueChange={(value) =>
            onRoleChange(value === "all" ? undefined : (value as UserRole))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {USER_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {roleFilter && (
          <button
            type="button"
            onClick={() => onRoleChange(undefined)}
            className="absolute -right-2 -top-2 rounded-full bg-muted p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="relative">
        <Select
          value={statusFilter === undefined ? "all" : statusFilter ? "active" : "inactive"}
          onValueChange={(value) =>
            onStatusChange(
              value === "all" ? undefined : value === "active"
            )
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== undefined && (
          <button
            type="button"
            onClick={() => onStatusChange(undefined)}
            className="absolute -right-2 -top-2 rounded-full bg-muted p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
