"use client";

import type { UpdateTenantDto } from "@b2b/api-client";
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
} from "@b2b/ui";
import { ArrowLeft, RefreshCw, Power, PowerOff, Trash2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import * as React from "react";

import { ConfigEditor } from "../components/config-editor";
import {
  useTenant,
  useUpdateTenant,
  useToggleTenantStatus,
  useDeleteTenant,
} from "../hooks/use-tenants";

import { Header } from "@/components/layout";

interface FormErrors {
  name?: string;
  slug?: string;
  config?: string;
}

function EditTenantContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: tenant, isLoading, error, refetch } = useTenant(id);
  const updateMutation = useUpdateTenant(id);
  const toggleStatusMutation = useToggleTenantStatus();
  const deleteMutation = useDeleteTenant();

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [configJson, setConfigJson] = React.useState("{}");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Initialize form when tenant data loads
  React.useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setSlug(tenant.slug);
      setConfigJson(tenant.config ? JSON.stringify(tenant.config, null, 2) : "{}");
    }
  }, [tenant]);

  // Track changes
  React.useEffect(() => {
    if (!tenant) return;
    const configChanged = (() => {
      try {
        const currentConfig = JSON.parse(configJson);
        return JSON.stringify(currentConfig) !== JSON.stringify(tenant.config || {});
      } catch {
        return true;
      }
    })();
    setHasChanges(
      name !== tenant.name || slug !== tenant.slug || configChanged
    );
  }, [name, slug, configJson, tenant]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!slug.trim()) {
      newErrors.slug = "Slug is required";
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = "Slug must contain only lowercase letters, numbers, and hyphens";
    }

    try {
      JSON.parse(configJson);
    } catch {
      newErrors.config = "Invalid JSON format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const config = JSON.parse(configJson);
      const updateData: UpdateTenantDto = { name, slug, config };
      await updateMutation.mutateAsync(updateData);
      setHasChanges(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleStatus = async () => {
    if (!tenant) return;
    const action = tenant.isActive ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} this tenant?`)) {
      return;
    }
    toggleStatusMutation.mutate({ id, isActive: !tenant.isActive });
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/tenants");
    } catch {
      // Error handled by mutation
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Edit Tenant" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !tenant) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Edit Tenant" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Tenant Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              The tenant you are looking for does not exist or you do not have permission to view it.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/tenants")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tenants
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="Edit Tenant" />
      <div className="flex-1 p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/tenants")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tenants
        </Button>

        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-medium">Tenant Status</CardTitle>
              <CardDescription>
                {tenant.isActive
                  ? "This tenant is currently active"
                  : "This tenant is currently inactive"}
              </CardDescription>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                tenant.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
              }`}
            >
              {tenant.isActive ? "Active" : "Inactive"}
            </span>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <Button
                variant={tenant.isActive ? "outline" : "default"}
                onClick={handleToggleStatus}
                disabled={toggleStatusMutation.isPending}
              >
                {tenant.isActive ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Deactivate Tenant
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Activate Tenant
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Tenant
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Tenant Details</CardTitle>
              <CardDescription>
                Update the basic information for this tenant
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
                    placeholder="Acme Corporation"
                    error={!!errors.name}
                    disabled={updateMutation.isPending}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    placeholder="acme-corp"
                    error={!!errors.slug}
                    disabled={updateMutation.isPending}
                  />
                  {errors.slug && (
                    <p className="text-sm text-destructive">{errors.slug}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">ID:</span>{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">{tenant.id}</code>
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(tenant.createdAt).toLocaleDateString("en-US", {
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

        {/* Config Editor */}
        <ConfigEditor
          value={configJson}
          onChange={(value) => {
            setConfigJson(value);
            // Clear config error when editing
            if (errors.config) {
              setErrors((prev) => ({ ...prev, config: undefined }));
            }
          }}
          disabled={updateMutation.isPending}
          error={errors.config}
        />

        {/* Mutation Error */}
        {updateMutation.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to update tenant. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditTenantPage() {
  const router = useRouter();
  useAuth(); // Access auth context

  return (
    <RequireAuth
      roles="SUPER_ADMIN"
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Edit Tenant" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to edit tenants. This feature is only available to Super Admins.
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
      <EditTenantContent />
    </RequireAuth>
  );
}
