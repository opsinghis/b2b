"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  Button,
  Input,
  Label,
} from "@b2b/ui";
import * as React from "react";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newPassword: string) => void;
  isLoading?: boolean;
  userName?: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  userName,
}: ResetPasswordModalProps) {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm the password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    onSubmit(password);
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Reset Password</ModalTitle>
            <ModalDescription>
              {userName
                ? `Set a new password for ${userName}.`
                : "Set a new password for this user."}
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                error={!!errors.password}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long.
              </p>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                error={!!errors.confirmPassword}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
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
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
