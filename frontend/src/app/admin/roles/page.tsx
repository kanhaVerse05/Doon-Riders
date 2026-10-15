'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../lib/adminApi';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  User,
  Users,
  Check,
  Sparkles,
  Save,
  Lock,
  Search,
  PlusCircle,
  ArrowRight,
  X,
  Trash2
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PermissionItem {
  id: number;
  code: string;
  module: string;
  description: string;
}

interface UserPermMap {
  [userId: number]: {
    [permCode: string]: {
      enabled: boolean;
      scope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN';
    };
  };
}

const DEMO_EMAILS = [
  'admin@doonriders.com',
  'manager@doonriders.com',
  'rahul.sales@doonriders.com',
  'priya.sales@doonriders.com',
  'amit.sales@doonriders.com',
  'demo@doonriders.com'
];

const getInitials = (nameStr: string) => {
  if (!nameStr) return 'DR';
  const parts = nameStr.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

interface RoleItem {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_system?: boolean;
  permissions_configured?: boolean;
}

const DEFAULT_SYSTEM_ROLES: RoleItem[] = [
  { id: 1, name: 'SUPER_ADMIN', display_name: 'Super Admin', description: 'Full root access to all system features and database', is_system: true },
  { id: 3, name: 'MANAGER', display_name: 'Sales & Operations Manager', description: 'Operational overview, booking handling, and branch reports', is_system: true },
  { id: 4, name: 'SALES_EXECUTIVE', display_name: 'Sales Executive', description: 'Direct lead conversion and customer onboarding', is_system: true },
  { id: 5, name: 'HUB_INCHARGE', display_name: 'Hub Incharge', description: 'Hub fleet inventory and scooter repairs coordinator', is_system: false },
  { id: 6, name: 'TECHNICIAN', display_name: 'Technician', description: 'Scooter diagnostics, job card execution, and parts replacement', is_system: false },
  { id: 7, name: 'CUSTOMER_SUPPORT', display_name: 'Customer Support', description: 'Customer complaints, breakdown ticket logging & support', is_system: false },
  { id: 8, name: 'PRE_BOOKING', display_name: 'Pre-Booking', description: 'Pre-booking management and customer reservation vouchers', is_system: false },
  { id: 16, name: 'ACCOUNTANT', display_name: 'Accountant', description: 'Pre-booking payments, rental security deposits, and invoicing', is_system: false },
  { id: 17, name: 'RECOVERY_AGENT', display_name: 'Recovery Agent', description: 'Field scooty recovery, GPS pickup, and 4-angle photo uploads', is_system: false }
];

const SUGGESTED_ROLES = [
  { title: 'Recovery Agent', desc: 'Field scooty recovery, GPS pickup, and 4-angle photo uploads' },
  { title: 'Technician', desc: 'Scooter repairs, parts replacement, and workshop job cards' },
  { title: 'Hub Incharge', desc: 'Hub station operations, charging swaps, and fleet supervisor' },
  { title: 'Workshop Manager', desc: 'Workshop queue, parts inventory management, and technician lead' },
  { title: 'Fleet Supervisor', desc: 'Vehicle inspections, battery tracking, and road assistance' },
  { title: 'Accountant', desc: 'Pre-booking payments, rental security deposits, and invoicing' },
  { title: 'Field Executive', desc: 'On-ground rider support and customer KYC collections' }
];

function RolesAndPermissionsContent() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId') ? Number(searchParams.get('userId')) : null;

  const [roles, setRoles] = useState<RoleItem[]>(DEFAULT_SYSTEM_ROLES);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionSaveError, setPermissionSaveError] = useState<string | null>(null);
  const [activeModuleTab, setActiveModuleTab] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Custom Role Modal State
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [roleSuccessToast, setRoleSuccessToast] = useState<string | null>(null);

  // User-Specific Custom Permissions Map
  const [userPermissions, setUserPermissions] = useState<UserPermMap>({});

  const allPermissions: PermissionItem[] = [
    // Dashboard
    { id: 1, code: 'dashboard.view', module: 'Dashboard', description: 'View main KPI overview cards and statistics' },
    { id: 2, code: 'dashboard.view_all', module: 'Dashboard', description: 'View enterprise analytics and full company metrics' },
    { id: 3, code: 'dashboard.view_sales', module: 'Dashboard', description: 'View personal sales KPI and conversion metrics' },

    // Pre-Bookings
    { id: 43, code: 'pre_bookings.view', module: 'Pre-Bookings', description: 'View pre-booking registry and customer queues' },
    { id: 44, code: 'pre_bookings.view_all', module: 'Pre-Bookings', description: 'View full company-wide EV pre-bookings' },
    { id: 45, code: 'pre_bookings.create', module: 'Pre-Bookings', description: 'Create and generate new EV pre-booking vouchers' },
    { id: 46, code: 'pre_bookings.status_update', module: 'Pre-Bookings', description: 'Update booking status (Confirmed, Allocated, Cancelled)' },
    { id: 47, code: 'pre_bookings.delete', module: 'Pre-Bookings', description: 'Delete or archive pre-booking customer records' },
    { id: 48, code: 'pre_bookings.export', module: 'Pre-Bookings', description: 'Export pre-booking slips and receipts to CSV/Excel' },
    { id: 49, code: 'pre_bookings.settings', module: 'Pre-Bookings', description: 'Configure booking token amount and delivery timeline' },

    // Leads & CRM
    { id: 4, code: 'leads.view', module: 'Leads', description: 'View leads list and pipeline status' },
    { id: 5, code: 'leads.view_all', module: 'Leads', description: 'View all leads across entire Uttarakhand company' },
    { id: 6, code: 'leads.view_assigned', module: 'Leads', description: 'View only leads assigned to this user' },
    { id: 7, code: 'leads.create', module: 'Leads', description: 'Create and ingest new inbound leads manually' },
    { id: 8, code: 'leads.edit', module: 'Leads', description: 'Edit customer lead details and rental requirements' },
    { id: 9, code: 'leads.delete', module: 'Leads', description: 'Delete or archive customer lead records' },
    { id: 10, code: 'leads.assign', module: 'Leads', description: 'Assign unassigned leads to team executives' },
    { id: 11, code: 'leads.reassign', module: 'Leads', description: 'Reassign existing leads between different sales reps' },
    { id: 12, code: 'leads.status_update', module: 'Leads', description: 'Change lead stages (Contacted, Interested, Converted, etc.)' },
    { id: 13, code: 'leads.notes', module: 'Leads', description: 'Add and view interaction notes and customer history' },
    { id: 14, code: 'leads.followup', module: 'Leads', description: 'Schedule and track upcoming follow-up calls & visits' },
    { id: 15, code: 'leads.export', module: 'Leads', description: 'Export leads and contact list to CSV/Excel' },

    // Customers
    { id: 16, code: 'customers.view', module: 'Customers', description: 'Access customer directory and KYC profiles' },
    { id: 17, code: 'customers.view_all', module: 'Customers', description: 'View full company-wide customer database' },
    { id: 18, code: 'customers.create', module: 'Customers', description: 'Register new riders and upload identity documents' },
    { id: 19, code: 'customers.edit', module: 'Customers', description: 'Update customer contact, address, and rental profile' },
    { id: 20, code: 'customers.delete', module: 'Customers', description: 'Remove customer records and blacklist accounts' },

    // Fleet & Rentals
    { id: 21, code: 'fleet.view', module: 'Fleet & Rentals', description: 'View EV Scooty fleet and battery swap inventory' },
    { id: 22, code: 'fleet.view_all', module: 'Fleet & Rentals', description: 'View all hub fleets and utilization rates' },
    { id: 23, code: 'fleet.create', module: 'Fleet & Rentals', description: 'Add new EV scooters and batteries to system' },
    { id: 24, code: 'fleet.edit', module: 'Fleet & Rentals', description: 'Update vehicle rates, health status, and specifications' },
    { id: 25, code: 'fleet.assign', module: 'Fleet & Rentals', description: 'Allocate EV scooties to customer rental bookings' },
    { id: 26, code: 'fleet.maintenance', module: 'Fleet & Rentals', description: 'Log battery health checkups and workshop repairs' },
    { id: 27, code: 'rentals.view', module: 'Fleet & Rentals', description: 'View active rental agreements and weekly bookings' },
    { id: 28, code: 'rentals.create', module: 'Fleet & Rentals', description: 'Create rental contracts and book vehicles' },
    { id: 29, code: 'rentals.cancel', module: 'Fleet & Rentals', description: 'Cancel rental agreements and process deposits' },

    // Repairs & Inventory
    { id: 30, code: 'repairs.view', module: 'Repairs & Workshop', description: 'View repair job cards and service tickets' },
    { id: 31, code: 'repairs.create', module: 'Repairs & Workshop', description: 'Create new repair tickets and intake damaged scooties' },
    { id: 32, code: 'repairs.update', module: 'Repairs & Workshop', description: 'Update repair status, parts used, and inspection checklist' },
    { id: 33, code: 'inventory.view', module: 'Repairs & Workshop', description: 'View spare parts catalogue and inventory stock counts' },
    { id: 34, code: 'inventory.manage', module: 'Repairs & Workshop', description: 'Add and restock spare parts inventory items' },

    // Reports & Analytics
    { id: 35, code: 'reports.view', module: 'Reports', description: 'Access reporting and performance analytics module' },
    { id: 36, code: 'reports.sales', module: 'Reports', description: 'View sales conversion funnel and revenue attribution' },
    { id: 37, code: 'reports.leads', module: 'Reports', description: 'View marketing campaign ROI and ad-set performance' },
    { id: 38, code: 'reports.export', module: 'Reports', description: 'Export analytical reports and financial summaries' },

    // Scooty Recovery
    { id: 50, code: 'recoveries.view', module: 'Scooty Recovery', description: 'View scooty recovery tickets and status tracking' },
    { id: 51, code: 'recoveries.view_all', module: 'Scooty Recovery', description: 'View full company-wide vehicle recoveries across hubs' },
    { id: 52, code: 'recoveries.create', module: 'Scooty Recovery', description: 'Assign / Log new scooty recovery request' },
    { id: 53, code: 'recoveries.accept', module: 'Scooty Recovery', description: 'Accept assigned recovery request (Recovery Agent)' },
    { id: 54, code: 'recoveries.pickup', module: 'Scooty Recovery', description: 'Record vehicle pickup with live GPS & 4 photos' },
    { id: 55, code: 'recoveries.reached_hub', module: 'Scooty Recovery', description: 'Mark scooty safely arrived at service hub' },
    { id: 56, code: 'recoveries.assign_tech', module: 'Scooty Recovery', description: 'Assign technician for damage inspection' },
    { id: 57, code: 'recoveries.inspect', module: 'Scooty Recovery', description: 'Submit technician damage inspection & parts replaced' },
    { id: 58, code: 'recoveries.settle', module: 'Scooty Recovery', description: 'Approve final settlement calculation & issue slip' },
    { id: 59, code: 'recoveries.delete', module: 'Scooty Recovery', description: 'Delete or cancel scooty recovery record' },

    // Team Management
    { id: 39, code: 'users.view', module: 'Team Directory', description: 'View team member directory and employee details' },
    { id: 40, code: 'users.create', module: 'Team Directory', description: 'Create and invite new team user accounts' },
    { id: 41, code: 'users.edit', module: 'Team Directory', description: 'Update team profiles, roles, and authorization' },
    { id: 42, code: 'roles.view', module: 'Team Directory', description: 'Access Role and Granular Permission Matrix' }
  ];

  const getSavedRolePermissions = (roleName: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('dr_role_custom_permissions');
      if (stored) {
        const parsed = JSON.parse(stored);
        const norm = (roleName || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
        if (parsed[norm]) return parsed[norm];
        if (parsed[roleName]) return parsed[roleName];
      }
    } catch (e) {}
    return null;
  };

  const getInitialUserPermissions = (roleName: string): { [code: string]: { enabled: boolean; scope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN' } } => {
    // 1. Check if permissions were previously configured and saved for this custom or team role
    const saved = getSavedRolePermissions(roleName);
    if (saved) {
      const map: any = {};
      allPermissions.forEach(p => {
        if (saved[p.code]) {
          map[p.code] = { ...saved[p.code] };
        } else {
          map[p.code] = { enabled: false, scope: 'ALL' };
        }
      });
      return map;
    }

    const norm = (roleName || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const map: any = {};

    allPermissions.forEach(p => {
      let enabled = false;
      let scope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN' = 'ALL';

      if (norm === 'SUPER_ADMIN') {
        enabled = true;
        scope = 'ALL';
      } else if (norm === 'PRE_BOOKING' || norm.includes('PRE_BOOK') || norm.includes('BOOKING')) {
        enabled = ['pre_bookings.view', 'pre_bookings.create', 'pre_bookings.status_update'].includes(p.code);
        scope = 'ALL';
      } else if (norm === 'RECOVERY_AGENT' || norm.includes('RECOVERY')) {
        enabled = ['recoveries.view', 'recoveries.accept', 'recoveries.pickup', 'recoveries.reached_hub'].includes(p.code);
        scope = 'ASSIGNED';
      } else if (norm === 'MANAGER') {
        enabled = ['Dashboard', 'Pre-Bookings', 'Leads', 'Customers', 'Fleet & Rentals', 'Repairs & Workshop', 'Scooty Recovery', 'Reports'].includes(p.module) && !p.code.includes('.delete');
        scope = 'ALL';
      } else if (norm === 'SALES_EXECUTIVE') {
        enabled = [
          'dashboard.view', 'dashboard.view_sales',
          'pre_bookings.view', 'pre_bookings.create', 'pre_bookings.status_update',
          'leads.view', 'leads.view_assigned', 'leads.status_update', 'leads.notes', 'leads.followup',
          'customers.view', 'fleet.view'
        ].includes(p.code);
        scope = 'ASSIGNED';
      } else if (norm === 'TECHNICIAN' || norm.includes('TECH')) {
        enabled = ['repairs.view', 'repairs.update', 'inventory.view', 'fleet.view', 'recoveries.view', 'recoveries.inspect'].includes(p.code);
        scope = 'ASSIGNED';
      } else if (norm === 'HUB_INCHARGE' || norm.includes('HUB')) {
        enabled = [
          'repairs.view', 'repairs.create', 'repairs.update', 'inventory.view', 'fleet.view', 'fleet.assign', 'fleet.maintenance',
          'recoveries.view', 'recoveries.create', 'recoveries.assign_tech', 'recoveries.settle'
        ].includes(p.code);
        scope = 'TEAM';
      } else {
        // Any custom role: starts with 0 rights (all disabled) until explicitly configured & saved by admin
        enabled = false;
        scope = 'ALL';
      }
      map[p.code] = { enabled, scope };
    });
    return map;
  };

  const fetchRolesAndUsers = async () => {
    setLoading(true);
    try {
      // 1. Load Roles directly from PostgreSQL
      let combinedRoles: RoleItem[] = [...DEFAULT_SYSTEM_ROLES];
      let rolePermissionsList: any[] = [];

      try {
        const res = await adminApi.get('/admin/roles');
        if (res && res.success && res.data) {
          if (Array.isArray(res.data.roles)) {
            res.data.roles.forEach((br: any) => {
                const existingIndex = combinedRoles.findIndex(c => c.name === br.name || Number(c.id) === Number(br.id));
                const dbRole = {
                  id: br.id,
                  name: br.name,
                  display_name: br.display_name,
                  description: br.description,
                  is_system: br.is_system,
                  permissions_configured: Boolean(br.permissions_configured)
                };
                if (existingIndex >= 0) combinedRoles[existingIndex] = { ...combinedRoles[existingIndex], ...dbRole };
                else combinedRoles.push(dbRole);
            });
          }
          if (Array.isArray(res.data.rolePermissions)) {
            rolePermissionsList = res.data.rolePermissions;
          }
        }
      } catch (e) {
        console.warn('API roles fetch notice:', e);
      }

      // Filter out redundant ADMIN role
      combinedRoles = combinedRoles.filter(r => r.name !== 'ADMIN');
      setRoles(combinedRoles);

      // 2. Load Users from PostgreSQL
      let customList: any[] = [];

      try {
        const res = await adminApi.get('/admin/users');
        if (res && res.success && Array.isArray(res.data)) {
          const nonSuper = res.data.filter((u: any) => 
            u.id !== 1 && 
            u.email !== 'doonridersmain@gmail.com' && 
            !DEMO_EMAILS.includes(u.email?.toLowerCase())
          );
          nonSuper.forEach((bu: any) => {
            const userObj = {
              id: bu.id,
              name: bu.name,
              email: bu.email,
              role_id: bu.role_id,
              role: bu.role_name || 'SALES_EXECUTIVE',
              role_name: bu.role_name || 'SALES_EXECUTIVE',
              roleDisplayName: bu.role_display_name || 'Team Member',
              role_display_name: bu.role_display_name || 'Team Member',
              avatar: bu.avatar_url && !bu.avatar_url.includes('avt-') ? bu.avatar_url : '',
              role_permissions_configured: Boolean(combinedRoles.find(r => Number(r.id) === Number(bu.role_id))?.permissions_configured)
            };
            customList.push(userObj);
          });
        }
      } catch (e) {
        console.warn('API users fetch notice:', e);
      }

      setTeamUsers(customList);

      // 3. Load user permissions directly from PostgreSQL role_permissions
      let userPermMap: UserPermMap = {};

      customList.forEach(u => {
        const uRoleId = Number(u.role_id);
        const userRoleName = (u.role_name || u.role || '').toUpperCase();

        if (userRoleName === 'SUPER_ADMIN') {
          userPermMap[u.id] = getInitialUserPermissions('SUPER_ADMIN');
          return;
        }

        // Check if DB has saved role_permissions for this role
        const rolePermsFromDb = rolePermissionsList.filter(rp => Number(rp.role_id) === uRoleId);

        if (u.role_permissions_configured || rolePermsFromDb.length > 0) {
          const map: any = {};
          allPermissions.forEach(p => {
            const matched = rolePermsFromDb.find(rp => rp.code === p.code);
            if (matched) {
              map[p.code] = { enabled: true, scope: matched.scope || 'ALL' };
            } else {
              map[p.code] = { enabled: false, scope: 'ALL' };
            }
          });
          userPermMap[u.id] = map;
        } else {
          // Fall back to role defaults if DB has not configured custom overrides yet
          userPermMap[u.id] = getInitialUserPermissions(u.role_name || u.role || 'SALES_EXECUTIVE');
        }
      });

      setUserPermissions(userPermMap);

      if (initialUserId && customList.some(u => u.id === initialUserId)) {
        setSelectedUserId(initialUserId);
      } else if (customList.length > 0) {
        setSelectedUserId(customList[0].id);
      } else {
        setSelectedUserId(null);
      }
    } catch (err) {
      console.warn('Error loading roles & users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndUsers();
  }, [initialUserId]);

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setCreatingRole(true);

    const cleanDisplayName = newRoleName.trim();
    const cleanCode = cleanDisplayName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

    const newRoleObj: RoleItem = {
      id: Date.now(),
      name: cleanCode,
      display_name: cleanDisplayName,
      description: newRoleDesc.trim() || `Custom ${cleanDisplayName} role for DOON Riders staff`,
      is_system: false
    };

    try {
      await adminApi.post('/admin/roles', {
        display_name: cleanDisplayName,
        description: newRoleObj.description
      });
    } catch (e) {
      console.warn('API sync for role creation:', e);
    }

    const updatedRoles = [...roles, newRoleObj];
    localStorage.setItem('dr_custom_roles_list', JSON.stringify(updatedRoles));
    setRoles(updatedRoles);

    setCreatingRole(false);
    setCreateRoleModalOpen(false);
    setNewRoleName('');
    setNewRoleDesc('');

    setRoleSuccessToast(`Custom role "${cleanDisplayName}" created successfully!`);
    setTimeout(() => setRoleSuccessToast(null), 3500);
  };

  const handleDeleteCustomRole = async (roleId: number, displayName: string, isSystem?: boolean) => {
    if (isSystem) {
      alert('System default roles cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete the custom role "${displayName}"?`)) {
      return;
    }

    try {
      await adminApi.delete(`/admin/roles/${roleId}`);
    } catch (e) {
      console.warn('API sync for role deletion:', e);
    }

    const updated = roles.filter(r => r.id !== roleId);
    localStorage.setItem('dr_custom_roles_list', JSON.stringify(updated));
    setRoles(updated);

    setRoleSuccessToast(`Role "${displayName}" deleted.`);
    setTimeout(() => setRoleSuccessToast(null), 3000);
  };

  const selectedUser = teamUsers.find(u => u.id === selectedUserId) || (teamUsers.length > 0 ? teamUsers[0] : null);

  const currentPerms = selectedUser
    ? (userPermissions[selectedUser.id] || getInitialUserPermissions(selectedUser.role_name || selectedUser.role || 'SALES_EXECUTIVE'))
    : {};

  const handleTogglePermission = (code: string) => {
    if (!selectedUser) return;
    setUserPermissions(prev => {
      const userMap = { ...(prev[selectedUser.id] || currentPerms) };
      const current = userMap[code] || { enabled: false, scope: 'ALL' };
      userMap[code] = {
        ...current,
        enabled: !current.enabled
      };
      return {
        ...prev,
        [selectedUser.id]: userMap
      };
    });
  };

  const handleScopeChange = (code: string, newScope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN') => {
    if (!selectedUser) return;
    setUserPermissions(prev => {
      const userMap = { ...(prev[selectedUser.id] || currentPerms) };
      const current = userMap[code] || { enabled: true, scope: 'ALL' };
      userMap[code] = {
        ...current,
        enabled: true,
        scope: newScope
      };
      return {
        ...prev,
        [selectedUser.id]: userMap
      };
    });
  };

  const handleUserRoleChange = (newRoleId: number) => {
    if (!selectedUser) return;
    const targetRole = roles.find(r => Number(r.id) === Number(newRoleId));
    if (!targetRole) return;

    // 1. Update selectedUser role in teamUsers immediately
    setTeamUsers(prev => prev.map(u => {
      if (u.id === selectedUser.id) {
        return {
          ...u,
          role_id: Number(targetRole.id),
          role: targetRole.name,
          role_name: targetRole.name,
          role_display_name: targetRole.display_name,
          roleDisplayName: targetRole.display_name,
          role_permissions_configured: Boolean(targetRole.permissions_configured)
        };
      }
      return u;
    }));

    // 2. Set default permissions map for the newly selected role
    const newMap = getInitialUserPermissions(targetRole.name);
    setUserPermissions(prev => ({
      ...prev,
      [selectedUser.id]: newMap
    }));
  };

  const handleApplyPreset = (preset: 'FULL' | 'SALES' | 'OPS' | 'TECH' | 'RECOVERY' | 'PRE_BOOKING' | 'VIEW_ONLY') => {
    if (!selectedUser) return;
    let presetRoleName = 'SALES_EXECUTIVE';
    if (preset === 'FULL') presetRoleName = 'SUPER_ADMIN';
    if (preset === 'OPS') presetRoleName = 'MANAGER';
    if (preset === 'TECH') presetRoleName = 'TECHNICIAN';
    if (preset === 'RECOVERY') presetRoleName = 'RECOVERY_AGENT';
    if (preset === 'PRE_BOOKING') presetRoleName = 'PRE_BOOKING';

    const matchedRole = roles.find(r => r.name === presetRoleName || r.name.includes(presetRoleName));

    if (preset === 'VIEW_ONLY') {
      const viewMap: any = {};
      allPermissions.forEach(p => {
        viewMap[p.code] = {
          enabled: p.code.includes('.view'),
          scope: 'ALL'
        };
      });
      setUserPermissions(prev => ({
        ...prev,
        [selectedUser.id]: viewMap
      }));
      return;
    }

    if (matchedRole) {
      setTeamUsers(prev => prev.map(u => {
        if (u.id === selectedUser.id) {
          return {
            ...u,
            role_id: Number(matchedRole.id),
            role: matchedRole.name,
            role_name: matchedRole.name,
            role_display_name: matchedRole.display_name,
            roleDisplayName: matchedRole.display_name,
            role_permissions_configured: Boolean(matchedRole.permissions_configured)
          };
        }
        return u;
      }));
    }

    const newMap = getInitialUserPermissions(presetRoleName);
    setUserPermissions(prev => ({
      ...prev,
      [selectedUser.id]: newMap
    }));
  };

  const handleSavePermissions = async () => {
    if (!selectedUser || savingPermissions) return;
    setSavingPermissions(true);
    setPermissionSaveError(null);
    setSavedSuccess(false);
    try {
      const response = await adminApi.post('/admin/roles/permission', {
        userId: selectedUser.id,
        roleId: selectedUser.role_id,
        roleName: selectedUser.role_name || selectedUser.role,
        permissions: userPermissions[selectedUser.id]
      });
      if (!response?.success) {
        throw new Error(response?.message || 'Permission save failed. Please try again.');
      }

      localStorage.setItem('dr_user_custom_permissions', JSON.stringify(userPermissions));
      const roleKey = (selectedUser.role_name || selectedUser.role || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
      if (roleKey && roleKey !== 'SUPER_ADMIN') {
        try {
          const storedRolePerms = localStorage.getItem('dr_role_custom_permissions');
          const rolePermMap = storedRolePerms ? JSON.parse(storedRolePerms) : {};
          rolePermMap[roleKey] = userPermissions[selectedUser.id];
          if (selectedUser.role_display_name || selectedUser.roleDisplayName) {
            rolePermMap[selectedUser.role_display_name || selectedUser.roleDisplayName] = userPermissions[selectedUser.id];
          }
          localStorage.setItem('dr_role_custom_permissions', JSON.stringify(rolePermMap));
        } catch (storageError) {
          console.warn('Could not cache role permissions locally:', storageError);
        }
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      setPermissionSaveError(e?.message || 'Permission save failed. Please try again.');
      console.error('Permission save failed:', e);
    } finally {
      setSavingPermissions(false);
    }
  };

  const modules = ['ALL', 'Dashboard', 'Pre-Bookings', 'Leads', 'Customers', 'Fleet & Rentals', 'Repairs & Workshop', 'Scooty Recovery', 'Reports', 'Team Directory'];

  const filteredPermissions = allPermissions.filter(p => {
    const matchesTab = activeModuleTab === 'ALL' || p.module === activeModuleTab;
    const matchesSearch = p.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          p.module.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const grantedCount = selectedUser ? Object.values(currentPerms).filter(p => p?.enabled).length : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Toast Notification */}
      {roleSuccessToast && (
        <div className="bg-[#EAFBF2] border border-[#00D96B] text-[#00A854] p-4 rounded-2xl flex items-center gap-2.5 shadow-sm text-xs font-bold animate-fadeIn">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{roleSuccessToast}</span>
        </div>
      )}
      {permissionSaveError && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold">
          {permissionSaveError}
        </div>
      )}

      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">
            Role &amp; Granular Permission Matrix
          </h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Create dynamic custom roles (e.g. Technician, Hub Incharge, XYZ) and configure granular module permissions &amp; data scopes
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setCreateRoleModalOpen(true)}
            className="inline-flex items-center gap-2 bg-white hover:bg-[#F7F9FA] text-[#111827] border border-[#E5E7EB] hover:border-[#00D96B] font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#00A854]" />
            <span>Create Custom Role</span>
          </button>

          {selectedUser && (
            <button
              onClick={handleSavePermissions}
              disabled={savingPermissions}
              className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition transform active:scale-95 cursor-pointer flex-shrink-0"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Permissions Saved!</span>
                </>
              ) : savingPermissions ? (
                <><Save className="w-4 h-4 animate-pulse" /><span>Saving…</span></>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Permissions</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* DEFINED SYSTEM & CUSTOM ROLES DIRECTORY CHIPS */}
      {/* ========================================================= */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00A854]" />
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
              Configured Roles Directory ({roles.length})
            </h3>
          </div>
          <button
            onClick={() => setCreateRoleModalOpen(true)}
            className="text-[11px] font-bold text-[#00A854] hover:underline cursor-pointer"
          >
            + Add Custom Role Name
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {roles.map(r => (
            <div
              key={r.id}
              className="p-3 bg-[#F7F9FA] hover:bg-white border border-[#E5E7EB] hover:border-[#00D96B]/50 rounded-xl transition shadow-sm space-y-1.5 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#111827] group-hover:text-[#00A854] transition">
                    {r.display_name}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${
                    r.is_system
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-[#EAFBF2] text-[#00A854] border-[#00D96B]/30'
                  }`}>
                    {r.is_system ? 'System' : 'Custom Role'}
                  </span>
                </div>
                <p className="text-[11px] text-[#667085] line-clamp-2 mt-0.5">
                  {r.description || `Role for ${r.display_name}`}
                </p>
              </div>

              {!r.is_system && (
                <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteCustomRole(Number(r.id), r.display_name, r.is_system)}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Delete Role
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* USER SELECTOR OR EMPTY STATE */}
      {teamUsers.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center mx-auto shadow-sm">
            <Users className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-[#111827]">No Custom Team Members Yet</h3>
            <p className="text-xs text-[#667085] mt-1 leading-relaxed">
              Create your staff members in the Team Directory, then customize their exact module permissions here.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Team Member in Directory &rarr;</span>
          </Link>
        </div>
      ) : (
        <>
          {/* USER SELECTOR CARDS */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#00A854]" />
                <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  Select Team Member to Customize Permissions:
                </span>
              </div>
              <span className="text-[11px] text-[#667085] font-mono">
                {teamUsers.length} Staff Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {teamUsers.map(u => {
                const isSelected = selectedUserId === u.id;
                const uPerms = userPermissions[u.id] || getInitialUserPermissions(u.role_name || u.role || 'SALES_EXECUTIVE');
                const uCount = Object.values(uPerms).filter(p => p?.enabled).length;

                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EAFBF2] border-[#00D96B] text-[#00A854] shadow-sm ring-1 ring-[#00D96B]'
                        : 'bg-[#F7F9FA] border-[#E5E7EB] text-[#475467] hover:bg-white hover:border-[#00D96B]/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854] font-black text-xs shadow-sm overflow-hidden flex-shrink-0">
                      {u.avatar || u.avatar_url ? (
                        <img src={u.avatar || u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(u.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-xs truncate ${isSelected ? 'text-[#111827]' : 'text-[#475467]'}`}>
                        {u.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-[#00A854] truncate">
                          {u.role_display_name || u.roleDisplayName || 'Team Member'}
                        </span>
                        <span className="text-[9px] text-[#98A2B3] font-mono">
                          ({uCount} perms)
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PERMISSION MATRIX TOOLBAR */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* Active User Context Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/40 flex items-center justify-center text-[#00A854] font-black text-sm">
                  {getInitials(selectedUser?.name || 'User')}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#111827] flex items-center gap-2 flex-wrap">
                    <span>Customizing: {selectedUser?.name}</span>
                    <span className="text-[10px] bg-[#EAFBF2] text-[#00A854] px-2 py-0.5 rounded-full font-mono font-bold border border-[#00D96B]/30">
                      {selectedUser?.role_display_name || selectedUser?.roleDisplayName || 'Staff'}
                    </span>
                    <span className="text-[10px] text-[#667085] font-mono font-normal">
                      ({selectedUser?.email})
                    </span>
                  </h3>
                  
                  {/* Dynamic Role Selector */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#475467]">Assigned Role:</span>
                    <select
                      value={selectedUser?.role_id || ''}
                      onChange={(e) => handleUserRoleChange(Number(e.target.value))}
                      className="bg-[#F7F9FA] hover:bg-white border border-[#D0D5DD] hover:border-[#00D96B] rounded-lg px-2.5 py-1 text-xs font-bold text-[#111827] focus:outline-none focus:border-[#00D96B] focus:ring-1 focus:ring-[#00D96B] cursor-pointer shadow-sm"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.display_name} ({r.name})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-[#667085]">
                      • Granted: <strong>{grantedCount} of {allPermissions.length}</strong> permissions
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Profile Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-[#98A2B3] uppercase">Quick Presets:</span>
                <button
                  onClick={() => handleApplyPreset('SALES')}
                  className="px-2.5 py-1 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] border border-[#E5E7EB] rounded-lg text-xs font-bold transition"
                >
                  Sales Exec
                </button>
                <button
                  onClick={() => handleApplyPreset('OPS')}
                  className="px-2.5 py-1 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] border border-[#E5E7EB] rounded-lg text-xs font-bold transition"
                >
                  Ops Manager
                </button>
                <button
                  onClick={() => handleApplyPreset('TECH')}
                  className="px-2.5 py-1 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] border border-[#E5E7EB] rounded-lg text-xs font-bold transition"
                >
                  Technician
                </button>
                <button
                  onClick={() => handleApplyPreset('RECOVERY')}
                  className="px-2.5 py-1 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] border border-[#E5E7EB] rounded-lg text-xs font-bold transition"
                >
                  Recovery Agent
                </button>
                <button
                  onClick={() => handleApplyPreset('PRE_BOOKING')}
                  className="px-2.5 py-1 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] border border-[#E5E7EB] rounded-lg text-xs font-bold transition"
                >
                  Pre-Booking
                </button>
                <button
                  onClick={() => handleApplyPreset('FULL')}
                  className="px-2.5 py-1 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] border border-[#E5E7EB] rounded-lg text-xs font-bold transition"
                >
                  Super Admin
                </button>
                <button
                  onClick={() => handleApplyPreset('VIEW_ONLY')}
                  className="px-2.5 py-1 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] border border-[#E5E7EB] rounded-lg text-xs font-bold transition"
                >
                  View Only
                </button>
              </div>
            </div>

            {/* Module Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {modules.map(mod => (
                  <button
                    key={mod}
                    onClick={() => setActiveModuleTab(mod)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      activeModuleTab === mod
                        ? 'bg-[#00D96B] text-white shadow-sm'
                        : 'bg-[#F7F9FA] border border-[#E5E7EB] text-[#667085] hover:text-[#111827]'
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search permission..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B]"
                />
              </div>
            </div>
          </div>

          {/* GRANULAR PERMISSIONS TABLE */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F7F9FA] text-[#667085] uppercase text-[11px] font-bold">
                    <th className="p-3.5 px-4 w-12 text-center">Grant</th>
                    <th className="p-3.5 px-4">Permission Code</th>
                    <th className="p-3.5 px-4">Functional Module</th>
                    <th className="p-3.5 px-4">Description</th>
                    <th className="p-3.5 px-4 text-right">Data Scope Enforcement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
                  {filteredPermissions.map(p => {
                    const permState = currentPerms[p.code] || { enabled: false, scope: 'ALL' };
                    const isGranted = permState.enabled;

                    return (
                      <tr
                        key={p.id}
                        className={`transition ${isGranted ? 'bg-white hover:bg-[#F7F9FA]' : 'bg-[#FAFAFA] opacity-70 hover:opacity-100 hover:bg-white'}`}
                      >
                        {/* Checkbox */}
                        <td className="p-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(p.code)}
                            className="cursor-pointer text-[#00A854] hover:scale-110 transition-transform inline-flex items-center justify-center"
                          >
                            {isGranted ? (
                              <CheckSquare className="w-5 h-5 fill-[#EAFBF2] stroke-[#00D96B] stroke-[2.2]" />
                            ) : (
                              <Square className="w-5 h-5 text-[#D1D5DB] stroke-[1.8]" />
                            )}
                          </button>
                        </td>

                        {/* Code */}
                        <td className="p-3.5 px-4">
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${
                            isGranted
                              ? 'bg-[#EAFBF2] text-[#00A854] border-[#00D96B]/30'
                              : 'bg-[#F1F5F9] text-[#667085] border-[#E5E7EB]'
                          }`}>
                            {p.code}
                          </span>
                        </td>

                        {/* Module */}
                        <td className="p-3.5 px-4">
                          <span className="font-bold text-[#111827] text-xs">
                            {p.module}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="p-3.5 px-4 text-[#475467] text-xs max-w-md truncate">
                          {p.description}
                        </td>

                        {/* Data Scope Dropdown */}
                        <td className="p-3.5 px-4 text-right">
                          {isGranted ? (
                            <select
                              value={permState.scope || 'ALL'}
                              onChange={(e) => handleScopeChange(p.code, e.target.value as any)}
                              className="bg-[#F7F9FA] border border-[#E5E7EB] hover:border-[#00D96B] text-[#111827] text-[11px] font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#00D96B] cursor-pointer"
                            >
                              <option value="ALL">ALL (Company Wide)</option>
                              <option value="TEAM">TEAM (Branch / Hub)</option>
                              <option value="ASSIGNED">ASSIGNED (Direct Only)</option>
                              <option value="OWN">OWN (Self Created)</option>
                            </select>
                          ) : (
                            <span className="text-[10px] text-[#98A2B3] font-mono italic">
                              Revoked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm flex items-center justify-between">
            <p className="text-xs text-[#667085]">
              Configuring custom access profile for <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
            </p>
            <button
              onClick={handleSavePermissions}
              disabled={savingPermissions}
              className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className={`w-4 h-4 ${savingPermissions ? 'animate-pulse' : ''}`} />}
              <span>{savedSuccess ? 'Changes Saved!' : savingPermissions ? 'Saving…' : 'Save Permissions'}</span>
            </button>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* CREATE CUSTOM ROLE MODAL */}
      {/* ========================================================= */}
      {createRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111827]">Create Custom Role</h3>
                  <p className="text-xs text-[#667085]">Define any new base role name (e.g. Technician, XYZ)</p>
                </div>
              </div>
              <button
                onClick={() => setCreateRoleModalOpen(false)}
                className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#111827] hover:bg-[#F7F9FA] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Role Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technician, Hub Incharge, Workshop Manager, XYZ..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111827] font-bold focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
                  autoFocus
                />
              </div>

              {/* Suggestions */}
              <div>
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block mb-1.5">
                  Popular Role Templates:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTED_ROLES.map((sr) => (
                    <button
                      key={sr.title}
                      type="button"
                      onClick={() => {
                        setNewRoleName(sr.title);
                        setNewRoleDesc(sr.desc);
                      }}
                      className={`text-left p-2 rounded-xl border text-[11px] transition cursor-pointer ${
                        newRoleName.toLowerCase() === sr.title.toLowerCase()
                          ? 'bg-[#EAFBF2] border-[#00D96B] text-[#00A854] shadow-sm'
                          : 'bg-[#F7F9FA] border-[#E5E7EB] text-[#475467] hover:border-[#00D96B]/50'
                      }`}
                    >
                      <p className="font-bold">{sr.title}</p>
                      <p className="text-[9px] text-[#667085] line-clamp-1 mt-0.5">{sr.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Role Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe the primary responsibilities and functional domain for this role..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B] focus:bg-white transition resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateRoleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#667085] hover:bg-[#F7F9FA] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRole}
                  className="bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition cursor-pointer disabled:opacity-50"
                >
                  {creatingRole ? 'Creating Role...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default function RolesAndPermissionsPage() {
  return (
    <AdminLayout>
      <Suspense fallback={
        <div className="p-10 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#00D96B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <RolesAndPermissionsContent />
      </Suspense>
    </AdminLayout>
  );
}
