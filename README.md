# 🔐 RBAC Shield

[![npm version](https://img.shields.io/npm/v/rbac-shield.svg)](https://www.npmjs.com/package/rbac-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**The production-ready, type-safe Role-Based Access Control (RBAC) system for Next.js applications.**

Built for modern web development with **React 19**, **TypeScript 5**, and **Next.js App Router** compatibility. RBAC Shield provides a seamless, multi-tenant permission system that supports both **Role-based** and **Permission-based** strategies.

---

## ✨ Features

- 🎯 **Type-Safe Permissions**: Typescript "Prettify" helpers ensure tooltips show exact prop shapes.
- 👑 **First-Class Role Support**: Check for **Roles**, **Permissions**, or **Both**.
- 🚀 **High Performance**: Optimized with React Context and memoization.
- 🏢 **Multi-Tenant Native**: Switch between organizations/roles instantly.
- ⚡ **Zero Loading States**: Instant hydration via server-side data injection.
- 🛡️ **Route Protection**: Declarative guards with auto-redirects.
- 🌍 **Universal**: Works in Client Components, Server Components, and Middleware.

---

## 📦 Installation

### Option 1: Interactive CLI (Recommended)

This will set up your types and configuration file automatically.

```bash
npx rbac-shield init
```

### Option 2: Manual Install

```bash
npm install rbac-shield
# or
yarn add rbac-shield
```

---

## 🚀 Quick Start

### 1. Define Schema

Create `lib/rbac.ts` to define your types and export your instances.

```typescript
// lib/rbac.ts
"use client";
import { createRBAC } from "rbac-shield";

export type Resources = "projects" | "billing" | "users";
export type Actions = "view" | "create" | "edit" | "delete";

export const {
  RBACProvider,
  useRBAC,
  useHasRole,
  useHasPermission,
  useAccess, // Hook returning check function
  useActionMatch, // Dynamic role/permission matcher
  Can,
  ProtectedRoute,
  guard,
} = createRBAC<Resources, Actions>();
```

### 2. Wrap App

Wrap your root layout with the provider.

```tsx
// app/layout.tsx
import { RBACProvider } from "@/lib/rbac";

export default function RootLayout({ children }) {
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

Initialize permissions. For async user data, **wait for the user to load** before setting auth.

#### Create the PermissionLoader Component

```tsx
// components/PermissionLoader.tsx
"use client";
import { useEffect } from "react";
import { useRBAC } from "@/lib/rbac";
import { useUser } from "@/hooks/useUser";

export function PermissionLoader({ children }) {
  const { setAuth, switchTenant } = useRBAC();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading || !user) return;

    // Load Roles + Permissions
    setAuth([
      {
        tenantId: user.id || "default",
        roles: [user.role], // e.g. ["admin"]
        permissions: user.permissions, // e.g. ["projects:view"]
      },
    ]);

    switchTenant(user.id || "default");
  }, [user, isLoading]);

  if (isLoading || !user) return null; // Prevent render until authed
  return <>{children}</>;
}
```

#### Wrap Your App

```tsx
// app/layout.tsx
import { RBACProvider } from "@/lib/rbac";
import { PermissionLoader } from "@/components/PermissionLoader";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RBACProvider>
          <PermissionLoader>{children}</PermissionLoader>
        </RBACProvider>
      </body>
    </html>
  );
}
```

### 4. Protect Routes

Use the components to guard access.

```tsx
import { ProtectedRoute, Can, useHasRole, useAccess } from "@/lib/rbac";

export default function AdminDashboard() {
  const isSuperAdmin = useHasRole("super_admin");

  // Advanced: Get access checker function
  const hasAccess = useAccess();

  const canManage = hasAccess({
    roles: ["admin"],
    permissions: ["system:manage"],
  });

  return (
    <ProtectedRoute role={["admin", "super_admin"]} fallbackPath="/login">
      <h1>Admin Dashboard</h1>

      {/* Conditional Rendering */}
      <Can permission="billing:view">
        <BillingWidget />
      </Can>
    </ProtectedRoute>
  );
}
```

---

## 👑 Role Management & Logic

RBAC Shield uses a **Unified Access Logic** across all components.

### Logic Matrix

| Props Provided      | Logic Applied                                        | Example                                |
| :------------------ | :--------------------------------------------------- | :------------------------------------- |
| **Role Only**       | User has `role`                                      | `<Can role="admin">`                   |
| **Permission Only** | User has `permission`                                | `<Can permission="edit">`              |
| **Both**            | **STRICT AND**: User has `role` **AND** `permission` | `<Can role="admin" permission="edit">` |

### Wildcards (`*`)

- **Roles**: If user has role `*`, they pass ALL role checks.
- **Permissions**: If user has permission `*`, they pass ALL permission checks.

### Arrays (OR Logic)

Providing an array means "User must match **ANY** of these".

```tsx
// Allow if user is 'admin' OR 'manager'
<ProtectedRoute role={["admin", "manager"]}>
```

---

## � API Reference

### Components

#### `<ProtectedRoute>`

Guards an entire route. Redirects if access denied.

- **role**: `string | string[]`
- **permission**: `string | string[]`
- **requireAll**: `boolean` (Default: `false` - generally used for checking multiple permissions)
- **redirect**: `boolean` (Default: `true`)
- **fallbackPath**: `string` (Default: `/`)
- **fallback**: `ReactNode` (Shown while redirecting)

#### `<Can>`

Conditionally renders children.

- **role**: `string | string[]`
- **permission**: `string | string[]`
- **fallback**: `ReactNode` (Shown if denied)

### Hooks

#### `useAccess({ roles?, permissions? })`

Returns `boolean`. Checks if user matches ANY of the roles OR ANY of the permissions.

<h4>`useHasRole(role)`</h4>

Returns `boolean`. Checks for specific role (or wildcard).

<h4>`useActionMatch(handlers)`</h4>

Executes logic based on **roles** or **permissions**. Checks role handlers first, then permission handlers, then falls back to default.

```tsx
const content = useActionMatch({
  role: {
    admin: () => <AdminDashboard />,
    manager: () => <ManagerDashboard />,
  },
  permission: {
    "reports:view": () => <ReportsView />,
  },
  default: () => <GuestView />,
});
```

<h4>`useRBAC()`</h4>

Access raw state (`isLoading`, `activeTenantId`, etc.) and actions (`setAuth`).

---

## 🛡️ Best Practices

1.  **Server-Side Verification**: Always verify permissions on the server (API Routes, Server Actions) using the `checkPermission` utility or `guard` wrapper. Client-side checks are for UX only.
2.  **Combine Checks**: Use Roles for high-level page access, and Permissions for specific button visibility.

---

## 📄 License

MIT © [Arif Hossain Roman](https://github.com/devnuckles)
