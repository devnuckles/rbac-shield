"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PermissionString } from "./types";

interface ProtectedRouteProps<R extends string, A extends string> {
  children: React.ReactNode;
  requiredPermission: PermissionString<R, A>;
  fallbackPath?: string;
  fallback?: React.ReactNode;
  useHasPermission: (permission: PermissionString<R, A>) => boolean;
  isLoading: boolean;
}

/**
 * Client-side route protection component
 * Wraps pages that require specific permissions
 *
 * @example
 * ```tsx
 * <ProtectedRoute
 *   requiredPermission="billing:manage"
 *   fallbackPath="/unauthorized"
 *   useHasPermission={useHasPermission}
 *   isLoading={isLoading}
 * >
 *   <BillingPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute<R extends string, A extends string>({
  children,
  requiredPermission,
  fallbackPath = "/",
  fallback,
  useHasPermission,
  isLoading,
}: ProtectedRouteProps<R, A>) {
  const router = useRouter();
  const hasPermission = useHasPermission(requiredPermission);
  const [mounted, setMounted] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !hasPermission) {
      setShouldRedirect(true);
      // Use replace instead of push to avoid adding to history
      router.replace(fallbackPath);
    }
  }, [mounted, isLoading, hasPermission, router, fallbackPath]);

  // Show loading state
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">
          Checking permissions...
        </div>
      </div>
    );
  }

  // Don't render content if redirecting or no permission
  if (shouldRedirect || !hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">
            You don't have permission to access this page.
          </p>
          <p className="text-gray-400 text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
