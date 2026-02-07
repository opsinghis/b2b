"use client";

import { useAuth } from "@b2b/auth/react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@b2b/ui";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validateEmail(email: string): string | undefined {
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return undefined;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const { login, isLoading: authLoading, error: authError } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync auth error to form errors
  React.useEffect(() => {
    if (authError) {
      setErrors((prev) => ({ ...prev, general: authError }));
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: FormErrors = {};
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const success = await login(email, password, callbackUrl);
      if (success) {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Customer Portal
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errors.general && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {errors.general}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              error={!!errors.email}
              disabled={isLoading}
              autoComplete="email"
              autoFocus
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={!!errors.password}
              disabled={isLoading}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function LoginSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Customer Portal
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
      <CardFooter>
        <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <React.Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </React.Suspense>
    </div>
  );
}
