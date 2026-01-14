export type PermissionString<R extends string, A extends string> = 
  | `${R}:${A}` 
  | '*' 
  | `routes:${string}`;

export interface TenantAuth<R extends string, A extends string> {
  tenantId: string;
  permissions: PermissionString<R, A>[];
}

export interface TenantAuthInput {
  tenantId: string;
  permissions: string[];
}

export interface RBACState<R extends string, A extends string> {
  activeTenantId: string | null;
  tenants: Record<string, {
    permissions: PermissionString<R, A>[];
    map: Record<string, boolean>;
  }>;
  isLoading: boolean;
}