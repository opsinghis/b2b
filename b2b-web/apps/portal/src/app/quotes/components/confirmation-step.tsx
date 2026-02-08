"use client";

import { Button, Card, CardContent } from "@b2b/ui";
import { CheckCircle, FileText, Plus } from "lucide-react";
import Link from "next/link";

import { formatPrice } from "../../catalog/hooks/use-catalog";
import { useQuoteBuilder } from "../context/quote-builder-context";

export function ConfirmationStep() {
  const { state, reset, total } = useQuoteBuilder();

  const handleCreateAnother = () => {
    reset();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
            <h2 className="text-2xl font-bold">Quote Created Successfully!</h2>
            <p className="text-muted-foreground mt-2">
              Quote #{state.quoteNumber} has been created
            </p>
          </div>

          {/* Quote Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quote Number</span>
              <span className="font-medium">{state.quoteNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Title</span>
              <span className="font-medium">{state.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium">{state.lineItems.length}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{formatPrice(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button variant="outline" onClick={handleCreateAnother}>
          <Plus className="h-4 w-4 mr-2" />
          Create Another Quote
        </Button>
        <Button asChild>
          <Link href={`/quotes/${state.savedQuoteId}`}>
            <FileText className="h-4 w-4 mr-2" />
            View Quote Details
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/quotes">View All Quotes</Link>
        </Button>
      </div>
    </div>
  );
}
