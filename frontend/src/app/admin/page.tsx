'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function AdminIndexPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/admin/login');
      return;
    }

    const isSuper = user.roleName === 'SUPER_ADMIN';
    if (isSuper || hasPermission('dashboard.view')) {
      router.replace('/admin/dashboard');
    } else if (hasPermission('pre_bookings.view')) {
      router.replace('/admin/pre-bookings');
    } else if (hasPermission('leads.view')) {
      router.replace('/admin/leads');
    } else if (hasPermission('complaints.view')) {
      router.replace('/admin/complaints');
    } else if (hasPermission('repairs.view')) {
      router.replace('/admin/repair-jobs');
    } else if (hasPermission('inventory.view')) {
      router.replace('/admin/inventory');
    } else if (hasPermission('returns.view')) {
      router.replace('/admin/returns');
    } else if (hasPermission('recoveries.view')) {
      router.replace('/admin/recoveries');
    } else if (hasPermission('customers.view')) {
      router.replace('/admin/customers');
    } else if (hasPermission('users.view')) {
      router.replace('/admin/users');
    } else {
      router.replace('/admin/no-access');
    }
  }, [user, isLoading, router, hasPermission]);

  return (
    <div className="min-h-screen bg-[#070b0e] flex items-center justify-center text-gray-400 text-xs font-mono">
      Redirecting to authorized workspace...
    </div>
  );
}
