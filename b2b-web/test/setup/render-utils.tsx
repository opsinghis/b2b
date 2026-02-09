/**
 * Test Render Utilities
 *
 * Custom render functions with providers for testing React components.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock session for auth context
export const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    tenantId: 'test-tenant-id',
  },
  accessToken: 'mock-access-token',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const mockAdminSession = {
  user: {
    id: 'test-admin-id',
    email: 'admin@example.com',
    name: 'Test Admin',
    role: 'ADMIN',
    tenantId: 'test-tenant-id',
  },
  accessToken: 'mock-admin-access-token',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Mock auth context
export const MockAuthContext = React.createContext({
  session: mockSession,
  status: 'authenticated' as const,
  signIn: vi.fn(),
  signOut: vi.fn(),
});

// Auth Provider wrapper
interface AuthProviderProps {
  children: React.ReactNode;
  session?: typeof mockSession | typeof mockAdminSession | null;
  status?: 'authenticated' | 'unauthenticated' | 'loading';
}

export function MockAuthProvider({
  children,
  session = mockSession,
  status = 'authenticated'
}: AuthProviderProps) {
  return (
    <MockAuthContext.Provider value={{
      session,
      status,
      signIn: vi.fn(),
      signOut: vi.fn()
    }}>
      {children}
    </MockAuthContext.Provider>
  );
}

// All providers wrapper for comprehensive testing
interface AllProvidersProps {
  children: React.ReactNode;
  session?: typeof mockSession | typeof mockAdminSession | null;
  authStatus?: 'authenticated' | 'unauthenticated' | 'loading';
}

function AllProviders({
  children,
  session = mockSession,
  authStatus = 'authenticated'
}: AllProvidersProps) {
  return (
    <MockAuthProvider session={session} status={authStatus}>
      {children}
    </MockAuthProvider>
  );
}

// Custom render with all providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: typeof mockSession | typeof mockAdminSession | null;
  authStatus?: 'authenticated' | 'unauthenticated' | 'loading';
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { session, authStatus, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders session={session} authStatus={authStatus}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

// Render for authenticated user (portal)
export function renderAsCustomer(ui: ReactElement, options: Omit<CustomRenderOptions, 'session'> = {}) {
  return renderWithProviders(ui, { ...options, session: mockSession });
}

// Render for admin user
export function renderAsAdmin(ui: ReactElement, options: Omit<CustomRenderOptions, 'session'> = {}) {
  return renderWithProviders(ui, { ...options, session: mockAdminSession });
}

// Render for unauthenticated user
export function renderAsGuest(ui: ReactElement, options: Omit<CustomRenderOptions, 'session' | 'authStatus'> = {}) {
  return renderWithProviders(ui, { ...options, session: null, authStatus: 'unauthenticated' });
}

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
