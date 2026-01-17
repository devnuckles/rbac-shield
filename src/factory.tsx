"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { RBACState, TenantAuthInput, PermissionString } from "./types";
import { checkPermission } from "./checkPermission";
import { matchPermission } from "./guards";

interface RBACContextValue<R extends string, A extends string> {
  state: RBACState<R, A>;
  setAuth: (auth: TenantAuthInput[] | string[]) => void;
  switchTenant: (tenantId: string) => void;
  reset: () => void;
  debug?: boolean;
}

// Helper to expand types in tooltips
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export interface CanProps<R extends string, A extends string> {
  /** Single permission or array of permissions to check */
  permission?: PermissionString<R, A> | PermissionString<R, A>[];
  /** Single role or array of roles to check */
  role?: string | string[];
  children: React.ReactNode;
  /** Content to render if permission is denied */
  fallback?: React.ReactNode;
  /** If true, requires ALL permissions. If false (default), requires ANY. */
  requireAll?: boolean;
}

export interface ProtectedRouteProps<R extends string, A extends string> {
  children: React.ReactNode;
  /** Single permission or array of permissions to check */
  permission?: PermissionString<R, A> | PermissionString<R, A>[];
  /** Single role or array of roles to check */
  role?: string | string[];
  /** Path to redirect to if access denied (if redirect is true) */
  fallbackPath?: string;
  /** Content to render if access denied (or while redirecting) */
  fallback?: React.ReactNode;
  /** If true, requires ALL permissions. If false (default), requires ANY. */
  requireAll?: boolean;
  /** Custom component to show while loading permissions */
  loadingComponent?: React.ReactNode;
  /** Whether to redirect on access denial. Default: true */
  redirect?: boolean;
}

export interface RBACProviderProps {
  children: React.ReactNode;
  debug?: boolean;
  initialData?: TenantAuthInput[] | string[];
}

export interface RBACFactory<R extends string, A extends string> {
  RBACProvider: (props: RBACProviderProps) => React.JSX.Element;
  /** Access raw state and actions */
  useRBAC: () => RBACState<R, A> & {
    setAuth: (auth: TenantAuthInput[] | string[]) => void;
    switchTenant: (tenantId: string) => void;
    reset: () => void;
  };
  useHasRole: (role: string) => boolean;
  useHasPermission: (permission: PermissionString<R, A>) => boolean;
  useAccess: () => (requirements: {
    roles?: string[];
    permissions?: string[];
  }) => boolean;
  useHasAnyPermission: (permissions: PermissionString<R, A>[]) => boolean;
  useHasAllPermissions: (permissions: PermissionString<R, A>[]) => boolean;
  usePermissions: () => PermissionString<R, A>[];
  /**
   * Execute logic based on the first matching permission.
   * Useful for switching APIs or components based on role.
   */
  usePermissionMatch: <T>(
    handlers: Partial<Record<PermissionString<R, A>, () => T>> & {
      default?: () => T;
    },
  ) => T | undefined;
  Can: (props: Prettify<CanProps<R, A>>) => React.JSX.Element;
  RBACErrorBoundary: typeof React.Component;
  ProtectedRoute: (
    props: Prettify<ProtectedRouteProps<R, A>>,
  ) => React.JSX.Element;
}

export function createRBAC<
  R extends string = string,
  A extends string = string,
