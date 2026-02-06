# B2B Web - Implementation Plan

> Frontend applications consuming the B2B API

---

## Repository Structure

```
b2b-web/
├── apps/
│   ├── admin/                 # Admin Portal (Next.js)
│   │   ├── src/
│   │   │   ├── app/          # App Router
│   │   │   ├── components/   # App-specific components
│   │   │   ├── lib/          # Utilities
│   │   │   └── hooks/        # Custom hooks
│   │   ├── public/
│   │   └── next.config.js
│   │
│   └── portal/               # Customer Portal (Next.js)
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   ├── lib/
│       │   └── hooks/
│       ├── public/
│       └── next.config.js
│
├── packages/
│   ├── ui/                   # Shared Component Library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api-client/           # Generated API Client
│   │   ├── src/
│   │   │   ├── generated/    # Auto-generated from OpenAPI
│   │   │   ├── hooks/        # React Query wrappers
│   │   │   └── index.ts
│   │   └── openapi.json      # Copied from b2b-api
│   │
│   └── config/               # Shared Configurations
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

---

## Phase 6: Frontend Foundation

### PRD-029: Turborepo Monorepo Setup

**Implementation Steps**:

1. Initialize monorepo
   ```bash
   pnpm init
   pnpm add -D turbo
   ```

2. Create workspace configuration
   ```yaml
   # pnpm-workspace.yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. Configure Turbo pipeline
   ```json
   // turbo.json
   {
     "$schema": "https://turbo.build/schema.json",
     "pipeline": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**", "dist/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "test": {
         "dependsOn": ["^build"]
       }
     }
   }
   ```

4. Scaffold Next.js apps
   ```bash
   pnpm create next-app apps/admin --typescript --tailwind --app
   pnpm create next-app apps/portal --typescript --tailwind --app
   ```

5. Create shared packages structure

### PRD-030: Shared UI Component Library

**Component Architecture**:

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Select/
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Table/
│   │   └── Form/
│   ├── hooks/
│   │   ├── useMediaQuery.ts
│   │   └── useDebounce.ts
│   ├── utils/
│   │   └── cn.ts           # clsx + twMerge
│   └── index.ts
├── .storybook/
└── package.json
```

**Component Pattern**:
```typescript
// Button.tsx
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
```

### PRD-031: API Client Generation

**OpenAPI Codegen Setup**:

```typescript
// packages/api-client/openapi-codegen.config.ts
import { defineConfig } from '@openapi-codegen/cli';
import { generateReactQueryComponents } from '@openapi-codegen/typescript';

export default defineConfig({
  b2bApi: {
    from: {
      source: 'file',
      path: './openapi.json',
    },
    outputDir: './src/generated',
    plugins: [generateReactQueryComponents],
  },
});
```

**Generated Hook Pattern**:
```typescript
// Usage in components
import { useGetUsers, useCreateUser } from '@b2b/api-client';

function UserList() {
  const { data, isLoading, error } = useGetUsers({
    page: 1,
    limit: 20,
  });

  const createUser = useCreateUser();

  // ...
}
```

### PRD-032: Authentication Integration

**NextAuth Configuration**:

```typescript
// apps/admin/src/auth.ts
import NextAuth from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.roles = token.roles;
      session.user.tenantId = token.tenantId;
      return session;
    },
  },
});
```

### PRD-033: Testing Infrastructure

**Vitest Configuration**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

**Playwright Configuration**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Phase 7: Admin Portal

### PRD-034: Admin Layout & Navigation

**Layout Structure**:
```
apps/admin/src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx          # Main dashboard layout
│   ├── page.tsx            # Dashboard home
│   ├── users/
│   │   ├── page.tsx        # User list
│   │   ├── [id]/page.tsx   # User detail
│   │   └── new/page.tsx    # Create user
│   ├── organizations/
│   ├── products/
│   └── contracts/
└── layout.tsx              # Root layout
```

**Dashboard Layout**:
```typescript
// (dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### PRD-035 to PRD-038: Admin Features

**Data Table Pattern**:
```typescript
// components/DataTable.tsx
import { useTable, useSortBy, usePagination, useFilters } from '@tanstack/react-table';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  exportable?: boolean;
}

export function DataTable<T>({ data, columns, ...props }: DataTableProps<T>) {
  // Implementation
}
```

---

## Phase 8: Customer Portal

### PRD-039 to PRD-043: Customer Features

**Product Catalog Pattern**:
```typescript
// Portal product browsing with custom pricing
async function getProductsForCustomer(customerId: string) {
  const [products, contract] = await Promise.all([
    api.products.list(),
    api.contracts.getActive(customerId),
  ]);

  return products.map(product => ({
    ...product,
    price: calculateContractPrice(product, contract),
  }));
}
```

---

## Testing Strategy

### Component Testing (packages/ui)
```typescript
// Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### E2E Testing (Playwright)
```typescript
// e2e/admin/users.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
  });

  test('displays user list', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount.greaterThan(1);
  });

  test('creates new user', async ({ page }) => {
    await page.getByRole('button', { name: 'Add User' }).click();
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Name').fill('Test User');
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText('User created')).toBeVisible();
  });
});
```

---

## Environment Configuration

```bash
# .env.local (apps/admin)
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3002
NEXTAUTH_SECRET=your-secret-key
KEYCLOAK_CLIENT_ID=admin-portal
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/b2b
```

---

## Code Conventions

### Imports
```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party
import { useQuery } from '@tanstack/react-query';

// 3. Internal packages
import { Button, Card } from '@b2b/ui';
import { api } from '@b2b/api-client';

// 4. Local imports
import { UserForm } from './components/UserForm';
```

### File Naming
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Tests: `*.test.tsx` or `*.spec.ts`
- Stories: `*.stories.tsx`

### State Management
- Server state: React Query
- Client state: Zustand (when needed)
- Form state: React Hook Form
- URL state: nuqs (useQueryState)

---

## Dependencies

### Production
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "@radix-ui/react-*": "latest",
    "next-auth": "^5.0.0-beta",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

### Development
```json
{
  "devDependencies": {
    "turbo": "^1.11.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "@testing-library/react": "^14.0.0",
    "msw": "^2.0.0",
    "@storybook/react": "^7.6.0"
  }
}
```
