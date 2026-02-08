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
  Switch,
} from "@b2b/ui";
import { useState, useEffect, type FormEvent } from "react";

import type { EmployeeDeduction, UpdateDeductionLimitDto } from "../hooks/use-salary-deductions";
import { formatPrice, DEFAULT_MONTHLY_LIMITS } from "../hooks/use-salary-deductions";

interface EditLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeDeduction | null;
  onSubmit: (userId: string, data: UpdateDeductionLimitDto) => void;
  isLoading?: boolean;
}

export function EditLimitModal({
  open,
  onOpenChange,
  employee,
  onSubmit,
  isLoading,
}: EditLimitModalProps) {
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ monthlyLimit?: string }>({});

  useEffect(() => {
    if (employee) {
      setMonthlyLimit(employee.monthlyLimit);
      setIsEnabled(employee.isEnabled);
      setNotes("");
      setErrors({});
    }
  }, [employee]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setErrors({});
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
    if (!employee || !validateForm()) return;

    onSubmit(employee.userId, {
      monthlyLimit: parseFloat(monthlyLimit),
      isEnabled,
      notes: notes || undefined,
    });
  };

  const handlePresetSelect = (value: number) => {
    setMonthlyLimit(value.toString());
    setErrors({});
  };

  if (!employee) return null;

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Edit Deduction Limit</ModalTitle>
            <ModalDescription>
              Update the monthly salary deduction limit for {employee.userName}
            </ModalDescription>
          </ModalHeader>

          <div className="space-y-6 py-4">
            {/* Employee Info */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="text-sm">
                <div className="font-medium">{employee.userName}</div>
                <div className="text-muted-foreground">{employee.userEmail}</div>
                {employee.organizationName && (
                  <div className="text-muted-foreground">{employee.organizationName}</div>
                )}
              </div>
              <div className="mt-2 pt-2 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Current Usage:</span>
                <span>
                  {formatPrice(employee.usedAmount)} / {formatPrice(employee.monthlyLimit)}
                </span>
              </div>
            </div>

            {/* Monthly Limit */}
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Monthly Limit ($)</Label>
              <Input
                id="monthlyLimit"
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

            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isEnabled" className="text-base">Salary Deduction</Label>
                <p className="text-sm text-muted-foreground">
                  {isEnabled ? "Employee can use salary deduction" : "Salary deduction is disabled"}
                </p>
              </div>
              <Switch
                id="isEnabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for change..."
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
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
