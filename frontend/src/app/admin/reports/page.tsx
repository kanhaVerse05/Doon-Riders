'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../lib/adminApi';

export default function ReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await adminApi.get('/admin/reports/dashboard');
        if (res.success) setStats(res.data);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Business Intelligence & Marketing Reports</h2>
          <p className="text-xs text-[#667085] mt-0.5">Lead attribution, conversion funnel, and team performance metrics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Lead Conversion Funnel</h3>
            <div className="space-y-3 pt-2">
              {[
                { stage: 'Total Inbound Leads', count: stats?.leads?.total_leads || 0, color: 'bg-[#111827]' },
                { stage: 'Contacted & Qualified', count: stats?.leads?.contacted_leads || 0, color: 'bg-blue-500' },
                { stage: 'Interested & Proposals', count: stats?.leads?.interested_leads || 0, color: 'bg-purple-500' },
                { stage: 'Converted Wins', count: stats?.leads?.converted_leads || 0, color: 'bg-[#00D96B]' }
              ].map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#111827] font-bold">{step.stage}</span>
                    <span className="text-[#111827] font-mono font-bold">{step.count}</span>
                  </div>
                  <div className="h-2.5 w-full bg-[#F7F9FA] rounded-full overflow-hidden border border-[#E5E7EB]">
                    <div className={`h-full ${step.color} rounded-full`} style={{ width: `${Math.max(10, (step.count / (stats?.leads?.total_leads || 1)) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Marketing Attribution & Ad Channels</h3>
            <div className="space-y-2.5 pt-2">
              {(stats?.leadsBySource || []).map((src: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#F7F9FA] rounded-xl border border-[#E5E7EB] text-xs">
                  <span className="font-bold text-[#111827]">{src.lead_source}</span>
                  <span className="font-mono text-[#00A854] font-bold bg-[#EAFBF2] px-2.5 py-0.5 rounded border border-[#00D96B]/30">
                    {src.count} Leads
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
