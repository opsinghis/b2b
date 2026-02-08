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
} from "@b2b/ui";
import { ChevronRight, FileText } from "lucide-react";

import { useQuoteBuilder } from "../context/quote-builder-context";

export function DetailsStep() {
  const {
    state,
    setTitle,
    setDescription,
    setCustomerName,
    setCustomerEmail,
    setValidUntil,
    setNotes,
    setDiscountPercent,
    nextStep,
    canProceed,
  } = useQuoteBuilder();

  const handleContinue = () => {
    if (canProceed()) {
      nextStep();
    }
  };

  // Get default valid until date (30 days from now)
  const getDefaultValidUntil = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Step 1: Quote Details
          </CardTitle>
          <CardDescription>
            Enter the basic information for this quote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quote Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Quote Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Office Supplies Q1 2024"
              value={state.title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={state.isProcessing}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Brief description of the quote..."
              value={state.description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={state.isProcessing}
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Customer Information */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                placeholder="Customer or company name"
                value={state.customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={state.isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="customer@example.com"
                value={state.customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={state.isProcessing}
              />
            </div>
          </div>

          {/* Valid Until and Discount */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={state.validUntil || getDefaultValidUntil()}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={state.isProcessing}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountPercent">Overall Discount (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                placeholder="0"
                value={state.discountPercent || ""}
                onChange={(e) =>
                  setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
                }
                disabled={state.isProcessing}
                min={0}
                max={100}
                step={0.5}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Customer</Label>
            <textarea
              id="notes"
              placeholder="Notes that will be visible to the customer..."
              value={state.notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={state.isProcessing}
              rows={2}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!canProceed() || state.isProcessing}
        >
          Continue to Products
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
