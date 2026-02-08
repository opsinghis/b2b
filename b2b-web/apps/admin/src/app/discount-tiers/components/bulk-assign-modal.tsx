"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
  Label,
  Checkbox,
} from "@b2b/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { Search, Upload, Users, Building2, AlertCircle } from "lucide-react";
import * as React from "react";

import type { DiscountTier } from "../hooks/use-discount-tiers";
import { TIER_LEVELS, LEVEL_TO_TIER } from "../hooks/use-discount-tiers";

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

interface BulkAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiers: DiscountTier[];
  users: User[];
  organizations: Organization[];
  onBulkAssign: (
    tierId: string,
    userIds: string[],
    organizationIds: string[]
  ) => void;
  isLoading?: boolean;
}

type AssignmentMode = "select" | "import";
type EntityType = "users" | "organizations";

export function BulkAssignModal({
  open,
  onOpenChange,
  tiers,
  users,
  organizations,
  onBulkAssign,
  isLoading,
}: BulkAssignModalProps) {
  const [selectedTierId, setSelectedTierId] = React.useState<string>("");
  const [mode, setMode] = React.useState<AssignmentMode>("select");
  const [entityType, setEntityType] = React.useState<EntityType>("users");
  const [search, setSearch] = React.useState("");
  const [selectedUserIds, setSelectedUserIds] = React.useState<Set<string>>(
    new Set()
  );
  const [selectedOrgIds, setSelectedOrgIds] = React.useState<Set<string>>(
    new Set()
  );
  const [importText, setImportText] = React.useState("");
  const [importError, setImportError] = React.useState<string | null>(null);

  const activeTiers = tiers.filter((t) => t.isActive);

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
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleSelectAllOrgs = () => {
    if (selectedOrgIds.size === filteredOrganizations.length) {
      setSelectedOrgIds(new Set());
    } else {
      setSelectedOrgIds(new Set(filteredOrganizations.map((o) => o.id)));
    }
  };

  const parseImportText = (): { userIds: string[]; orgIds: string[] } => {
    const lines = importText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const userIds: string[] = [];
    const orgIds: string[] = [];

    for (const line of lines) {
      // Try to match by email first (for users)
      const userByEmail = users.find(
        (u) => u.email.toLowerCase() === line.toLowerCase()
      );
      if (userByEmail) {
        userIds.push(userByEmail.id);
        continue;
      }

      // Try to match by organization name
      const org = organizations.find(
        (o) => o.name.toLowerCase() === line.toLowerCase()
      );
      if (org) {
        orgIds.push(org.id);
        continue;
      }

      // Try to match by ID directly
      const userById = users.find((u) => u.id === line);
      if (userById) {
        userIds.push(userById.id);
        continue;
      }

      const orgById = organizations.find((o) => o.id === line);
      if (orgById) {
        orgIds.push(orgById.id);
      }
    }

    return { userIds, orgIds };
  };

  const handleAssign = () => {
    if (!selectedTierId) return;

    let userIdsToAssign: string[] = [];
    let orgIdsToAssign: string[] = [];

    if (mode === "select") {
      userIdsToAssign = Array.from(selectedUserIds);
      orgIdsToAssign = Array.from(selectedOrgIds);
    } else {
      const parsed = parseImportText();
      userIdsToAssign = parsed.userIds;
      orgIdsToAssign = parsed.orgIds;

      if (userIdsToAssign.length === 0 && orgIdsToAssign.length === 0) {
        setImportError(
          "No valid users or organizations found. Enter email addresses, organization names, or IDs (one per line)."
        );
        return;
      }
    }

    onBulkAssign(selectedTierId, userIdsToAssign, orgIdsToAssign);
    handleClose();
  };

  const handleClose = () => {
    setSelectedTierId("");
    setMode("select");
    setEntityType("users");
    setSearch("");
    setSelectedUserIds(new Set());
    setSelectedOrgIds(new Set());
    setImportText("");
    setImportError(null);
    onOpenChange(false);
  };

  const totalSelected =
    mode === "select"
      ? selectedUserIds.size + selectedOrgIds.size
      : parseImportText().userIds.length + parseImportText().orgIds.length;

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <ModalHeader>
          <ModalTitle>Bulk Tier Assignment</ModalTitle>
          <ModalDescription>
            Assign multiple users or organizations to a discount tier at once.
          </ModalDescription>
        </ModalHeader>

        {/* Tier Selection */}
        <div className="space-y-2 pb-4 border-b">
          <Label>Select Discount Tier</Label>
          <Select value={selectedTierId} onValueChange={setSelectedTierId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a tier to assign" />
            </SelectTrigger>
            <SelectContent>
              {activeTiers.map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        TIER_LEVELS.find((t) => t.value === LEVEL_TO_TIER[tier.level])?.color ||
                        "bg-gray-500"
                      }`}
                    />
                    {tier.name} ({tier.discountPercentage}% off)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2 pt-4">
          <Button
            variant={mode === "select" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("select")}
          >
            <Users className="mr-2 h-4 w-4" />
            Select from List
          </Button>
          <Button
            variant={mode === "import" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("import")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>

        {mode === "select" ? (
          <>
            {/* Entity Type Tabs */}
            <div className="flex border-b mt-4">
              <button
                type="button"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  entityType === "users"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setEntityType("users")}
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
                  entityType === "organizations"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setEntityType("organizations")}
              >
                <Building2 className="h-4 w-4" />
                Organizations
                {selectedOrgIds.size > 0 && (
                  <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
                    {selectedOrgIds.size}
                  </span>
                )}
              </button>
            </div>

            {/* Search */}
            <div className="relative pt-4 px-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 translate-y-0.5 text-muted-foreground" />
              <Input
                placeholder={
                  entityType === "users"
                    ? "Search users..."
                    : "Search organizations..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] mt-4">
              {entityType === "users" ? (
                <div className="space-y-2">
                  {filteredUsers.length > 0 && (
                    <div className="flex items-center px-2 pb-2 border-b">
                      <Checkbox
                        checked={
                          selectedUserIds.size === filteredUsers.length &&
                          filteredUsers.length > 0
                        }
                        onCheckedChange={handleSelectAllUsers}
                      />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Select all ({filteredUsers.length})
                      </span>
                    </div>
                  )}
                  {filteredUsers.map((user) => (
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
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrganizations.length > 0 && (
                    <div className="flex items-center px-2 pb-2 border-b">
                      <Checkbox
                        checked={
                          selectedOrgIds.size === filteredOrganizations.length &&
                          filteredOrganizations.length > 0
                        }
                        onCheckedChange={handleSelectAllOrgs}
                      />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Select all ({filteredOrganizations.length})
                      </span>
                    </div>
                  )}
                  {filteredOrganizations.map((org) => (
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
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4 pt-4 flex-1">
            <div className="space-y-2">
              <Label>Import List</Label>
              <p className="text-xs text-muted-foreground">
                Enter email addresses (for users), organization names, or IDs -
                one per line.
              </p>
              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportError(null);
                }}
                className="min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={`john@example.com\njane@example.com\nAcme Corporation\norg-id-12345`}
                disabled={isLoading}
              />
              {importError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {importError}
                </div>
              )}
            </div>
            {importText && (
              <div className="text-sm text-muted-foreground">
                Preview: {parseImportText().userIds.length} users and{" "}
                {parseImportText().orgIds.length} organizations will be assigned.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center gap-2 pt-4 border-t mt-4">
          <div className="text-sm text-muted-foreground">
            {totalSelected > 0 && selectedTierId && (
              <span>{totalSelected} entities will be assigned to tier</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={isLoading || !selectedTierId || totalSelected === 0}
            >
              {isLoading
                ? "Assigning..."
                : `Assign ${totalSelected} to Tier`}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
