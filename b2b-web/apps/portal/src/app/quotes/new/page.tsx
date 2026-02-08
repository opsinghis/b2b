"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import {
  QuoteBuilderSteps,
  DetailsStep,
  ProductsStep,
  ReviewStep,
  ConfirmationStep,
} from "../components";
import {
  QuoteBuilderProvider,
  useQuoteBuilder,
} from "../context/quote-builder-context";

function QuoteBuilderPageSkeleton() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-12 w-full bg-muted rounded animate-pulse" />
      <div className="h-96 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

function QuoteBuilderContent() {
  const { state } = useQuoteBuilder();

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/quotes">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Create New Quote</h1>
        <p className="text-muted-foreground">
          Build a quote by selecting products and customizing pricing
        </p>
      </div>

      {/* Progress Steps */}
      <QuoteBuilderSteps currentStep={state.currentStep} />

      {/* Step Content */}
      {state.currentStep === "details" && <DetailsStep />}
      {state.currentStep === "products" && <ProductsStep />}
      {state.currentStep === "review" && <ReviewStep />}
      {state.currentStep === "confirmation" && <ConfirmationStep />}
    </div>
  );
}

export default function QuoteBuilderPage() {
  return (
    <RequireAuth
      fallback={<QuoteBuilderPageSkeleton />}
      redirectTo="/login"
    >
      <QuoteBuilderProvider>
        <QuoteBuilderContent />
      </QuoteBuilderProvider>
    </RequireAuth>
  );
}
