'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { adminApi } from '../../../../lib/adminApi';
import {
  CheckSquare,
  Square,
  ArrowRight,
  RotateCw,
  Users,
  Check,
  Search,
  UserPlus,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role_display_name: string;
  avatar_url?: string;
  status?: string;
}

const DEMO_EMAILS = [
  'admin@doonriders.com',
  'manager@doonriders.com',
  'rahul.sales@doonriders.com',
  'priya.sales@doonriders.com',
  'amit.sales@doonriders.com',
  'demo@doonriders.com'
];

export default function LeadAssignmentPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [teamStaff, setTeamStaff] = useState<TeamMember[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const defaultSampleLead = [
    {
      id: 1,
      lead_code: 'LD-1042',
      name: 'Rohan Mehra',
      phone: '+91 98111 22334',
      email: 'rohan.mehra@gmail.com',
      location: 'Dehradun (Rajpur Road)',
      vehicle_interested_in: 'DOON Electro Pro',
      rental_plan: 'Weekly',
      rental_duration_days: 7,
      lead_source: 'Meta Ads',
      status: 'Interested',
      assigned_to: null,
      notes: 'Customer wants electric scooter for weekly food delivery commute.',
      created_at: new Date().toISOString()
    }
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Load Staff (EXCLUDING Super Admin - ID 1 & doonridersmain@gmail.com)
      let staffList: TeamMember[] = [];
      const storedCustomUsers = localStorage.getItem('dr_custom_team_users');
      if (storedCustomUsers) {
        try {
          const parsed = JSON.parse(storedCustomUsers);
          staffList = parsed.filter((u: any) => 
            u.id !== 1 && 
            u.email !== 'doonridersmain@gmail.com' &&
            !DEMO_EMAILS.includes(u.email?.toLowerCase())
          );
        } catch (e) {}
      }

      try {
        const usersRes = await adminApi.get('/admin/users');
        if (usersRes && usersRes.success && usersRes.data) {
          const backendNonSuper = usersRes.data.filter((u: any) => 
            u.id !== 1 && 
            u.email !== 'doonridersmain@gmail.com' &&
            !DEMO_EMAILS.includes(u.email?.toLowerCase())
          );
          backendNonSuper.forEach((bu: any) => {
            if (!staffList.some(cu => cu.id === bu.id || cu.email === bu.email)) {
              staffList.push({
                id: bu.id,
                name: bu.name,
                email: bu.email,
                role_display_name: bu.role_display_name || 'Staff Member',
                avatar_url: bu.avatar_url,
                status: bu.status
              });
            }
          });
        }
      } catch (err) {}

      setTeamStaff(staffList);
      if (staffList.length > 0 && !selectedStaffId) {
        setSelectedStaffId(String(staffList[0].id));
      }

      // 2. Load Leads
      try {
        const leadsRes = await adminApi.get('/admin/leads?status=All');
        if (leadsRes && leadsRes.success && leadsRes.data) {
          setLeads(leadsRes.data);
        } else {
          setLeads(defaultSampleLead);
        }
      } catch (e) {
        setLeads(defaultSampleLead);
      }

    } catch (err) {
      console.warn('Assignment data notice:', err);
      setLeads(defaultSampleLead);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleSelectLead = (id: number) => {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedLeads.length === 0) {
      alert('Please select at least one lead from the table below.');
      return;
    }

    if (!selectedStaffId) {
      alert('Please select a staff member from the dropdown.');
      return;
    }

    const targetStaff = teamStaff.find(u => u.id === Number(selectedStaffId));
    if (!targetStaff) {
      alert('Selected staff member not found.');
      return;
    }

    try {
      await adminApi.post('/admin/leads/bulk-assign', {
        leadIds: selectedLeads,
        assignToUserId: Number(selectedStaffId)
      });
    } catch (err: any) {
      console.warn('API assign notice:', err);
    }

    // Update local state
    setLeads(prev => prev.map(l => {
      if (selectedLeads.includes(l.id)) {
        return {
          ...l,
          assigned_to: targetStaff.id,
          assigned_to_name: targetStaff.name
        };
      }
      return l;
    }));

    setSuccessToast(`Successfully assigned ${selectedLeads.length} lead(s) to ${targetStaff.name}!`);
    setSelectedLeads([]);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleUnassign = async () => {
    if (selectedLeads.length === 0) return;

    setLeads(prev => prev.map(l => {
      if (selectedLeads.includes(l.id)) {
        return {
          ...l,
          assigned_to: null,
          assigned_to_name: null
        };
      }
      return l;
    }));

    setSuccessToast(`Unassigned ${selectedLeads.length} lead(s).`);
    setSelectedLeads([]);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesFilter = 
      statusFilter === 'All' ? true :
      statusFilter === 'Unassigned' ? !lead.assigned_to :
      statusFilter === 'Assigned' ? Boolean(lead.assigned_to) :
      lead.status === statusFilter;
    
    const matchesSearch = 
      (lead.name && lead.name.toLowerCase().includes(search.toLowerCase())) ||
      (lead.phone && lead.phone.includes(search)) ||
      (lead.lead_code && lead.lead_code.toLowerCase().includes(search.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const selectedStaffObj = teamStaff.find(u => u.id === Number(selectedStaffId));

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight flex items-center gap-3">
              Lead Allocation &amp; Assignment
              <span className="text-xs font-mono font-bold bg-[#EAFBF2] text-[#00A854] px-3 py-0.5 rounded-full border border-[#00D96B]/30">
                Direct Dispatch
              </span>
            </h2>
            <p className="text-xs text-[#667085] font-medium mt-1">
              Select leads and assign them directly to your staff members below
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#00A854] bg-[#EAFBF2] border border-[#00D96B]/30 hover:bg-[#EAFBF2]/80 rounded-xl transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Team Member</span>
            </Link>

            <button
              onClick={fetchData}
              className="px-4 py-2 text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FA] rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-[#EAFBF2] border border-[#00D96B] text-[#00A854] p-4 rounded-2xl flex items-center gap-2.5 font-bold text-xs shadow-sm animate-fadeIn">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{successToast}</span>
          </div>
        )}

        {/* COMPACT ALLOCATION TOOLBAR + TABLE */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden space-y-4 p-5">
          
          {/* Top Filter & Dropdown Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
            
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {['All', 'Unassigned', 'Assigned', 'Interested', 'Follow-up'].map(f => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    statusFilter === f
                      ? 'bg-[#00D96B] text-white shadow-sm'
                      : 'bg-[#F7F9FA] border border-[#E5E7EB] text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* INLINE ASSIGNMENT DROPDOWN & ACTIONS */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              
              {/* Staff Selector Dropdown */}
              {teamStaff.length === 0 ? (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-medium">
                  No staff members created yet. <Link href="/admin/users" className="font-bold underline">Add Staff &rarr;</Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#667085] whitespace-nowrap">Assign to:</span>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="bg-[#F7F9FA] border border-[#E5E7EB] hover:border-[#00D96B] text-[#111827] text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-[#00D96B] cursor-pointer min-w-[180px]"
                  >
                    {teamStaff.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role_display_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Unassign Button */}
              {selectedLeads.length > 0 && (
                <button
                  onClick={handleUnassign}
                  className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer whitespace-nowrap"
                >
                  Unassign ({selectedLeads.length})
                </button>
              )}

              {/* Assign Button */}
              <button
                onClick={handleBulkAssign}
                disabled={selectedLeads.length === 0 || teamStaff.length === 0}
                className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition transform active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
              >
                <span>
                  Assign {selectedLeads.length > 0 ? `(${selectedLeads.length})` : ''} to {selectedStaffObj?.name?.split(' ')[0] || 'Staff'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search lead by name, phone (+91), or lead code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FA] text-[#667085] uppercase text-[11px] font-bold">
                  <th className="p-3 px-4 w-10 text-center">
                    <button onClick={selectAll} className="cursor-pointer text-[#00A854]">
                      {selectedLeads.length > 0 && selectedLeads.length === filteredLeads.length ? (
                        <CheckSquare className="w-4 h-4 stroke-[#00D96B]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#98A2B3]" />
                      )}
                    </button>
                  </th>
                  <th className="p-3 px-4">Lead Code</th>
                  <th className="p-3 px-4">Customer Name &amp; Phone</th>
                  <th className="p-3 px-4">Location</th>
                  <th className="p-3 px-4">Lead Source</th>
                  <th className="p-3 px-4">Current Assignee</th>
                  <th className="p-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-[#98A2B3]">
                      No leads found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const isSelected = selectedLeads.includes(lead.id);
                    const assignedStaffMember = teamStaff.find(u => u.id === lead.assigned_to);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => toggleSelectLead(lead.id)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-[#EAFBF2]/50' : 'hover:bg-[#F7F9FA]'
                        }`}
                      >
                        <td className="p-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelectLead(lead.id)} className="cursor-pointer text-[#00A854]">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 stroke-[#00D96B]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#D1D5DB]" />
                            )}
                          </button>
                        </td>

                        <td className="p-3 px-4 font-mono font-bold text-[#00A854]">
                          {lead.lead_code}
                        </td>

                        <td className="p-3 px-4">
                          <p className="font-bold text-[#111827] text-xs">{lead.name}</p>
                          <p className="text-[11px] text-[#667085] font-mono">{lead.phone}</p>
                        </td>

                        <td className="p-3 px-4 text-[#667085]">
                          {lead.location || 'Dehradun'}
                        </td>

                        <td className="p-3 px-4">
                          <span className="bg-[#F7F9FA] text-[#475467] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            {lead.lead_source}
                          </span>
                        </td>

                        <td className="p-3 px-4">
                          {assignedStaffMember || (lead.assigned_to && lead.assigned_to_name && lead.assigned_to !== 1) ? (
                            <span className="bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/30 px-2.5 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00D96B]"></span>
                              <span>{assignedStaffMember?.name || lead.assigned_to_name}</span>
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                              Unassigned
                            </span>
                          )}
                        </td>

                        <td className="p-3 px-4">
                          <span className="bg-[#F7F9FA] text-[#111827] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
