'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, LogOut } from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';

export default function NoAccessPage() {
  const { logout } = useAuth();
  const router = useRouter();

  return (
    <AdminLayout>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
          <LockKeyhole className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black text-[#182230]">No sections assigned</h1>
        <p className="mt-2 text-sm leading-6 text-[#667085]">Contact your Super Admin to request access. Assigned sections will appear after your permissions are updated.</p>
        <div className="mt-6 flex gap-2">
          <button onClick={() => router.refresh()} className="rounded-xl bg-[#00C96B] px-4 py-2.5 text-sm font-bold text-[#071B13]">Refresh access</button>
          <button onClick={() => logout()} className="inline-flex items-center gap-2 rounded-xl border border-[#D0D5DD] px-4 py-2.5 text-sm font-bold text-[#344054]"><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      </div>
    </AdminLayout>
  );
}
