import { createAuthMiddleware } from "@b2b/auth/middleware";

export default createAuthMiddleware({
  publicRoutes: ["/login"],
  defaultRedirect: "/login",
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
