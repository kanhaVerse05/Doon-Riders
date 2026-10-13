export interface UserRolePermission {
  code: string;
  scope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN';
}

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
      { code: 'reports.view', scope: 'ALL' },
      { code: 'users.view', scope: 'ALL' },
      { code: 'roles.view', scope: 'ALL' },
      { code: 'audit.view', scope: 'ALL' },
      { code: 'settings.view', scope: 'ALL' }
    ];
  }

  if (norm === 'MANAGER') {
    return [
      { code: 'dashboard.view', scope: 'ALL' },
      { code: 'dashboard.view_all', scope: 'ALL' },
      { code: 'dashboard.view_sales', scope: 'ALL' },
      { code: 'complaints.view', scope: 'ALL' },
      { code: 'complaints.create', scope: 'ALL' },
      { code: 'complaints.assign', scope: 'ALL' },
      { code: 'complaints.update', scope: 'ALL' },
      { code: 'complaints.track', scope: 'ALL' },
      { code: 'leads.view', scope: 'ALL' },
      { code: 'leads.create', scope: 'ALL' },
      { code: 'leads.edit', scope: 'ALL' },
      { code: 'leads.assign', scope: 'ALL' },
      { code: 'customers.view', scope: 'ALL' },
      { code: 'fleet.view', scope: 'ALL' },
      { code: 'repairs.view', scope: 'ALL' },
      { code: 'repairs.create', scope: 'ALL' },
      { code: 'repairs.update', scope: 'ALL' },
      { code: 'inventory.view', scope: 'ALL' },
      { code: 'pre_bookings.view', scope: 'ALL' },
      { code: 'pre_bookings.view_all', scope: 'ALL' },
      { code: 'pre_bookings.create', scope: 'ALL' },
      { code: 'pre_bookings.status_update', scope: 'ALL' },
      { code: 'pre_bookings.export', scope: 'ALL' },
      { code: 'reports.view', scope: 'ALL' }
    ];
  }

  if (norm === 'CUSTOMER_SUPPORT' || norm.includes('SUPPORT') || norm.includes('CARE')) {
    return [
      { code: 'dashboard.view', scope: 'ALL' },
      { code: 'complaints.view', scope: 'ALL' },
      { code: 'complaints.create', scope: 'ALL' },
      { code: 'complaints.update', scope: 'ALL' },
      { code: 'complaints.track', scope: 'ALL' },
      { code: 'customers.view', scope: 'ALL' },
      { code: 'fleet.view', scope: 'ALL' },
      { code: 'pre_bookings.view', scope: 'ALL' }
    ];
  }

  if (norm === 'TECHNICIAN' || norm.includes('TECH')) {
    return [
      { code: 'dashboard.view', scope: 'ASSIGNED' },
      { code: 'complaints.view', scope: 'ASSIGNED' },
      { code: 'complaints.update', scope: 'ASSIGNED' },
      { code: 'complaints.track', scope: 'ASSIGNED' },
      { code: 'repairs.view', scope: 'ASSIGNED' },
      { code: 'repairs.update', scope: 'ASSIGNED' },
      { code: 'inventory.view', scope: 'ALL' },
      { code: 'fleet.view', scope: 'ASSIGNED' }
    ];
  }

  if (norm === 'HUB_INCHARGE' || norm.includes('HUB')) {
    return [
      { code: 'dashboard.view', scope: 'TEAM' },
      { code: 'complaints.view', scope: 'TEAM' },
      { code: 'complaints.assign', scope: 'TEAM' },
      { code: 'complaints.update', scope: 'TEAM' },
      { code: 'complaints.track', scope: 'TEAM' },
      { code: 'repairs.view', scope: 'TEAM' },
      { code: 'repairs.create', scope: 'TEAM' },
      { code: 'repairs.update', scope: 'TEAM' },
      { code: 'inventory.view', scope: 'TEAM' },
      { code: 'fleet.view', scope: 'TEAM' },
      { code: 'pre_bookings.view', scope: 'TEAM' }
    ];
  }

  if (norm === 'PRE_BOOKING' || norm.includes('PRE_BOOK') || norm.includes('BOOKING')) {
    return [
      { code: 'pre_bookings.view', scope: 'ALL' },
      { code: 'pre_bookings.create', scope: 'ALL' },
      { code: 'pre_bookings.status_update', scope: 'ALL' }
    ];
  }

  // Sales Executive / Standard Rep / Custom role default
  return [
    { code: 'dashboard.view', scope: 'ASSIGNED' },
    { code: 'dashboard.view_sales', scope: 'ASSIGNED' },
    { code: 'complaints.view', scope: 'ALL' },
    { code: 'complaints.create', scope: 'ALL' },
    { code: 'leads.view', scope: 'ASSIGNED' },
    { code: 'leads.view_assigned', scope: 'ASSIGNED' },
    { code: 'leads.create', scope: 'OWN' },
    { code: 'leads.edit', scope: 'ASSIGNED' },
    { code: 'customers.view', scope: 'ASSIGNED' },
    { code: 'pre_bookings.view', scope: 'OWN' },
    { code: 'pre_bookings.create', scope: 'OWN' },
    { code: 'fleet.view', scope: 'ALL' }
  ];
};
