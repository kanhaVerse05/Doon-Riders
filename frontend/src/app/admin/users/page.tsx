'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  LockKeyhole,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../lib/adminApi';
import { useAuth } from '../../../context/AuthContext';

type Role = {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  is_system?: boolean;
  permissions_configured?: boolean;
};

type Permission = { code: string; module: string; description: string };
type RolePermission = { role_id: number; code: string; scope?: string };
type StaffUser = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role_id: number | null;
  role_name?: string;
  role_display_name?: string;
  status: string;
  avatar_url?: string;
  created_at?: string;
};
type Tab = 'users' | 'roles';

const normalizeRoleCode = (value: string) => value
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'DR';

export default function UserManagementPage() {
  const { user, hasPermission } = useAuth();
  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN';
  const canViewRoles = hasPermission('roles.view');
  const canCreateUsers = hasPermission('users.create');
  const canEditUsers = hasPermission('users.edit') && isSuperAdmin;

  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Record<string, boolean>>({});
  const [searchUsers, setSearchUsers] = useState('');
  const [searchPermissions, setSearchPermissions] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingRights, setSavingRights] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', password: '', roleId: '' });
  const [roleForm, setRoleForm] = useState({ displayName: '', description: '' });

  const selectedRole = roles.find(role => role.id === selectedRoleId) || null;

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const response = await adminApi.get('/admin/users');
    if (!response?.success || !Array.isArray(response.data)) {
      setNotice({ type: 'error', text: response?.message || 'Unable to load staff accounts.' });
      setUsers([]);
    } else {
      setUsers(response.data);
    }
    setLoadingUsers(false);
  }, []);

  const loadRoles = useCallback(async () => {
    if (!canViewRoles) return;
    setLoadingRoles(true);
    const response = await adminApi.get('/admin/roles');
    if (!response?.success || !response.data) {
      setNotice({ type: 'error', text: response?.message || 'Unable to load roles and permissions.' });
      setLoadingRoles(false);
      return;
    }

    const nextRoles = (response.data.roles || []).map((role: any) => ({
      ...role,
      id: Number(role.id)
    })) as Role[];
    const nextPermissions = (response.data.permissions || []) as Permission[];
    const nextRolePermissions = (response.data.rolePermissions || []).map((item: any) => ({
      ...item,
      role_id: Number(item.role_id)
    })) as RolePermission[];

    setRoles(nextRoles);
    setPermissions(nextPermissions);
    setRolePermissions(nextRolePermissions);
    setSelectedRoleId(current => current && nextRoles.some(role => role.id === current)
      ? current
      : (nextRoles.find(role => role.name !== 'SUPER_ADMIN')?.id ?? null));
    setLoadingRoles(false);
  }, [canViewRoles]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (tab === 'roles' || isSuperAdmin) void loadRoles();
  }, [tab, loadRoles, isSuperAdmin]);

  useEffect(() => {
    if (!selectedRoleId) {
      setSelectedCodes({});
      return;
    }
    const grants: Record<string, boolean> = {};
    rolePermissions
      .filter(permission => permission.role_id === selectedRoleId)
      .forEach(permission => { grants[permission.code] = true; });
    setSelectedCodes(grants);
  }, [selectedRoleId, rolePermissions]);

  const groupedPermissions = useMemo(() => {
    const normalizedSearch = searchPermissions.trim().toLowerCase();
    const groups = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const matches = !normalizedSearch || permission.code.toLowerCase().includes(normalizedSearch) ||
        permission.description.toLowerCase().includes(normalizedSearch);
      if (!matches) continue;
      const group = groups.get(permission.module) || [];
      group.push(permission);
      groups.set(permission.module, group);
    }
    return Array.from(groups.entries());
  }, [permissions, searchPermissions]);

  const filteredUsers = users.filter(member => {
    const query = searchUsers.trim().toLowerCase();
    return !query || member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query) ||
      (member.phone || '').toLowerCase().includes(query) || (member.role_display_name || '').toLowerCase().includes(query);
  });

  const selectedCount = Object.values(selectedCodes).filter(Boolean).length;
  const grantCountByRole = (roleId: number) => rolePermissions.filter(permission => permission.role_id === roleId).length;

  const notifyError = (message: string) => setNotice({ type: 'error', text: message });

  const handleCreateUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreateUsers) return;
    if (!userForm.name.trim() || !userForm.email.trim() || userForm.password.length < 8 || (isSuperAdmin && !userForm.roleId)) {
      notifyError('Enter a name, email address, role, and a password with at least 8 characters.');
      return;
    }
    setCreatingUser(true);
    setNotice(null);
    const response = await adminApi.post('/admin/users', {
      name: userForm.name.trim(),
      email: userForm.email.trim().toLowerCase(),
      phone: userForm.phone.trim() || undefined,
      password: userForm.password,
      ...(isSuperAdmin ? { roleId: Number(userForm.roleId) } : {})
    });
    setCreatingUser(false);
    if (!response?.success) {
      notifyError(response?.message || 'Unable to create the user account.');
      return;
    }
    setCreateUserOpen(false);
    setUserForm({ name: '', email: '', phone: '', password: '', roleId: '' });
    setNotice({ type: 'success', text: `The account for ${response.data?.name || 'the user'} was created successfully.` });
    await loadUsers();
  };

  const handleCreateRole = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSuperAdmin) return;
    const displayName = roleForm.displayName.trim();
    if (!displayName || !normalizeRoleCode(displayName)) {
      notifyError('Enter a role name using letters and numbers.');
      return;
    }
    setCreatingRole(true);
    setNotice(null);
    const response = await adminApi.post('/admin/roles', {
      display_name: displayName,
      name: normalizeRoleCode(displayName),
      description: roleForm.description.trim() || `Custom ${displayName} role`
    });
    setCreatingRole(false);
    if (!response?.success) {
      notifyError(response?.message || 'Unable to create the role.');
      return;
    }
    setRoleForm({ displayName: '', description: '' });
    setCreateRoleOpen(false);
    setNotice({ type: 'success', text: `${displayName} was created successfully. No permissions have been assigned.` });
    await loadRoles();
    if (response.data?.id) setSelectedRoleId(Number(response.data.id));
  };

  const handleSaveRights = async () => {
    if (!isSuperAdmin || !selectedRole || selectedRole.name === 'SUPER_ADMIN') return;
    setSavingRights(true);
    setNotice(null);
    const permissionMap = Object.fromEntries(
      permissions.map(permission => [permission.code, {
        enabled: selectedCodes[permission.code] === true,
        scope: ['leads.view', 'pre_bookings.view', 'recoveries.view'].includes(permission.code)
          ? selectedCodes[permission.code.replace('.view', '.view_all')] ? 'ALL' : 'ASSIGNED'
          : 'ALL'
      }])
    );
    const response = await adminApi.post('/admin/roles/permission', {
      roleId: selectedRole.id,
      permissions: permissionMap
    });
    setSavingRights(false);
    if (!response?.success) {
      notifyError(response?.message || 'Unable to save the permissions.');
      return;
    }
    setRolePermissions(current => [
      ...current.filter(permission => permission.role_id !== selectedRole.id),
      ...permissions.filter(permission => selectedCodes[permission.code]).map(permission => ({
        role_id: selectedRole.id,
        code: permission.code,
        scope: 'ALL'
      }))
    ]);
    setRoles(current => current.map(role => role.id === selectedRole.id
      ? { ...role, permissions_configured: true }
      : role));
    setNotice({ type: 'success', text: `${selectedCount} permission${selectedCount === 1 ? '' : 's'} saved for ${selectedRole.display_name}.` });
  };

  const handleDeleteRole = async (role: Role) => {
    if (!isSuperAdmin || role.is_system || role.name === 'SUPER_ADMIN') return;
    if (!window.confirm(`Delete the “${role.display_name}” role? Roles assigned to users cannot be deleted.`)) return;
    const response = await adminApi.delete(`/admin/roles/${role.id}`);
    if (!response?.success) {
      notifyError(response?.message || 'Unable to delete the role.');
      return;
    }
    setNotice({ type: 'success', text: `${role.display_name} was deleted successfully.` });
    await loadRoles();
  };

  const handleRoleChange = async (member: StaffUser, roleId: number) => {
    if (!canEditUsers) return;
    const role = roles.find(item => item.id === roleId);
    if (!role) return;
    const response = await adminApi.patch(`/admin/users/${member.id}/status`, { roleId: role.id });
    if (!response?.success) {
      notifyError(response?.message || 'Unable to update the user role.');
      return;
    }
    setNotice({ type: 'success', text: `${member.name} was assigned the ${role.display_name} role.` });
    await loadUsers();
  };

  const handleDeleteUser = async (member: StaffUser) => {
    if (!hasPermission('users.delete') || member.role_name === 'SUPER_ADMIN') return;
    if (!window.confirm(`Permanently delete the staff account for ${member.name}?`)) return;
    const response = await adminApi.delete(`/admin/users/${member.id}`);
    if (!response?.success) {
      notifyError(response?.message || 'Unable to delete the user account.');
      return;
    }
    setNotice({ type: 'success', text: `The account for ${member.name} was deleted successfully.` });
    await loadUsers();
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#00A854]">
              <ShieldCheck className="h-4 w-4" /> Access Control
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">User Management</h1>
            <p className="mt-1 text-sm text-[#667085]">Manage staff accounts, roles, and module-level permissions.</p>
          </div>
          {tab === 'users' && canCreateUsers && (
            <button
              onClick={() => {
                const firstRole = roles.find(role => role.name !== 'SUPER_ADMIN');
                setUserForm(form => ({ ...form, roleId: form.roleId || (isSuperAdmin && firstRole ? String(firstRole.id) : '') }));
                setCreateUserOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00C96B] px-5 py-3 text-sm font-bold text-[#071B13] shadow-[0_8px_20px_rgba(0,201,107,.2)] transition hover:bg-[#00B85F]"
            >
              <UserPlus className="h-4 w-4" /> Create User
            </button>
          )}
          {tab === 'roles' && isSuperAdmin && (
            <button
              onClick={() => setCreateRoleOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D0D5DD] bg-white px-5 py-3 text-sm font-bold text-[#182230] shadow-sm transition hover:border-[#00C96B]"
            >
              <Plus className="h-4 w-4 text-[#00A854]" /> Create Role
            </button>
          )}
        </div>

        {notice && (
          <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {notice.type === 'success' ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="flex-1">{notice.text}</span>
            <button aria-label="Dismiss message" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="flex gap-2 border-b border-[#E4E7EC]">
          <button
            onClick={() => setTab('users')}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === 'users' ? 'border-[#00C96B] text-[#007A43]' : 'border-transparent text-[#667085] hover:text-[#182230]'}`}
          >
            <Users className="h-4 w-4" /> Users <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[11px]">{users.length}</span>
          </button>
          {canViewRoles && (
            <button
              onClick={() => setTab('roles')}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${tab === 'roles' ? 'border-[#00C96B] text-[#007A43]' : 'border-transparent text-[#667085] hover:text-[#182230]'}`}
            >
              <Shield className="h-4 w-4" /> Roles &amp; Permissions
            </button>
          )}
        </div>

        {tab === 'users' ? (
          <section className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#EAECF0] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h2 className="font-bold text-[#182230]">Staff Accounts</h2>
                <p className="mt-1 text-xs text-[#667085]">Changing an account’s role applies the permissions configured for that role.</p>
              </div>
              <label className="relative block w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                <input value={searchUsers} onChange={event => setSearchUsers(event.target.value)} placeholder="Search by name, email, or role" className="w-full rounded-xl border border-[#D0D5DD] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#00C96B]" />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#F9FAFB] text-[11px] uppercase tracking-wide text-[#667085]">
                  <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Email / Phone</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EAECF0]">
                  {loadingUsers ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#667085]">Loading users…</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-[#667085]">No staff accounts found.</td></tr>
                  ) : filteredUsers.map(member => (
                    <tr key={member.id} className="hover:bg-[#FCFCFD]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-xs font-black text-emerald-700">{initials(member.name)}</span>
                          <div><div className="font-bold text-[#182230]">{member.name}</div><div className="mt-0.5 text-xs text-[#98A2B3]">ID #{member.id}</div></div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="text-[#344054]">{member.email}</div><div className="mt-0.5 text-xs text-[#98A2B3]">{member.phone || 'Phone not added'}</div></td>
                      <td className="px-5 py-4">
                        {canEditUsers && member.role_name !== 'SUPER_ADMIN' ? (
                          <select value={member.role_id ?? ''} onChange={event => void handleRoleChange(member, Number(event.target.value))} className="max-w-[230px] rounded-lg border border-[#D0D5DD] bg-white px-3 py-2 text-xs font-bold text-[#344054] outline-none focus:border-[#00C96B]">
                            {roles.filter(role => role.name !== 'SUPER_ADMIN').map(role => <option key={role.id} value={role.id}>{role.display_name}</option>)}
                          </select>
                        ) : <span className="inline-flex rounded-full border border-[#EAECF0] bg-[#F9FAFB] px-3 py-1.5 text-xs font-bold text-[#344054]">{member.role_display_name || 'No role'}</span>}
                      </td>
                      <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{member.status || 'unknown'}</span></td>
                      <td className="px-5 py-4 text-right">
                        {hasPermission('users.delete') && member.role_name !== 'SUPER_ADMIN' && <button onClick={() => void handleDeleteUser(member)} title="Delete user" className="rounded-lg p-2 text-[#98A2B3] transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
            <section className="h-fit overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm">
              <div className="border-b border-[#EAECF0] px-4 py-4">
                <h2 className="font-bold text-[#182230]">Role Directory</h2>
                <p className="mt-1 text-xs text-[#667085]">Select a role to review and edit its permissions.</p>
              </div>
              <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
                {loadingRoles ? <p className="p-4 text-center text-sm text-[#667085]">Loading roles…</p> : roles.filter(role => role.name !== 'SUPER_ADMIN').map(role => (
                  <div key={role.id} className={`flex items-start gap-2 rounded-xl border p-3 transition ${selectedRoleId === role.id ? 'border-[#00C96B] bg-[#F0FDF5] shadow-sm' : 'border-[#EAECF0] hover:border-[#B7EBD0]'}`}>
                    <button onClick={() => setSelectedRoleId(role.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-bold text-[#182230]">{role.display_name}</span>
                      <span className="mt-1 block text-xs text-[#667085]">{grantCountByRole(role.id)} permissions assigned</span>
                      {!role.permissions_configured && <span className="mt-1 inline-block text-[10px] font-bold text-amber-700">Permission review required</span>}
                    </button>
                    <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 ${selectedRoleId === role.id ? 'text-[#00A854]' : 'text-[#98A2B3]'}`} />
                    {isSuperAdmin && !role.is_system && <button onClick={() => void handleDeleteRole(role)} title="Delete role" className="rounded-md p-1 text-[#98A2B3] hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                ))}
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-[#E4E7EC] bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-[#EAECF0] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div>
                  <h2 className="font-bold text-[#182230]">{selectedRole?.display_name || 'Role permissions'}</h2>
                  <p className="mt-1 text-xs text-[#667085]">Each permission is independent. Only selected actions will be granted.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#F2F4F7] px-3 py-1.5 text-xs font-bold text-[#475467]">{selectedCount} selected</span>
                  {isSuperAdmin && selectedRole && selectedRole.name !== 'SUPER_ADMIN' && <button onClick={() => void handleSaveRights()} disabled={savingRights || loadingRoles} className="inline-flex items-center gap-2 rounded-xl bg-[#00C96B] px-4 py-2.5 text-xs font-black text-[#071B13] transition hover:bg-[#00B85F] disabled:cursor-not-allowed disabled:opacity-60"><Check className="h-4 w-4" />{savingRights ? 'Saving…' : 'Save Permissions'}</button>}
                </div>
              </div>

              {selectedRole?.name === 'SUPER_ADMIN' ? (
                <div className="m-5 flex gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900"><LockKeyhole className="h-5 w-5 shrink-0" /><p>Super Admin has full system access and cannot be modified here.</p></div>
              ) : !selectedRole ? (
                <div className="p-12 text-center text-sm text-[#667085]">Select a role to continue.</div>
              ) : (
                <>
                  <div className="border-b border-[#EAECF0] p-4 sm:px-5">
                    <label className="relative block max-w-md">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                      <input value={searchPermissions} onChange={event => setSearchPermissions(event.target.value)} placeholder="Search permissions or actions" className="w-full rounded-xl border border-[#D0D5DD] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#00C96B]" />
                    </label>
                  </div>
                  <div className="space-y-4 p-4 sm:p-5">
                    {groupedPermissions.length === 0 ? <p className="py-10 text-center text-sm text-[#667085]">No matching permissions found.</p> : groupedPermissions.map(([module, items]) => (
                      <div key={module} className="overflow-hidden rounded-xl border border-[#EAECF0]">
                        <div className="flex items-center justify-between bg-[#F9FAFB] px-4 py-3">
                          <h3 className="text-sm font-extrabold text-[#344054]">{module}</h3>
                          <span className="text-[11px] font-semibold text-[#98A2B3]">{items.filter(item => selectedCodes[item.code]).length} / {items.length}</span>
                        </div>
                        <div className="divide-y divide-[#F2F4F7]">
                          {items.map(permission => (
                            <label key={permission.code} className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition ${selectedCodes[permission.code] ? 'bg-[#F6FEF9]' : 'hover:bg-[#FCFCFD]'}`}>
                              <input type="checkbox" checked={Boolean(selectedCodes[permission.code])} disabled={!isSuperAdmin} onChange={event => setSelectedCodes(current => {
                                const enabled = event.target.checked;
                                const next = { ...current, [permission.code]: enabled };
                                if (permission.code.endsWith('.view_all')) next[permission.code.replace('.view_all', '.view')] = enabled || Boolean(current[permission.code.replace('.view_all', '.view')]);
                                if (permission.code.endsWith('.view') && !enabled) next[permission.code.replace('.view', '.view_all')] = false;
                                return next;
                              })} className="mt-0.5 h-4 w-4 rounded border-[#D0D5DD] accent-[#00B85F] disabled:cursor-not-allowed" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-[#344054]">{permission.description}</span>
                                <span className="mt-1 block font-mono text-[11px] text-[#98A2B3]">{permission.code}</span>
                              </span>
                              {selectedCodes[permission.code] && <Check className="h-4 w-4 shrink-0 text-[#00A854]" />}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </div>

      {createUserOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#101828]/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateUser} className="my-auto w-full max-w-xl space-y-5 rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-black text-[#182230]">Create User</h2><p className="mt-1 text-sm text-[#667085]">Create a staff account and assign a role.</p></div>
              <button type="button" onClick={() => setCreateUserOpen(false)} aria-label="Close"><X className="h-5 w-5 text-[#667085]" /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-[#344054]">Full name<input required value={userForm.name} onChange={event => setUserForm(form => ({ ...form, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#00C96B]" /></label>
              <label className="text-xs font-bold text-[#344054]">Email<input required type="email" autoComplete="off" value={userForm.email} onChange={event => setUserForm(form => ({ ...form, email: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#00C96B]" /></label>
              <label className="text-xs font-bold text-[#344054]">Phone (optional)<input value={userForm.phone} onChange={event => setUserForm(form => ({ ...form, phone: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#00C96B]" /></label>
              <label className="text-xs font-bold text-[#344054]">Temporary password<input required minLength={8} type="password" autoComplete="new-password" value={userForm.password} onChange={event => setUserForm(form => ({ ...form, password: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#00C96B]" /></label>
              <label className="text-xs font-bold text-[#344054] sm:col-span-2">Role{isSuperAdmin ? (
                <select required value={userForm.roleId} onChange={event => setUserForm(form => ({ ...form, roleId: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#00C96B]"><option value="">Select a role</option>{roles.filter(role => role.name !== 'SUPER_ADMIN').map(role => <option key={role.id} value={role.id}>{role.display_name}{grantCountByRole(role.id) === 0 ? ' · no permissions configured' : ''}</option>)}</select>
              ) : <input disabled value={user?.roleDisplayName || 'Your role'} className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] bg-[#F9FAFB] px-3 py-2.5 text-sm font-normal text-[#667085]" />}</label>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EAECF0] pt-4">
              <button type="button" onClick={() => setCreateUserOpen(false)} className="rounded-xl border border-[#D0D5DD] px-4 py-2.5 text-sm font-bold text-[#344054]">Cancel</button>
              <button type="submit" disabled={creatingUser || (isSuperAdmin && roles.length === 0)} className="rounded-xl bg-[#00C96B] px-5 py-2.5 text-sm font-black text-[#071B13] disabled:opacity-50">{creatingUser ? 'Creating…' : 'Create account'}</button>
            </div>
          </form>
        </div>
      )}

      {createRoleOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#101828]/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreateRole} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-black text-[#182230]">Create Custom Role</h2><p className="mt-1 text-sm text-[#667085]">New roles are created without permissions. Assign permissions after creation.</p></div>
              <button type="button" onClick={() => setCreateRoleOpen(false)} aria-label="Close"><X className="h-5 w-5 text-[#667085]" /></button>
            </div>
            <label className="block text-xs font-bold text-[#344054]">Role name<input required maxLength={80} autoFocus value={roleForm.displayName} onChange={event => setRoleForm(form => ({ ...form, displayName: event.target.value }))} placeholder="Jaise: Workshop Supervisor" className="mt-1.5 w-full rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#00C96B]" /></label>
            <label className="block text-xs font-bold text-[#344054]">Description (optional)<textarea maxLength={250} rows={3} value={roleForm.description} onChange={event => setRoleForm(form => ({ ...form, description: event.target.value }))} placeholder="Describe this role’s responsibilities" className="mt-1.5 w-full resize-none rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#00C96B]" /></label>
            <div className="flex justify-end gap-2 border-t border-[#EAECF0] pt-4">
              <button type="button" onClick={() => setCreateRoleOpen(false)} className="rounded-xl border border-[#D0D5DD] px-4 py-2.5 text-sm font-bold text-[#344054]">Cancel</button>
              <button type="submit" disabled={creatingRole} className="rounded-xl bg-[#00C96B] px-5 py-2.5 text-sm font-black text-[#071B13] disabled:opacity-50">{creatingRole ? 'Creating…' : 'Create empty role'}</button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}
