"use client";

import type { UpdateUserDto } from "@b2b/api-client";
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
  KeyRound,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import * as React from "react";

import { ResetPasswordModal } from "../components/reset-password-modal";
import {
  useUser,
  useUpdateUser,
  useToggleUserStatus,
  useDeleteUser,
  useResetUserPassword,
  USER_ROLES,
  type UserRole,
} from "../hooks/use-users";

import { Header } from "@/components/layout";

interface FormErrors {
  firstName?: string;
  lastName?: string;
  role?: string;
}

function EditUserContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: user, isLoading, error, refetch } = useUser(id);
  const updateMutation = useUpdateUser(id);
  const toggleStatusMutation = useToggleUserStatus();
  const deleteMutation = useDeleteUser();
  const resetPasswordMutation = useResetUserPassword();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("USER");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [hasChanges, setHasChanges] = React.useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = React.useState(false);

  // Initialize form when user data loads
  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setRole(user.role as UserRole);
    }
  }, [user]);

  // Track changes
  React.useEffect(() => {
    if (!user) return;
    setHasChanges(
      firstName !== user.firstName ||
        lastName !== user.lastName ||
        role !== user.role
    );
  }, [firstName, lastName, role, user]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!role) {
      newErrors.role = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const updateData: UpdateUserDto = { firstName, lastName, role };
      await updateMutation.mutateAsync(updateData);
      setHasChanges(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    const action = user.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }
    toggleStatusMutation.mutate({ id, isActive: !user.isActive });
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/users");
    } catch {
      // Error handled by mutation
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    try {
      await resetPasswordMutation.mutateAsync({ id, newPassword });
      setIsResetPasswordOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Edit User" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Edit User" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">
              User Not Found
            </h2>
            <p className="mt-2 text-muted-foreground">
              The user you are looking for does not exist or you do not have
              permission to view it.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/users")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (userRole: UserRole) => {
    switch (userRole) {
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
    <div className="flex flex-col h-full">
      <Header title="Edit User" />
      <div className="flex-1 p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/users")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>

        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-medium">
                User Status
              </CardTitle>
              <CardDescription>
                {user.isActive
                  ? "This user is currently active"
                  : "This user is currently inactive"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getRoleBadgeColor(user.role as UserRole)}`}
              >
                {USER_ROLES.find((r) => r.value === user.role)?.label ||
                  user.role}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  user.isActive
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsResetPasswordOpen(true)}
                disabled={resetPasswordMutation.isPending}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Reset Password
              </Button>
              <Button
                variant={user.isActive ? "outline" : "default"}
                onClick={handleToggleStatus}
                disabled={toggleStatusMutation.isPending}
              >
                {user.isActive ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Deactivate User
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Activate User
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>User Details</CardTitle>
              <CardDescription>
                Update the basic information for this user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    error={!!errors.firstName}
                    disabled={updateMutation.isPending}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    error={!!errors.lastName}
                    disabled={updateMutation.isPending}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed after account creation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as UserRole)}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">ID:</span>{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">
                    {user.id}
                  </code>
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
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

        {/* Mutation Error */}
        {updateMutation.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to update user. Please try again.
            </p>
          </div>
        )}

        {/* Reset Password Modal */}
        <ResetPasswordModal
          open={isResetPasswordOpen}
          onOpenChange={setIsResetPasswordOpen}
          onSubmit={handleResetPassword}
          isLoading={resetPasswordMutation.isPending}
          userName={`${user.firstName} ${user.lastName}`}
        />
      </div>
    </div>
  );
}

export default function EditUserPage() {
  const router = useRouter();
  useAuth();

  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Edit User" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">
                Access Denied
              </h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to edit users. This feature is only
                available to Admins.
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
      <EditUserContent />
    </RequireAuth>
  );
}
