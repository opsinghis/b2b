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
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Receipt,
} from "lucide-react";

import { useCheckout, type PaymentMethod } from "../context";

// =============================================================================
// Payment Method Card Component
// =============================================================================

interface PaymentMethodCardProps {
  method: PaymentMethod;
  title: string;
  description: string;
  icon: typeof CreditCard;
  isSelected: boolean;
  onSelect: () => void;
}

function PaymentMethodCard({
  title,
  description,
  icon: Icon,
  isSelected,
  onSelect,
}: PaymentMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-lg border-2 transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
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
        <div>
          <span className="font-medium">{title}</span>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// Payment Methods Data
// =============================================================================

const PAYMENT_METHODS: {
  id: PaymentMethod;
  title: string;
  description: string;
  icon: typeof CreditCard;
}[] = [
  {
    id: "invoice",
    title: "Invoice (Net 30)",
    description: "Pay within 30 days of invoice date",
    icon: Receipt,
  },
  {
    id: "purchase_order",
    title: "Purchase Order",
    description: "Reference your company PO number",
    icon: FileText,
  },
  {
    id: "credit_card",
    title: "Credit Card",
    description: "Pay securely with your credit card",
    icon: CreditCard,
  },
];

// =============================================================================
// Main Payment Step Component
// =============================================================================

export function PaymentStep() {
  const {
    state,
    setPaymentMethod,
    setPurchaseOrderNumber,
    nextStep,
    prevStep,
    canProceed,
  } = useCheckout();

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
          {PAYMENT_METHODS.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method.id}
              title={method.title}
              description={method.description}
              icon={method.icon}
              isSelected={state.paymentMethod === method.id}
              onSelect={() => setPaymentMethod(method.id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Purchase Order Number Input */}
      {state.paymentMethod === "purchase_order" && (
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
      {state.paymentMethod === "credit_card" && (
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
      {state.paymentMethod === "invoice" && (
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
