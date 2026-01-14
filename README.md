# 🔐 RBAC Shield

[![npm version](https://img.shields.io/npm/v/rbac-shield.svg)](https://www.npmjs.com/package/rbac-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Beta-orange.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> [!WARNING] > **Public Beta**: ensuring strict type safety and performance. API is stable but minor breaking changes might occur before v1.0.

**The production-ready, type-safe Role-Based Access Control (RBAC) system for Next.js applications.**

Built for modern web development with **React 19**, **TypeScript 5**, and **Next.js App Router** compatibility. RBAC Shield provides a seamless, multi-tenant permission system that just works.

---

## 📑 Table of Contents

- [Features](#-features)
- [Quick Setup (CLI)](#-quick-setup-recommended)
- [Manual Installation](#-manual-installation)
- [Quick Start](#-quick-start)
- [Guides & Patterns](#-guides--patterns)
  - [Roles as Permissions](#roles-as-permissions)
  - [Complex Logic (AND/OR)](#complex-logic-andor)
  - [Customizing UX](#customizing-ux-loading--redirects)
  - [SSR & Hydration](#ssr--hydration-eliminate-loading-states)
  - [Logic Switching (Dynamic APIs)](#logic-switching-dynamic-apis)
  - [Server Action Guards](#server-action-guards)
- [API Reference](#-api-reference)
- [Security & Best Practices](#-security--best-practices)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

- 🎯 **Type-Safe Permissions**: Typescript "Prettify" helpers ensure tooltips show exact prop shapes, amazing IntelliSense.
- 🚀 **High Performance**: Optimized with React Context and memoization. Permission checks are < 1ms.
- 🏢 **Multi-Tenant Native**: Switch between multiple organizations/roles instantly without page reloads.
- ⚡ **Zero Loading States**: Support for `initialData` prop allows instant hydration from server-side data.
- 🛡️ **Route Protection**: Declarative client-side guards with automatic handling of loading states and redirects.
- 🌍 **Universal Support**: Works seamlessly in **Client Components**, **Server Components**, and **Middleware**.
- 📦 **Zero Dependencies**: Lightweight (~35KB) and built entirely on standard React APIs.

---

## 🚀 Quick Setup (Recommended)

The fastest way to integrate RBAC Shield is with our interactive CLI. It initializes your configuration and handles all boilerplate.

```bash
npx rbac-shield init
```

The CLI will:

1. Detect your project type (Next.js/React, TS/JS)
2. Help you define your resources (e.g., `projects`) and actions (e.g., `create`)
3. Generate a clean, type-safe `lib/rbac.ts` file configured for your app

---

## 📦 Manual Installation

If you prefer to set things up yourself:

```bash
npm install rbac-shield
# or
yarn add rbac-shield
# or
pnpm add rbac-shield
# or
bun add rbac-shield
```

**Peer Dependencies:**
Ensure you have peer dependencies installed (standard in Next.js apps):
`react >= 18.0.0`, `react-dom >= 18.0.0`, `next >= 13.0.0`

---

## 🚀 Quick Start

### 1. Define Your Schema

Create a single source of truth for your permissions in `lib/rbac.ts` (or `config/rbac.ts`).

```typescript
// lib/rbac.ts
"use client";
import { createRBAC } from "rbac-shield";

// 1. Define resources (things you secure)
export type Resources = "projects" | "billing" | "users" | "marketing";

// 2. Define actions (what users can do)
export type Actions = "view" | "create" | "edit" | "delete" | "export";

// 3. Create your instances
export const {
  RBACProvider,
  useRBAC, // Renamed from useRBAC (alias available)
  useHasPermission,
  useMatch,
  Can,
  ProtectedRoute,
  guard,
} = createRBAC<Resources, Actions>();
```

### 2. Wrap Your App

Add the provider to your root layout to enable state management.

```tsx
// app/layout.tsx
import { RBACProvider } from "@/lib/rbac";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <RBACProvider>{children}</RBACProvider>
      </body>
    </html>
  );
}
```

### 3. Load Permissions

Initialize the system with data from your backend (e.g., after login).

```tsx
// components/AuthProvider.tsx
"use client";
import { useEffect } from "react";
import { useRBAC, useMatch } from "@/lib/rbac"; // Use the hook directly

export function AuthProvider({
  user,
  children,
}: {
  user: any;
  children: React.ReactNode;
}) {
  const { setAuth, switchTenant } = useRBAC();

  useEffect(() => {
    if (user) {
      // Load permissions into RBAC Shield
      setAuth([
        {
          tenantId: "team-123",
          permissions: ["projects:view", "projects:edit"],
        },
      ]);
      // Activate the context
      switchTenant("team-123");
    }
  }, [user, setAuth, switchTenant]);

  return <>{children}</>;
}
```

### 4. Secure Your App

Use the generated hooks and components anywhere.

```tsx
import { ProtectedRoute, Can, useHasPermission } from "@/lib/rbac";

export default function ProjectSettings() {
  const canDelete = useHasPermission("projects:delete");

  return (
    // 1. Protect Example: Redirects to / if missing permission
    <ProtectedRoute requiredPermission="projects:edit" fallbackPath="/">
      <h1>Project Settings</h1>

      {/* 2. Conditional Render Example */}
      <Can permission="billing:view" fallback={<p>Upgrade to see billing</p>}>
        <BillingWidget />
      </Can>

      {/* 3. Hook Logic Example */}
      <button disabled={!canDelete}>Delete Project</button>
    </ProtectedRoute>
  );
}
```

---

## 📖 Guides & Patterns

### Roles as Permissions

Avoid hardcoding role checks like `if (role === 'admin')`. Instead, treat roles as permissions!
Assign a "identity permission" to your roles, e.g., `role:admin`, `role:manager`.

```tsx
// ❌ Bad: Brittle
if (user.role === 'admin') <AdminText />

// ✅ Good: Flexible
// User permissions: ['post:read', 'role:admin']
<Can permission="role:admin" fallback="Welcome User">
  Welcome Admin
</Can>
```

### Complex Logic (AND/OR)

Sometimes you need a user to have a specific permission **AND** a specific role.
Use the array format with `requireAll`.

```tsx
// User must be 'admin' AND have 'post:delete' permission
<Can permission={["role:admin", "post:delete"]} requireAll>
  <DeleteEverythingButton />
</Can>
```

### Customizing UX (Loading & Redirects)

You have full control over the loading and fallback states. Pass `null` to hide them completely.

```tsx
// 1. Silent Loading (No Spinner)
<ProtectedRoute permission="admin:view" loadingComponent={null} >
  <Dashboard />
</ProtectedRoute>

// 2. Instant Redirect (No "Access Denied" screen)
<ProtectedRoute permission="admin:view" fallback={null} fallbackPath="/login" >
  <Dashboard />
</ProtectedRoute>

// 3. No Redirect (Show Custom 403 Page)
<ProtectedRoute permission="admin:view" redirect={false} fallback={<AccessDeniedPage />} >
  <Dashboard />
</ProtectedRoute>
```

### SSR & Hydration (Eliminate Loading States)

Prevent the "flicker" of loading states by passing server-side permissions directly to the provider.

```tsx
// app/layout.tsx (Server Component)
import { RBACProvider } from "@/lib/rbac";
import { getSession } from "@/lib/auth"; // Your auth logic

export default async function RootLayout({ children }) {
  const session = await getSession();

  // Prepare valid initial data matches TenantAuthInput[]
  const initialData = session
    ? [
        {
          tenantId: session.orgId,
          permissions: session.permissions, // string[] from DB is fine!
        },
      ]
    : [];

  return (
    <html>
      <body>
        <RBACProvider initialData={initialData}>{children}</RBACProvider>
      </body>
    </html>
  );
}
```

### Logic Switching (Dynamic APIs)

Need to call different APIs or execute different logic based on permissions? You have two options:

#### Option 1: Top-Level Hook (Recommended)

Use this when you want to resolve the handler _during render_ but call it later (e.g., on click).

```tsx
import { useRBAC, useMatch } from "@/lib/rbac";

export default function Dashboard() {
  // 1. Resolve the handler at the top level
  // Note: We return a FUNCTION () => ... so it doesn't run immediately!
  const getData = useMatch({
    "admin:view": () => () => api.getAdminStats(),
    "manager:view": () => () => api.getManagerStats(),
    default: () => () => api.getUserStats(),
  });

  const handleRefresh = () => {
    // 2. Call the resolved function
    if (getData) getData();
  };

  return <button onClick={handleRefresh}>Refresh Data</button>;
}
```

#### Option 2: Event Handler Utility

Use the `match` utility (not the hook) if you want to keep all logic inside the event handler.

```tsx
import { usePermissions, match } from "@/lib/rbac";

export default function Dashboard() {
  const permissions = usePermissions(); // Hooks must be top-level

  const handleRefresh = () => {
    // 'match' is a plain function, safe to use here!
    match(permissions, {
      "admin:view": () => api.getAdminStats(),
      "manager:view": () => api.getManagerStats(),
      default: () => api.getUserStats(),
    });
  };
}
```

### Server Action Guards

Protect arbitrary functions (like Server Actions) using the `guard` wrapper.

```typescript
// actions/project.ts (Server Action)
import { guard } from "rbac-shield";
import { getSession } from "@/lib/auth";

export async function deleteProject(id: string) {
  const session = await getSession();

  // Wrap your delicate logic
  const safeAction = guard(
    session.permissions, // User's permissions
    "project:delete", // Required permission
    async () => {
      await db.project.delete(id);
      return "Deleted!";
    }
  );

  return safeAction(); // Throws Error if unauthorized
}
```

---

## 📚 API Reference

### Components

#### `<RBACProvider>`

Top-level provider component.

- **initialData**: (Optional) `TenantAuthInput[]`. Hydrate state immediately.
- **debug**: (Optional) `boolean`. Log permission checks to console.

#### `<ProtectedRoute>`

A wrapper component that guards an entire route or section.

- **permission**: Single permission string OR array (`[]`).
- **requireAll**: `boolean` (Default: `false`).
- **redirect**: `boolean` (Default: `true`).
- **fallbackPath**: URL to redirect to if unauthorized.
- **fallback**: UI to show while redirecting.
- **loadingComponent**: Custom UI to show during initial check.

#### `<Can>`

Structural component for conditional rendering.

- **permission**: Single string OR array.
- **requireAll**: `boolean`.
- **fallback**: UI to show when permission is denied.

### Hooks

#### `useRBAC()`

Access raw state and actions.

- `setAuth(authData)`: Accepts simple `string[]`.
- `switchTenant(id)`: Change active context.
- `isLoading`: `boolean`.
- `activeTenantId`: `string | null`.

#### `useMatch(handlers)`

Executes logic based on the first matching permission.

- **handlers**: Object `{ [permission]: () => T }`.
- **default**: Fallback function.

#### `useHasPermission(permission)`

Returns `boolean`. Checks for exact permission match or wildcard `*`.

#### `useHasAnyPermission(permissions[])`

Returns `boolean`. True if user has **at least one** permission.

#### `useHasAllPermissions(permissions[])`

Returns `boolean`. True only if user has **every single** permission.

### Utilities

#### `guard(userPerms, requiredPerm, function)`

Higher-order function that wraps and protects a function execution.

#### `checkPermission(userPerms, requiredPerm)`

Universal helper for checking permissions (works on Server/Client/Edge).

---

## 🛡️ Security & Best Practices

> [!IMPORTANT] > **Client-side checks are for User Experience (UX) only.**

RBAC Shield controls what the user _sees_ in the browser, but it cannot stop a determined attacker from crafting API requests manually.

### 1. Server-Side Verification (Universal)

Use the universal `checkPermission` helper in Middleware, Server Actions, or API Routes:

```tsx
import { checkPermission } from "rbac-shield";
// 1. Middleware Example
export function middleware(req) {
  const permissions = getPermissionsFromCookie(req);
  if (!checkPermission(permissions, "admin:access")) {
    return NextResponse.redirect(new URL("/403", req.url));
  }
}
```

### 2. Debug Mode

Enable debug mode to see permission logs in the console:

```tsx
<RBACProvider debug={true}>{children}</RBACProvider>
```

---

## 🐛 Troubleshooting

| Issue                  | Solution                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Infinite Loading**   | Ensure `RBACProvider` wraps your app and `setAuth` is called with valid data.                                  |
| **Type Errors**        | Verify your `Resources` and `Actions` types in `lib/rbac.ts` are exported.                                     |
| **Hydration Mismatch** | `ProtectedRoute` and `Can` are client components; ensure they are used in client contexts or wrapped properly. |

---

## 🤝 Contributing

We welcome contributions! Please open an issue or submit a PR on our [GitHub repository](https://github.com/your-repo/rbac-shield).

## 📄 License

MIT © [Arif Hossain Roman](https://github.com/devnuckles)
