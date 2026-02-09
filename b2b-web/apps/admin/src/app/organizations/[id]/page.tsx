"use client";

import type { UpdateOrganizationDto } from "@b2b/api-client";
import { useAuth, RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import {
  ArrowLeft,
  RefreshCw,
  Power,
  PowerOff,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import * as React from "react";

import { useUsers } from "../../users/hooks/use-users";
import { AssignUsersModal } from "../components/assign-users-modal";
import {
  useOrganization,
  useOrganizations,
  useUpdateOrganization,
  useToggleOrganizationStatus,
  useDeleteOrganization,
  useAssignUserToOrganization,
} from "../hooks/use-organizations";

import { Header } from "@/components/layout";

interface FormErrors {
  name?: string;
  code?: string;
  description?: string;
  parentId?: string;
}

function EditOrganizationContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const initialTab = searchParams.get("tab");

  const { data: organization, isLoading, error, refetch } = useOrganization(id);
  const { data: allOrgsData } = useOrganizations({ limit: 100 });
  const { data: usersData } = useUsers({ limit: 100 });

  const updateMutation = useUpdateOrganization(id);
  const toggleStatusMutation = useToggleOrganizationStatus();
  const deleteMutation = useDeleteOrganization();
  const assignUserMutation = useAssignUserToOrganization();

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isAssignUsersModalOpen, setIsAssignUsersModalOpen] = React.useState(
    initialTab === "users"
  );

  // Initialize form when organization data loads
  React.useEffect(() => {
    if (organization) {
      setName(organization.name);
      setCode(organization.code);
      setDescription(organization.description || "");
      setParentId(organization.parentId || "");
    }
  }, [organization]);

  // Track changes
  React.useEffect(() => {
    if (!organization) return;
    setHasChanges(
      name !== organization.name ||
        code !== organization.code ||
        description !== (organization.description || "") ||
        parentId !== (organization.parentId || "")
    );
  }, [name, code, description, parentId, organization]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!code.trim()) {
      newErrors.code = "Code is required";
    } else if (!/^[A-Z0-9-]+$/.test(code)) {
      newErrors.code =
        "Code must contain only uppercase letters, numbers, and hyphens";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const updateData: UpdateOrganizationDto = {
        name,
        code,
        description: description || undefined,
        parentId: parentId || undefined,
      };
      await updateMutation.mutateAsync(updateData);
      setHasChanges(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async () => {
    if (!organization) return;
    const action = organization.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this organization?`)) {
      return;
    }
    toggleStatusMutation.mutate({ id, isActive: !organization.isActive });
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this organization? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/organizations");
    } catch {
      // Error handled by mutation
    }
  };

  const handleAssignUser = (userId: string, organizationId: string | null) => {
    assignUserMutation.mutate({ userId, organizationId });
  };

  // Filter out current org and its descendants to prevent circular refs
  const getAvailableParents = () => {
    if (!allOrgsData?.data) return [];

    const getDescendantIds = (orgId: string): string[] => {
      const children = allOrgsData.data.filter(
        (org) => org.parentId === orgId
      );
      return [
        orgId,
        ...children.flatMap((child) => getDescendantIds(child.id)),
      ];
    };

    const excludeIds = getDescendantIds(id);
    return allOrgsData.data.filter(
      (org) => org.isActive && !excludeIds.includes(org.id)
    );
  };

  const availableParents = getAvailableParents();

  // Get users for this organization
  const orgUsers =
    usersData?.data.filter((user) => user.organizationId === id) || [];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Edit Organization" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !organization) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Edit Organization" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">
              Organization Not Found
            </h2>
            <p className="mt-2 text-muted-foreground">
              The organization you are looking for does not exist or you do not
              have permission to view it.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/organizations")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Organizations
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Edit Organization" />
      <div className="flex-1 p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/organizations")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Organizations
        </Button>

        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-medium">
                Organization Status
              </CardTitle>
              <CardDescription>
                {organization.isActive
                  ? "This organization is currently active"
                  : "This organization is currently inactive"}
              </CardDescription>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                organization.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {organization.isActive ? "Active" : "Inactive"}
            </span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Button
                variant={organization.isActive ? "outline" : "default"}
                onClick={handleToggleStatus}
                disabled={toggleStatusMutation.isPending}
              >
                {organization.isActive ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Deactivate Organization
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Activate Organization
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Organization
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Update the basic information for this organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Engineering Department"
                    error={!!errors.name}
                    disabled={updateMutation.isPending}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ENG"
                    error={!!errors.code}
                    disabled={updateMutation.isPending}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Responsible for all engineering activities"
                  disabled={updateMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentId">Parent Organization</Label>
                <Select
                  value={parentId || "__none__"}
                  onValueChange={(value) => setParentId(value === "__none__" ? "" : value)}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger id="parentId">
                    <SelectValue placeholder="Select a parent organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (Root organization)</SelectItem>
                    {availableParents.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name} ({org.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">ID:</span>{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">
                    {organization.id}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(organization.createdAt).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                disabled={updateMutation.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !hasChanges}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* Users Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Assigned Users</CardTitle>
              <CardDescription>
                Users currently assigned to this organization
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsAssignUsersModalOpen(true)}
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
          </CardHeader>
          <CardContent>
            {orgUsers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No users assigned to this organization</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setIsAssignUsersModalOpen(true)}
                >
                  Assign users now
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {orgUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
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
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        user.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mutation Error */}
        {updateMutation.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to update organization. Please try again.
            </p>
          </div>
        )}

        {/* Assign Users Modal */}
        {organization && usersData && (
          <AssignUsersModal
            open={isAssignUsersModalOpen}
            onOpenChange={setIsAssignUsersModalOpen}
            organization={organization}
            users={usersData.data}
            onAssignUser={handleAssignUser}
            isLoading={assignUserMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

export default function EditOrganizationPage() {
  const router = useRouter();
  useAuth();

  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Edit Organization" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">
                Access Denied
              </h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to edit organizations.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/")}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <EditOrganizationContent />
    </RequireAuth>
  );
}
