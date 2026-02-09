"use client";

import { RequireAuth } from "@b2b/auth/react";
import { Button } from "@b2b/ui";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  QuoteBuilderSteps,
  DetailsStep,
  ProductsStep,
  ReviewStep,
} from "../../components";
import {
  QuoteBuilderProvider,
  useQuoteBuilder,
  type InitializeFromQuoteData,
} from "../../context/quote-builder-context";
import { useQuote, canEditQuote } from "../../hooks/use-quotes";

function QuoteEditPageSkeleton() {
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      <div className="h-8 w-64 bg-muted rounded animate-pulse" />
      <div className="h-12 w-full bg-muted rounded animate-pulse" />
      <div className="h-96 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

function QuoteEditInitializer({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const { initializeFromQuote } = useQuoteBuilder();
  const { data: quote, isLoading, isError } = useQuote(quoteId);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (quote && !initialized) {
      // Check if quote can be edited
      if (!canEditQuote(quote.status)) {
        router.replace(`/quotes/${quoteId}`);
        return;
      }

      // Initialize the builder with existing quote data
      const quoteData: InitializeFromQuoteData = {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        description: quote.description,
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        validUntil: quote.validUntil,
        notes: quote.notes,
        internalNotes: quote.internalNotes,
        discountPercent: quote.discountPercent,
        lineItems: quote.lineItems,
      };
      initializeFromQuote(quoteData);
      setInitialized(true);
    }
  }, [quote, initialized, initializeFromQuote, router, quoteId]);

  if (isLoading) {
    return <QuoteEditPageSkeleton />;
  }

  if (isError || !quote) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load quote</p>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!canEditQuote(quote.status)) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">
            This quote cannot be edited. Only draft quotes can be modified.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/quotes/${quoteId}`}>View Quote</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading quote...</span>
        </div>
      </div>
    );
  }

  return <QuoteEditContent quoteNumber={quote.quoteNumber} />;
}

function QuoteEditContent({ quoteNumber }: { quoteNumber: string }) {
  const { state: builderState } = useQuoteBuilder();

  // Don't show confirmation step in edit mode - redirect happens in ReviewStep
  if (builderState.currentStep === "confirmation") {
    return <QuoteEditPageSkeleton />;
  }

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
        <h1 className="text-2xl font-bold">Edit Quote</h1>
        <p className="text-muted-foreground">
          Editing {quoteNumber} - Make changes to your quote
        </p>
      </div>

      {/* Progress Steps */}
      <QuoteBuilderSteps currentStep={builderState.currentStep} />

      {/* Step Content */}
      {builderState.currentStep === "details" && <DetailsStep />}
      {builderState.currentStep === "products" && <ProductsStep />}
      {builderState.currentStep === "review" && <ReviewStep />}
    </div>
  );
}

export default function QuoteEditPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <RequireAuth
      fallback={<QuoteEditPageSkeleton />}
      redirectTo="/login"
    >
      <QuoteBuilderProvider>
        <QuoteEditInitializer quoteId={id} />
      </QuoteBuilderProvider>
    </RequireAuth>
  );
}
