'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';

export default function TechnicianRootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user && user.roleName === 'TECHNICIAN') {
        router.replace('/admin/technician/jobs');
      } else {
        router.replace('/technician/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin" />
    </div>
  );
}
