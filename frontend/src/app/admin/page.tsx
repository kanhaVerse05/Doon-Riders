'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#070b0e] flex items-center justify-center text-gray-400 text-xs font-mono">
      Redirecting to Dashboard...
    </div>
  );
}
