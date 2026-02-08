"use client";

import { cn } from "@b2b/ui";
import { Check, MapPin, Truck, CreditCard, ClipboardCheck } from "lucide-react";

import type { CheckoutStep } from "../context";

interface CheckoutProgressProps {
  currentStep: CheckoutStep;
  onStepClick?: (step: CheckoutStep) => void;
}

const STEPS: { id: CheckoutStep; label: string; icon: typeof Check }[] = [
  { id: "address", label: "Address", icon: MapPin },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "review", label: "Review", icon: ClipboardCheck },
];

export function CheckoutProgress({
  currentStep,
  onStepClick,
}: CheckoutProgressProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Don't show progress on confirmation
  if (currentStep === "confirmation") {
    return null;
  }

  return (
    <nav aria-label="Checkout progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;

          return (
            <li key={step.id} className="flex items-center flex-1">
              <button
                type="button"
                onClick={() => isCompleted && onStepClick?.(step.id)}
                disabled={!isCompleted}
                className={cn(
                  "flex flex-col items-center gap-2 flex-1",
                  isCompleted && "cursor-pointer",
                  !isCompleted && !isCurrent && "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                    isCompleted &&
                      "bg-primary border-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary text-primary bg-primary/10",
                    !isCompleted &&
                      !isCurrent &&
                      "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent && "text-primary",
                    isCompleted && "text-foreground",
                    !isCompleted && !isCurrent && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4 -mt-6",
                    index < currentIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
