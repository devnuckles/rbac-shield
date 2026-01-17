# 🔐 RBAC Shield

[![npm version](https://img.shields.io/npm/v/rbac-shield.svg)](https://www.npmjs.com/package/rbac-shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Status](https://img.shields.io/badge/Status-Beta-orange.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

> [!WARNING]
> **Public Beta**: Ensuring strict type safety and performance. API is stable but minor breaking changes might occur before v1.0.

**The production-ready, type-safe Role-Based Access Control (RBAC) system for Next.js applications.**

Built for modern web development with **React 19**, **TypeScript 5**, and **Next.js App Router** compatibility. RBAC Shield provides a seamless, multi-tenant permission system that supports both **Role-based** and **Permission-based** strategies.

---

## 📑 Table of Contents

- [Features](#-features)
- [Quick Setup (CLI)](#-quick-setup-recommended)
- [Manual Installation](#-manual-installation)
- [Quick Start](#-quick-start)
- [Role Management (New)](#-role-management)
- [Guides & Patterns](#-guides--patterns)
  - [Roles vs Permissions](#roles-vs-permissions)
  - [Complex Logic (AND/OR)](#complex-logic-andor)
  - [SSR & Hydration](#ssr--hydration-eliminate-loading-states)
  - [Logic Switching (Dynamic APIs)](#logic-switching-dynamic-apis)
  - [Server Action Guards](#server-action-guards)
- [API Reference](#-api-reference)
- [Security & Best Practices](#-security--best-practices)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

- 🎯 **Type-Safe Permissions**: Typescript "Prettify" helpers ensure tooltips show exact prop shapes, amazing IntelliSense.
- 👑 **First-Class Role Support**: Check for Roles (`admin`), Permissions (`edit:post`), or both simultaneously.
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
  useRBAC,
  useHasRole, // New!
  useHasPermission,
  useMatch,
  Can,
  ProtectedRoute,
  guard,
} = createRBAC<Resources, Actions>();
```

### 2. Wrap Your App

Add the provider to your root layout.

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

Initialize the system with data from your backend. You can now pass just permissions (strings) or roles and permissions.

```tsx
// components/AuthProvider.tsx
"use client";
import { useEffect } from "react";
import { useRBAC } from "@/lib/rbac";

export function AuthProvider({ user, children }) {
  const { setAuth } = useRBAC();

  useEffect(() => {
    if (user) {
      // Option A: Simple Permissions (Auto-assigned to 'default' tenant)
      setAuth(["projects:view"]);

      // Option B: Roles + Permissions
      // setAuth([{
      //    tenantId: "default",
      //    roles: ["admin"],
      //    permissions: ["projects:view"]
      // }]);
    }
  }, [user, setAuth]);

  return <>{children}</>;
}
```

### 4. Secure Your App

Use the components to guard access.

```tsx
import { ProtectedRoute, Can, useHasRole } from "@/lib/rbac";

export default function AdminPanel() {
  const isAdmin = useHasRole("admin");

  return (
    // 1. Role-Based Route Protection
    <ProtectedRoute role="admin" fallbackPath="/login">
      <h1>Admin Dashboard</h1>

      {/* 2. Permission Check */}
      <Can permission="billing:view">
        <BillingWidget />
      </Can>

      {/* 3. Combined Logic (Role AND Permission) */}
      <Can role="manager" permission="users:delete">
        <DeleteUserButton />
      </Can>
    </ProtectedRoute>
  );
}
```

---

## 👑 Role Management

RBAC Shield now supports **Dynamic Logic** for access control. You can check for Roles, Permissions, or Both.

### Logic Matrix

| Props Provided      | Logic Applied                                        | Example                                |
| :------------------ | :--------------------------------------------------- | :------------------------------------- |
| **Role Only**       | User has `role`                                      | `<Can role="admin">`                   |
| **Permission Only** | User has `permission`                                | `<Can permission="edit">`              |
| **Both**            | **STRICT AND**: User has `role` **AND** `permission` | `<Can role="admin" permission="edit">` |
| **Neither**         | Deny Access                                          | `<Can />` (Renders nothing)            |

### Wildcards

- **Roles**: If the user has the role `*`, they pass ALL role checks.
- **Permissions**: If the user has permission `*`, they pass ALL permission checks.

### Array Inputs (OR Logic)

If you provide an array to `role` or `permission`, by default it checks if the user has **ANY** of them (OR logic).

```tsx
// User is EITHER 'admin' OR 'manager'
<Can role={["admin", "manager"]}>
  <ManagementPanel />
</Can>
```

---

## 📖 Guides & Patterns

### Roles vs Permissions

- **Roles**: Use for high-level identity or persona checks (e.g., "Is this an Admin?").
- **Permissions**: Use for granular capability checks (e.g., "Can they delete this post?").

**Best Practice**: Combine them! Use `<ProtectedRoute role="admin">` for the page layout, and `<Can permission="settings:edit">` for specific buttons.

### Complex Logic (AND/OR)

Use `requireAll` to enforce strict requirements on arrays.

```tsx
// User must be 'admin' AND have 'post:delete' permission
<Can permission={["role:admin", "post:delete"]} requireAll>
  <DeleteEverythingButton />
</Can>
```

### SSR & Hydration (Eliminate Loading States)

Prevent the "flicker" of loading states by passing server-side permissions directly to the provider.

```tsx
// app/layout.tsx (Server Component)
import { RBACProvider } from "@/lib/rbac";
import { getSession } from "@/lib/auth";

export default async function RootLayout({ children }) {
  const session = await getSession();

  // server-side: just pass the string array of permissions!
  const initialData = session?.permissions || [];

  return (
    <html>
      <body>
        {/* Hydrates instantly! */}
        <RBACProvider initialData={initialData}>{children}</RBACProvider>
      </body>
    </html>
  );
}
```

### Logic Switching (Dynamic APIs)

Use `useMatch` to execute different logic based on permissions or roles.

```tsx
import { useMatch } from "@/lib/rbac";

export default function Dashboard() {
  const getData = useMatch({
    "admin:view": () => api.getAdminStats(),
    "manager:view": () => api.getManagerStats(),
    default: () => api.getUserStats(),
  });

  return <button onClick={getData}>Refresh Data</button>;
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

  const safeAction = guard(
    session.permissions, // User's permissions
    "project:delete", // Required permission
    async () => {
      await db.project.delete(id);
      return "Deleted!";
    },
  );

  return safeAction();
}
```

---

## 📚 API Reference

### Components

#### `<ProtectedRoute>`

A wrapper component that guards an entire route or section.

- **permission**: string | string[] (Optional)
- **role**: string | string[] (Optional)
- **requireAll**: boolean (Default: `false`)
- **redirect**: boolean (Default: `true`)
- **fallbackPath**: string (Default: `/`)
- **fallback**: ReactNode (UI while redirecting/denied)

#### `<Can>`

Structural component for conditional rendering.

- **permission**: string | string[] (Optional)
- **role**: string | string[] (Optional)
- **requireAll**: boolean
- **fallback**: ReactNode

### Hooks

#### `useHasRole(role: string)`

Returns `boolean`. Checks if user has the specific role (or `*`).

#### `useHasPermission(permission: string)`

Returns `boolean`. Checks for exact permission match or wildcard `*`.

#### `useRBAC()`

Access raw state.

- `setAuth(authData)`: Valid inputs:
  - `string[]` (Permissions only)
  - `TenantAuthInput[]` (Full Multi-tenant data)
- `switchTenant(id)`: Change active context.

---

## 🛡️ Security & Best Practices

> [!IMPORTANT]
> **Client-side checks are for User Experience (UX) only.**

Always verify permissions on the server (API Routes, Server Actions, Middleware) using `checkPermission` or `guard`.

---

## 📄 License

MIT © [Arif Hossain Roman](https://github.com/devnuckles)
