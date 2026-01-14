/**
 * Universal Permission Verifier
 * Works in Browser, Node.js, and Edge Runtime (Middleware)
 * 
 * @param heldPermissions - Array of permissions the user holds (e.g. ['projects:view', 'billing:*'])
 * @param requiredPermission - The permission to check for (e.g. 'billing:edit')
 * @returns boolean - True if access should be granted
 */
export function checkPermission(
  heldPermissions: string[], 
  requiredPermission: string
): boolean {
  // 1. Check for Global Admin Wildcard
  if (heldPermissions.includes('*')) return true;

  // 2. Check for Exact Match
  if (heldPermissions.includes(requiredPermission)) return true;

  // 3. Check for Resource Wildcard (e.g. "projects:*" matches "projects:delete")
  const [resource] = requiredPermission.split(':');
  if (resource && heldPermissions.includes(`${resource}:*`)) {
    return true;
  }
  
  return false;
}
