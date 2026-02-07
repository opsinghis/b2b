"use client";

import type { CreateOrganizationDto, OrganizationResponseDto } from "@b2b/api-client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import * as React from "react";

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateOrganizationDto) => void;
  isLoading?: boolean;
  organizations?: OrganizationResponseDto[];
}

interface FormErrors {
  name?: string;
  code?: string;
  description?: string;
  parentId?: string;
}

export function CreateOrganizationModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  organizations = [],
}: CreateOrganizationModalProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [parentId, setParentId] = React.useState<string>("");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const generateCode = (name: string) => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 20);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!code || code === generateCode(name)) {
      setCode(generateCode(value));
    }
  };

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setParentId("");
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

    if (!code.trim()) {
      newErrors.code = "Code is required";
    } else if (!/^[A-Z0-9-]+$/.test(code)) {
      newErrors.code = "Code must contain only uppercase letters, numbers, and hyphens";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const data: CreateOrganizationDto = {
      name,
      code,
      description: description || undefined,
      parentId: parentId || undefined,
    };

    onSubmit(data);
  };

  // Filter out already selected parent and its children to prevent circular refs
  const availableParents = organizations.filter((org) => org.isActive);

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Create New Organization</ModalTitle>
            <ModalDescription>
              Add a new organization to your tenant. Organizations can be nested to create a hierarchy.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modal-name">Name</Label>
              <Input
                id="modal-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Engineering Department"
                error={!!errors.name}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-code">Code</Label>
              <Input
                id="modal-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENG"
                error={!!errors.code}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier. Only uppercase letters, numbers, and hyphens.
              </p>
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-description">Description (optional)</Label>
              <textarea
                id="modal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Responsible for all engineering activities"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-parent">Parent Organization (optional)</Label>
              <Select
                value={parentId}
                onValueChange={setParentId}
                disabled={isLoading}
              >
                <SelectTrigger id="modal-parent">
                  <SelectValue placeholder="Select a parent organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Root organization)</SelectItem>
                  {availableParents.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a parent to nest this organization under another.
              </p>
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
              {isLoading ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
