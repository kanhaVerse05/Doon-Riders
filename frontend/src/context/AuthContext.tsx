'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApi } from '../lib/adminApi';

export interface UserPermission {
  code: string;
  scope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN';
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  roleId: number;
  roleName: string;
  roleDisplayName: string;
  avatarUrl?: string;
  permissions: UserPermission[];
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchRoleDemo: (role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALES_EXECUTIVE' | 'HUB_INCHARGE' | 'TECHNICIAN') => Promise<void>;
  hasPermission: (permissionCode: string, requiredScope?: string) => boolean;
  canAccess: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDefaultRolePermissions = (roleName: string): UserPermission[] => {
  const norm = (roleName || '').toUpperCase();

  if (norm === 'SUPER_ADMIN') {
    return [
      { code: 'dashboard.view', scope: 'ALL' },
      { code: 'dashboard.view_all', scope: 'ALL' },
      { code: 'dashboard.view_sales', scope: 'ALL' },
      { code: 'leads.view', scope: 'ALL' },
      { code: 'leads.view_all', scope: 'ALL' },
      { code: 'leads.create', scope: 'ALL' },
      { code: 'leads.edit', scope: 'ALL' },
      { code: 'leads.delete', scope: 'ALL' },
      { code: 'leads.assign', scope: 'ALL' },
      { code: 'customers.view', scope: 'ALL' },
      { code: 'customers.view_all', scope: 'ALL' },
      { code: 'fleet.view', scope: 'ALL' },
      { code: 'repairs.view', scope: 'ALL' },
      { code: 'repairs.create', scope: 'ALL' },
      { code: 'repairs.update', scope: 'ALL' },
      { code: 'inventory.view', scope: 'ALL' },
      { code: 'inventory.manage', scope: 'ALL' },
      { code: 'pre_bookings.view', scope: 'ALL' },
      { code: 'reports.view', scope: 'ALL' },
      { code: 'users.view', scope: 'ALL' },
      { code: 'roles.view', scope: 'ALL' },
      { code: 'audit.view', scope: 'ALL' },
      { code: 'settings.view', scope: 'ALL' }
    ];
  }

  if (norm === 'ADMIN') {
    return [
      { code: 'dashboard.view', scope: 'ALL' },
      { code: 'dashboard.view_all', scope: 'ALL' },
      { code: 'leads.view', scope: 'ALL' },
      { code: 'leads.view_all', scope: 'ALL' },
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
      { code: 'reports.view', scope: 'ALL' },
      { code: 'users.view', scope: 'ALL' }
    ];
  }

  if (norm === 'MANAGER') {
    return [
      { code: 'dashboard.view', scope: 'ALL' },
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
      { code: 'reports.view', scope: 'ALL' }
    ];
  }

  if (norm === 'TECHNICIAN' || norm.includes('TECH')) {
    return [
      { code: 'repairs.view', scope: 'ASSIGNED' },
      { code: 'repairs.update', scope: 'ASSIGNED' },
      { code: 'inventory.view', scope: 'ALL' },
      { code: 'fleet.view', scope: 'ASSIGNED' }
    ];
  }

  if (norm === 'HUB_INCHARGE' || norm.includes('HUB')) {
    return [
      { code: 'repairs.view', scope: 'TEAM' },
      { code: 'repairs.create', scope: 'TEAM' },
      { code: 'repairs.update', scope: 'TEAM' },
      { code: 'inventory.view', scope: 'TEAM' },
      { code: 'fleet.view', scope: 'TEAM' },
      { code: 'pre_bookings.view', scope: 'TEAM' }
    ];
  }

  // Sales Executive Default
  return [
    { code: 'dashboard.view', scope: 'ASSIGNED' },
    { code: 'dashboard.view_sales', scope: 'ASSIGNED' },
    { code: 'leads.view', scope: 'ASSIGNED' },
    { code: 'leads.view_assigned', scope: 'ASSIGNED' },
    { code: 'leads.create', scope: 'OWN' },
    { code: 'leads.edit', scope: 'ASSIGNED' },
    { code: 'customers.view', scope: 'ASSIGNED' },
    { code: 'pre_bookings.view', scope: 'OWN' },
    { code: 'fleet.view', scope: 'ALL' }
  ];
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('dr_admin_token');
      const savedUser = localStorage.getItem('dr_admin_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Error loading session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (emailInput: string, passwordInput = ''): Promise<boolean> => {
    const emailClean = (emailInput || '').toLowerCase().trim();
    const passClean = (passwordInput || '').trim();

    // 1. Try Backend API first
    try {
      const res = await adminApi.post('/admin/auth/login', { email: emailClean, password: passClean });
      if (res && res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('dr_admin_token', res.token);
        localStorage.setItem('dr_admin_user', JSON.stringify(res.user));
        return true;
      }
    } catch (apiErr) {
      console.warn('API call error, verifying local credentials:', apiErr);
    }

    // 2. Direct Super Admin Credentials validation
    const superAdminEmails = ['doonridersmain@gmail.com', 'superadmin@doonriders.com'];
    const validPasswords = ['!Admin@8285', 'Admin@1234', 'admin@1234', '!admin@8285'];

    if (superAdminEmails.includes(emailClean) && validPasswords.includes(passClean)) {
      const superAdminUser: AdminUser = {
        id: 1,
        name: 'Ankit Kumar',
        email: 'doonridersmain@gmail.com',
        phone: '+91 8439431999',
        roleId: 1,
        roleName: 'SUPER_ADMIN',
        roleDisplayName: 'Super Admin',
        avatarUrl: '/images/doon-riders-logo.png',
        permissions: getDefaultRolePermissions('SUPER_ADMIN')
      };

      const mockToken = 'dr_super_admin_token_' + Date.now();
      setToken(mockToken);
      setUser(superAdminUser);
      localStorage.setItem('dr_admin_token', mockToken);
      localStorage.setItem('dr_admin_user', JSON.stringify(superAdminUser));
      return true;
    }

    // 3. Authenticate against Custom Team Members
    const storedCustomUsers = localStorage.getItem('dr_custom_team_users');
    if (storedCustomUsers) {
      try {
        const usersList: any[] = JSON.parse(storedCustomUsers);
        const matchedMember = usersList.find(u => u.email?.toLowerCase().trim() === emailClean);

        if (matchedMember) {
          // Load custom permissions if saved in matrix
          let userPerms: UserPermission[] = [];
          const storedPerms = localStorage.getItem('dr_user_custom_permissions');
          if (storedPerms) {
            try {
              const permMap = JSON.parse(storedPerms);
              if (permMap[matchedMember.id]) {
                userPerms = Object.entries(permMap[matchedMember.id])
                  .filter(([_, val]: any) => val?.enabled)
                  .map(([code, val]: any) => ({
                    code,
                    scope: val.scope || 'ALL'
                  }));
              }
            } catch (e) {}
          }

          if (userPerms.length === 0) {
            userPerms = getDefaultRolePermissions(matchedMember.role_name || matchedMember.role || 'SALES_EXECUTIVE');
          }

          const authenticatedCustomUser: AdminUser = {
            id: matchedMember.id,
            name: matchedMember.name,
            email: matchedMember.email,
            phone: matchedMember.phone,
            roleId: matchedMember.role_id || 4,
            roleName: matchedMember.role_name || matchedMember.role || 'SALES_EXECUTIVE',
            roleDisplayName: matchedMember.role_display_name || matchedMember.roleDisplayName || 'Team Member',
            avatarUrl: matchedMember.avatar_url || '',
            permissions: userPerms
          };

          const customToken = 'dr_team_token_' + matchedMember.id + '_' + Date.now();
          setToken(customToken);
          setUser(authenticatedCustomUser);
          localStorage.setItem('dr_admin_token', customToken);
          localStorage.setItem('dr_admin_user', JSON.stringify(authenticatedCustomUser));
          return true;
        }
      } catch (e) {
        console.error('Error parsing custom users for auth:', e);
      }
    }

    // Invalid credentials
    return false;
  };

  const logout = (redirectUrl?: string) => {
    const isTech = user?.roleName === 'TECHNICIAN' || user?.roleName?.includes('TECH');
    const isTechPath = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/technician') ||
      window.location.pathname.startsWith('/admin/technician')
    );

    setUser(null);
    setToken(null);
    localStorage.removeItem('dr_admin_token');
    localStorage.removeItem('dr_admin_user');

    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else if (isTech || isTechPath) {
      window.location.href = '/technician/login';
    } else {
      window.location.href = '/admin/login';
    }
  };

  const switchRoleDemo = async (role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALES_EXECUTIVE' | 'HUB_INCHARGE' | 'TECHNICIAN') => {
    try {
      const res = await adminApi.post('/admin/auth/switch-role-demo', { role });
      if (res && res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('dr_admin_token', res.token);
        localStorage.setItem('dr_admin_user', JSON.stringify(res.user));
        window.location.reload();
      }
    } catch (err: any) {
      console.warn('Switch role notice:', err);
    }
  };

  const hasPermission = (permissionCode: string, requiredScope?: string): boolean => {
    if (!user) return false;
    if (user.roleName === 'SUPER_ADMIN') return true;

    if (!user.permissions || !Array.isArray(user.permissions)) {
      return false;
    }

    const perm = user.permissions.find(p => p.code === permissionCode);
    if (!perm) return false;

    if (requiredScope && perm.scope !== requiredScope && perm.scope !== 'ALL') {
      return false;
    }

    return true;
  };

  const canAccess = (module: string): boolean => {
    if (!user) return false;
    if (user.roleName === 'SUPER_ADMIN') return true;
    if (!user.permissions || !Array.isArray(user.permissions)) return false;
    return user.permissions.some(p => p.code.startsWith(`${module.toLowerCase()}.`));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchRoleDemo,
        hasPermission,
        canAccess
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useRBAC = () => {
  const { hasPermission, canAccess, user } = useAuth();
  return { hasPermission, canAccess, role: user?.roleName, roleDisplayName: user?.roleDisplayName };
};
