"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn,
} from "@b2b/ui";
import {
  AlertCircle,
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Info,
  Receipt,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { useCheckout, type PaymentMethodType } from "../context";
import {
  usePaymentMethods,
  useSalaryDeduction,
  formatPrice,
  type PaymentMethod,
  type PaymentMethodType as ApiPaymentMethodType,
} from "../hooks";

import { useCart } from "@/app/cart/hooks";

// =============================================================================
// Icon Mapping
// =============================================================================

const PAYMENT_METHOD_ICONS: Record<ApiPaymentMethodType, typeof CreditCard> = {
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  BANK_TRANSFER: Banknote,
  SALARY_DEDUCTION: Wallet,
  INVOICE: Receipt,
  WALLET: Wallet,
};

function getPaymentMethodType(apiType: ApiPaymentMethodType): PaymentMethodType {
  const mapping: Record<ApiPaymentMethodType, PaymentMethodType> = {
    CREDIT_CARD: "credit_card",
    DEBIT_CARD: "credit_card",
    BANK_TRANSFER: "invoice",
    SALARY_DEDUCTION: "salary_deduction",
    INVOICE: "invoice",
    WALLET: "credit_card",
  };
  return mapping[apiType] || "invoice";
}

// =============================================================================
// Salary Deduction Info Component
// =============================================================================

interface SalaryDeductionInfoProps {
  monthlyLimit: string;
  usedAmount: string;
  remainingAmount: string;
  periodEnd: string;
  orderTotal: number;
}

function SalaryDeductionInfo({
  monthlyLimit,
  usedAmount,
  remainingAmount,
  periodEnd,
  orderTotal,
}: SalaryDeductionInfoProps) {
  const limit = parseFloat(monthlyLimit);
  const used = parseFloat(usedAmount);
  const remaining = parseFloat(remainingAmount);
  const usagePercent = limit > 0 ? (used / limit) * 100 : 0;
  const canAfford = remaining >= orderTotal;

  const periodEndDate = new Date(periodEnd);
  const formattedPeriodEnd = periodEndDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className={cn(
      "border-2",
      canAfford ? "border-primary/30 bg-primary/5" : "border-amber-500/30 bg-amber-50 dark:bg-amber-900/10"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Salary Deduction Limit
        </CardTitle>
        <CardDescription>
          Resets on {formattedPeriodEnd}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used this period</span>
            <span className="font-medium">{formatPrice(used)} / {formatPrice(limit)}</span>
          </div>
          {/* Simple progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm font-medium">Available Balance</span>
          <span className={cn(
            "text-lg font-bold",
            canAfford ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
          )}>
            {formatPrice(remaining)}
          </span>
        </div>

        {!canAfford && (
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Your order total ({formatPrice(orderTotal)}) exceeds your remaining balance.
                Please select a different payment method or reduce your order.
              </p>
            </div>
          </div>
        )}

        <Link
          href="/payment-history"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          View payment history
          <ChevronRight className="w-3 h-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Payment Method Card Component
// =============================================================================

interface PaymentMethodCardProps {
  method: PaymentMethod;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

function PaymentMethodCard({
  method,
  isSelected,
  onSelect,
  disabled,
  disabledReason,
}: PaymentMethodCardProps) {
  const Icon = PAYMENT_METHOD_ICONS[method.type] || Receipt;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "w-full text-left p-4 rounded-lg border-2 transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : disabled
          ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
          : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
          )}
        >
          {isSelected ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <span className="font-medium">{method.name}</span>
          {method.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{method.description}</p>
          )}
          {disabled && disabledReason && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {disabledReason}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// Main Payment Step Component
// =============================================================================

export function PaymentStep() {
  const {
    state,
    setPaymentMethodType,
    setSelectedPaymentMethod,
    setPurchaseOrderNumber,
    nextStep,
    prevStep,
    canProceed,
  } = useCheckout();

  const { data: cart } = useCart();
  const orderTotal = cart ? parseFloat(cart.total) : 0;

  const { data: paymentMethods, isLoading: isLoadingMethods } = usePaymentMethods(orderTotal);
  const { data: salaryDeduction, isLoading: isLoadingSalary } = useSalaryDeduction();

  const isLoading = isLoadingMethods || isLoadingSalary;

  // Auto-select first available payment method if none selected
  useEffect(() => {
    if (paymentMethods && paymentMethods.length > 0 && !state.selectedPaymentMethod) {
      const firstActive = paymentMethods.find((m) => m.isActive);
      if (firstActive) {
        setSelectedPaymentMethod(firstActive);
        setPaymentMethodType(getPaymentMethodType(firstActive.type));
      }
    }
  }, [paymentMethods, state.selectedPaymentMethod, setSelectedPaymentMethod, setPaymentMethodType]);

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    // Check if salary deduction can afford the order
    if (method.type === "SALARY_DEDUCTION" && salaryDeduction) {
      const remaining = parseFloat(salaryDeduction.remainingAmount);
      if (remaining < orderTotal) {
        return; // Cannot select - insufficient balance
      }
    }

    setSelectedPaymentMethod(method);
    setPaymentMethodType(getPaymentMethodType(method.type));
  };

  const isSalaryDeductionSelected = state.selectedPaymentMethod?.type === "SALARY_DEDUCTION";
  const isPurchaseOrderSelected = state.paymentMethodType === "purchase_order" ||
    state.selectedPaymentMethod?.code?.toLowerCase().includes("po");
  const isCreditCardSelected = state.selectedPaymentMethod?.type === "CREDIT_CARD" ||
    state.selectedPaymentMethod?.type === "DEBIT_CARD";
  const isInvoiceSelected = state.selectedPaymentMethod?.type === "INVOICE";

  // Check if salary deduction can afford the order
  const canUseSalaryDeduction = salaryDeduction?.isEnabled &&
    parseFloat(salaryDeduction?.remainingAmount || "0") >= orderTotal;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Method
          </CardTitle>
          <CardDescription>
            Select how you would like to pay for your order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods && paymentMethods.length > 0 ? (
            paymentMethods
              .filter((m) => m.isActive)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((method) => {
                const isSalaryDeduction = method.type === "SALARY_DEDUCTION";
                const insufficientBalance = isSalaryDeduction && salaryDeduction &&
                  parseFloat(salaryDeduction.remainingAmount) < orderTotal;
                const salaryNotEnabled = isSalaryDeduction && (!salaryDeduction || !salaryDeduction.isEnabled);

                return (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    isSelected={state.selectedPaymentMethod?.id === method.id}
                    onSelect={() => handleSelectPaymentMethod(method)}
                    disabled={insufficientBalance || salaryNotEnabled}
                    disabledReason={
                      salaryNotEnabled
                        ? "Salary deduction is not available for your account"
                        : insufficientBalance
                        ? "Insufficient balance for this order"
                        : undefined
                    }
                  />
                );
              })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>No payment methods available</p>
              <p className="text-sm mt-1">Please contact support for assistance</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Deduction Details */}
      {isSalaryDeductionSelected && salaryDeduction && (
        <SalaryDeductionInfo
          monthlyLimit={salaryDeduction.monthlyLimit}
          usedAmount={salaryDeduction.usedAmount}
          remainingAmount={salaryDeduction.remainingAmount}
          periodEnd={salaryDeduction.periodEnd}
          orderTotal={orderTotal}
        />
      )}

      {/* Non-selected but available salary deduction info */}
      {!isSalaryDeductionSelected && salaryDeduction?.isEnabled && canUseSalaryDeduction && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Salary Deduction Available</p>
                <p>
                  You have {formatPrice(salaryDeduction.remainingAmount)} available for salary deduction this period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Order Number Input */}
      {isPurchaseOrderSelected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Purchase Order Details</CardTitle>
            <CardDescription>
              Enter your company purchase order number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="poNumber">PO Number</Label>
              <Input
                id="poNumber"
                placeholder="e.g., PO-2024-12345"
                value={state.purchaseOrderNumber}
                onChange={(e) => setPurchaseOrderNumber(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Card Notice */}
      {isCreditCardSelected && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Secure Payment</p>
                <p>
                  You will be redirected to our secure payment processor to
                  complete your payment after reviewing your order.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Notice */}
      {isInvoiceSelected && (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Receipt className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Invoice Terms</p>
                <p>
                  An invoice will be sent to your billing email address. Payment
                  is due within 30 days of the invoice date.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History Link */}
      <div className="flex items-center justify-center">
        <Link
          href="/payment-history"
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          View your payment history
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" size="lg" onClick={prevStep}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Delivery
        </Button>
        <Button size="lg" onClick={nextStep} disabled={!canProceed()}>
          Review Order
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
