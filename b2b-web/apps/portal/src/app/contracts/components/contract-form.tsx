"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@b2b/ui";
import { Save, Send, Loader2 } from "lucide-react";
import { useState } from "react";

import { CreateContractData } from "../hooks";

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
];

interface ContractFormProps {
  onSave: (data: CreateContractData) => Promise<void>;
  onSaveAndSubmit: (data: CreateContractData) => Promise<void>;
  isSaving?: boolean;
  isSubmitting?: boolean;
  initialData?: Partial<CreateContractData>;
}

export function ContractForm({
  onSave,
  onSaveAndSubmit,
  isSaving = false,
  isSubmitting = false,
  initialData,
}: ContractFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [effectiveDate, setEffectiveDate] = useState(initialData?.effectiveDate || "");
  const [expirationDate, setExpirationDate] = useState(initialData?.expirationDate || "");
  const [totalValue, setTotalValue] = useState(
    initialData?.totalValue?.toString() || ""
  );
  const [currency, setCurrency] = useState(initialData?.currency || "USD");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (effectiveDate && expirationDate) {
      const start = new Date(effectiveDate);
      const end = new Date(expirationDate);
      if (end <= start) {
        newErrors.expirationDate = "Expiration date must be after effective date";
      }
    }

    if (totalValue && (isNaN(Number(totalValue)) || Number(totalValue) < 0)) {
      newErrors.totalValue = "Total value must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getFormData = (): CreateContractData => ({
    title: title.trim(),
    description: description.trim() || undefined,
    effectiveDate: effectiveDate || undefined,
    expirationDate: expirationDate || undefined,
    totalValue: totalValue ? Number(totalValue) : undefined,
    currency: currency || undefined,
  });

  const handleSave = async () => {
    if (!validate()) return;
    await onSave(getFormData());
  };

  const handleSaveAndSubmit = async () => {
    if (!validate()) return;
    await onSaveAndSubmit(getFormData());
  };

  const isProcessing = isSaving || isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter contract title"
            error={!!errors.title}
            disabled={isProcessing}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter contract description"
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isProcessing}
          />
        </div>

        {/* Dates Row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective Date</Label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expirationDate">Expiration Date</Label>
            <Input
              id="expirationDate"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              error={!!errors.expirationDate}
              disabled={isProcessing}
            />
            {errors.expirationDate && (
              <p className="text-sm text-destructive">{errors.expirationDate}</p>
            )}
          </div>
        </div>

        {/* Value and Currency Row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="totalValue">Total Value</Label>
            <Input
              id="totalValue"
              type="number"
              min="0"
              step="0.01"
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
              placeholder="0.00"
              error={!!errors.totalValue}
              disabled={isProcessing}
            />
            {errors.totalValue && (
              <p className="text-sm text-destructive">{errors.totalValue}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency} disabled={isProcessing}>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isProcessing}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </>
            )}
          </Button>
          <Button onClick={handleSaveAndSubmit} disabled={isProcessing}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Save & Submit for Review
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
