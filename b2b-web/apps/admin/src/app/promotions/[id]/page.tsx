"use client";

import { useAuth, RequireAuth } from "@b2b/auth/react";
import {
  Button,
  Input,
  Label,
  Switch,
  DatePicker,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@b2b/ui";
import { ArrowLeft, RefreshCw, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import * as React from "react";

import {
  usePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  type UpdatePromotionDto,
  type BogoConfig,
  PROMOTION_TYPES,
  getPromotionStatus,
  PROMOTION_STATUSES,
} from "../hooks/use-promotions";

import { Header } from "@/components/layout";

function PromotionDetailContent() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: promotion, isLoading, error, refetch } = usePromotion(id);
  const updateMutation = useUpdatePromotion(id);
  const deleteMutation = useDeletePromotion();

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [discountValue, setDiscountValue] = React.useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = React.useState("");
  const [buyQuantity, setBuyQuantity] = React.useState("1");
  const [getQuantity, setGetQuantity] = React.useState("1");
  const [bogoDiscountPercent, setBogoDiscountPercent] = React.useState("100");
  const [minOrderValue, setMinOrderValue] = React.useState("");
  const [minQuantity, setMinQuantity] = React.useState("");
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [hasEndDate, setHasEndDate] = React.useState(false);
  const [totalUsageLimit, setTotalUsageLimit] = React.useState("");
  const [perUserLimit, setPerUserLimit] = React.useState("");
  const [hasUsageLimit, setHasUsageLimit] = React.useState(false);
  const [stackable, setStackable] = React.useState(false);
  const [priority, setPriority] = React.useState("1");
  const [isActive, setIsActive] = React.useState(true);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Initialize form when promotion loads
  React.useEffect(() => {
    if (promotion) {
      setName(promotion.name);
      setDescription(promotion.description || "");
      setDiscountValue(promotion.discountValue.toString());
      setMaxDiscountAmount(promotion.maxDiscountAmount?.toString() || "");

      if (promotion.bogoConfig) {
        setBuyQuantity(promotion.bogoConfig.buyQuantity.toString());
        setGetQuantity(promotion.bogoConfig.getQuantity.toString());
        setBogoDiscountPercent(promotion.bogoConfig.discountPercent?.toString() || "100");
      }

      setMinOrderValue(promotion.minOrderValue?.toString() || "");
      setMinQuantity(promotion.minQuantity?.toString() || "");
      setStartDate(new Date(promotion.startDate));
      setEndDate(promotion.endDate ? new Date(promotion.endDate) : undefined);
      setHasEndDate(!!promotion.endDate);
      setTotalUsageLimit(promotion.totalUsageLimit?.toString() || "");
      setPerUserLimit(promotion.perUserLimit?.toString() || "");
      setHasUsageLimit(!!promotion.totalUsageLimit || !!promotion.perUserLimit);
      setStackable(promotion.stackable);
      setPriority(promotion.priority.toString());
      setIsActive(promotion.isActive);
      setHasChanges(false);
    }
  }, [promotion]);

  // Track changes
  React.useEffect(() => {
    if (promotion) {
      const changed =
        name !== promotion.name ||
        description !== (promotion.description || "") ||
        discountValue !== promotion.discountValue.toString() ||
        isActive !== promotion.isActive ||
        stackable !== promotion.stackable;
      setHasChanges(changed);
    }
  }, [name, description, discountValue, isActive, stackable, promotion]);

  const handleSave = async () => {
    if (!promotion) return;

    let bogoConfig: BogoConfig | undefined;
    if (promotion.type === "BOGO") {
      bogoConfig = {
        buyQuantity: parseInt(buyQuantity, 10),
        getQuantity: parseInt(getQuantity, 10),
        discountPercent: parseInt(bogoDiscountPercent, 10),
      };
    }

    const updateData: UpdatePromotionDto = {
      name,
      description: description || undefined,
      discountValue: promotion.type === "BOGO" || promotion.type === "FREE_SHIPPING"
        ? undefined
        : parseFloat(discountValue),
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
      bogoConfig,
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : undefined,
      minQuantity: minQuantity ? parseInt(minQuantity, 10) : undefined,
      startDate: startDate?.toISOString(),
      endDate: hasEndDate && endDate ? endDate.toISOString() : undefined,
      totalUsageLimit: hasUsageLimit && totalUsageLimit ? parseInt(totalUsageLimit, 10) : undefined,
      perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : undefined,
      priority: parseInt(priority, 10),
      stackable,
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
    if (!confirm("Are you sure you want to delete this promotion? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/promotions");
    } catch {
      // Error handled by mutation
    }
  };

  // Check admin access
  if (!hasRole("ADMIN") && !hasRole("SUPER_ADMIN")) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Promotion Details" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">
              You do not have permission to access promotion management.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Promotion Details" />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !promotion) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Promotion Details" />
        <div className="flex-1 p-6">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-destructive">Promotion Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              The promotion you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
            <Button asChild className="mt-4">
              <Link href="/promotions">Back to Promotions</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const status = getPromotionStatus(promotion);
  const statusConfig = PROMOTION_STATUSES.find((s) => s.value === status);
  const typeConfig = PROMOTION_TYPES.find((t) => t.value === promotion.type);

  return (
    <div className="flex flex-col h-full">
      <Header title="Promotion Details" />
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/promotions">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{promotion.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {promotion.code && (
                  <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">
                    {promotion.code}
                  </code>
                )}
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig?.color}`}>
                  {statusConfig?.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !hasChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input value={typeConfig?.label || promotion.type} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <textarea
                    id="edit-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={updateMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Discount Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Discount Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {promotion.type === "BOGO" ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Buy Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={buyQuantity}
                        onChange={(e) => setBuyQuantity(e.target.value)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Get Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={getQuantity}
                        onChange={(e) => setGetQuantity(e.target.value)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount %</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={bogoDiscountPercent}
                        onChange={(e) => setBogoDiscountPercent(e.target.value)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  </div>
                ) : promotion.type === "FREE_SHIPPING" ? (
                  <p className="text-muted-foreground">
                    This promotion waives shipping costs for qualifying orders.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        {promotion.type === "PERCENTAGE" ? "Discount %" : "Discount Amount"}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max={promotion.type === "PERCENTAGE" ? "100" : undefined}
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                    {promotion.type === "PERCENTAGE" && (
                      <div className="space-y-2">
                        <Label>Max Discount Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={maxDiscountAmount}
                          onChange={(e) => setMaxDiscountAmount(e.target.value)}
                          placeholder="No limit"
                          disabled={updateMutation.isPending}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Conditions */}
            <Card>
              <CardHeader>
                <CardTitle>Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Order Value</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      placeholder="No minimum"
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value)}
                      placeholder="No minimum"
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle>Scheduling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>End Date</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={hasEndDate}
                          onCheckedChange={setHasEndDate}
                          disabled={updateMutation.isPending}
                        />
                        <span className="text-xs text-muted-foreground">Set end date</span>
                      </div>
                    </div>
                    {hasEndDate ? (
                      <DatePicker
                        value={endDate}
                        onChange={setEndDate}
                        disabled={updateMutation.isPending}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground pt-2">
                        Runs indefinitely
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Stackable</Label>
                  <Switch
                    checked={stackable}
                    onCheckedChange={setStackable}
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    min="1"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={updateMutation.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-3xl font-bold">{promotion.currentUsageCount}</p>
                  <p className="text-sm text-muted-foreground">
                    {promotion.totalUsageLimit
                      ? `of ${promotion.totalUsageLimit} total uses`
                      : "total redemptions"}
                  </p>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Switch
                    checked={hasUsageLimit}
                    onCheckedChange={setHasUsageLimit}
                    disabled={updateMutation.isPending}
                  />
                  <span className="text-sm">Enable limits</span>
                </div>
                {hasUsageLimit && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Total Limit</Label>
                      <Input
                        type="number"
                        min="1"
                        value={totalUsageLimit}
                        onChange={(e) => setTotalUsageLimit(e.target.value)}
                        placeholder="Unlimited"
                        disabled={updateMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Per User Limit</Label>
                      <Input
                        type="number"
                        min="1"
                        value={perUserLimit}
                        onChange={(e) => setPerUserLimit(e.target.value)}
                        placeholder="Unlimited"
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/promotions/${id}/analytics`}>View Analytics</Link>
                </Button>
                {promotion.isCouponBased && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/promotions">Manage Coupons</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PromotionDetailPage() {
  return (
    <RequireAuth
      roles={["ADMIN", "SUPER_ADMIN"]}
      fallback={
        <div className="flex flex-col h-full">
          <Header title="Promotion Details" />
          <div className="flex-1 p-6">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">
                You do not have permission to access promotion management.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <PromotionDetailContent />
    </RequireAuth>
  );
}