>(): RBACFactory<R, A> {
  // Create Context
  const RBACContext = createContext<RBACContextValue<R, A> | null>(null);

  // Reusable logic to process raw auth inputs into strict state
  const processTenants = (
    authInput: TenantAuthInput[] | string[],
  ): Record<
    string,
    {
      roles: string[];
      permissions: PermissionString<R, A>[];
      map: Record<string, boolean>;
    }
  > => {
    let authArray: TenantAuthInput[];

    // Check if input is a simple string array (single tenant mode)
    if (Array.isArray(authInput)) {
      if (authInput.length === 0 || typeof authInput[0] === "string") {
        // Flatten string array into permissions for default tenant
        authArray = [
          { tenantId: "default", permissions: authInput as string[] },
        ];
      } else {
        // Standard TenantAuthInput[]
        authArray = authInput as TenantAuthInput[];
      }
    } else {
      // Single TenantAuthInput object (e.g. { roles: [], permissions: [] })
      // Auto-assign to default tenant if tenantId missing, otherwise use as is or wrap
      // Actually, TenantAuthInput MUST have tenantId in type definition.
      // But user might want simpler input: setAuth({ roles:[], permissions:[] })
      // We can iterate over the object but typings say Input is Array or String Array.
      // We need to support single object input in typings first if we want this.
      // User requirement: "setAuth({ roles: [], permissions: [] })"
      // We need to update setAuth signature first.

      // For now, let's assume authInput IS TenantAuthInput[] | string[].
      // Wait, we need to allow single object.
      // I'll stick to Array support for now to match interface.

      authArray = authInput as TenantAuthInput[];
    }

    return authArray.reduce(
      (acc, curr) => ({
        ...acc,
        [curr.tenantId]: {
          roles: curr.roles || [], // Extract roles or default to empty
          permissions: curr.permissions as PermissionString<R, A>[],
          map: curr.permissions.reduce(
            (pMap, p) => ({ ...pMap, [p]: true }),
            {} as Record<string, boolean>,
          ),
        },
      }),
      {} as Record<
        string,
        {
          roles: string[];
          permissions: PermissionString<R, A>[];
          map: Record<string, boolean>;
        }
      >,
    );
  };

  /**
   * Provider component to wrap your application.
   * Manages the RBAC state and authentication.
   */
  function RBACProvider({
    children,
    debug = false,
    initialData,
  }: RBACProviderProps) {
    // Initialize state, optionally hydrating from initialData
    const [state, setState] = useState<RBACState<R, A>>(() => {
      if (initialData && initialData.length > 0) {
        const tenants = processTenants(initialData);
        // If "default" tenant exists (from string[] input), auto-select it
        const autoActiveId = tenants["default"] ? "default" : null;

        return {
          activeTenantId: autoActiveId,
          tenants,
          isLoading: false, // Hydrated!
        };
      }
      return {
        activeTenantId: null,
        tenants: {},
        isLoading: true,
      };
    });

    // Logger helper
    const log = useCallback(
      (msg: string, ...args: any[]) => {
        if (debug) console.debug(`[RBAC Shield] ${msg}`, ...args);
      },
      [debug],
    );

    const setAuth = useCallback(
      (authInput: TenantAuthInput[] | string[]) => {
        try {
          const tenants = processTenants(authInput);
          // If "default" tenant exists and we are in single-tenant mode (inferred), switch to it
          const shouldAutoSwitch =
            !!tenants["default"] && !state.activeTenantId;

          setState((prev) => ({
            ...prev,
            tenants,
            isLoading: false,
            activeTenantId: shouldAutoSwitch ? "default" : prev.activeTenantId,
          }));

          if (shouldAutoSwitch) {
            log("Auto-switched to default tenant");
          }
          log("Permissions loaded for tenants:", Object.keys(tenants));
        } catch (error) {
          console.error("[RBAC Shield] Error setting auth:", error);
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      },
      [log],
    );

    const switchTenant = useCallback(
      (tenantId: string) => {
        setState((prev) => ({ ...prev, activeTenantId: tenantId }));
        log("Switched to tenant:", tenantId);
      },
      [log],
    );

    const reset = useCallback(() => {
      setState({
        activeTenantId: null,
        tenants: {},
        isLoading: true,
      });
      log("State reset");
    }, [log]);

    const value = useMemo(
      () => ({ state, setAuth, switchTenant, reset, debug }),
      [state, setAuth, switchTenant, reset, debug],
    );

    return (
      <RBACContext.Provider value={value}>{children}</RBACContext.Provider>
    );
  }

  // Hook to access context
  function useRBACContext() {
    const context = useContext(RBACContext);
    if (!context) {
      throw new Error("useRBACContext must be used within RBACProvider");
    }
    return context;
  }

  /**
   * Hook to access the current RBAC store state.
   * Useful for debugging or custom logic.
   */
  function useRBAC() {
    const { state, setAuth, switchTenant, reset } = useRBACContext();
    return {
      ...state,
      setAuth,
      switchTenant,
      reset,
    };
  }

  /**
   * Check if the current user has a specific role.
   * @param role - The role string to check
   * @returns boolean
   */
  function useHasRole(role: string) {
    const { state, debug } = useRBACContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    return useMemo(() => {
      if (
        !mounted ||
        state.isLoading ||
        !state.activeTenantId ||
        !state.tenants[state.activeTenantId]
      )
        return false;

      const tenant = state.tenants[state.activeTenantId];
      if (!tenant) return false;

      const has = checkAccess(tenant, { roles: [role] });

      if (debug && !has) {
        console.debug(
          `[RBAC Shield] Denied: Required Role '${role}', User has`,
          tenant.roles,
        );
      }

      return has;
    }, [
      state.tenants,
      state.activeTenantId,
      role,
      mounted,
      state.isLoading,
      debug,
    ]);
  }

  /**
   * Check if the current user has a specific permission.
   * @param permission - The permission string to check
   * @returns boolean
   */
  function useHasPermission(permission: PermissionString<R, A>) {
    const { state, debug } = useRBACContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    return useMemo(() => {
      if (
        !mounted ||
        state.isLoading ||
        !state.activeTenantId ||
        !state.tenants[state.activeTenantId]
      )
        return false;

      const tenant = state.tenants[state.activeTenantId];
      if (!tenant) return false;

      const has = checkAccess(tenant, { permissions: [permission] });

      if (debug && !has) {
        console.debug(
          `[RBAC Shield] Denied: Required '${permission}', User has`,
          tenant.permissions,
        );
      }

      return has;
    }, [
      state.tenants,
      state.activeTenantId,
      permission,
      mounted,
      state.isLoading,
      debug,
    ]);
  }

  /**
   * Check if the user has ANY of the provided permissions.
   * @param permissions - Array of permissions
   */
  function useHasAnyPermission(permissions: PermissionString<R, A>[]) {
    const { state } = useRBACContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    return useMemo(() => {
      if (
        !mounted ||
        state.isLoading ||
        !state.activeTenantId ||
        !state.tenants[state.activeTenantId]
      )
        return false;

      const tenant = state.tenants[state.activeTenantId];
      if (tenant?.map["*"]) return true;

      return permissions.some((p) => !!tenant?.map[p]);
    }, [
      state.tenants,
      state.activeTenantId,
      permissions,
      mounted,
      state.isLoading,
    ]);
  }

  /**
   * Check if the user has ALL of the provided permissions.
   * @param permissions - Array of permissions
   */
  function useHasAllPermissions(permissions: PermissionString<R, A>[]) {
    const { state } = useRBACContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    return useMemo(() => {
      if (
        !mounted ||
        state.isLoading ||
        !state.activeTenantId ||
        !state.tenants[state.activeTenantId]
      )
        return false;

      const tenant = state.tenants[state.activeTenantId];
      if (tenant?.map["*"]) return true;

      return permissions.every((p) => !!tenant?.map[p]);
    }, [
      state.tenants,
      state.activeTenantId,
      permissions,
      mounted,
      state.isLoading,
    ]);
  }

  /**
   * Get all permissions for the active tenant.
   */
  function usePermissions() {
    const { state } = useRBACContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    return useMemo(() => {
      if (
        !mounted ||
        !state.activeTenantId ||
        !state.tenants[state.activeTenantId]
      )
        return [];
      return state.tenants[state.activeTenantId]?.permissions || [];
    }, [state.tenants, state.activeTenantId, mounted]);
  }

  /**
   * Hook version of matchPermission() that uses the current context's permissions.
   */
  function usePermissionMatch<T>(
    handlers: Partial<Record<PermissionString<R, A>, () => T>> & {
      default?: () => T;
    },
  ): T | undefined {
    const { state } = useRBACContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // We can't memorize the result because "handlers" might change on every render
    // if passed as an inline object literal (which is common).
    // However, permissions are stable.

    if (
      !mounted ||
      !state.activeTenantId ||
      !state.tenants[state.activeTenantId]
    ) {
      // If we are loading or not authed, try default, else undefined
      return handlers.default ? handlers.default() : undefined;
    }

    const currentPermissions =
      state.tenants[state.activeTenantId].permissions || [];

    return matchPermission(currentPermissions, handlers);
  }

  /**
   * Check access based on requirements (roles OR permissions).
   * @param requirements Object with roles and/or permissions arrays
   * @returns boolean
   */
  /**
   * Internal helper to check access against a specific tenant state.
   * Centralizes all logic for Roles, Permissions, Wildcards, and AND/OR combinations.
   */
  const checkAccess = (
    tenant: { roles: string[]; permissions: PermissionString<R, A>[] },
    requirements: { roles?: string[]; permissions?: string[] },
    requireAll: boolean = false,
  ): boolean => {
    // 1. Check Roles
    let roleMatch = true;
    if (requirements.roles && requirements.roles.length > 0) {
      if (tenant.roles.includes("*")) {
        roleMatch = true;
      } else {
        // OR Logic for roles array
        roleMatch = requirements.roles.some((r) => tenant.roles.includes(r));
      }
    }

    // 2. Check Permissions
    let permMatch = true;
    if (requirements.permissions && requirements.permissions.length > 0) {
      // Force cast to check for global wildcard
      if ((tenant.permissions as string[]).includes("*")) {
        permMatch = true;
      } else {
        if (requireAll) {
          permMatch = requirements.permissions.every((p) =>
            checkPermission(tenant.permissions, p as PermissionString<R, A>),
          );
        } else {
          permMatch = requirements.permissions.some((p) =>
            checkPermission(tenant.permissions, p as PermissionString<R, A>),
          );
        }
      }
    }

    // 3. Combine Logic
    // If BOTH are required, treat as AND.
    // If only one provided, check that one.
    // If neither, return false (deny safe).

    if (requirements.roles?.length && requirements.permissions?.length) {
      return roleMatch && permMatch;
    }
    if (requirements.roles?.length) return roleMatch;
    if (requirements.permissions?.length) return permMatch;

    return true; // No requirements = Allow? Or deny?
    // In strict RBAC, checking "nothing" usually means "is authenticated".
    // But for "access check" with empty object, we initially returned true.
    return true;
  };

  /**
   * Hook that returns a function to check access against the current tenant state.
   * Safe to use in loops, callbacks, and effects.
   * @returns (requirements) => boolean
   */
  const useAccess = (): ((requirements: {
    roles?: string[];
    permissions?: string[];
  }) => boolean) => {
    const { tenants, activeTenantId, isLoading } = useRBAC();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Return a stable function that closes over the current state
    return useCallback(
      (requirements: { roles?: string[]; permissions?: string[] }) => {
        if (
          !mounted ||
          isLoading ||
          !activeTenantId ||
          !tenants[activeTenantId]
        ) {
          // If public/empty requirements, allow. Else deny while loading/unauthed.
          if (
            !requirements.roles?.length &&
            !requirements.permissions?.length
          ) {
            return true;
          }
          return false;
        }

        const tenant = tenants[activeTenantId];
        return checkAccess(tenant, requirements);
      },
      [tenants, activeTenantId, isLoading, mounted],
    );
  };

  /**
   * Component to conditionally render children based on permissions.
   */
  function Can({
    permission,
    role,
    children,
    fallback = null,
    requireAll = false,
  }: CanProps<R, A>) {
    const { state, debug } = useRBACContext();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const hasAccess = useMemo(() => {
      if (
        !mounted ||
        state.isLoading ||
        !state.activeTenantId ||
        !state.tenants[state.activeTenantId]
      )
        return false;

      const tenant = state.tenants[state.activeTenantId];
      if (!tenant) return false;

      // Normalize inputs to arrays
      const roles = role ? (Array.isArray(role) ? role : [role]) : [];
      const permissions = permission;
      const has = checkAccess(
        tenant,
        { roles, permissions: permissions as string[] },
        requireAll,
      );

      if (debug && !has) {
        console.debug(`[RBAC Shield] Can Guard Denied.`, {
          requiredRole: role,
          requiredPerm: permission,
          userRoles: tenant.roles,
        });
      }

      return has;
    }, [
      state.tenants,
      state.activeTenantId,
      state.isLoading,
      permission,
      role,
      mounted,
      requireAll,
    ]);

    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  /**
   * Error Boundary to catch errors within RBAC components.
   * Useful for handling rendering errors without crashing the app.
   */
  class RBACErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ReactNode },
    { hasError: boolean }
  > {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error("[RBAC Error Boundary]:", error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          this.props.fallback || (
            <div>Something went wrong with permissions.</div>
          )
        );
      }
      return this.props.children;
    }
  }

  /**
   * Component to protect a route or section of the app.
   * Handles loading states and redirects.
   */
  function ProtectedRoute({
    children,
    permission,
    role,
    fallbackPath = "/",
    fallback,
    requireAll = false,
    loadingComponent,
    redirect = true,
  }: ProtectedRouteProps<R, A>) {
    const router = useRouter();
    const { state, debug } = useRBACContext();
    const [mounted, setMounted] = useState(false);
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const hasAccess = useMemo(() => {
      if (
        !mounted ||
        state.isLoading ||
        !state.activeTenantId ||
        !state.tenants[state.activeTenantId]
      )
        return false;

      const tenant = state.tenants[state.activeTenantId];
      if (!tenant) return false;

      // Normalize inputs
      const roles = role ? (Array.isArray(role) ? role : [role]) : [];
      const permissions = permission
        ? Array.isArray(permission)
          ? permission
          : [permission]
        : [];

      const has = checkAccess(
        tenant,
        { roles, permissions: permissions as string[] },
        requireAll,
      );

      if (debug && !has) {
        console.debug(`[RBAC Shield] ProtectedRoute Denied.`, {
          requiredRole: role,
          requiredPerm: permission,
        });
      }

      return has;
    }, [
      state.tenants,
      state.activeTenantId,
      state.isLoading,
      permission,
      role,
      mounted,
      requireAll,
      debug,
    ]);

    useEffect(() => {
      if (redirect && mounted && !state.isLoading && !hasAccess) {
        setShouldRedirect(true);
        router.replace(fallbackPath);
      }
    }, [mounted, state.isLoading, hasAccess, router, fallbackPath, redirect]);

    // Show loading state
    if (!mounted || state.isLoading) {
      if (loadingComponent !== undefined) return <>{loadingComponent}</>;
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-white text-xl animate-pulse">
            Checking permissions...
          </div>
        </div>
      );
    }

    // Don't render content if redirecting or no permission
    if (shouldRedirect || !hasAccess) {
      if (fallback !== undefined) {
        return <>{fallback}</>;
      }
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-6">
              You don't have permission to access this page.
            </p>
            <p className="text-gray-400 text-sm">
              {redirect ? "Redirecting..." : ""}
            </p>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }

  return {
    RBACProvider,
    useRBAC,
    useHasRole,
    useHasPermission,
    useAccess,
    useHasAnyPermission,
    useHasAllPermissions,
    usePermissions,
    usePermissionMatch, // Updated here
    Can,
    RBACErrorBoundary,
    ProtectedRoute,
  };
}
