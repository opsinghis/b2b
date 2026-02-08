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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import * as React from "react";

import {
  type CreateDiscountTierDto,
  type TierLevel,
  TIER_LEVELS,
  TIER_TO_LEVEL,
} from "../hooks/use-discount-tiers";

interface CreateTierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateDiscountTierDto) => void;
  isLoading?: boolean;
}

interface FormErrors {
  name?: string;
  code?: string;
  level?: string;
  discountPercent?: string;
}

export function CreateTierModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateTierModalProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [level, setLevel] = React.useState<TierLevel>("BRONZE");
  const [discountPercent, setDiscountPercent] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [minSpend, setMinSpend] = React.useState("");
  const [minOrders, setMinOrders] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [color, setColor] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const resetForm = () => {
    setName("");
    setCode("");
    setLevel("BRONZE");
    setDiscountPercent("");
    setDescription("");
    setMinSpend("");
    setMinOrders("");
    setIsActive(true);
    setColor("");
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Auto-generate code from name
  React.useEffect(() => {
    if (name && !code) {
      const generated = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_")
        .substring(0, 20);
      setCode(generated);
    }
  }, [name, code]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!code.trim()) {
      newErrors.code = "Code is required";
    } else if (!/^[A-Z0-9_]+$/.test(code)) {
      newErrors.code = "Code must be uppercase letters, numbers, and underscores only";
    }

    const discount = parseFloat(discountPercent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      newErrors.discountPercent = "Discount must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    onSubmit({
      name,
      code,
      level: TIER_TO_LEVEL[level],
      discountPercent: parseFloat(discountPercent),
      description: description || undefined,
      minSpend: minSpend ? parseFloat(minSpend) : undefined,
      minOrders: minOrders ? parseInt(minOrders, 10) : undefined,
      isActive,
      color: color || undefined,
    });
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Create Discount Tier</ModalTitle>
            <ModalDescription>
              Create a new discount tier with eligibility requirements.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier-name">Name</Label>
                  <Input
                    id="tier-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Gold Partner Discount"
                    error={!!errors.name}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier-code">Code</Label>
                  <Input
                    id="tier-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., GOLD_PARTNER"
                    error={!!errors.code}
                    disabled={isLoading}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier-level">Tier Level</Label>
                  <Select
                    value={level}
                    onValueChange={(value) => setLevel(value as TierLevel)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="tier-level">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIER_LEVELS.map((tier) => (
                        <SelectItem key={tier.value} value={tier.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-3 w-3 rounded-full ${tier.color}`}
                            />
                            {tier.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.level && (
                    <p className="text-sm text-destructive">{errors.level}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier-discount">Discount Percentage</Label>
                  <div className="relative">
                    <Input
                      id="tier-discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      placeholder="e.g., 15"
                      error={!!errors.discountPercent}
                      disabled={isLoading}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      %
                    </span>
                  </div>
                  {errors.discountPercent && (
                    <p className="text-sm text-destructive">
                      {errors.discountPercent}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={isActive ? "active" : "inactive"}
                    onValueChange={(value) => setIsActive(value === "active")}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier-color">Display Color (optional)</Label>
                  <Input
                    id="tier-color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g., #FFD700"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tier-description">Description (optional)</Label>
                <textarea
                  id="tier-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe this discount tier..."
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Eligibility Requirements */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Eligibility Requirements</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier-min-spend">Minimum Spend (optional)</Label>
                  <Input
                    id="tier-min-spend"
                    type="number"
                    min="0"
                    step="0.01"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    placeholder="e.g., 1000"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum cumulative spend to qualify
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tier-min-orders">Minimum Orders (optional)</Label>
                  <Input
                    id="tier-min-orders"
                    type="number"
                    min="0"
                    step="1"
                    value={minOrders}
                    onChange={(e) => setMinOrders(e.target.value)}
                    placeholder="e.g., 5"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum number of orders to qualify
                  </p>
                </div>
              </div>
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
              {isLoading ? "Creating..." : "Create Tier"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
