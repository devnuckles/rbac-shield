import { PermissionString } from "./types";
import { checkPermission } from "./checkPermission";

/**
 * Universal Action Guard
 * Wraps a function and ensures the user has the required permission before executing.
 * Works for Server Actions, API Routes, or standard functions.
 *
 * @param userPermissions - The permissions the user requires
 * @param required - The permission required to execute the action
 * @param action - The function to execute if authorized
 * @throws Error if permission is denied
 */
export function guard<
  Args extends any[],
  Return,
  R extends string = string,
  A extends string = string
>(
  userPermissions: string[],
  required: PermissionString<R, A>,
  action: (...args: Args) => Promise<Return> | Return
): (...args: Args) => Promise<Return> {
  return async (...args: Args) => {
    const hasAccess = checkPermission(userPermissions, required);

    if (!hasAccess) {
      throw new Error(
        `[RBAC Shield] Access Denied: Missing permission '${required}'`
      );
    }

    return action(...args);
  };
}

/**
 * Logic Switcher / Pattern Matcher
 * Executes the first handler where the user has the corresponding permission.
 *
 * @param userPermissions - string[] of user permissions
 * @param handlers - Object mapping permissions to functions
 * @param defaultHandler - (Optional) Function to run if no permissions match
 */
export function match<
  Return,
  R extends string = string,
  A extends string = string
>(
  userPermissions: string[],
  handlers: Partial<Record<PermissionString<R, A>, () => Return>> & {
    default?: () => Return;
  }
): Return | undefined {
  // 1. Check strict keys
  for (const [permission, handler] of Object.entries(handlers)) {
    if (permission === "default") continue;

    if (checkPermission(userPermissions, permission as string)) {
      return (handler as () => Return)();
    }
  }

  // 2. Fallback
  if (handlers.default) {
    return handlers.default();
  }

  return undefined;
}
