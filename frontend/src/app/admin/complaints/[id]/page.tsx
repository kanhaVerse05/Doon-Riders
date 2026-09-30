'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { OpenStreetMapTracker } from '../../../../components/admin/OpenStreetMapTracker';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi } from '../../../../lib/adminApi';
import {
  ArrowLeft,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Building,
  User,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  Wrench,
  Package,
  Camera,
  Calendar,
  Layers,
  Radio,
  Share2,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ComplaintEvent {
  id: number;
  complaint_id: number;
  event_type: string;
  title: string;
  description: string;
  status: string;
  performed_by_id?: number;
  performed_by_name: string;
  performed_by_role: string;
  latitude?: number | null;
  longitude?: number | null;
  duration_seconds?: number;
  duration_formatted?: string | null;
  metadata?: any;
  created_at: string;
}

interface Complaint {
  id: number;
  complaint_number: string;
  scooter_id?: number | null;
  scooter_number: string;
  customer_name: string;
  customer_phone: string;
  location_address: string;
  location_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  issue_category: string;
  description: string;
  priority: 'Normal' | 'High' | 'Urgent';
  hub_id: number;
  hub_name: string;
  hub_incharge_id?: number | null;
  hub_incharge_name?: string | null;
  technician_id?: number | null;
  technician_name?: string | null;
  technician_phone?: string | null;
  technician_code?: string | null;
  technician_specialization?: string | null;
  technician_rating?: number | null;
  technician_latitude?: number | null;
  technician_longitude?: number | null;
  technician_location_updated_at?: string | null;
  status:
    | 'New'
    | 'Assigned'
    | 'En Route'
    | 'Reached'
    | 'Work In Progress'
    | 'Work Done'
    | 'Closed'
    | 'Cancelled';
  journey_started_at?: string | null;
  reached_at?: string | null;
  journey_duration_seconds?: number;
  journey_duration_formatted?: string | null;
  work_started_at?: string | null;
  work_completed_at?: string | null;
  work_duration_seconds?: number;
  work_duration_formatted?: string | null;
  work_performed?: string | null;
  parts_used?: any[];
  technician_remarks?: string | null;
  proof_photos?: string[];
  completion_notes?: string | null;
  final_latitude?: number | null;
  final_longitude?: number | null;
  return_journey_started_at?: string | null;
  created_by_id?: number;
  created_by_name?: string;
  created_by_role?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
}

interface Technician {
  id: number;
  technician_code: string;
  name: string;
  phone: string;
  hub_id: number;
  hub_name: string;
  specialization: string;
  status: string;
  rating?: number;
}

// Helper to format seconds as timer 00:14:32
const formatTimer = (totalSeconds: number) => {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function ComplaintOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const complaintId = params?.id as string;

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [timeline, setTimeline] = useState<ComplaintEvent[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Timer Heartbeat
  const [liveSeconds, setLiveSeconds] = useState(0);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Close Complaint action
  const [closingComplaint, setClosingComplaint] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchComplaintDetails = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get(`/admin/complaints/${complaintId}`);
      if (res && res.success) {
        setComplaint(res.data);
        setTimeline(res.timeline || []);
        if (res.technicians) setTechnicians(res.technicians);
      }
    } catch (err) {
      console.error('Failed to load complaint details', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (complaintId) {
      fetchComplaintDetails();
    }
  }, [complaintId]);

  // Live timer update
  useEffect(() => {
    const interval = setInterval(() => {
      if (complaint && complaint.status === 'En Route' && complaint.journey_started_at) {
        const start = new Date(complaint.journey_started_at).getTime();
        const now = Date.now();
        setLiveSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      } else if (complaint && complaint.status === 'Work In Progress' && complaint.work_started_at) {
        const start = new Date(complaint.work_started_at).getTime();
        const now = Date.now();
        setLiveSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [complaint]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchComplaintDetails();
  };

  // Open WhatsApp
  const handleOpenWhatsApp = () => {
    if (!complaint) return;
    const cleanPhone = complaint.customer_phone.replace(/[^0-9]/g, '');
    const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Hello ${complaint.customer_name}, DOON RIDERS Field Service here regarding your breakdown complaint ${complaint.complaint_number}. Our technician ${complaint.technician_name || 'is being dispatched'}.`);
    window.open(`https://wa.me/${formatted}?text=${msg}`, '_blank');
  };

  // Assign Technician
  const handleAssignTechnician = async () => {
    if (!complaint || !selectedTechId) {
      alert('Please select a technician to assign');
      return;
    }

    try {
      setSubmittingAssign(true);
      const res = await adminApi.post(`/admin/complaints/${complaint.id}/assign`, {
        technician_id: selectedTechId
      });

      if (res && res.success) {
        showToast('Technician assigned successfully!');
        setShowAssignModal(false);
        fetchComplaintDetails();
      } else {
        alert(res?.message || 'Failed to assign technician');
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning technician');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Close Complaint
  const handleCloseComplaint = async () => {
    if (!complaint) return;
    if (!confirm(`Are you sure you want to mark ${complaint.complaint_number} as Closed and Resolved?`)) return;

    try {
      setClosingComplaint(true);
      const res = await adminApi.patch(`/admin/complaints/${complaint.id}/status`, {
        status: 'Closed'
      });

      if (res && res.success) {
        showToast('Complaint marked as Closed & Resolved!');
        fetchComplaintDetails();
      } else {
        alert(res?.message || 'Failed to close complaint');
      }
    } catch (err: any) {
      alert(err.message || 'Error closing complaint');
    } finally {
      setClosingComplaint(false);
    }
  };

  if (loading || !complaint) {
    return (
      <AdminLayout>
        <div className="py-24 text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-3 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Loading Complaint Details & Live GPS Route...</p>
        </div>
      </AdminLayout>
    );
  }

  const isEnRoute = complaint.status === 'En Route';
  const isReached = complaint.status === 'Reached';
  const isWIP = complaint.status === 'Work In Progress';
  const isWorkDone = complaint.status === 'Work Done';
  const isClosed = complaint.status === 'Closed';

  const techLat = parseFloat(String(complaint.technician_latitude || '')) || 30.2863;
  const techLng = parseFloat(String(complaint.technician_longitude || '')) || 78.0069;
  const custLat = parseFloat(String(complaint.latitude || '')) || 30.3256;
  const custLng = parseFloat(String(complaint.longitude || '')) || 78.0436;

  const mapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${techLat},${techLng}&destination=${custLat},${custLng}&travelmode=driving`;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20 max-w-[1500px] mx-auto">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#0A0F1D] border border-[#00D96B]/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-6 h-6 rounded-full bg-[#00D96B]/20 border border-[#00D96B]/40 flex items-center justify-center text-[#00D96B]">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/complaints')}
              className="p-2 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
              title="Back to complaints"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight font-mono">
                  {complaint.complaint_number}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                  complaint.priority === 'Urgent'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : complaint.priority === 'High'
                    ? 'bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {complaint.priority} Priority
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Vehicle <strong className="font-mono text-slate-800">{complaint.scooter_number}</strong> &bull; Routed to {complaint.hub_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center justify-center"
              title="Refresh GPS & Status"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Assign / Reassign Button */}
            {(!isWorkDone && !isClosed) && (
              <button
                onClick={() => {
                  setSelectedTechId(complaint.technician_id || technicians[0]?.id || null);
                  setShowAssignModal(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs border border-blue-200 transition flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>{complaint.technician_name ? 'Reassign Technician' : 'Assign Technician'}</span>
              </button>
            )}

            {/* Close Complaint Button */}
            {isWorkDone && (
              <button
                onClick={handleCloseComplaint}
                disabled={closingComplaint}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition"
              >
                <CheckCircle2 className="w-4 h-4 text-[#00D96B]" />
                <span>Mark Complaint as Closed</span>
              </button>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2-Span Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Live Tracking & Interactive OpenStreetMap Section */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854]">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-[#98A2B3] tracking-widest uppercase">
                      Real-Time Field Dispatch
                    </span>
                    <h2 className="text-base font-black text-[#111827] flex items-center gap-2">
                      Live OpenStreetMap Tracking
                      {isEnRoute && (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
                          EN ROUTE
                        </span>
                      )}
                    </h2>
                  </div>
                </div>

                {/* Live Timer Widget */}
                {(isEnRoute || isWIP || complaint.journey_duration_formatted) && (
                  <div className="bg-[#EAFBF2] border border-[#00D96B]/30 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-xs">
                    <Clock className="w-4 h-4 text-[#00A854]" />
                    <div>
                      <p className="text-[9px] font-extrabold text-[#00A854] uppercase tracking-wider">
                        {isEnRoute ? 'Journey Time' : isWIP ? 'Work Duration' : 'Total Travel Time'}
                      </p>
                      <p className="text-base font-black font-mono text-[#111827]">
                        {isEnRoute || isWIP ? formatTimer(liveSeconds) : complaint.journey_duration_formatted}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Banner Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#F7F9FA] p-3.5 rounded-2xl border border-[#E5E7EB]">
                <div>
                  <p className="text-[10px] text-[#667085] font-extrabold uppercase">Technician</p>
                  <p className="text-xs font-black text-[#111827] mt-0.5 truncate">
                    {complaint.technician_name || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#667085] font-extrabold uppercase">Current State</p>
                  <p className="text-xs font-black text-[#00A854] mt-0.5">{complaint.status}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#667085] font-extrabold uppercase">Breakdown Spot</p>
                  <p className="text-xs font-semibold text-[#475467] mt-0.5 truncate">{complaint.location_address}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#667085] font-extrabold uppercase">GPS Sync</p>
                  <p className="text-xs font-mono text-[#667085] mt-0.5">
                    {complaint.technician_location_updated_at ? 'Live Synced' : 'Ready'}
                  </p>
                </div>
              </div>

              {/* Real OpenStreetMap Live GPS Tracker Map */}
              <OpenStreetMapTracker
                technicianLat={techLat}
                technicianLng={techLng}
                customerLat={custLat}
                customerLng={custLng}
                technicianName={complaint.technician_name || 'Technician'}
                scooterNumber={complaint.scooter_number}
                customerName={complaint.customer_name}
                customerAddress={complaint.location_address}
                isEnRoute={isEnRoute}
                status={complaint.status}
                lastUpdated={complaint.technician_location_updated_at}
              />
            </div>

            {/* 2. Complaint & Scooty Breakdown Information Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Breakdown & Issue Details</h2>
                  <p className="text-[11px] text-slate-500">Scooty symptoms reported by customer</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Scooty Number</span>
                  <p className="text-sm font-mono font-black text-slate-900 mt-0.5">{complaint.scooter_number}</p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Issue Category</span>
                  <p className="text-xs font-extrabold text-slate-900 mt-0.5">{complaint.issue_category}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1">
                  Customer Problem Description
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">{complaint.description}</p>
              </div>
            </div>

            {/* 3. Work Details & Field Resolution (If Work Done or Closed) */}
            {(complaint.work_performed || isWorkDone || isClosed) && (
              <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-4 bg-emerald-50/20">
                <div className="flex items-center gap-3 border-b border-emerald-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-emerald-950">Field Repair Resolution</h2>
                    <p className="text-[11px] text-emerald-700">Completed by Technician {complaint.technician_name}</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-emerald-100 text-xs space-y-2">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase block">Work Performed:</span>
                  <p className="text-slate-800 font-semibold">{complaint.work_performed || 'On-site breakdown repair performed and road-tested.'}</p>
                  {complaint.technician_remarks && (
                    <p className="text-[11px] text-slate-600 italic mt-1">
                      &ldquo;{complaint.technician_remarks}&rdquo;
                    </p>
                  )}
                </div>

                {/* Parts Used */}
                {complaint.parts_used && complaint.parts_used.length > 0 && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Spare Parts Replaced:</span>
                    <div className="divide-y divide-slate-100">
                      {complaint.parts_used.map((p: any, idx: number) => (
                        <div key={idx} className="py-2 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900">{p.part_name}</p>
                            <p className="text-[10px] text-slate-500">Qty: {p.quantity}</p>
                          </div>
                          <span className="font-mono font-bold text-slate-900">₹{p.total_price || (p.unit_price * p.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Complete Event Timeline */}
            <div className="bg-white p-6 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Complaint Lifecycle Timeline</h2>
                  <p className="text-[11px] text-slate-500">Complete audit history and GPS timestamps</p>
                </div>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((event, idx) => (
                  <div key={event.id || idx} className="relative group">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-[#00D96B] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#00D96B]" />
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{event.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{event.description}</p>
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-medium">
                        <span>By: <strong>{event.performed_by_name}</strong> ({event.performed_by_role})</span>
                        {event.duration_formatted && (
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Duration: {event.duration_formatted}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6">
            {/* Customer Details Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00A854] flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">Customer Contact</h3>
                  <p className="text-[10px] text-slate-500">Rider breakdown support</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-sm font-black text-slate-900">{complaint.customer_name}</p>
                <p className="text-xs font-mono text-slate-600">{complaint.customer_phone}</p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`tel:${complaint.customer_phone}`}
                    className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Breakdown Location</span>
                <p className="text-xs font-semibold text-slate-800 mt-1">{complaint.location_address}</p>
                {complaint.location_url && (
                  <a
                    href={complaint.location_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-1"
                  >
                    <span>View Customer Pin on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Service Hub & Incharge Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900">Service Hub & Assignment</h3>
                  <p className="text-[10px] text-slate-500">Responsible Hub Incharge</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-extrabold text-slate-900">{complaint.hub_name}</p>
                <p className="text-[11px] text-slate-500">Incharge: <strong>{complaint.hub_incharge_name || 'Karan Joshi'}</strong></p>
              </div>

              {/* Assigned Technician Profile */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                  Assigned Field Technician
                </span>

                {complaint.technician_name ? (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#00D96B]/20 text-[#00A854] font-black text-xs flex items-center justify-center">
                        {complaint.technician_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{complaint.technician_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{complaint.technician_code || 'TECH-101'}</p>
                      </div>
                    </div>

                    {complaint.technician_phone && (
                      <a
                        href={`tel:${complaint.technician_phone}`}
                        className="w-full py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-black text-[11px] font-bold flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call Technician ({complaint.technician_phone})</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-2">
                    <p className="text-xs font-bold text-amber-800">Technician Not Yet Assigned</p>
                    <button
                      onClick={() => {
                        setSelectedTechId(technicians[0]?.id || null);
                        setShowAssignModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition"
                    >
                      Assign Technician
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Assign / Reassign Technician */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Assign Field Technician</h2>
                    <p className="text-[11px] text-slate-500">Dispatch technician for {complaint.complaint_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Field Technician for Hub: {complaint.hub_name}
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {technicians.map(t => {
                    const isSelected = selectedTechId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTechId(t.id)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {t.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{t.name}</p>
                            <p className="text-[10px] text-slate-500">{t.specialization} &bull; {t.phone}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t.technician_code}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignTechnician}
                  disabled={submittingAssign || !selectedTechId}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
                >
                  {submittingAssign ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Assign & Dispatch</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
