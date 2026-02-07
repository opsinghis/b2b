"use client";

import * as React from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import type { SessionUser, UserRole } from "./types";

export { SessionProvider, signIn, signOut };

// Extended session type that includes our custom properties
interface ExtendedSession extends Session {
  user: SessionUser;
  error?: "RefreshAccessTokenError";
}

export interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, callbackUrl?: string) => Promise<boolean>;
  logout: (callbackUrl?: string) => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

function isExtendedSession(session: Session | null): session is ExtendedSession {
  if (!session?.user) return false;
  const user = session.user as Partial<SessionUser>;
  return !!(
    user.id &&
    user.email &&
    user.firstName &&
    user.lastName &&
    user.role &&
    user.tenantId &&
    user.accessToken &&
    user.refreshToken &&
    user.accessTokenExpires
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [error, setError] = React.useState<string | null>(null);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && isExtendedSession(session);
  const user: SessionUser | null = isExtendedSession(session) ? session.user : null;

  // Handle token refresh errors
  React.useEffect(() => {
    if (isExtendedSession(session) && session.error === "RefreshAccessTokenError") {
      setError("Session expired. Please sign in again.");
      signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  const login = React.useCallback(
    async (email: string, password: string, callbackUrl?: string): Promise<boolean> => {
      setError(null);
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: callbackUrl || "/",
        });

        if (result?.error) {
          setError("Invalid email or password");
          return false;
        }

        if (result?.ok && callbackUrl) {
          window.location.href = callbackUrl;
        }

        return !!result?.ok;
      } catch {
        setError("An unexpected error occurred");
        return false;
      }
    },
    []
  );

  const logout = React.useCallback(async (callbackUrl?: string) => {
    await signOut({ callbackUrl: callbackUrl || "/login" });
  }, []);

  const hasRole = React.useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(user.role);
    },
    [user]
  );

  const value: AuthContextValue = React.useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      logout,
      hasRole,
    }),
    [user, isAuthenticated, isLoading, error, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export interface RequireAuthProps {
  children: React.ReactNode;
  roles?: UserRole | UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function RequireAuth({
  children,
  roles,
  fallback = null,
  redirectTo,
}: RequireAuthProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated && redirectTo) {
      window.location.href = redirectTo;
    }
  }, [isLoading, isAuthenticated, redirectTo]);

  if (isLoading) {
    return fallback;
  }

  if (!isAuthenticated) {
    return fallback;
  }

  if (roles && !hasRole(roles)) {
    return fallback;
  }

  return <>{children}</>;
}
