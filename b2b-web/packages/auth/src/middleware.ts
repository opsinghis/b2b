import NextAuth from "next-auth";
import { authConfig } from "./config";

const { auth } = NextAuth(authConfig);

export { auth as middleware };

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export interface MiddlewareConfig {
  publicRoutes?: string[];
  protectedRoutes?: string[];
  defaultRedirect?: string;
}

export function createAuthMiddleware(options: MiddlewareConfig = {}) {
  const {
    publicRoutes = ["/login", "/register", "/forgot-password"],
    defaultRedirect = "/login",
  } = options;

  return auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const isPublicRoute = publicRoutes.some(
      (route) =>
        nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
    );

    // Redirect logged-in users away from public routes like login
    if (isLoggedIn && isPublicRoute) {
      return Response.redirect(new URL("/", nextUrl));
    }

    // Redirect non-logged-in users to login
    if (!isLoggedIn && !isPublicRoute) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return Response.redirect(
        new URL(`${defaultRedirect}?callbackUrl=${callbackUrl}`, nextUrl)
      );
    }

    return;
  });
}
