export interface UserRolePermission {
  code: string;
  scope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN';
}

export type CustomPermissionMap = Record<string, { enabled?: boolean; scope?: string }>;

const VALID_SCOPES = new Set(['ALL', 'TEAM', 'ASSIGNED', 'OWN']);

export const normalizeScope = (scope: unknown): UserRolePermission['scope'] =>
  typeof scope === 'string' && VALID_SCOPES.has(scope)
    ? scope as UserRolePermission['scope']
    : 'ALL';

export const applyCustomPermissionOverrides = (
  basePermissions: UserRolePermission[],
  customPermissions?: CustomPermissionMap | null
): UserRolePermission[] => {
  if (!customPermissions || typeof customPermissions !== 'object' || Array.isArray(customPermissions)) {
    return basePermissions.map(permission => ({ ...permission }));
  }

  const result = basePermissions
    .filter(permission => customPermissions[permission.code]?.enabled !== false)
    .map(permission => {
      const override = customPermissions[permission.code];
      return override?.enabled
        ? { ...permission, scope: normalizeScope(override.scope || permission.scope) }
        : { ...permission, scope: normalizeScope(permission.scope) };
    });

  for (const [code, config] of Object.entries(customPermissions)) {
    if (!config?.enabled || result.some(permission => permission.code === code)) continue;
    result.push({ code, scope: normalizeScope(config.scope) });
  }

  return result;
};

export const resolveRolePermissions = (
  roleName: string,
  storedPermissions: UserRolePermission[],
  explicitlyConfigured: boolean,
  customPermissions?: CustomPermissionMap | null
): UserRolePermission[] => {
  const hasStoredPermissions = storedPermissions.length > 0;
  const basePermissions = explicitlyConfigured || hasStoredPermissions
    ? storedPermissions
    : getPermissionsForRole(roleName);
  return applyCustomPermissionOverrides(basePermissions, customPermissions);
};

export const getPermissionsForRole = (roleName: string): UserRolePermission[] => {
  const norm = (roleName || '').toUpperCase();

  if (norm === 'SUPER_ADMIN') {
    return [
      { code: 'dashboard.view', scope: 'ALL' },
      { code: 'dashboard.view_all', scope: 'ALL' },
      { code: 'dashboard.view_sales', scope: 'ALL' },
      { code: 'complaints.view', scope: 'ALL' },
      { code: 'complaints.create', scope: 'ALL' },
      { code: 'complaints.assign', scope: 'ALL' },
      { code: 'complaints.update', scope: 'ALL' },
      { code: 'complaints.delete', scope: 'ALL' },
      { code: 'complaints.track', scope: 'ALL' },
      { code: 'leads.view', scope: 'ALL' },
      { code: 'leads.view_all', scope: 'ALL' },
      { code: 'leads.create', scope: 'ALL' },
      { code: 'leads.edit', scope: 'ALL' },
      { code: 'leads.delete', scope: 'ALL' },
      { code: 'leads.assign', scope: 'ALL' },
      { code: 'customers.view', scope: 'ALL' },
      { code: 'customers.view_all', scope: 'ALL' },
      { code: 'customers.create', scope: 'ALL' },
      { code: 'customers.edit', scope: 'ALL' },
      { code: 'customers.delete', scope: 'ALL' },
      { code: 'fleet.view', scope: 'ALL' },
      { code: 'fleet.view_all', scope: 'ALL' },
      { code: 'fleet.create', scope: 'ALL' },
      { code: 'fleet.edit', scope: 'ALL' },
      { code: 'repairs.view', scope: 'ALL' },
      { code: 'repairs.create', scope: 'ALL' },
      { code: 'repairs.update', scope: 'ALL' },
      { code: 'inventory.view', scope: 'ALL' },
      { code: 'inventory.manage', scope: 'ALL' },
      { code: 'pre_bookings.view', scope: 'ALL' },
      { code: 'pre_bookings.view_all', scope: 'ALL' },
      { code: 'pre_bookings.create', scope: 'ALL' },
      { code: 'pre_bookings.status_update', scope: 'ALL' },
      { code: 'pre_bookings.delete', scope: 'ALL' },
      { code: 'pre_bookings.export', scope: 'ALL' },
      { code: 'pre_bookings.settings', scope: 'ALL' },
      { code: 'recoveries.view', scope: 'ALL' },
      { code: 'recoveries.view_all', scope: 'ALL' },
      { code: 'recoveries.create', scope: 'ALL' },
      { code: 'recoveries.accept', scope: 'ALL' },
      { code: 'recoveries.pickup', scope: 'ALL' },
      { code: 'recoveries.reached_hub', scope: 'ALL' },
      { code: 'recoveries.assign_tech', scope: 'ALL' },
      { code: 'recoveries.inspect', scope: 'ALL' },
      { code: 'recoveries.settle', scope: 'ALL' },
      { code: 'recoveries.delete', scope: 'ALL' },
      { code: 'reports.view', scope: 'ALL' },
      { code: 'users.view', scope: 'ALL' },
      { code: 'roles.view', scope: 'ALL' },
      { code: 'audit.view', scope: 'ALL' },
      { code: 'settings.view', scope: 'ALL' }
    ];
  }

  return [];
};
