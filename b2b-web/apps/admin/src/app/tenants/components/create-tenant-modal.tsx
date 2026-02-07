"use client";

import type { CreateTenantDto } from "@b2b/api-client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
  Label,
} from "@b2b/ui";
import * as React from "react";

interface CreateTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateTenantDto) => void;
  isLoading?: boolean;
}

interface FormErrors {
  name?: string;
  slug?: string;
  config?: string;
}

export function CreateTenantModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateTenantModalProps) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [configJson, setConfigJson] = React.useState("{}");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setConfigJson("{}");
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
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
    onSubmit({ name, slug, config });
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Create New Tenant</ModalTitle>
            <ModalDescription>
              Add a new tenant to the platform. Fill in the details below.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modal-name">Name</Label>
              <Input
                id="modal-name"
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
              <Label htmlFor="modal-slug">Slug</Label>
              <Input
                id="modal-slug"
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
              <Label htmlFor="modal-config">Configuration (JSON)</Label>
              <textarea
                id="modal-config"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className={`min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${
                  errors.config ? "border-destructive" : ""
                }`}
                placeholder='{"theme": "default"}'
                disabled={isLoading}
              />
              {errors.config && (
                <p className="text-sm text-destructive">{errors.config}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Tenant"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
