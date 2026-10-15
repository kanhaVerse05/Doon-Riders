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
  customPermissions?: Record<string, { enabled: boolean; scope?: string }> | any;
  custom_permissions?: Record<string, { enabled: boolean; scope?: string }> | any;
  permissions: UserPermission[];
}

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchRoleDemo: (role: 'SUPER_ADMIN' | 'MANAGER' | 'SALES_EXECUTIVE' | 'HUB_INCHARGE' | 'TECHNICIAN') => Promise<void>;
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
      { code: 'complaints.view', scope: 'ALL' },
      { code: 'complaints.create', scope: 'ALL' },
      { code: 'complaints.update', scope: 'ALL' },
      { code: 'complaints.assign', scope: 'ALL' },
      { code: 'inventory.view', scope: 'ALL' },
      { code: 'inventory.manage', scope: 'ALL' },
      { code: 'pre_bookings.view', scope: 'ALL' },
      { code: 'recoveries.view', scope: 'ALL' },
      { code: 'recoveries.view_all', scope: 'ALL' },
      { code: 'recoveries.create', scope: 'ALL' },
      { code: 'recoveries.accept', scope: 'ALL' },
      { code: 'recoveries.pickup', scope: 'ALL' },
      { code: 'recoveries.reached_hub', scope: 'ALL' },
      { code: 'recoveries.assign_tech', scope: 'ALL' },
      { code: 'recoveries.inspect', scope: 'ALL' },
      { code: 'recoveries.settle', scope: 'ALL' },
      { code: 'reports.view', scope: 'ALL' },
      { code: 'users.view', scope: 'ALL' },
      { code: 'roles.view', scope: 'ALL' },
      { code: 'audit.view', scope: 'ALL' },
      { code: 'settings.view', scope: 'ALL' }
    ];
  }


  return [];
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const savedToken = localStorage.getItem('dr_admin_token');
        if (!savedToken) return;
        setToken(savedToken);
        const meRes = await adminApi.get('/admin/auth/me');
        if (!active) return;
        if (meRes?.success && meRes.user) {
          setUser(meRes.user);
          localStorage.setItem('dr_admin_user', JSON.stringify(meRes.user));
        } else {
          setToken(null);
          localStorage.removeItem('dr_admin_token');
          localStorage.removeItem('dr_admin_user');
        }
      } catch (e) {
        if (active) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('dr_admin_token');
          localStorage.removeItem('dr_admin_user');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => { active = false; };
  }, []);

  const login = async (emailInput: string, passwordInput = ''): Promise<boolean> => {
    const emailClean = (emailInput || '').toLowerCase().trim();
    const passClean = (passwordInput || '').trim();

    // Only a server-verified account may create an authenticated session.
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
      console.warn('Login request failed:', apiErr);
    }
    return false;
  };

  const logout = (redirectUrl?: string | any) => {
    const isTech = user?.roleName === 'TECHNICIAN' || user?.roleName?.includes('TECH');
    const isTechPath = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/technician') ||
      window.location.pathname.startsWith('/admin/technician')
    );

    setUser(null);
    setToken(null);
    localStorage.removeItem('dr_admin_token');
    localStorage.removeItem('dr_admin_user');

    if (typeof redirectUrl === 'string' && redirectUrl.trim().length > 0 && !redirectUrl.includes('object')) {
      window.location.href = redirectUrl;
    } else if (isTech || isTechPath) {
      window.location.href = '/technician/login';
    } else {
      window.location.href = '/admin/login';
    }
  };

  const switchRoleDemo = async (role: 'SUPER_ADMIN' | 'MANAGER' | 'SALES_EXECUTIVE' | 'HUB_INCHARGE' | 'TECHNICIAN') => {
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
    const normRole = (user.roleName || user.roleDisplayName || '').toUpperCase();
    if (normRole === 'SUPER_ADMIN') {
      return true;
    }

    // 1. Check user.customPermissions from Database
    if (user.customPermissions && typeof user.customPermissions === 'object') {
      const p = (user.customPermissions as any)[permissionCode];
      if (p !== undefined) {
        if (!p.enabled) return false;
        if (requiredScope && p.scope && p.scope !== requiredScope && p.scope !== 'ALL') {
          return false;
        }
        return true;
      }
    }

    // Check the permission list returned by the backend (or the local-only login fallback).
    if (user.permissions && Array.isArray(user.permissions)) {
      const perm = user.permissions.find(p => p.code === permissionCode || p.code?.toLowerCase() === permissionCode.toLowerCase());
      if (perm) {
        if (requiredScope && perm.scope && perm.scope !== requiredScope && perm.scope !== 'ALL') {
          return false;
        }
        return true;
      }
      // If user.permissions array was provided from database, permissions not present are disallowed
      return false;
    }

    // Fallback only if permissions were never loaded.
    const defaults = getDefaultRolePermissions(user.roleName || user.roleDisplayName);
    const defPerm = defaults.find(p => p.code === permissionCode || p.code?.toLowerCase() === permissionCode.toLowerCase());
    if (defPerm) {
      if (requiredScope && defPerm.scope !== requiredScope && defPerm.scope !== 'ALL') {
        return false;
      }
      return true;
    }

    return false;
  };

  const canAccess = (module: string): boolean => {
    if (!user) return false;
    const normRole = (user.roleName || user.roleDisplayName || '').toUpperCase();
    if (normRole === 'SUPER_ADMIN') {
      return true;
    }

    const modPrefix = `${module.toLowerCase()}.`;

    // A module is available for navigation only when the user has a view permission in it.
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions.some(p => p.code.startsWith(modPrefix) && /\.view(?:_|$)/.test(p.code));
    }

    // Fallback only if permissions were never loaded.
    const defaults = getDefaultRolePermissions(user.roleName || user.roleDisplayName);
    return defaults.some(p => p.code.startsWith(modPrefix) && /\.view(?:_|$)/.test(p.code));
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
