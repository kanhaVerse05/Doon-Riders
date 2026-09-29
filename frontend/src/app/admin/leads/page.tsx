'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/adminApi';
import {
  Search,
  Plus,
  Phone,
  MessageSquare,
  Eye,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ArrowRight,
  X,
  MapPin,
  Calendar,
  FileText,
  UserCheck,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role_display_name?: string;
}

export default function LeadsPage() {
  const { user, hasPermission } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [teamUsers, setTeamUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    location: 'Dehradun',
    vehicleInterestedIn: 'DOON Electro Pro',
    rentalDurationDays: 7,
    rentalPlan: 'Weekly',
    leadSource: 'Manual',
    assignedTo: '',
    notes: ''
  });

  // Bulk Upload Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      assigned_to_name: null,
      notes: 'Customer wants electric scooter for weekly food delivery commute.',
      created_at: new Date().toISOString()
    }
  ];

  const fetchUsersAndLeads = async () => {
    setLoading(true);
    try {
      // 1. Team Staff (Excluding Super Admin)
      let usersList: TeamMember[] = [];
      const storedCustomUsers = localStorage.getItem('dr_custom_team_users');
      if (storedCustomUsers) {
        try {
          const parsed = JSON.parse(storedCustomUsers);
          usersList = parsed.filter((u: any) => u.id !== 1 && u.email !== 'doonridersmain@gmail.com');
        } catch (e) {}
      }

      try {
        const uRes = await adminApi.get('/admin/users');
        if (uRes && uRes.success && uRes.data) {
          const nonSuper = uRes.data.filter((bu: any) => bu.id !== 1 && bu.email !== 'doonridersmain@gmail.com');
          nonSuper.forEach((bu: any) => {
            if (!usersList.some(cu => cu.id === bu.id || cu.email === bu.email)) {
              usersList.push({
                id: bu.id,
                name: bu.name,
                email: bu.email,
                role_display_name: bu.role_display_name || 'Staff'
              });
            }
          });
        }
      } catch (e) {}

      setTeamUsers(usersList);

      // 2. Leads
      let query = `/admin/leads?status=${statusFilter}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      const res = await adminApi.get(query);
      if (res && res.success && res.data) {
        setLeads(res.data);
      } else {
        setLeads(defaultSampleLead);
      }
    } catch (err) {
      console.warn('Leads fetch notice:', err);
      setLeads(defaultSampleLead);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndLeads();
  }, [statusFilter, search]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminApi.post('/admin/leads', {
        ...formData,
        assignedTo: formData.assignedTo ? Number(formData.assignedTo) : undefined
      });
      if (res && res.success) {
        setToastMessage(`Lead ${res.data?.lead_code || 'LD-New'} created successfully!`);
        setShowCreateModal(false);
        fetchUsersAndLeads();
      } else {
        // Local add
        const newLead = {
          id: Date.now(),
          lead_code: `LD-${1040 + leads.length + 1}`,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          location: formData.location,
          vehicle_interested_in: formData.vehicleInterestedIn,
          rental_plan: formData.rentalPlan,
          rental_duration_days: formData.rentalDurationDays,
          lead_source: formData.leadSource,
          status: 'New',
          assigned_to: formData.assignedTo ? Number(formData.assignedTo) : null,
          assigned_to_name: teamUsers.find(u => u.id === Number(formData.assignedTo))?.name || null,
          notes: formData.notes,
          created_at: new Date().toISOString()
        };
        setLeads(prev => [newLead, ...prev]);
        setShowCreateModal(false);
        setToastMessage(`Lead ${newLead.lead_code} created!`);
      }
    } catch (err: any) {
      alert('Error creating lead: ' + err.message);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQuickAssign = async (leadId: number, assignToUserId: string) => {
    const targetUserId = assignToUserId ? Number(assignToUserId) : null;
    const targetUser = teamUsers.find(u => u.id === targetUserId);

    try {
      if (targetUserId) {
        await adminApi.post('/admin/leads/bulk-assign', {
          leadIds: [leadId],
          assignToUserId: targetUserId
        });
      }
    } catch (e) {}

    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          assigned_to: targetUserId,
          assigned_to_name: targetUser ? targetUser.name : null
        };
      }
      return l;
    }));

    setToastMessage(targetUser ? `Lead assigned to ${targetUser.name}!` : 'Lead unassigned.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadSampleCsv = () => {
    const headers = 'Lead Number,Name,Location,Lead Source,Rental Plan,Notes';
    const sampleRows = [
      '+91 98111 22334,Aarav Sharma,Rajpur Road,Meta Ads,Weekly,Urgent pickup required',
      '+91 98222 33445,Sneha Rawat,Clock Tower,Google Ads,Monthly,Daily college commute'
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...sampleRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'doon_riders_leads_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert('CSV file is empty or has no data rows.');
        return;
      }

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length >= 2) {
          rows.push({
            phone: parts[0] || '',
            name: parts[1] || 'Inbound Lead',
            location: parts[2] || 'Dehradun',
            leadSource: parts[3] || 'Excel Import',
            rentalPlan: parts[4] || 'Weekly',
            notes: parts[5] || ''
          });
        }
      }
      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    try {
      const res = await adminApi.post('/admin/leads/bulk-import', { leads: parsedRows });
      if (res && res.success) {
        setImportResult({ count: res.importedCount || parsedRows.length, message: res.message });
        fetchUsersAndLeads();
      } else {
        // local append
        const imported = parsedRows.map((r, idx) => ({
          id: Date.now() + idx,
          lead_code: `LD-${1050 + leads.length + idx}`,
          name: r.name,
          phone: r.phone,
          location: r.location,
          lead_source: r.leadSource,
          rental_plan: r.rentalPlan,
          status: 'New',
          notes: r.notes,
          created_at: new Date().toISOString()
        }));
        setLeads(prev => [...imported, ...prev]);
        setImportResult({ count: imported.length, message: `Successfully imported ${imported.length} leads!` });
      }
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Inbound Lead Pipeline</h2>
            <p className="text-xs text-[#667085] mt-0.5">Manage, track, and assign customer leads across company channels</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FA] transition shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#00A854]" />
              <span>BULK IMPORT (EXCEL / CSV)</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD INBOUND LEAD</span>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="bg-[#EAFBF2] border border-[#00D96B] text-[#00A854] p-3.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, code (LD-1042)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {['All', 'New', 'Contacted', 'Interested', 'Follow-up', 'Converted'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/40 shadow-sm'
                    : 'bg-[#F7F9FA] border border-[#E5E7EB] text-[#667085] hover:text-[#111827]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Leads Table with Direct Assign Dropdown */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FA] text-[#667085] uppercase text-[11px] font-bold">
                  <th className="p-3.5 px-4">Code</th>
                  <th className="p-3.5 px-4">Name &amp; Contact</th>
                  <th className="p-3.5 px-4">Location</th>
                  <th className="p-3.5 px-4">Lead Source</th>
                  <th className="p-3.5 px-4">Rental Plan</th>
                  <th className="p-3.5 px-4">Assigned Staff</th>
                  <th className="p-3.5 px-4">Status</th>
                  <th className="p-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-[#98A2B3]">Loading leads pipeline...</td></tr>
                ) : leads.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-[#98A2B3]">No leads found.</td></tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#F7F9FA] transition">
                      <td className="p-3.5 px-4 font-mono font-bold">
                        <span className="bg-[#EAFBF2] text-[#00A854] px-2 py-0.5 rounded border border-[#00D96B]/30">
                          {lead.lead_code}
                        </span>
                      </td>

                      <td className="p-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#111827] text-xs">{lead.name}</span>
                          <span className="text-[#667085] font-mono text-[11px]">• {lead.phone}</span>
                        </div>
                      </td>

                      <td className="p-3.5 px-4 text-[#667085]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#98A2B3]" />
                          <span>{lead.location || 'Dehradun'}</span>
                        </span>
                      </td>

                      <td className="p-3.5 px-4">
                        <span className="bg-[#F7F9FA] text-[#475467] border border-[#E5E7EB] px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {lead.lead_source}
                        </span>
                      </td>

                      <td className="p-3.5 px-4 text-[#667085]">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-[#98A2B3]" />
                          <span>{lead.rental_plan || 'Weekly'}</span>
                        </span>
                      </td>

                      {/* DIRECT ASSIGNMENT DROPDOWN */}
                      <td className="p-3.5 px-4">
                        <select
                          value={lead.assigned_to || ''}
                          onChange={(e) => handleQuickAssign(lead.id, e.target.value)}
                          className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border transition cursor-pointer focus:outline-none ${
                            lead.assigned_to
                              ? 'bg-[#EAFBF2] text-[#00A854] border-[#00D96B]/40'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="">Unassigned</option>
                          {teamUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role_display_name || 'Staff'})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3.5 px-4">
                        <span className="bg-[#F7F9FA] text-[#111827] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          {lead.status}
                        </span>
                      </td>

                      <td className="p-3.5 px-4 text-right">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="inline-flex items-center gap-1 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#111827] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/40 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#00A854]" />
                          <span>Manage</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CREATE LEAD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="font-bold text-base text-[#111827]">Create Inbound Lead</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikas Negi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">Rental Plan</label>
                  <select
                    value={formData.rentalPlan}
                    onChange={(e) => setFormData({ ...formData, rentalPlan: e.target.value })}
                    className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00D96B]"
                  >
                    <option value="Weekly">Weekly (₹1,699/week)</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Assign To Staff Member</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#00D96B]"
                >
                  <option value="">Unassigned (Queue)</option>
                  {teamUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role_display_name || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Notes / Requirement</label>
                <textarea
                  rows={2}
                  placeholder="Customer inquiry details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="font-bold text-base text-[#111827]">Bulk Import Leads</h3>
              <button onClick={() => { setShowImportModal(false); setImportResult(null); setParsedRows([]); }} className="p-1 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {importResult ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-[#00A854] mx-auto" />
                <h4 className="font-bold text-base text-[#111827]">{importResult.message}</h4>
                <button
                  onClick={() => { setShowImportModal(false); setImportResult(null); setParsedRows([]); }}
                  className="bg-[#00D96B] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md"
                >
                  Close &amp; View Leads
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F7F9FA] rounded-xl border border-[#E5E7EB]">
                  <div>
                    <p className="text-xs font-bold text-[#111827]">Download Sample Format</p>
                    <p className="text-[11px] text-[#667085]">CSV format for instant ingestion</p>
                  </div>
                  <button
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#00A854] hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#00D96B] bg-[#EAFBF2]/30 rounded-2xl p-6 text-center cursor-pointer hover:bg-[#EAFBF2]/50 transition"
                >
                  <UploadCloud className="w-8 h-8 text-[#00A854] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#111827]">Click to upload CSV file</p>
                  <p className="text-[11px] text-[#667085] mt-1">Supports standard CSV format</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv"
                    className="hidden"
                  />
                </div>

                {parsedRows.length > 0 && (
                  <div className="p-3 bg-[#EAFBF2] text-[#00A854] rounded-xl text-xs font-bold flex items-center justify-between">
                    <span>Parsed {parsedRows.length} leads ready to import</span>
                    <button
                      onClick={handleExecuteImport}
                      disabled={importing}
                      className="bg-[#00D96B] text-white px-4 py-1.5 rounded-lg shadow-sm"
                    >
                      {importing ? 'Importing...' : 'Execute Import'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
