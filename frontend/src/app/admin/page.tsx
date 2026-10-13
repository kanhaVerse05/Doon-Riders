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

    const isSuper = user.roleName === 'SUPER_ADMIN' || user.roleName?.includes('SUPER');
    const isPreBooking = user.roleName === 'PRE_BOOKING' || 
                         user.roleName?.includes('PRE_BOOK') || 
                         user.roleDisplayName?.toLowerCase().includes('pre-booking');

    if (isSuper || hasPermission('dashboard.view')) {
      router.replace('/admin/dashboard');
    } else if (isPreBooking || hasPermission('pre_bookings.view')) {
      router.replace('/admin/pre-bookings');
    } else if (hasPermission('leads.view')) {
      router.replace('/admin/leads');
    } else if (hasPermission('complaints.view')) {
      router.replace('/admin/complaints');
    } else if (hasPermission('repairs.view')) {
      router.replace('/admin/repair-jobs');
    } else if (hasPermission('inventory.view')) {
      router.replace('/admin/inventory');
    } else {
      router.replace('/admin/pre-bookings');
    }
  }, [user, isLoading, router, hasPermission]);

  return (
    <div className="min-h-screen bg-[#070b0e] flex items-center justify-center text-gray-400 text-xs font-mono">
      Redirecting to authorized workspace...
    </div>
  );
}
