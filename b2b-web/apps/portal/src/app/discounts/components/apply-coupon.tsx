"use client";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@b2b/ui";
import {
  Tag,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";

import {
  useValidateCoupon,
  useApplyCoupon,
  formatPrice,
  getPromotionValueDisplay,
} from "../hooks";

export function ApplyCoupon() {
  const [code, setCode] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateCoupon = useValidateCoupon();
  const applyCoupon = useApplyCoupon();

  const handleValidate = async () => {
    if (!code.trim()) {
      setValidationError("Please enter a coupon code");
      return;
    }

    setValidationError(null);
    setSuccessMessage(null);

    try {
      const result = await validateCoupon.mutateAsync({
        code: code.trim().toUpperCase(),
        orderAmount: 0, // Will be validated without specific order context
      });

      if (result.isValid) {
        setSuccessMessage(
          result.promotion
            ? `Valid! ${result.promotion.name} - ${getPromotionValueDisplay(result.promotion)}`
            : "Coupon is valid!"
        );
      } else {
        setValidationError(result.message || "Invalid coupon code");
      }
    } catch {
      setValidationError("Failed to validate coupon. Please try again.");
    }
  };

  const handleApply = async () => {
    if (!code.trim()) {
      setValidationError("Please enter a coupon code");
      return;
    }

    setValidationError(null);
    setSuccessMessage(null);

    try {
      await applyCoupon.mutateAsync({
        code: code.trim().toUpperCase(),
        orderAmount: 0, // Cart will use actual cart total
      });
      setSuccessMessage("Coupon applied successfully to your cart!");
      setCode("");
    } catch {
      setValidationError("Failed to apply coupon. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleValidate();
    }
  };

  const isLoading = validateCoupon.isPending || applyCoupon.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Apply Coupon Code
        </CardTitle>
        <CardDescription>
          Have a coupon code? Enter it below to apply it to your cart
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter coupon code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setValidationError(null);
              setSuccessMessage(null);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 uppercase"
            disabled={isLoading}
          />
          <Button
            variant="outline"
            onClick={handleValidate}
            disabled={isLoading || !code.trim()}
          >
            {validateCoupon.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Validate"
            )}
          </Button>
          <Button
            onClick={handleApply}
            disabled={isLoading || !code.trim()}
          >
            {applyCoupon.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Apply"
            )}
          </Button>
        </div>

        {/* Validation Result */}
        {validationError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
            <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400">
              {validationError}
            </p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 dark:text-green-400">
              {successMessage}
            </p>
          </div>
        )}

        {/* Coupon Validation Details */}
        {validateCoupon.data?.isValid && validateCoupon.data.promotion && (
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {validateCoupon.data.promotion.name}
              </span>
              <span className="text-lg font-bold text-primary">
                {getPromotionValueDisplay(validateCoupon.data.promotion)}
              </span>
            </div>
            {validateCoupon.data.promotion.description && (
              <p className="text-sm text-muted-foreground">
                {validateCoupon.data.promotion.description}
              </p>
            )}
            {validateCoupon.data.discountAmount && (
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                You&apos;ll save {formatPrice(validateCoupon.data.discountAmount)} on this order
              </p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-2 border-t">
              {validateCoupon.data.promotion.minOrderAmount && (
                <span>
                  Min. order: {formatPrice(validateCoupon.data.promotion.minOrderAmount)}
                </span>
              )}
              {validateCoupon.data.promotion.maxDiscount && (
                <span>
                  Max discount: {formatPrice(validateCoupon.data.promotion.maxDiscount)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Coupon codes are case-insensitive. Only one coupon can be applied per
            order. Some coupons may have minimum order requirements.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
