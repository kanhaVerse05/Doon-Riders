'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../lib/adminApi';
import {
  UserPlus,
  Search,
  User,
  Phone,
  Mail,
  Lock,
  Check,
  X,
  ShieldCheck,
  ArrowRight,
  Trash2,
  AlertCircle,
  Camera,
  Upload
} from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role_id: number;
  role_name?: string;
  role_display_name: string;
  status: string;
  avatar_url?: string;
  last_login?: string;
  created_at?: string;
  is_super_admin?: boolean;
}

interface RoleItem {
  id: number | string;
  name: string;
  display_name: string;
  is_system?: boolean;
}

const DEFAULT_ROLES: RoleItem[] = [
  { id: 4, name: 'SALES_EXECUTIVE', display_name: 'Sales Executive', is_system: true },
  { id: 3, name: 'MANAGER', display_name: 'Sales & Operations Manager', is_system: true },
  { id: 2, name: 'ADMIN', display_name: 'Admin', is_system: true },
  { id: 5, name: 'HUB_INCHARGE', display_name: 'Hub Incharge', is_system: false },
  { id: 6, name: 'TECHNICIAN', display_name: 'Technician', is_system: false }
];

const POPULAR_ROLE_CHIPS = [
  'Technician',
  'Hub Incharge',
  'Workshop Manager',
  'Fleet Supervisor',
  'Accountant',
  'Field Executive'
];

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

