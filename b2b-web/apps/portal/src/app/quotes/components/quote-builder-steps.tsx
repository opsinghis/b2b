"use client";

import { CheckCircle } from "lucide-react";

import type { QuoteBuilderStep } from "../context/quote-builder-context";

interface QuoteBuilderStepsProps {
  currentStep: QuoteBuilderStep;
}

const STEPS = [
  { id: "details" as const, label: "Quote Details" },
  { id: "products" as const, label: "Add Products" },
  { id: "review" as const, label: "Review" },
  { id: "confirmation" as const, label: "Done" },
];

export function QuoteBuilderSteps({ currentStep }: QuoteBuilderStepsProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              index < currentIndex
                ? "bg-green-600 text-white"
                : index === currentIndex
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {index < currentIndex ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </div>
          <span
            className={`ml-2 text-sm ${
              index === currentIndex ? "font-medium" : "text-muted-foreground"
            } hidden sm:inline`}
          >
            {step.label}
          </span>
          {index < STEPS.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-2 ${
                index < currentIndex ? "bg-green-600" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
