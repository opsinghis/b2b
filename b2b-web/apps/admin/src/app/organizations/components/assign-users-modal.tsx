"use client";

import type { UserResponseDto, OrganizationResponseDto } from "@b2b/api-client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
} from "@b2b/ui";
import { Search, UserPlus, UserMinus, Check } from "lucide-react";
import * as React from "react";

interface AssignUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: OrganizationResponseDto;
  users: UserResponseDto[];
  onAssignUser: (userId: string, organizationId: string | null) => void;
  isLoading?: boolean;
}

export function AssignUsersModal({
  open,
  onOpenChange,
  organization,
  users,
  onAssignUser,
  isLoading,
}: AssignUsersModalProps) {
  const [search, setSearch] = React.useState("");
  const [pendingChanges, setPendingChanges] = React.useState<
    Map<string, "assign" | "unassign">
  >(new Map());

  const filteredUsers = React.useMemo(() => {
    if (!search.trim()) return users;
    const lowerSearch = search.toLowerCase();
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(lowerSearch) ||
        user.firstName?.toLowerCase().includes(lowerSearch) ||
        user.lastName?.toLowerCase().includes(lowerSearch)
    );
  }, [users, search]);

  const assignedUsers = filteredUsers.filter(
    (user) => user.organizationId === organization.id
  );
  const unassignedUsers = filteredUsers.filter(
    (user) => user.organizationId !== organization.id
  );

  const handleToggleUser = (user: UserResponseDto) => {
    const isCurrentlyAssigned = user.organizationId === organization.id;
    const pendingAction = pendingChanges.get(user.id);

    // Toggle pending state
    const newPendingChanges = new Map(pendingChanges);
    if (pendingAction) {
      // If there's a pending action, remove it (cancel)
      newPendingChanges.delete(user.id);
    } else {
      // Add a new pending action
      newPendingChanges.set(
        user.id,
        isCurrentlyAssigned ? "unassign" : "assign"
      );
    }
    setPendingChanges(newPendingChanges);
  };

  const handleApplyChanges = async () => {
    Array.from(pendingChanges.entries()).forEach(([userId, action]) => {
      const newOrgId = action === "assign" ? organization.id : null;
      onAssignUser(userId, newOrgId);
    });
    setPendingChanges(new Map());
    onOpenChange(false);
  };

  const handleClose = () => {
    setPendingChanges(new Map());
    setSearch("");
    onOpenChange(false);
  };

  const getUserStatus = (user: UserResponseDto) => {
    const isCurrentlyAssigned = user.organizationId === organization.id;
    const pendingAction = pendingChanges.get(user.id);

    if (pendingAction === "assign") return "pending-assign";
    if (pendingAction === "unassign") return "pending-unassign";
    if (isCurrentlyAssigned) return "assigned";
    return "unassigned";
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <ModalHeader>
          <ModalTitle>Assign Users to {organization.name}</ModalTitle>
          <ModalDescription>
            Select users to assign or remove from this organization.
          </ModalDescription>
        </ModalHeader>

        {/* Search */}
        <div className="relative px-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* User Lists */}
        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] mt-4 space-y-4">
          {/* Assigned Users */}
          {assignedUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                Currently Assigned ({assignedUsers.length})
              </h4>
              <div className="space-y-1">
                {assignedUsers.map((user) => {
                  const status = getUserStatus(user);
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                        status === "pending-unassign"
                          ? "bg-destructive/10 border border-destructive/20"
                          : "bg-green-50 dark:bg-green-900/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {user.firstName?.[0]}
                          {user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={status === "pending-unassign" ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => handleToggleUser(user)}
                        disabled={isLoading}
                      >
                        {status === "pending-unassign" ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Undo
                          </>
                        ) : (
                          <>
                            <UserMinus className="mr-1 h-3 w-3" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unassigned Users */}
          {unassignedUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                Available Users ({unassignedUsers.length})
              </h4>
              <div className="space-y-1">
                {unassignedUsers.map((user) => {
                  const status = getUserStatus(user);
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                        status === "pending-assign"
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                          : "hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                          {user.firstName?.[0]}
                          {user.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                            {user.organizationId && (
                              <span className="ml-1 text-orange-500">
                                (in another org)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={status === "pending-assign" ? "outline" : "ghost"}
                        size="sm"
                        onClick={() => handleToggleUser(user)}
                        disabled={isLoading}
                      >
                        {status === "pending-assign" ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Undo
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-1 h-3 w-3" />
                            Assign
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found</p>
              {search && (
                <p className="text-sm">Try adjusting your search</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-2 pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            {pendingChanges.size > 0 && (
              <span>{pendingChanges.size} pending change(s)</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyChanges}
              disabled={isLoading || pendingChanges.size === 0}
            >
              {isLoading ? "Applying..." : "Apply Changes"}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
