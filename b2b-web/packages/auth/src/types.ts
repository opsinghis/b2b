export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "USER"
  | "VIEWER";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  accessTokenExpires: number;
}

export interface SessionUser extends AuthUser {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
}
