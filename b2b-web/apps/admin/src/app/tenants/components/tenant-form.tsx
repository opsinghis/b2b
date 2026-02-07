"use client";

import type { TenantResponseDto, CreateTenantDto, UpdateTenantDto } from "@b2b/api-client";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@b2b/ui";
import * as React from "react";

interface TenantFormProps {
  tenant?: TenantResponseDto;
  onSubmit: (data: CreateTenantDto | UpdateTenantDto) => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode: "create" | "edit";
}

interface FormErrors {
  name?: string;
  slug?: string;
  config?: string;
}

export function TenantForm({
  tenant,
  onSubmit,
  onCancel,
  isLoading,
  mode,
}: TenantFormProps) {
  const [name, setName] = React.useState(tenant?.name || "");
  const [slug, setSlug] = React.useState(tenant?.slug || "");
  const [configJson, setConfigJson] = React.useState(
    tenant?.config ? JSON.stringify(tenant.config, null, 2) : "{}"
  );
  const [errors, setErrors] = React.useState<FormErrors>({});

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (mode === "create" && !slug) {
      setSlug(generateSlug(value));
    }
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const config = JSON.parse(configJson);

    if (mode === "create") {
      onSubmit({ name, slug, config } as CreateTenantDto);
    } else {
      onSubmit({ name, slug, config } as UpdateTenantDto);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create Tenant" : "Edit Tenant"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Add a new tenant to the platform"
              : "Update tenant information"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corporation"
              error={!!errors.name}
              disabled={isLoading}
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
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly identifier. Only lowercase letters, numbers, and hyphens.
            </p>
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="config">Configuration (JSON)</Label>
            <textarea
              id="config"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className={`min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.config ? "border-destructive" : ""
              }`}
              placeholder='{"theme": "default", "features": []}'
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Tenant-specific configuration in JSON format.
            </p>
            {errors.config && (
              <p className="text-sm text-destructive">{errors.config}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
              ? "Create Tenant"
              : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
