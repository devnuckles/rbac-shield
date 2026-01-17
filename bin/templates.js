const TEMPLATES = {
  basic: {
    resources: ['projects', 'users', 'settings'],
    actions: ['view', 'create', 'edit', 'delete']
  },
  ecommerce: {
    resources: ['products', 'orders', 'customers', 'inventory'],
    actions: ['view', 'create', 'edit', 'delete', 'manage']
  },
  saas: {
    resources: ['workspaces', 'billing', 'teams', 'api-keys'],
    actions: ['view', 'create', 'edit', 'delete', 'manage']
  }
};

function getTemplate(templateName, language, resources, actions) {
  const isTypeScript = language === 'typescript';
  
  const resourcesType = resources.map(r => `'${r}'`).join(' | ');
  const actionsType = actions.map(a => `'${a}'`).join(' | ');

  if (isTypeScript) {
    return `'use client';
import { createRBAC } from 'rbac-shield';

// Define your application's resources
export type Resources = ${resourcesType};

// Define your application's actions
export type Actions = ${actionsType};

// Initialize RBAC with your types
export const { 
  RBACProvider,
  useRBAC, 
  useHasRole,
  useHasPermission,
  useAccess,
  useHasAnyPermission,
  useHasAllPermissions,
  usePermissions,
  useActionMatch,
  Can,
  RBACErrorBoundary,
  ProtectedRoute,
} = createRBAC<Resources, Actions>();
`;
  } else {
    return `'use client';
import { createRBAC } from 'rbac-shield';

// Initialize RBAC
// Resources: ${resources.join(', ')}
// Actions: ${actions.join(', ')}
export const { 
  RBACProvider,
  useRBAC,
  useHasRole,
  useHasPermission,
  useAccess,
  useHasAnyPermission,
  useHasAllPermissions,
  usePermissions,
  useActionMatch,
  Can,
  RBACErrorBoundary,
  ProtectedRoute,
} = createRBAC();
`;
  }
}

module.exports = {
  TEMPLATES,
  getTemplate
};
