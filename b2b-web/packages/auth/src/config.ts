import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { SessionUser, UserRole } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Default tenant for auth requests (can be overridden via environment)
const DEFAULT_TENANT = process.env.NEXT_PUBLIC_DEFAULT_TENANT || "default";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    tenantId: string;
  };
}

async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": DEFAULT_TENANT,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<AuthResponse>;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
} | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": DEFAULT_TENANT,
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as AuthResponse;

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpires: Date.now() + data.expiresIn * 1000,
    };
  } catch {
    return null;
  }
}

// Extended JWT type for internal use
interface ExtendedJWT extends JWT {
  id?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  tenantId?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: "RefreshAccessTokenError";
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const data = await loginUser(
          credentials.email as string,
          credentials.password as string
        );

        if (!data) {
          return null;
        }

        return {
          id: data.user.id,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
          tenantId: data.user.tenantId,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          accessTokenExpires: Date.now() + data.expiresIn * 1000,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }): Promise<ExtendedJWT> {
      // Initial sign in
      if (user) {
        const extUser = user as {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
          role: UserRole;
          tenantId: string;
          accessToken: string;
          refreshToken: string;
          accessTokenExpires: number;
        };
        return {
          ...token,
          id: extUser.id,
          email: extUser.email,
          firstName: extUser.firstName,
          lastName: extUser.lastName,
          role: extUser.role,
          tenantId: extUser.tenantId,
          accessToken: extUser.accessToken,
          refreshToken: extUser.refreshToken,
          accessTokenExpires: extUser.accessTokenExpires,
        };
      }

      const extToken = token as ExtendedJWT;

      // Return previous token if the access token has not expired yet
      if (
        extToken.accessTokenExpires &&
        Date.now() < extToken.accessTokenExpires
      ) {
        return extToken;
      }

      // Access token has expired, try to refresh it
      if (!extToken.refreshToken) {
        return { ...extToken, error: "RefreshAccessTokenError" };
      }

      const refreshed = await refreshAccessToken(extToken.refreshToken);

      if (!refreshed) {
        return { ...extToken, error: "RefreshAccessTokenError" };
      }

      return {
        ...extToken,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        accessTokenExpires: refreshed.accessTokenExpires,
        error: undefined,
      };
    },
    async session({ session, token }): Promise<Session> {
      const extToken = token as ExtendedJWT;

      if (
        extToken.id &&
        extToken.email &&
        extToken.firstName &&
        extToken.lastName &&
        extToken.role &&
        extToken.tenantId &&
        extToken.accessToken &&
        extToken.refreshToken &&
        extToken.accessTokenExpires
      ) {
        const sessionUser: SessionUser = {
          id: extToken.id,
          email: extToken.email,
          firstName: extToken.firstName,
          lastName: extToken.lastName,
          role: extToken.role,
          tenantId: extToken.tenantId,
          accessToken: extToken.accessToken,
          refreshToken: extToken.refreshToken,
          accessTokenExpires: extToken.accessTokenExpires,
        };

        return {
          ...session,
          user: sessionUser,
          error: extToken.error,
        } as Session;
      }

      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
};
