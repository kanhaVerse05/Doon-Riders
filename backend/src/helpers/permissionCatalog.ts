export interface PermissionDefinition {
  code: string;
  module: string;
  description: string;
}

/**
 * Canonical permission list shared by the API seed and the User Management UI.
 * Keep these codes aligned with admin route guards and frontend navigation.
 */
export const PERMISSION_CATALOG: PermissionDefinition[] = [
  { code: 'dashboard.view', module: 'Dashboard', description: 'Open the dashboard and its statistics.' },

  { code: 'complaints.view', module: 'Complaints', description: 'View complaints and breakdown tickets.' },
  { code: 'complaints.create', module: 'Complaints', description: 'Create a complaint.' },
  { code: 'complaints.assign', module: 'Complaints', description: 'Assign a technician to a complaint.' },
  { code: 'complaints.update', module: 'Complaints', description: 'Update complaint status and details.' },
  { code: 'complaints.track', module: 'Complaints', description: 'Update technician location for a complaint.' },

  { code: 'repairs.view', module: 'Repair Jobs', description: 'View workshop repair jobs and tasks.' },
  { code: 'repairs.create', module: 'Repair Jobs', description: 'Create a repair job.' },
  { code: 'repairs.update', module: 'Repair Jobs', description: 'Assign, inspect, repair, bill, and close repair jobs.' },
  { code: 'repairs.delete', module: 'Repair Jobs', description: 'Clear repair jobs and related admin notifications.' },

  { code: 'returns.view', module: 'Scooty Returns', description: 'View return and inspection records.' },
  { code: 'returns.create', module: 'Scooty Returns', description: 'Create a scooty return.' },
  { code: 'returns.assign_tech', module: 'Scooty Returns', description: 'Assign a technician to inspect a return.' },
  { code: 'returns.inspect', module: 'Scooty Returns', description: 'Submit a return inspection.' },
  { code: 'returns.settle', module: 'Scooty Returns', description: 'Settle a return and its charges.' },
  { code: 'returns.update', module: 'Scooty Returns', description: 'Update return status.' },

  { code: 'recoveries.view', module: 'Scooty Recoveries', description: 'View recovery tickets assigned to or visible to the user.' },
  { code: 'recoveries.view_all', module: 'Scooty Recoveries', description: 'View all recovery tickets.' },
  { code: 'recoveries.create', module: 'Scooty Recoveries', description: 'Create and assign a recovery request.' },
  { code: 'recoveries.accept', module: 'Scooty Recoveries', description: 'Accept an assigned recovery.' },
  { code: 'recoveries.pickup', module: 'Scooty Recoveries', description: 'Record scooter pickup and evidence.' },
  { code: 'recoveries.reached_hub', module: 'Scooty Recoveries', description: 'Mark a scooter as arrived at the hub.' },
  { code: 'recoveries.assign_tech', module: 'Scooty Recoveries', description: 'Assign a technician for damage inspection.' },
  { code: 'recoveries.inspect', module: 'Scooty Recoveries', description: 'Submit the damage inspection.' },
  { code: 'recoveries.settle', module: 'Scooty Recoveries', description: 'Approve recovery settlement.' },
  { code: 'recoveries.delete', module: 'Scooty Recoveries', description: 'Delete or cancel a recovery record.' },

  { code: 'pre_bookings.view', module: 'Pre-Bookings', description: 'View pre-bookings.' },
  { code: 'pre_bookings.view_all', module: 'Pre-Bookings', description: 'View all pre-bookings and collections.' },
  { code: 'pre_bookings.create', module: 'Pre-Bookings', description: 'Create a pre-booking.' },
  { code: 'pre_bookings.status_update', module: 'Pre-Bookings', description: 'Change pre-booking status.' },
  { code: 'pre_bookings.delete', module: 'Pre-Bookings', description: 'Delete a pre-booking.' },
  { code: 'pre_bookings.export', module: 'Pre-Bookings', description: 'Export pre-bookings.' },
  { code: 'pre_bookings.settings', module: 'Pre-Bookings', description: 'Manage QR payment and receipt settings.' },

  { code: 'inventory.view', module: 'Inventory', description: 'View parts and stock.' },
  { code: 'inventory.manage', module: 'Inventory', description: 'Create, edit, upload, and adjust stock.' },

  { code: 'fleet.view', module: 'Vehicle Gallery', description: 'View the vehicle gallery.' },
  { code: 'fleet.manage', module: 'Vehicle Gallery', description: 'Upload and delete vehicle gallery photos.' },

  { code: 'leads.view', module: 'Leads & CRM', description: 'View assigned leads.' },
  { code: 'leads.view_all', module: 'Leads & CRM', description: 'View all leads.' },
  { code: 'leads.create', module: 'Leads & CRM', description: 'Create and import leads.' },
  { code: 'leads.edit', module: 'Leads & CRM', description: 'Edit lead details.' },
  { code: 'leads.delete', module: 'Leads & CRM', description: 'Delete leads.' },
  { code: 'leads.assign', module: 'Leads & CRM', description: 'Assign leads to team members.' },
  { code: 'leads.status_update', module: 'Leads & CRM', description: 'Change lead status.' },

  { code: 'customers.view', module: 'Customers', description: 'View customer records.' },
  { code: 'customers.view_all', module: 'Customers', description: 'View all customer records.' },
  { code: 'customers.create', module: 'Customers', description: 'Create customer records.' },
  { code: 'customers.edit', module: 'Customers', description: 'Edit customer records.' },
  { code: 'customers.delete', module: 'Customers', description: 'Delete customer records.' },

  { code: 'reports.view', module: 'Reports', description: 'View reports and attribution.' },

  { code: 'users.view', module: 'User Management', description: 'View staff accounts.' },
  { code: 'users.create', module: 'User Management', description: 'Create staff accounts.' },
  { code: 'users.edit', module: 'User Management', description: 'Edit staff status and role assignments.' },
  { code: 'users.delete', module: 'User Management', description: 'Remove staff accounts.' },
  { code: 'roles.view', module: 'User Management', description: 'View roles and their permissions.' },

  { code: 'audit.view', module: 'Audit Logs', description: 'View audit history.' },

  { code: 'settings.view', module: 'Settings', description: 'View system settings and pricing.' },
  { code: 'settings.edit', module: 'Settings', description: 'Change system settings and pricing.' },
];

export const PERMISSION_BY_CODE = new Map(PERMISSION_CATALOG.map(permission => [permission.code, permission]));
