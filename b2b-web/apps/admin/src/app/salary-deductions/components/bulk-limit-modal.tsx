"use client";

import {
  Button,
  Input,
  Label,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@b2b/ui";
import { useState, type FormEvent } from "react";

import type { BulkUpdateLimitDto } from "../hooks/use-salary-deductions";
import { DEFAULT_MONTHLY_LIMITS } from "../hooks/use-salary-deductions";

interface BulkLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedUserIds: string[];
  onSubmit: (data: BulkUpdateLimitDto) => void;
  isLoading?: boolean;
}

export function BulkLimitModal({
  open,
  onOpenChange,
  selectedCount,
  selectedUserIds,
  onSubmit,
  isLoading,
}: BulkLimitModalProps) {
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ monthlyLimit?: string }>({});

  const resetForm = () => {
    setMonthlyLimit("");
    setNotes("");
    setErrors({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const validateForm = (): boolean => {
    const newErrors: { monthlyLimit?: string } = {};
    const limitValue = parseFloat(monthlyLimit);

    if (!monthlyLimit || isNaN(limitValue)) {
      newErrors.monthlyLimit = "Please enter a valid amount";
    } else if (limitValue < 0) {
      newErrors.monthlyLimit = "Limit cannot be negative";
    } else if (limitValue > 100000) {
      newErrors.monthlyLimit = "Limit cannot exceed $100,000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onSubmit({
      userIds: selectedUserIds,
      monthlyLimit: parseFloat(monthlyLimit),
      notes: notes || undefined,
    });
  };

  const handlePresetSelect = (value: number) => {
    setMonthlyLimit(value.toString());
    setErrors({});
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Bulk Update Limits</ModalTitle>
            <ModalDescription>
              Set the same monthly limit for {selectedCount} selected employee{selectedCount !== 1 ? "s" : ""}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-6 py-4">
            {/* Warning */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This will update the monthly limit for all {selectedCount} selected employees.
                This action cannot be undone.
              </p>
            </div>

            {/* Monthly Limit */}
            <div className="space-y-2">
              <Label htmlFor="bulkMonthlyLimit">New Monthly Limit ($)</Label>
              <Input
                id="bulkMonthlyLimit"
                type="number"
                min="0"
                step="100"
                value={monthlyLimit}
                onChange={(e) => {
                  setMonthlyLimit(e.target.value);
                  setErrors({});
                }}
                placeholder="Enter amount"
                className={errors.monthlyLimit ? "border-destructive" : ""}
              />
              {errors.monthlyLimit && (
                <p className="text-sm text-destructive">{errors.monthlyLimit}</p>
              )}

              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                {DEFAULT_MONTHLY_LIMITS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={parseFloat(monthlyLimit) === preset.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="bulkNotes">Notes (Optional)</Label>
              <Input
                id="bulkNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for bulk update..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : `Update ${selectedCount} Employee${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
