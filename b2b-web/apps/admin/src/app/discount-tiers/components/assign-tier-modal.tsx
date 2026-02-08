"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
  Checkbox,
} from "@b2b/ui";
import { Search, UserPlus, Building2, Users, Check, X } from "lucide-react";
import * as React from "react";

import type { DiscountTier, TierAssignment } from "../hooks/use-discount-tiers";
import { LEVEL_TO_TIER, TIER_LEVELS } from "../hooks/use-discount-tiers";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Organization {
  id: string;
  name: string;
}

interface AssignTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: DiscountTier;
  assignments: TierAssignment[];
  users: User[];
  organizations: Organization[];
  onAssign: (userIds: string[], organizationIds: string[]) => void;
  onUnassign: (assignmentId: string) => void;
  isLoading?: boolean;
}

type TabType = "users" | "organizations" | "current";

export function AssignTierModal({
  open,
  onOpenChange,
  tier,
  assignments,
  users,
  organizations,
  onAssign,
  onUnassign,
  isLoading,
}: AssignTierModalProps) {
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TabType>("users");
  const [selectedUserIds, setSelectedUserIds] = React.useState<Set<string>>(
    new Set()
  );
  const [selectedOrgIds, setSelectedOrgIds] = React.useState<Set<string>>(
    new Set()
  );

  const assignedUserIds = new Set(
    assignments.filter((a) => a.userId).map((a) => a.userId!)
  );
  const assignedOrgIds = new Set(
    assignments.filter((a) => a.organizationId).map((a) => a.organizationId!)
  );

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

  const filteredOrganizations = React.useMemo(() => {
    if (!search.trim()) return organizations;
    const lowerSearch = search.toLowerCase();
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(lowerSearch)
    );
  }, [organizations, search]);

  const unassignedUsers = filteredUsers.filter(
    (user) => !assignedUserIds.has(user.id)
  );
  const unassignedOrganizations = filteredOrganizations.filter(
    (org) => !assignedOrgIds.has(org.id)
  );

  const handleToggleUser = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const handleToggleOrg = (orgId: string) => {
    const newSet = new Set(selectedOrgIds);
    if (newSet.has(orgId)) {
      newSet.delete(orgId);
    } else {
      newSet.add(orgId);
    }
    setSelectedOrgIds(newSet);
  };

  const handleSelectAllUsers = () => {
    if (selectedUserIds.size === unassignedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(unassignedUsers.map((u) => u.id)));
    }
  };

  const handleSelectAllOrgs = () => {
    if (selectedOrgIds.size === unassignedOrganizations.length) {
      setSelectedOrgIds(new Set());
    } else {
      setSelectedOrgIds(new Set(unassignedOrganizations.map((o) => o.id)));
    }
  };

  const handleAssign = () => {
    onAssign(Array.from(selectedUserIds), Array.from(selectedOrgIds));
    setSelectedUserIds(new Set());
    setSelectedOrgIds(new Set());
  };

  const handleClose = () => {
    setSearch("");
    setSelectedUserIds(new Set());
    setSelectedOrgIds(new Set());
    setActiveTab("users");
    onOpenChange(false);
  };

  const totalSelected = selectedUserIds.size + selectedOrgIds.size;

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <ModalHeader>
          <ModalTitle>
            Assign to {tier.name}
            <span
              className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                TIER_LEVELS.find((t) => t.value === LEVEL_TO_TIER[tier.level])?.color || "bg-gray-500"
              }`}
            >
              {LEVEL_TO_TIER[tier.level] || "BRONZE"}
            </span>
          </ModalTitle>
          <ModalDescription>
            Assign users or organizations to this discount tier. They will
            receive a {tier.discountPercentage}% discount.
          </ModalDescription>
        </ModalHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("users")}
          >
            <Users className="h-4 w-4" />
            Users
            {selectedUserIds.size > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
                {selectedUserIds.size}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "organizations"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("organizations")}
          >
            <Building2 className="h-4 w-4" />
            Organizations
            {selectedOrgIds.size > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
                {selectedOrgIds.size}
              </span>
            )}
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "current"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("current")}
          >
            <Check className="h-4 w-4" />
            Current ({assignments.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative pt-4 px-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 translate-y-0.5 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === "users"
                ? "Search users..."
                : activeTab === "organizations"
                  ? "Search organizations..."
                  : "Search current assignments..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] mt-4">
          {activeTab === "users" && (
            <div className="space-y-2">
              {unassignedUsers.length > 0 && (
                <div className="flex items-center px-2 pb-2 border-b">
                  <Checkbox
                    checked={
                      selectedUserIds.size === unassignedUsers.length &&
                      unassignedUsers.length > 0
                    }
                    onCheckedChange={handleSelectAllUsers}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Select all ({unassignedUsers.length})
                  </span>
                </div>
              )}
              {unassignedUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer ${
                    selectedUserIds.has(user.id)
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => handleToggleUser(user.id)}
                >
                  <Checkbox
                    checked={selectedUserIds.has(user.id)}
                    onCheckedChange={() => handleToggleUser(user.id)}
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              ))}
              {unassignedUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No users available to assign</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "organizations" && (
            <div className="space-y-2">
              {unassignedOrganizations.length > 0 && (
                <div className="flex items-center px-2 pb-2 border-b">
                  <Checkbox
                    checked={
                      selectedOrgIds.size === unassignedOrganizations.length &&
                      unassignedOrganizations.length > 0
                    }
                    onCheckedChange={handleSelectAllOrgs}
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Select all ({unassignedOrganizations.length})
                  </span>
                </div>
              )}
              {unassignedOrganizations.map((org) => (
                <div
                  key={org.id}
                  className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer ${
                    selectedOrgIds.has(org.id)
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => handleToggleOrg(org.id)}
                >
                  <Checkbox
                    checked={selectedOrgIds.has(org.id)}
                    onCheckedChange={() => handleToggleOrg(org.id)}
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{org.name}</p>
                  </div>
                </div>
              ))}
              {unassignedOrganizations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No organizations available to assign</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "current" && (
            <div className="space-y-2">
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No current assignments</p>
                  <p className="text-sm">
                    Assign users or organizations from the other tabs
                  </p>
                </div>
              ) : (
                assignments
                  .filter((assignment) => {
                    if (!search.trim()) return true;
                    const lowerSearch = search.toLowerCase();
                    if (assignment.user) {
                      return (
                        assignment.user.email.toLowerCase().includes(lowerSearch) ||
                        assignment.user.firstName
                          ?.toLowerCase()
                          .includes(lowerSearch) ||
                        assignment.user.lastName
                          ?.toLowerCase()
                          .includes(lowerSearch)
                      );
                    }
                    if (assignment.organization) {
                      return assignment.organization.name
                        .toLowerCase()
                        .includes(lowerSearch);
                    }
                    return false;
                  })
                  .map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-md bg-green-50 dark:bg-green-900/20"
                    >
                      <div className="flex items-center gap-3">
                        {assignment.user ? (
                          <>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                              {assignment.user.firstName?.[0]}
                              {assignment.user.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {assignment.user.firstName}{" "}
                                {assignment.user.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {assignment.user.email}
                              </p>
                            </div>
                          </>
                        ) : assignment.organization ? (
                          <>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {assignment.organization.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Organization
                              </p>
                            </div>
                          </>
                        ) : null}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onUnassign(assignment.id)}
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-2 pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            {totalSelected > 0 && (
              <span>
                {totalSelected} selected ({selectedUserIds.size} users,{" "}
                {selectedOrgIds.size} organizations)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Close
            </Button>
            {activeTab !== "current" && (
              <Button
                onClick={handleAssign}
                disabled={isLoading || totalSelected === 0}
              >
                {isLoading ? "Assigning..." : `Assign Selected (${totalSelected})`}
              </Button>
            )}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
