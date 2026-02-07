// Core auth exports
export { auth, handlers, signIn, signOut } from "./auth";
export { authConfig } from "./config";

// Types
export type {
  AuthUser,
  UserRole,
  AuthTokens,
  SessionUser,
} from "./types";

// Re-export from next-auth for convenience
export type { Session, User } from "next-auth";
