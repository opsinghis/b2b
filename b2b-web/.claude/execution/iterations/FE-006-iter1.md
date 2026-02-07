All tasks are complete. Let me provide a summary of the FE-006 implementation:

## Summary: FE-006 - Frontend Authentication Implementation

All completion criteria have been met:

### 1. NextAuth.js v5 configured
- Created `packages/auth` with NextAuth.js 5.0.0-beta.25
- Config at `packages/auth/src/config.ts` with JWT session strategy

### 2. Credentials provider (email/password via API)
- Credentials provider configured in `packages/auth/src/config.ts`
- Calls backend API `/api/v1/auth/login` endpoint with tenant header

### 3. Login page with form validation
- Created login pages for both apps:
  - `apps/admin/src/app/(auth)/login/page.tsx`
  - `apps/portal/src/app/(auth)/login/page.tsx`
- Client-side validation for email and password
- Error handling and feedback display
- Suspense boundary for SSR compatibility

### 4. Logout functionality
- Logout implemented via `useAuth()` hook's `logout()` method
- Admin sidebar has logout button (`apps/admin/src/components/layout/sidebar.tsx`)
- Portal header has logout button (`apps/portal/src/components/layout/header.tsx`)

### 5. Protected route middleware
- Middleware created at `packages/auth/src/middleware.ts`
- `createAuthMiddleware()` factory for customizable route protection
- Applied to both apps via `apps/*/src/middleware.ts`

### 6. useAuth() hook with user info
- `useAuth()` hook in `packages/auth/src/react.tsx`
- Provides: `user`, `isAuthenticated`, `isLoading`, `error`, `login`, `logout`, `hasRole`

### 7. Access token storage and refresh
- JWT session stores access token, refresh token, and expiration
- Automatic token refresh in JWT callback when token expires
- Uses backend `/api/v1/auth/refresh` endpoint

### Files Created/Modified:
- `packages/auth/` - New auth package with 6 source files
- `apps/admin/` - Auth routes, middleware, login page, layout updates
- `apps/portal/` - Auth routes, middleware, login page, layout updates

```
<promise>COMPLETE:FE-006</promise>
```
