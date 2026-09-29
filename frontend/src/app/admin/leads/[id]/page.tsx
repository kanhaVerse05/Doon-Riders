'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi } from '../../../../lib/adminApi';
import {
  Phone,
  MessageSquare,
  ArrowLeft,
  Send,
  UserCheck,
  MapPin,
  Calendar,
  FileText
} from 'lucide-react';
import Link from 'next/link';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState('');
  const [noteText, setNoteText] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLead = async () => {
    try {
      const res = await adminApi.get(`/admin/leads/${params.id}`);
      if (res.success) {
        setLead(res.data);
        setStatus(res.data.status);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load lead');
      router.push('/admin/leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchLead();
    }
  }, [params.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminApi.patch(`/admin/leads/${params.id}/status`, {
        status,
        notes: noteText || undefined,
        nextFollowupDate: nextFollowup || undefined
      });
      if (res.success) {
        setNoteText('');
        fetchLead();
      }
    } catch (err: any) {
      alert('Error updating lead: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToCustomer = async () => {
    if (!confirm(`Convert ${lead.name} into an official Customer profile?`)) return;
    try {
      const res = await adminApi.post('/admin/customers', {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        leadId: lead.id,
        address: lead.location
      });
      if (res.success) {
        alert('Customer profile created successfully!');
        router.push('/admin/customers');
      }
    } catch (err: any) {
      alert('Conversion failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-64 flex items-center justify-center text-[#98A2B3] font-mono text-xs">
          Loading Lead 360 File...
        </div>
      </AdminLayout>
    );
  }

  if (!lead) return null;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111827] hover:text-[#00A854] transition"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Leads Pipeline</span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${lead.phone}`}
              className="bg-white text-[#111827] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#F7F9FA] border border-[#E5E7EB] transition flex items-center gap-1.5 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 text-[#00A854]" />
              <span>Call Customer</span>
            </a>
            <a
              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              className="bg-[#00D96B] hover:bg-[#00A854] text-[#071B12] hover:text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
            {hasPermission('customers.create') && (
              <button
                onClick={handleConvertToCustomer}
                className="bg-white hover:bg-[#EAFBF2] text-[#00A854] border border-[#00D96B] font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Convert to Customer</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-[#111827]">{lead.name}</h1>
                <span className="font-mono text-xs font-bold text-[#00A854] bg-[#EAFBF2] border border-[#00D96B]/30 px-2.5 py-0.5 rounded">
                  {lead.lead_code}
                </span>
                <span className="text-[11px] font-bold bg-[#F7F9FA] text-[#667085] border border-[#E5E7EB] px-2.5 py-0.5 rounded-full">
                  {lead.status}
                </span>
              </div>
              <p className="text-xs text-[#667085] font-mono mt-1">{lead.phone} • {lead.email || 'No email'}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-[#98A2B3] uppercase tracking-widest font-bold block">Assigned Executive</span>
              <span className="text-xs font-bold text-[#00A854]">{lead.assigned_to_name || 'Unassigned'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#F7F9FA] p-3 rounded-xl border border-[#E5E7EB]">
              <span className="text-[10px] text-[#667085] block font-semibold">Interested Vehicle</span>
              <span className="font-bold text-[#111827] mt-0.5 block">{lead.vehicle_interested_in}</span>
            </div>
            <div className="bg-[#F7F9FA] p-3 rounded-xl border border-[#E5E7EB]">
              <span className="text-[10px] text-[#667085] block font-semibold">Channel Source</span>
              <span className="font-bold text-[#111827] mt-0.5 block">{lead.lead_source}</span>
            </div>
            <div className="bg-[#F7F9FA] p-3 rounded-xl border border-[#E5E7EB]">
              <span className="text-[10px] text-[#667085] block font-semibold">Rental Plan</span>
              <span className="font-bold text-[#111827] mt-0.5 block">{lead.rental_plan || 'Weekly'}</span>
            </div>
            <div className="bg-[#F7F9FA] p-3 rounded-xl border border-[#E5E7EB]">
              <span className="text-[10px] text-[#667085] block font-semibold">Location</span>
              <span className="font-bold text-[#111827] mt-0.5 block">{lead.location}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Update Lead & Status</h3>
            <form onSubmit={handleUpdate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#111827] mb-1">Lead Stage</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827] font-semibold focus:outline-none focus:border-[#00D96B]"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Interested">Interested</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Documents Pending">Documents Pending</option>
                  <option value="Booking Confirmed">Booking Confirmed</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Next Follow-up Call Date</label>
                <input
                  type="date"
                  value={nextFollowup}
                  onChange={(e) => setNextFollowup(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111827] focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111827] mb-1">Discussion Note / Outcome</label>
                <textarea
                  rows={3}
                  placeholder="Customer agreed for weekend rental pickup..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl p-3 text-[#111827] focus:outline-none focus:border-[#00D96B]"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#00D96B] hover:bg-[#00A854] text-[#071B12] hover:text-white font-bold py-2.5 rounded-xl uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Updating...' : 'Log Activity & Save'}</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Activity & Call Timeline</h3>
            <div className="space-y-4">
              {(!lead.timeline || lead.timeline.length === 0) ? (
                <p className="text-xs text-[#667085]">No previous activities logged.</p>
              ) : (
                lead.timeline.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00D96B] ring-2 ring-white"></div>
                      {idx !== lead.timeline.length - 1 && <div className="w-0.5 flex-1 bg-[#E5E7EB] mt-1"></div>}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#111827]">{item.action}</span>
                        <span className="text-[10px] text-[#98A2B3] font-mono">{new Date(item.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-[#667085] mt-0.5">{item.notes || 'Status updated'}</p>
                      <span className="text-[10px] text-[#98A2B3]">Logged by: {item.user_name || 'System'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
