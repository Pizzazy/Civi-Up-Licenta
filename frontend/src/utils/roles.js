import { PERMISSIONS } from '@/data/constants';

/**
 * Check if a user role has permission to access a given module.
 */
export function hasModuleAccess(role, module) {
  const allowed = PERMISSIONS[module];
  if (!allowed) return false;
  return allowed.includes(role);
}

/**
 * Get a list of module IDs a given role can access.
 */
export function getAccessibleModules(role) {
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => roles.includes(role))
    .map(([module]) => module);
}

/**
 * Filter navigation items based on role permissions.
 */
export function filterNavByRole(navItems, role) {
  return navItems.filter((item) => hasModuleAccess(role, item.id));
}
