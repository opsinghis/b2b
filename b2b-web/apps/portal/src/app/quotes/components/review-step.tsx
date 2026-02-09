"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  useToast,
} from "@b2b/ui";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Loader2,
  Mail,
  Percent,
  Save,
  Send,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { formatPrice } from "../../catalog/hooks/use-catalog";
import { useQuoteBuilder } from "../context/quote-builder-context";
import { useCreateQuote, useUpdateQuote, useSubmitQuote, formatDate } from "../hooks/use-quotes";

export function ReviewStep() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    state,
    prevStep,
    nextStep,
    setProcessing,
    setError,
    setSavedQuote,
    subtotal,
    discountAmount,
    total,
  } = useQuoteBuilder();

  const { mutateAsync: createQuote, isPending: isCreating } = useCreateQuote();
  const { mutateAsync: updateQuote, isPending: isUpdating } = useUpdateQuote();
  const { mutateAsync: submitQuote, isPending: isSubmitting } = useSubmitQuote();

  const isProcessing = isCreating || isUpdating || isSubmitting || state.isProcessing;

  const buildQuotePayload = () => ({
    title: state.title,
    description: state.description || undefined,
    customerName: state.customerName || undefined,
    customerEmail: state.customerEmail || undefined,
    validUntil: state.validUntil || undefined,
    notes: state.notes || undefined,
    internalNotes: state.internalNotes || undefined,
    discountPercent: state.discountPercent || undefined,
    lineItems: state.lineItems.map((item) => ({
      masterProductId: item.product.id,
      quantity: item.quantity,
      unitPrice: item.priceOverride ? item.unitPrice : undefined,
      notes: item.notes || undefined,
    })),
  });

  const handleSaveAsDraft = async () => {
    try {
      setProcessing(true);
      setError(null);

      const payload = buildQuotePayload();

      let result;
      if (state.isEditMode && state.editingQuoteId) {
        // Update existing quote
        result = await updateQuote({ id: state.editingQuoteId, data: payload });
        addToast({
          title: "Quote updated",
          description: `Quote #${result.quoteNumber} has been updated`,
          variant: "success",
        });
        queryClient.invalidateQueries({ queryKey: ["quotes"] });
        // Redirect to quote detail page after edit
        router.push(`/quotes/${state.editingQuoteId}`);
      } else {
        // Create new quote
        result = await createQuote(payload);
        setSavedQuote(result.id, result.quoteNumber);
        addToast({
          title: "Quote saved as draft",
          description: `Quote #${result.quoteNumber} has been saved`,
          variant: "success",
        });
        queryClient.invalidateQueries({ queryKey: ["quotes"] });
        nextStep();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save quote";
      setError(message);
      addToast({
        title: "Failed to save quote",
        description: message,
        variant: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      setProcessing(true);
      setError(null);

      const payload = buildQuotePayload();
      let quoteId: string;
      let quoteNumber: string;

      if (state.isEditMode && state.editingQuoteId) {
        // Update existing quote first
        const result = await updateQuote({ id: state.editingQuoteId, data: payload });
        quoteId = result.id;
        quoteNumber = result.quoteNumber;
      } else {
        // Create new quote first
        const result = await createQuote(payload);
        quoteId = result.id;
        quoteNumber = result.quoteNumber;
      }

      // Then submit it for approval
      await submitQuote({ id: quoteId });

      addToast({
        title: "Quote submitted for approval",
        description: `Quote #${quoteNumber} has been submitted`,
        variant: "success",
      });

      queryClient.invalidateQueries({ queryKey: ["quotes"] });

      if (state.isEditMode) {
        // Redirect to quote detail page after edit + submit
        router.push(`/quotes/${quoteId}`);
      } else {
        setSavedQuote(quoteId, quoteNumber);
        nextStep();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit quote";
      setError(message);
      addToast({
        title: "Failed to submit quote",
        description: message,
        variant: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quote Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Step 3: Review Quote
          </CardTitle>
          <CardDescription>
            Review the quote details before saving or submitting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quote Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Quote Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <p className="font-medium">{state.title}</p>
              </div>
              {state.description && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm">{state.description}</p>
                </div>
              )}
            </div>

            {/* Customer Info */}
            {(state.customerName || state.customerEmail) && (
              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                {state.customerName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{state.customerName}</span>
                  </div>
                )}
                {state.customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{state.customerEmail}</span>
                  </div>
                )}
              </div>
            )}

            {/* Validity and Discount */}
            <div className="flex flex-wrap gap-4 pt-4 border-t">
              {state.validUntil && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Valid until {formatDate(state.validUntil)}
                  </span>
                </div>
              )}
              {state.discountPercent > 0 && (
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {state.discountPercent}% discount applied
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <h3 className="font-semibold">Line Items ({state.lineItems.length})</h3>
            <div className="border rounded-lg divide-y">
              {state.lineItems.map((item) => (
                <div key={item.id} className="p-3 flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.product.sku}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.quantity} x {formatPrice(item.unitPrice)}
                      {item.priceOverride && (
                        <span className="ml-2 text-xs text-blue-600">
                          (custom price)
                        </span>
                      )}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold ml-4">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount ({state.discountPercent}%)</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Notes */}
          {state.notes && (
            <div className="space-y-1 pt-4 border-t">
              <Label className="text-xs text-muted-foreground">
                Notes for Customer
              </Label>
              <p className="text-sm">{state.notes}</p>
            </div>
          )}

          {/* Error Display */}
          {state.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={isProcessing}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleSaveAsDraft}
            disabled={isProcessing}
          >
            {(isCreating || isUpdating) && !isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {state.isEditMode ? "Save Changes" : "Save as Draft"}
          </Button>
          <Button
            onClick={handleSubmitForApproval}
            disabled={isProcessing}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {state.isEditMode ? "Save & Submit for Approval" : "Submit for Approval"}
          </Button>
        </div>
      </div>
    </div>
  );
}