export default function UsersPage() {
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRoleValue, setSelectedRoleValue] = useState<string>('4'); // ID or 'CUSTOM'
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [password, setPassword] = useState('Admin@1234');
  const [status, setStatus] = useState('active');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSuperAdmin = (): TeamMember => {
    let savedSuperAdminAvatar = '';
    let savedSuperAdminName = 'Ankit Kumar';
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('dr_admin_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.avatarUrl && !parsed.avatarUrl.includes('doon-riders-logo') && !parsed.avatarUrl.includes('avt-')) {
            savedSuperAdminAvatar = parsed.avatarUrl;
          }
          if (parsed.name) savedSuperAdminName = parsed.name;
        } catch (e) {}
      }
    }

    return {
      id: 1,
      name: savedSuperAdminName,
      email: 'doonridersmain@gmail.com',
      phone: '+91 8439431999',
      role_id: 1,
      role_name: 'SUPER_ADMIN',
      role_display_name: 'Super Admin',
      status: 'active',
      avatar_url: savedSuperAdminAvatar,
      is_super_admin: true,
      last_login: new Date().toISOString()
    };
  };

  const fetchRoles = async () => {
    try {
      const storedRoles = localStorage.getItem('dr_custom_roles_list');
      let combined: RoleItem[] = [...DEFAULT_ROLES];
      if (storedRoles) {
        try {
          const parsed = JSON.parse(storedRoles);
          parsed.forEach((pr: RoleItem) => {
            if (!combined.some(c => c.name === pr.name || c.display_name.toLowerCase() === pr.display_name.toLowerCase())) {
              combined.push(pr);
            }
          });
        } catch (e) {}
      }

      try {
        const res = await adminApi.get('/admin/roles');
        if (res && res.success && res.data && res.data.roles) {
          res.data.roles.forEach((br: any) => {
            if (br.name !== 'SUPER_ADMIN' && !combined.some(c => c.name === br.name || c.id === br.id)) {
              combined.push({
                id: br.id,
                name: br.name,
                display_name: br.display_name,
                is_system: br.is_system
              });
            }
          });
        }
      } catch (e) {}

      localStorage.setItem('dr_custom_roles_list', JSON.stringify(combined));
      setRoles(combined);
    } catch (e) {
      console.warn('Error fetching roles:', e);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const superAdmin = getSuperAdmin();
      const storedCustomUsers = localStorage.getItem('dr_custom_team_users');
      let customList: TeamMember[] = [];
      if (storedCustomUsers) {
        try {
          const parsed = JSON.parse(storedCustomUsers);
          customList = parsed.filter((u: any) => !DEMO_EMAILS.includes(u.email?.toLowerCase()) && u.email !== 'doonridersmain@gmail.com');
        } catch (e) {}
      }

      // Try Backend API
      try {
        const res = await adminApi.get('/admin/users');
        if (res && res.success && res.data && res.data.length > 0) {
          const backendNonDemo = res.data.filter((u: any) => 
            u.email !== 'doonridersmain@gmail.com' && 
            u.id !== 1 && 
            !DEMO_EMAILS.includes(u.email?.toLowerCase())
          );
          backendNonDemo.forEach((bu: any) => {
            if (!customList.some(cu => cu.email === bu.email)) {
              customList.push({
                id: bu.id,
                name: bu.name,
                email: bu.email,
                phone: bu.phone,
                role_id: bu.role_id,
                role_name: bu.role_name,
                role_display_name: bu.role_display_name,
                status: bu.status || 'active',
                avatar_url: bu.avatar_url && !bu.avatar_url.includes('avt-') ? bu.avatar_url : '',
                is_super_admin: false
              });
            }
          });
        }
      } catch (apiErr) {}

      localStorage.setItem('dr_custom_team_users', JSON.stringify(customList));
      setUsers([superAdmin, ...customList]);
    } catch (err) {
      console.warn('Error loading users:', err);
      setUsers([getSuperAdmin()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorToast(null);

    const emailClean = email.toLowerCase().trim();

    if (emailClean === 'doonridersmain@gmail.com') {
      setErrorToast('Cannot create another Super Admin account.');
      setCreating(false);
      return;
    }

    if (users.some(u => u.email.toLowerCase() === emailClean)) {
      setErrorToast('A team member with this email address already exists.');
      setCreating(false);
      return;
    }

    const isCustom = selectedRoleValue === 'CUSTOM';
    if (isCustom && !customRoleInput.trim()) {
      setErrorToast('Please enter a Custom Role Name (e.g. Technician, Hub Incharge, XYZ).');
      setCreating(false);
      return;
    }

    let targetRoleId: number | string = Number(selectedRoleValue);
    let targetRoleDisplayName = 'Sales Executive';
    let targetRoleName = 'SALES_EXECUTIVE';

    if (isCustom) {
      targetRoleDisplayName = customRoleInput.trim();
      targetRoleName = targetRoleDisplayName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      targetRoleId = Date.now();

      // Register new role in roles list
      const newRoleObj: RoleItem = {
        id: targetRoleId,
        name: targetRoleName,
        display_name: targetRoleDisplayName,
        is_system: false
      };

      setRoles(prev => {
        if (prev.some(r => r.name === targetRoleName || r.display_name.toLowerCase() === targetRoleDisplayName.toLowerCase())) {
          return prev;
        }
        const updated = [...prev, newRoleObj];
        localStorage.setItem('dr_custom_roles_list', JSON.stringify(updated));
        return updated;
      });
    } else {
      const matchedRole = roles.find(r => String(r.id) === String(selectedRoleValue));
      if (matchedRole) {
        targetRoleId = matchedRole.id;
        targetRoleDisplayName = matchedRole.display_name;
        targetRoleName = matchedRole.name;
      }
    }

    const newUser: TeamMember = {
      id: Date.now(),
      name: name.trim(),
      email: emailClean,
      phone: phone.trim() || '+91 98000 00000',
      role_id: Number(targetRoleId) || Date.now(),
      role_name: targetRoleName,
      role_display_name: targetRoleDisplayName,
      status: status,
      avatar_url: avatarUrl || '',
      created_at: new Date().toISOString(),
      is_super_admin: false
    };

    // 1. Try Backend API
    try {
      await adminApi.post('/admin/users', {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        roleId: isCustom ? undefined : targetRoleId,
        custom_role_name: isCustom ? targetRoleDisplayName : undefined,
        password,
        avatarUrl: newUser.avatar_url
      });
    } catch (err) {
      console.warn('API notice for user creation:', err);
    }

    // 2. Save locally
    const storedCustomUsers = localStorage.getItem('dr_custom_team_users');
    const customList: TeamMember[] = storedCustomUsers ? JSON.parse(storedCustomUsers) : [];
    customList.push(newUser);
    localStorage.setItem('dr_custom_team_users', JSON.stringify(customList));

    // Update state
    setUsers(prev => [...prev, newUser]);
    setSuccessToast(`Team member "${newUser.name}" with role "${targetRoleDisplayName}" created successfully!`);
    setCreating(false);
    setCreateModalOpen(false);

    // Reset Form
    setName('');
    setEmail('');
    setPhone('');
    setPassword('Admin@1234');
    setSelectedRoleValue('4');
    setCustomRoleInput('');
    setAvatarUrl('');

    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDeleteUser = (userId: number, userName: string, isSuperAdmin?: boolean) => {
    if (isSuperAdmin || userId === 1) {
      alert('Super Admin cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${userName} from the team directory?`)) {
      return;
    }

    const storedCustomUsers = localStorage.getItem('dr_custom_team_users');
    if (storedCustomUsers) {
      try {
        const list: TeamMember[] = JSON.parse(storedCustomUsers);
        const updated = list.filter(u => u.id !== userId);
        localStorage.setItem('dr_custom_team_users', JSON.stringify(updated));
      } catch (e) {}
    }

    setUsers(prev => prev.filter(u => u.id !== userId));
    setSuccessToast(`Team member "${userName}" removed.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const dynamicFilterRoles = ['ALL', ...Array.from(new Set([
    'SUPER_ADMIN',
    'ADMIN',
    'MANAGER',
    'SALES_EXECUTIVE',
    'HUB_INCHARGE',
    'TECHNICIAN',
    ...roles.map(r => r.name),
    ...users.map(u => u.role_name).filter(Boolean)
  ]))];

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                          u.email.toLowerCase().includes(search.toLowerCase()) ||
                          (u.phone && u.phone.includes(search));
    const matchesRole = roleFilter === 'ALL' || 
                        u.role_name === roleFilter || 
                        u.role_display_name?.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight flex items-center gap-2.5">
              Team Directory
              <span className="text-xs bg-[#EAFBF2] text-[#00A854] font-mono font-bold px-2.5 py-0.5 rounded-full border border-[#00D96B]/30">
                {users.length} Total Members
              </span>
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Manage authorized employees, create staff accounts, create custom roles (Technician, Hub Incharge, XYZ), and configure access
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition-all transform active:scale-95 cursor-pointer flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>

        {/* Notifications */}
        {successToast && (
          <div className="bg-[#EAFBF2] border border-[#00D96B] text-[#00A854] p-4 rounded-2xl flex items-center justify-between shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2.5 font-bold text-xs">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{successToast}</span>
            </div>
            <Link
              href="/admin/roles"
              className="text-xs font-bold underline hover:text-[#111827] flex items-center gap-1"
            >
              Configure Permissions &rarr;
            </Link>
          </div>
        )}

        {errorToast && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-2.5 shadow-sm text-xs font-bold animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorToast}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {dynamicFilterRoles.slice(0, 8).map((rf) => (
              <button
                key={rf}
                onClick={() => setRoleFilter(rf as string)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  roleFilter === rf
                    ? 'bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/40 shadow-sm'
                    : 'bg-[#F7F9FA] border border-[#E5E7EB] text-[#667085] hover:text-[#111827]'
                }`}
              >
                {rf === 'ALL' ? 'All Roles' : (rf as string).replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FA] text-[#667085] uppercase text-[11px] font-bold">
                  <th className="p-4 px-5">Team Member</th>
                  <th className="p-4 px-5">Email Address</th>
                  <th className="p-4 px-5">Assigned Role</th>
                  <th className="p-4 px-5">Account Status</th>
                  <th className="p-4 px-5 text-right">Actions &amp; Authorization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-[#98A2B3]">
                      Loading directory...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-[#98A2B3]">
                      No team members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSuperAdmin = u.is_super_admin || u.role_name === 'SUPER_ADMIN' || u.id === 1 || u.email === 'doonridersmain@gmail.com';
                    
                    return (
                      <tr key={u.id} className="hover:bg-[#F7F9FA] transition group">
                        <td className="p-4 px-5 flex items-center gap-3.5">
                          <div className="relative w-10 h-10 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854] font-black text-xs shadow-sm overflow-hidden flex-shrink-0">
                            {u.avatar_url && !u.avatar_url.includes('doon-riders-logo') && !u.avatar_url.includes('avt-') ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{getInitials(u.name)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#111827] text-xs sm:text-sm">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-[#667085] font-mono">{u.phone || 'No phone'}</p>
                          </div>
                        </td>
                        <td className="p-4 px-5 font-mono text-[#667085]">{u.email}</td>
                        <td className="p-4 px-5">
                          <span className={`font-bold px-3 py-1 rounded-lg text-[10px] border ${
                            isSuperAdmin
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-[#EAFBF2] text-[#00A854] border-[#00D96B]/30'
                          }`}>
                            {u.role_display_name}
                          </span>
                        </td>
                        <td className="p-4 px-5">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 px-5 text-right">
                          {isSuperAdmin ? (
                            <span className="text-[#98A2B3] text-sm font-mono pr-4 select-none">
                              —
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/roles?userId=${u.id}`}
                                className="inline-flex items-center gap-1.5 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#111827] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/50 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-[#00A854]" />
                                <span>Permissions</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name, u.is_super_admin)}
                                title="Remove User"
                                className="p-1.5 rounded-xl text-[#98A2B3] hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* CREATE NEW USER MODAL (WITH DYNAMIC CUSTOM ROLE CREATION) */}
      {/* ========================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111827]">Create Team Member</h3>
                  <p className="text-xs text-[#667085]">Add staff and assign existing or custom role</p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#111827] hover:bg-[#F7F9FA] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="space-y-4">
              
              {/* Profile Photo Uploader with Auto Initials Preview */}
              <div className="flex items-center gap-4 p-3 bg-[#F7F9FA] border border-[#E5E7EB] rounded-2xl">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-2xl bg-[#EAFBF2] border-2 border-dashed border-[#00D96B] flex items-center justify-center overflow-hidden cursor-pointer group shadow-sm flex-shrink-0 hover:scale-105 transition-transform"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-lg text-[#00A854]">
                      {getInitials(name || 'New User')}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                    <Camera className="w-4 h-4" />
                    <span className="text-[8px] font-bold uppercase mt-0.5">Upload</span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#111827]">Profile Picture</p>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#667085]">
                    {avatarUrl
                      ? 'Custom photo uploaded'
                      : 'No photo uploaded — avatar with initials will be generated automatically.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00A854] hover:text-[#00D96B] cursor-pointer mt-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Photo (Optional)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohit Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="rohit.sales@doonriders.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B] focus:bg-white transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Role Selection & Custom Role Option */}
              <div className="space-y-3 p-3.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                      Select Base Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedRoleValue}
                      onChange={(e) => setSelectedRoleValue(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B] transition cursor-pointer font-bold shadow-sm"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={String(r.id)}>
                          {r.display_name} {r.is_system ? '(Standard)' : '(Custom)'}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Create New Custom Role (e.g. Technician, Hub Incharge, etc.)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                      Account Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B] transition font-mono shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* If Custom Role is chosen */}
                {selectedRoleValue === 'CUSTOM' && (
                  <div className="pt-2 border-t border-[#E5E7EB] space-y-2.5 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-[#00A854] mb-1">
                        Enter Custom Role Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Technician, Hub Incharge, Workshop Manager, XYZ..."
                        value={customRoleInput}
                        onChange={(e) => setCustomRoleInput(e.target.value)}
                        className="w-full bg-white border-2 border-[#00D96B] rounded-xl px-3.5 py-2 text-xs text-[#111827] font-bold focus:outline-none focus:ring-2 focus:ring-[#00D96B]/30 shadow-sm"
                        autoFocus
                      />
                    </div>

                    {/* Quick suggestion chips */}
                    <div>
                      <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider block mb-1">
                        Quick Suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {POPULAR_ROLE_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => setCustomRoleInput(chip)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                              customRoleInput.toLowerCase() === chip.toLowerCase()
                                ? 'bg-[#00D96B] text-white border-[#00D96B] shadow-sm'
                                : 'bg-white border-[#E5E7EB] text-[#475467] hover:border-[#00D96B] hover:text-[#00A854]'
                            }`}
                          >
                            + {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#667085] hover:bg-[#F7F9FA] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Creating User...' : 'Create Team Member'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </AdminLayout>
  );
}
