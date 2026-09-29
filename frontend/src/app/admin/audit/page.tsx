'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../lib/adminApi';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get('/admin/audit');
      if (res.success) setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Security Audit Trail</h2>
          <p className="text-xs text-[#667085] mt-0.5">Immutable record of all sensitive operations</p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F9FA] text-[#667085] uppercase text-[11px] font-bold">
                <th className="p-3.5 px-4">Timestamp</th>
                <th className="p-3.5 px-4">User</th>
                <th className="p-3.5 px-4">Role</th>
                <th className="p-3.5 px-4">Action</th>
                <th className="p-3.5 px-4">Module</th>
                <th className="p-3.5 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-[#98A2B3]">Loading audit trail...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-[#667085]">No logs recorded.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F7F9FA] transition">
                    <td className="p-3.5 px-4 text-[#667085] text-[11px] font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 px-4 font-bold text-[#111827]">{log.user_name || 'System'}</td>
                    <td className="p-3.5 px-4">
                      <span className="bg-[#F7F9FA] text-[#667085] border border-[#E5E7EB] px-2 py-0.5 rounded text-[10px] font-bold">
                        {log.user_role}
                      </span>
                    </td>
                    <td className="p-3.5 px-4 font-mono font-bold text-[#00A854]">{log.action}</td>
                    <td className="p-3.5 px-4 font-semibold text-[#667085]">{log.module}</td>
                    <td className="p-3.5 px-4 text-[#111827]">{log.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
