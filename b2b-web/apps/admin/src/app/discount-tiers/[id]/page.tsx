"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button, Input, Label } from "@b2b/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { ArrowLeft, Save, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import * as React from "react";

import {
  useDiscountTier,
  useUpdateDiscountTier,
  useDeleteDiscountTier,
  type UpdateDiscountTierDto,
  TIER_LEVELS,
  LEVEL_TO_TIER,
  TIER_TO_LEVEL,
} from "../hooks/use-discount-tiers";

import { Header } from "@/components/layout";

interface FormErrors {
  name?: string;
  level?: string;
  discountPercent?: string;
  code?: string;
}

function TierDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: tier, isLoading, error, refetch } = useDiscountTier(id);
  const updateMutation = useUpdateDiscountTier(id);
  const deleteMutation = useDeleteDiscountTier();

  // Form state
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [level, setLevel] = React.useState<number>(0);
  const [discountPercent, setDiscountPercent] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [minSpend, setMinSpend] = React.useState("");
  const [minOrders, setMinOrders] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [color, setColor] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Populate form when tier data loads
  React.useEffect(() => {
    if (tier) {
      setName(tier.name);
      setCode(tier.code);
      setLevel(tier.level);
      setDiscountPercent(tier.discountPercentage.toString());
      setDescription(tier.description || "");
      setMinSpend(tier.minSpend?.toString() || "");
      setMinOrders(tier.minOrders?.toString() || "");
      setIsActive(tier.isActive);
      setColor(tier.color || "");
      setHasChanges(false);
    }
  }, [tier]);

  // Track changes
  React.useEffect(() => {
    if (!tier) return;
    const changed =
      name !== tier.name ||
      level !== tier.level ||
      discountPercent !== tier.discountPercentage.toString() ||
      description !== (tier.description || "") ||
      minSpend !== (tier.minSpend?.toString() || "") ||
      minOrders !== (tier.minOrders?.toString() || "") ||
      color !== (tier.color || "") ||
      isActive !== tier.isActive;
    setHasChanges(changed);
  }, [name, level, discountPercent, description, minSpend, minOrders, color, isActive, tier]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    const discount = parseFloat(discountPercent);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      newErrors.discountPercent = "Discount must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const updateData: UpdateDiscountTierDto = {
      name,
      level,
      discountPercent: parseFloat(discountPercent),
      description: description || undefined,
      minSpend: minSpend ? parseFloat(minSpend) : undefined,
      minOrders: minOrders ? parseInt(minOrders, 10) : undefined,
      color: color || undefined,
      isActive,
    };

    try {
      await updateMutation.mutateAsync(updateData);
      setHasChanges(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this tier? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/discount-tiers");
    } catch {
      // Error handled by mutation
    }
  };

  // Get tier level label from numeric level
  const tierLabel = LEVEL_TO_TIER[level] || "BRONZE";

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Loading..." />
        <div className="flex-1 p-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !tier) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Tier Not Found" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Tier Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              The requested discount tier could not be found.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/discount-tiers">Back to Tiers</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={`Edit: ${tier.name}`} />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Breadcrumb and Actions */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/discount-tiers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Tiers
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl space-y-6">
          {/* Basic Information */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier-name">Name</Label>
                <Input
                  id="tier-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Gold Partner Discount"
                  error={!!errors.name}
                  disabled={updateMutation.isPending}
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
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Code cannot be changed</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier-level">Tier Level</Label>
                <Select
                  value={tierLabel}
                  onValueChange={(value) => setLevel(TIER_TO_LEVEL[value as keyof typeof TIER_TO_LEVEL] || 0)}
                  disabled={updateMutation.isPending}
                >
                  <SelectTrigger id="tier-level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIER_LEVELS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${t.color}`} />
                          {t.label}
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
                    disabled={updateMutation.isPending}
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
                  disabled={updateMutation.isPending}
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
                  disabled={updateMutation.isPending}
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
                disabled={updateMutation.isPending}
              />
            </div>
          </div>

          {/* Eligibility Requirements */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="text-lg font-semibold">Eligibility Requirements</h3>

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
                  disabled={updateMutation.isPending}
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
                  disabled={updateMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum number of orders to qualify
                </p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg border p-6 space-y-4 bg-muted/30">
            <h3 className="text-lg font-semibold">Metadata</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">ID</p>
                <p className="font-mono">{tier.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>
                  {new Date(tier.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p>
                  {new Date(tier.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TierDetailPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Edit Tier" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to edit discount tiers.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <TierDetailContent />
    </RequireAuth>
  );
}
