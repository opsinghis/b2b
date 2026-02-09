"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import Link from "next/link";

import {
  CheckoutProgress,
  AddressStep,
  DeliveryStep,
  PaymentStep,
  ReviewStep,
  ConfirmationStep,
} from "./components";
import { CheckoutProvider, useCheckout } from "./context";

import { useCart } from "@/app/cart/hooks";

// =============================================================================
// Checkout Page Skeleton
// =============================================================================

function CheckoutPageSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="animate-pulse space-y-8">
          {/* Progress Bar Skeleton */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="w-16 h-4 rounded bg-muted" />
                </div>
                {i < 4 && <div className="flex-1 h-0.5 mx-4 bg-muted" />}
              </div>
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="space-y-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Empty Cart View
// =============================================================================

function EmptyCartView() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">
            Add some products to your cart before proceeding to checkout.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild>
              <Link href="/catalog">Browse Products</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Checkout Content (Renders Current Step)
// =============================================================================

function CheckoutContent() {
  const { state, goToStep } = useCheckout();
  const { data: cart, isLoading } = useCart();

  // Show skeleton while loading cart
  if (isLoading) {
    return <CheckoutPageSkeleton />;
  }

  // Show empty cart view if cart is empty (except on confirmation page)
  if (
    state.currentStep !== "confirmation" &&
    (!cart || cart.items.length === 0)
  ) {
    return <EmptyCartView />;
  }

  // Render the appropriate step
  const renderStep = () => {
    switch (state.currentStep) {
      case "address":
        return <AddressStep />;
      case "delivery":
        return <DeliveryStep />;
      case "payment":
        return <PaymentStep />;
      case "review":
        return <ReviewStep />;
      case "confirmation":
        return <ConfirmationStep />;
      default:
        return <AddressStep />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Progress Indicator */}
          <CheckoutProgress
            currentStep={state.currentStep}
            onStepClick={goToStep}
          />

          {/* Step Content */}
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Checkout Page Component
// =============================================================================

export default function CheckoutPage() {
  return (
    <RequireAuth fallback={<CheckoutPageSkeleton />} redirectTo="/login">
      <CheckoutProvider>
        <CheckoutContent />
      </CheckoutProvider>
    </RequireAuth>
  );
}
