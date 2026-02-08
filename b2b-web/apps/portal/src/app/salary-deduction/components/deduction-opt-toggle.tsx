"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch,
  useToast,
} from "@b2b/ui";
import { AlertTriangle, Info, Loader2, Settings } from "lucide-react";
import { useState } from "react";

import { useSalaryDeduction, useUpdateDeductionPreferences } from "../hooks";

export function DeductionOptToggle() {
  const { addToast } = useToast();
  const { data: salaryDeduction, isLoading } = useSalaryDeduction();
  const updatePreferences = useUpdateDeductionPreferences();

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
        </CardHeader>
        <CardContent>
          <div className="h-12 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!salaryDeduction) {
    return null;
  }

  const isEnabled = salaryDeduction.isEnabled;

  const handleToggleChange = (checked: boolean) => {
    if (checked !== isEnabled) {
      setPendingEnabled(checked);
      setShowConfirm(true);
    }
  };

  const handleConfirm = async () => {
    if (pendingEnabled === null) return;

    try {
      await updatePreferences.mutateAsync({ isEnabled: pendingEnabled });
      addToast({
        title: pendingEnabled
          ? "Salary deduction enabled"
          : "Salary deduction disabled",
        description: pendingEnabled
          ? "You can now use salary deduction for purchases."
          : "Salary deduction has been disabled for your account.",
        variant: "success",
      });
    } catch {
      addToast({
        title: "Failed to update preferences",
        description: "Please try again later.",
        variant: "error",
      });
    } finally {
      setShowConfirm(false);
      setPendingEnabled(null);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setPendingEnabled(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Deduction Preferences
        </CardTitle>
        <CardDescription>
          Manage your salary deduction enrollment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex-1">
            <p className="font-medium">Enable Salary Deduction</p>
            <p className="text-sm text-muted-foreground">
              {isEnabled
                ? "You can use salary deduction as a payment method during checkout."
                : "Enable to use salary deduction as a payment method."}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggleChange}
            disabled={updatePreferences.isPending}
          />
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="p-4 rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {pendingEnabled
                    ? "Enable Salary Deduction?"
                    : "Disable Salary Deduction?"}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {pendingEnabled
                    ? "Once enabled, you'll be able to use salary deduction as a payment method. Deductions will be taken from your payroll."
                    : "Disabling will prevent you from using salary deduction for future purchases. Any pending deductions will still be processed."}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={updatePreferences.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={updatePreferences.isPending}
                className={
                  pendingEnabled
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {updatePreferences.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {pendingEnabled ? "Enable" : "Disable"}
              </Button>
            </div>
          </div>
        )}

        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Note:</strong> Changes to your deduction preferences will
              take effect immediately.
            </p>
            <p>
              If you disable salary deduction while having pending deductions,
              those deductions will still be processed on the next payroll date.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
