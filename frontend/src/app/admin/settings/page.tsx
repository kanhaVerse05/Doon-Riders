'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../lib/adminApi';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await adminApi.get('/admin/settings');
      if (res.success) setSettings(res.data);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">System Settings & Configuration</h2>
          <p className="text-xs text-[#667085] mt-0.5">Manage business parameters and lead routing engine</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.map((s) => (
            <div key={s.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[#111827] font-mono uppercase">{s.key}</h3>
              <p className="text-xs text-[#667085]">{s.description}</p>
              <pre className="bg-[#F7F9FA] text-[#00A854] p-4 rounded-xl text-xs font-mono border border-[#E5E7EB] overflow-x-auto">
                {JSON.stringify(s.value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
