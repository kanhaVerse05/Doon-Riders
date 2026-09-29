'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../lib/adminApi';
import { Search } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get(`/admin/customers?search=${encodeURIComponent(search)}`);
      if (res.success) setCustomers(res.data);
    } catch (err) {
      console.error('Failed to load customers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Customer Directory</h2>
          <p className="text-xs text-[#667085] mt-0.5">Verified customer profiles and KYC records</p>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or code (CUST-2026-001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-9 pr-4 py-2 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B]"
            />
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F9FA] text-[#667085] uppercase text-[11px] font-bold">
                <th className="p-3.5 px-4">Customer Code</th>
                <th className="p-3.5 px-4">Full Name</th>
                <th className="p-3.5 px-4">Phone & City</th>
                <th className="p-3.5 px-4">KYC Status</th>
                <th className="p-3.5 px-4">Total Deals</th>
                <th className="p-3.5 px-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-[#98A2B3]">Loading customers...</td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-[#667085]">No customers registered yet.</td></tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F7F9FA] transition">
                    <td className="p-3.5 px-4">
                      <span className="font-mono font-bold text-[#00A854] bg-[#EAFBF2] border border-[#00D96B]/30 px-2 py-0.5 rounded">
                        {c.customer_code}
                      </span>
                    </td>
                    <td className="p-3.5 px-4 font-bold text-[#111827]">{c.name}</td>
                    <td className="p-3.5 px-4">
                      <p className="text-[#111827] font-mono">{c.phone}</p>
                      <p className="text-[10px] text-[#667085]">{c.city || 'Dehradun'}</p>
                    </td>
                    <td className="p-3.5 px-4">
                      <span className="bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        {c.kyc_status} ({c.id_proof_type})
                      </span>
                    </td>
                    <td className="p-3.5 px-4 font-mono font-bold text-[#111827]">{c.total_rentals || 1} Deals</td>
                    <td className="p-3.5 px-4 text-[#667085] text-[11px]">{new Date(c.created_at).toLocaleDateString()}</td>
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
