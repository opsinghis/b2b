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
  Switch,
  DatePicker,
} from "@b2b/ui";
import * as React from "react";

import {
  type CreatePromotionDto,
  type PromotionType,
  type BogoConfig,
  PROMOTION_TYPES,
} from "../hooks/use-promotions";

interface CreatePromotionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePromotionDto) => void;
  isLoading?: boolean;
}

interface FormErrors {
  name?: string;
  code?: string;
  discountValue?: string;
  startDate?: string;
  bogoConfig?: string;
}

export function CreatePromotionModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreatePromotionModalProps) {
  // Basic info
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<PromotionType>("PERCENTAGE");

  // Discount configuration
  const [discountValue, setDiscountValue] = React.useState("");
  const [maxDiscountAmount, setMaxDiscountAmount] = React.useState("");

  // BOGO configuration
  const [buyQuantity, setBuyQuantity] = React.useState("1");
  const [getQuantity, setGetQuantity] = React.useState("1");
  const [bogoDiscountPercent, setBogoDiscountPercent] = React.useState("100");

  // Conditions
  const [minOrderValue, setMinOrderValue] = React.useState("");
  const [minQuantity, setMinQuantity] = React.useState("");

  // Scheduling
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = React.useState<Date | undefined>();
  const [hasEndDate, setHasEndDate] = React.useState(false);

  // Usage limits
  const [totalUsageLimit, setTotalUsageLimit] = React.useState("");
  const [perUserLimit, setPerUserLimit] = React.useState("");
  const [hasUsageLimit, setHasUsageLimit] = React.useState(false);

  // Coupon
  const [isCouponBased, setIsCouponBased] = React.useState(false);

  // Other options
  const [stackable, setStackable] = React.useState(false);
  const [priority, setPriority] = React.useState("1");
  const [isActive, setIsActive] = React.useState(true);

  const [errors, setErrors] = React.useState<FormErrors>({});

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setType("PERCENTAGE");
    setDiscountValue("");
    setMaxDiscountAmount("");
    setBuyQuantity("1");
    setGetQuantity("1");
    setBogoDiscountPercent("100");
    setMinOrderValue("");
    setMinQuantity("");
    setStartDate(new Date());
    setEndDate(undefined);
    setHasEndDate(false);
    setTotalUsageLimit("");
    setPerUserLimit("");
    setHasUsageLimit(false);
    setIsCouponBased(false);
    setStackable(false);
    setPriority("1");
    setIsActive(true);
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
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 10);
      setCode(generated);
    }
  }, [name, code]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (isCouponBased && !code.trim()) {
      newErrors.code = "Code is required for coupon-based promotions";
    } else if (code && !/^[A-Z0-9_-]+$/.test(code)) {
      newErrors.code = "Code must be uppercase letters, numbers, dashes, and underscores only";
    }

    if (type !== "FREE_SHIPPING" && type !== "BOGO") {
      const discount = parseFloat(discountValue);
      if (type === "PERCENTAGE") {
        if (isNaN(discount) || discount <= 0 || discount > 100) {
          newErrors.discountValue = "Discount must be between 1 and 100";
        }
      } else if (type === "FIXED_AMOUNT") {
        if (isNaN(discount) || discount <= 0) {
          newErrors.discountValue = "Discount must be greater than 0";
        }
      }
    }

    if (type === "BOGO") {
      const buy = parseInt(buyQuantity, 10);
      const get = parseInt(getQuantity, 10);
      const discount = parseInt(bogoDiscountPercent, 10);
      if (isNaN(buy) || buy < 1) {
        newErrors.bogoConfig = "Buy quantity must be at least 1";
      } else if (isNaN(get) || get < 1) {
        newErrors.bogoConfig = "Get quantity must be at least 1";
      } else if (isNaN(discount) || discount < 1 || discount > 100) {
        newErrors.bogoConfig = "BOGO discount must be between 1 and 100";
      }
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    let bogoConfig: BogoConfig | undefined;
    if (type === "BOGO") {
      bogoConfig = {
        buyQuantity: parseInt(buyQuantity, 10),
        getQuantity: parseInt(getQuantity, 10),
        discountPercent: parseInt(bogoDiscountPercent, 10),
      };
    }

    const promotionData: CreatePromotionDto = {
      name,
      code: code || undefined,
      description: description || undefined,
      type,
      discountValue: type === "BOGO" ? 0 : type === "FREE_SHIPPING" ? 0 : parseFloat(discountValue),
      maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : undefined,
      bogoConfig,
      minOrderValue: minOrderValue ? parseFloat(minOrderValue) : undefined,
      minQuantity: minQuantity ? parseInt(minQuantity, 10) : undefined,
      startDate: startDate!.toISOString(),
      endDate: hasEndDate && endDate ? endDate.toISOString() : undefined,
      totalUsageLimit: hasUsageLimit && totalUsageLimit ? parseInt(totalUsageLimit, 10) : undefined,
      perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : undefined,
      isCouponBased,
      priority: parseInt(priority, 10),
      stackable,
      isActive,
    };

    onSubmit(promotionData);
  };

  const getDiscountInputLabel = () => {
    switch (type) {
      case "PERCENTAGE":
        return "Discount Percentage";
      case "FIXED_AMOUNT":
        return "Discount Amount ($)";
      default:
        return "Discount Value";
    }
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Create Promotion</ModalTitle>
            <ModalDescription>
              Create a new promotion or coupon with customizable conditions and limits.
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="promo-name">Name</Label>
                  <Input
                    id="promo-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Summer Sale 20% Off"
                    error={!!errors.name}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promo-code">Code (Optional)</Label>
                  <Input
                    id="promo-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., SUMMER20"
                    error={!!errors.code}
                    disabled={isLoading}
                  />
                  {errors.code && (
                    <p className="text-sm text-destructive">{errors.code}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-type">Promotion Type</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as PromotionType)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="promo-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMOTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div>
                          <p className="font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo-description">Description (Optional)</Label>
                <textarea
                  id="promo-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[60px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Describe this promotion..."
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Discount Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Discount Configuration</h3>

              {type === "BOGO" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="buy-qty">Buy Quantity</Label>
                      <Input
                        id="buy-qty"
                        type="number"
                        min="1"
                        value={buyQuantity}
                        onChange={(e) => setBuyQuantity(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="get-qty">Get Quantity</Label>
                      <Input
                        id="get-qty"
                        type="number"
                        min="1"
                        value={getQuantity}
                        onChange={(e) => setGetQuantity(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bogo-discount">Discount %</Label>
                      <Input
                        id="bogo-discount"
                        type="number"
                        min="1"
                        max="100"
                        value={bogoDiscountPercent}
                        onChange={(e) => setBogoDiscountPercent(e.target.value)}
                        disabled={isLoading}
                        placeholder="100 = Free"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {bogoDiscountPercent === "100"
                      ? `Buy ${buyQuantity}, Get ${getQuantity} Free`
                      : `Buy ${buyQuantity}, Get ${getQuantity} at ${bogoDiscountPercent}% off`}
                  </p>
                  {errors.bogoConfig && (
                    <p className="text-sm text-destructive">{errors.bogoConfig}</p>
                  )}
                </div>
              ) : type === "FREE_SHIPPING" ? (
                <p className="text-sm text-muted-foreground">
                  This promotion will waive shipping costs for qualifying orders.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount-value">{getDiscountInputLabel()}</Label>
                    <div className="relative">
                      <Input
                        id="discount-value"
                        type="number"
                        min="0"
                        max={type === "PERCENTAGE" ? "100" : undefined}
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={type === "PERCENTAGE" ? "e.g., 20" : "e.g., 10.00"}
                        error={!!errors.discountValue}
                        disabled={isLoading}
                        className={type === "PERCENTAGE" ? "pr-8" : "pl-6"}
                      />
                      {type === "PERCENTAGE" && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      )}
                      {type === "FIXED_AMOUNT" && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                      )}
                    </div>
                    {errors.discountValue && (
                      <p className="text-sm text-destructive">{errors.discountValue}</p>
                    )}
                  </div>

                  {type === "PERCENTAGE" && (
                    <div className="space-y-2">
                      <Label htmlFor="max-discount">Max Discount Amount (Optional)</Label>
                      <div className="relative">
                        <Input
                          id="max-discount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={maxDiscountAmount}
                          onChange={(e) => setMaxDiscountAmount(e.target.value)}
                          placeholder="e.g., 50.00"
                          disabled={isLoading}
                          className="pl-6"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cap the maximum discount amount
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conditions */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Conditions</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-order">Minimum Order Value (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="min-order"
                      type="number"
                      min="0"
                      step="0.01"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      placeholder="e.g., 50.00"
                      disabled={isLoading}
                      className="pl-6"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min-qty">Minimum Quantity (Optional)</Label>
                  <Input
                    id="min-qty"
                    type="number"
                    min="1"
                    step="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    placeholder="e.g., 3"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Scheduling</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    disabled={isLoading}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-destructive">{errors.startDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>End Date</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={hasEndDate}
                        onCheckedChange={setHasEndDate}
                        disabled={isLoading}
                      />
                      <span className="text-xs text-muted-foreground">Set end date</span>
                    </div>
                  </div>
                  {hasEndDate && (
                    <DatePicker
                      value={endDate}
                      onChange={setEndDate}
                      disabled={isLoading}
                    />
                  )}
                  {!hasEndDate && (
                    <p className="text-sm text-muted-foreground">
                      Promotion will run indefinitely
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Limits */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Usage Limits</h3>

              <div className="flex items-center gap-2 mb-3">
                <Switch
                  checked={hasUsageLimit}
                  onCheckedChange={setHasUsageLimit}
                  disabled={isLoading}
                />
                <span className="text-sm">Enable usage limits</span>
              </div>

              {hasUsageLimit && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="total-limit">Total Usage Limit</Label>
                    <Input
                      id="total-limit"
                      type="number"
                      min="1"
                      value={totalUsageLimit}
                      onChange={(e) => setTotalUsageLimit(e.target.value)}
                      placeholder="e.g., 1000"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum total redemptions
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="per-user-limit">Per User Limit</Label>
                    <Input
                      id="per-user-limit"
                      type="number"
                      min="1"
                      value={perUserLimit}
                      onChange={(e) => setPerUserLimit(e.target.value)}
                      placeholder="e.g., 1"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum uses per customer
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2">Options</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isCouponBased}
                    onCheckedChange={setIsCouponBased}
                    disabled={isLoading}
                  />
                  <div>
                    <Label className="cursor-pointer">Coupon-based</Label>
                    <p className="text-xs text-muted-foreground">
                      Requires code entry at checkout
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={stackable}
                    onCheckedChange={setStackable}
                    disabled={isLoading}
                  />
                  <div>
                    <Label className="cursor-pointer">Stackable</Label>
                    <p className="text-xs text-muted-foreground">
                      Can combine with other promotions
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher priority applies first (1 = highest)
                  </p>
                </div>

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
                      <SelectItem value="inactive">Inactive (Draft)</SelectItem>
                    </SelectContent>
                  </Select>
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
              {isLoading ? "Creating..." : "Create Promotion"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
