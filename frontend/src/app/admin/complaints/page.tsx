'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/adminApi';
import {
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Tag,
  User,
  RotateCw,
  Building,
  Navigation,
  Check,
  X,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  Radio,
  Calendar,
  Layers,
  Wrench,
  ShieldCheck
} from 'lucide-react';

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
  created_by_id?: number;
  created_by_name?: string;
  created_by_role?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
}

interface Hub {
  id: number;
  hub_code: string;
  hub_name: string;
  location: string;
  incharge_name: string;
  incharge_phone: string;
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
  active_jobs_count?: number;
  rating?: number;
}

const ISSUE_CATEGORIES = [
  'Battery Breakdown / Low Range',
  'Motor Stalling / Cutoff',
  'Brake Caliper / Wire Failure',
  'Tire Puncture / Valve Leak',
  'Throttle Stuck / Acceleration Issue',
  'Key Ignition / Digital Cluster Dead',
  'Wiring / Electronic Short Circuit',
  'Suspension / Chassis Problem',
  'Other Breakdown Issue'
];

export default function ComplaintsListPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Role simulation pill (allows toggling view between Super Admin, Customer Support & Hub Incharge)
  const [activeRoleView, setActiveRoleView] = useState<'ADMIN' | 'SUPPORT' | 'HUB_INCHARGE'>('ADMIN');

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'NEW' | 'ASSIGNED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'WORK_DONE' | 'CLOSED'>('ALL');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    assigned: 0,
    enRoute: 0,
    reached: 0,
    inProgress: 0,
    workDone: 0,
    closed: 0
  });

  // Create Complaint Modal (Customer Support Form)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [newComplaintForm, setNewComplaintForm] = useState({
    scooter_number: '',
    customer_name: '',
    customer_phone: '',
    location_address: '',
    location_url: '',
    latitude: '',
    longitude: '',
    issue_category: ISSUE_CATEGORIES[0],
    description: '',
    priority: 'Normal' as 'Normal' | 'High' | 'Urgent',
    hub_id: 1
  });

  // Assign Technician Modal (Hub Incharge Action)
  const [assigningComplaint, setAssigningComplaint] = useState<Complaint | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/complaints?limit=100');
      if (res && res.success) {
        setComplaints(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.hubs) setHubs(res.hubs);
        if (res.technicians) setTechnicians(res.technicians);
      }
    } catch (err) {
      console.error('Failed to load complaints', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchComplaints();
  };

  // Helper: Open WhatsApp
  const handleOpenWhatsApp = (phone: string, customerName: string, complaintNo: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Hello ${customerName}, DOON RIDERS Emergency Field Service here regarding your breakdown ticket ${complaintNo}. Our support & technical team is reviewing your location.`);
    window.open(`https://wa.me/${formatted}?text=${msg}`, '_blank');
  };

  // Submit New Complaint (Customer Support)
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaintForm.scooter_number || !newComplaintForm.customer_name || !newComplaintForm.customer_phone || !newComplaintForm.location_address || !newComplaintForm.description) {
      alert('Please fill all mandatory fields (Scooty No, Customer Name, Phone, Location & Description)');
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await adminApi.post('/admin/complaints', newComplaintForm);
      if (res && res.success) {
        showToast(`Complaint ${res.data?.complaint_number || 'ticket'} logged & forwarded to Hub Incharge!`);
        setShowCreateModal(false);
        setNewComplaintForm({
          scooter_number: '',
          customer_name: '',
          customer_phone: '',
          location_address: '',
          location_url: '',
          latitude: '',
          longitude: '',
          issue_category: ISSUE_CATEGORIES[0],
          description: '',
          priority: 'Normal',
          hub_id: 1
        });
        fetchComplaints();
      } else {
        alert(res?.message || 'Failed to create complaint');
      }
    } catch (err: any) {
      alert(err.message || 'Server error creating complaint');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Submit Assign Technician (Hub Incharge)
  const handleAssignTechnician = async () => {
    if (!assigningComplaint || !selectedTechId) {
      alert('Please select a technician to assign');
      return;
    }

    try {
      setSubmittingAssign(true);
      const res = await adminApi.post(`/admin/complaints/${assigningComplaint.id}/assign`, {
        technician_id: selectedTechId
      });

      if (res && res.success) {
        showToast(`Technician assigned to ${assigningComplaint.complaint_number}. Live in Technician App!`);
        setAssigningComplaint(null);
        setSelectedTechId(null);
        fetchComplaints();
      } else {
        alert(res?.message || 'Failed to assign technician');
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning technician');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Filter complaints based on search, tabs and role simulation
  const filteredComplaints = complaints.filter(c => {
    // Role simulation filters
    if (activeRoleView === 'HUB_INCHARGE') {
      // simulate ISBT Main Hub Incharge view
      if (c.hub_id !== 1) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const match =
        c.complaint_number.toLowerCase().includes(q) ||
        c.scooter_number.toLowerCase().includes(q) ||
        c.customer_name.toLowerCase().includes(q) ||
        c.customer_phone.toLowerCase().includes(q) ||
        c.location_address.toLowerCase().includes(q) ||
        c.issue_category.toLowerCase().includes(q) ||
        (c.technician_name && c.technician_name.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Status Tab filter
    if (statusTab === 'NEW' && c.status !== 'New') return false;
    if (statusTab === 'ASSIGNED' && c.status !== 'Assigned') return false;
    if (statusTab === 'EN_ROUTE' && c.status !== 'En Route') return false;
    if (statusTab === 'IN_PROGRESS' && c.status !== 'Reached' && c.status !== 'Work In Progress') return false;
    if (statusTab === 'WORK_DONE' && c.status !== 'Work Done') return false;
    if (statusTab === 'CLOSED' && c.status !== 'Closed') return false;

    // Hub filter
    if (selectedHub !== 'all' && c.hub_id !== Number(selectedHub)) return false;

    // Technician filter
    if (selectedTechnician !== 'all' && c.technician_id !== Number(selectedTechnician)) return false;

    // Priority filter
    if (selectedPriority !== 'all' && c.priority !== selectedPriority) return false;

    return true;
  });

  const getStatusBadge = (status: Complaint['status']) => {
    switch (status) {
      case 'New':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            New (Unassigned)
          </span>
        );
      case 'Assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Assigned
          </span>
        );
      case 'En Route':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
            En Route
          </span>
        );
      case 'Reached':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Reached Location
          </span>
        );
      case 'Work In Progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-spin" />
            Work In Progress
          </span>
        );
      case 'Work Done':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" />
            Work Done
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: Complaint['priority']) => {
    switch (priority) {
      case 'Urgent':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-red-100 text-red-700 border border-red-200">URGENT</span>;
      case 'High':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-amber-100 text-amber-800 border border-amber-200">HIGH</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600">NORMAL</span>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20 max-w-[1600px] mx-auto">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#0A0F1D] border border-[#00D96B]/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-6 h-6 rounded-full bg-[#00D96B]/20 border border-[#00D96B]/40 flex items-center justify-center text-[#00D96B]">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Top Header & Role Simulation Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854] shadow-sm">
                <AlertCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#111827] tracking-tight flex items-center gap-2">
                  Complaints & Field Service
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-[#00D96B]/15 text-[#00A854] border border-[#00D96B]/30">
                    Live Dispatch
                  </span>
                </h1>
                <p className="text-xs text-[#667085] mt-0.5">
                  Customer Support ticket logging &rarr; Hub Incharge assignment &rarr; Live field technician journey tracking.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Role Simulation Switcher */}
            <div className="flex items-center bg-[#F7F9FA] p-1 rounded-2xl border border-[#E5E7EB]">
              <span className="text-[10px] font-extrabold text-[#98A2B3] uppercase px-2">Role:</span>
              <button
                onClick={() => setActiveRoleView('ADMIN')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeRoleView === 'ADMIN'
                    ? 'bg-white text-[#111827] shadow-sm border border-[#E5E7EB]'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                Super Admin
              </button>
              <button
                onClick={() => setActiveRoleView('SUPPORT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeRoleView === 'SUPPORT'
                    ? 'bg-[#EAFBF2] text-[#00A854] shadow-sm border border-[#00D96B]/30 font-extrabold'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                Customer Support
              </button>
              <button
                onClick={() => setActiveRoleView('HUB_INCHARGE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeRoleView === 'HUB_INCHARGE'
                    ? 'bg-[#EAFBF2] text-[#00A854] shadow-sm border border-[#00D96B]/30 font-extrabold'
                    : 'text-[#667085] hover:text-[#111827]'
                }`}
              >
                Hub Incharge
              </button>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-2xl border border-[#E5E7EB] hover:bg-[#F7F9FA] text-[#667085] transition flex items-center justify-center cursor-pointer"
              title="Refresh Data"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Log New Complaint CTA (Customer Support & Admin) */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Log New Complaint</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => setStatusTab('ALL')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusTab === 'ALL'
                ? 'bg-white border-[#00D96B] shadow-md ring-2 ring-[#00D96B]/20'
                : 'bg-white border-[#E5E7EB] hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-[#667085] text-xs font-semibold">
              <span>All Complaints</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-[#111827] mt-2">{stats.total}</p>
            <span className="text-[10px] text-slate-400 font-medium">Total registered</span>
          </div>

          <div
            onClick={() => setStatusTab('NEW')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusTab === 'NEW'
                ? 'bg-amber-50/50 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                : 'bg-white border-[#E5E7EB] hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
              <span>New (Pending)</span>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <p className="text-2xl font-black text-amber-900 mt-2">{stats.new}</p>
            <span className="text-[10px] text-amber-600 font-medium">Needs Hub Assignment</span>
          </div>

          <div
            onClick={() => setStatusTab('ASSIGNED')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusTab === 'ASSIGNED'
                ? 'bg-blue-50/50 border-blue-400 shadow-md ring-2 ring-blue-400/20'
                : 'bg-white border-[#E5E7EB] hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
              <span>Assigned</span>
              <User className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-900 mt-2">{stats.assigned}</p>
            <span className="text-[10px] text-blue-600 font-medium">Ready for Technician</span>
          </div>

          <div
            onClick={() => setStatusTab('EN_ROUTE')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusTab === 'EN_ROUTE'
                ? 'bg-purple-50/50 border-purple-400 shadow-md ring-2 ring-purple-400/20'
                : 'bg-white border-[#E5E7EB] hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
              <span>En Route</span>
              <Navigation className="w-4 h-4 text-purple-500 animate-bounce" />
            </div>
            <p className="text-2xl font-black text-purple-900 mt-2">{stats.enRoute}</p>
            <span className="text-[10px] text-purple-600 font-medium">Live GPS Tracking</span>
          </div>

          <div
            onClick={() => setStatusTab('IN_PROGRESS')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusTab === 'IN_PROGRESS'
                ? 'bg-orange-50/50 border-orange-400 shadow-md ring-2 ring-orange-400/20'
                : 'bg-white border-[#E5E7EB] hover:border-orange-300'
            }`}
          >
            <div className="flex items-center justify-between text-orange-700 text-xs font-bold">
              <span>Work In Progress</span>
              <Wrench className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-orange-900 mt-2">{stats.inProgress + stats.reached}</p>
            <span className="text-[10px] text-orange-600 font-medium">Active Field Repair</span>
          </div>

          <div
            onClick={() => setStatusTab('WORK_DONE')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              statusTab === 'WORK_DONE'
                ? 'bg-emerald-50/50 border-emerald-400 shadow-md ring-2 ring-emerald-400/20'
                : 'bg-white border-[#E5E7EB] hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
              <span>Work Done / Closed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-900 mt-2">{stats.workDone + stats.closed}</p>
            <span className="text-[10px] text-emerald-600 font-medium">Resolved & Completed</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Complaint ID, Scooty Reg No, Customer Name, Phone or Issue..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-2xl text-xs font-medium text-[#111827] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Hub Selector */}
            <div className="w-full md:w-48">
              <select
                value={selectedHub}
                onChange={e => setSelectedHub(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-2xl text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#00D96B]"
              >
                <option value="all">All Service Hubs</option>
                {hubs.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.hub_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Technician Selector */}
            <div className="w-full md:w-48">
              <select
                value={selectedTechnician}
                onChange={e => setSelectedTechnician(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-2xl text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#00D96B]"
              >
                <option value="all">All Technicians</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.technician_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="w-full md:w-36">
              <select
                value={selectedPriority}
                onChange={e => setSelectedPriority(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-2xl text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#00D96B]"
              >
                <option value="all">All Priority</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
          </div>

          {/* Status Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-[#F0F2F5] text-xs font-bold">
            <span className="text-[10px] text-[#98A2B3] uppercase font-extrabold pr-2 shrink-0">Status:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'NEW', label: 'New / Unassigned', count: stats.new },
              { id: 'ASSIGNED', label: 'Assigned', count: stats.assigned },
              { id: 'EN_ROUTE', label: 'En Route', count: stats.enRoute },
              { id: 'IN_PROGRESS', label: 'In Progress', count: stats.inProgress + stats.reached },
              { id: 'WORK_DONE', label: 'Work Done', count: stats.workDone },
              { id: 'CLOSED', label: 'Closed', count: stats.closed }
            ].map(tab => {
              const active = statusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl shrink-0 transition flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#111827] text-white shadow-sm'
                      : 'bg-[#F7F9FA] text-[#667085] hover:bg-[#EDF0F2] hover:text-[#111827]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      active ? 'bg-[#00D96B] text-[#0A0F1D]' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Complaints Table */}
        <div className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-[#111827]">Complaints Feed</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                {filteredComplaints.length} tickets
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-bold">Loading Field Service Complaints...</p>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No Complaints Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No tickets matched your current search and filter criteria. Try adjusting the filters or log a new breakdown complaint.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] font-extrabold text-[#667085] uppercase tracking-wider">
                    <th className="py-3 px-4">Complaint ID & Priority</th>
                    <th className="py-3 px-4">Scooty Number</th>
                    <th className="py-3 px-4">Customer & Location</th>
                    <th className="py-3 px-4">Issue Category</th>
                    <th className="py-3 px-4">Service Hub</th>
                    <th className="py-3 px-4">Technician</th>
                    <th className="py-3 px-4">Status & Tracking</th>
                    <th className="py-3 px-4">Logged Time</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-xs">
                  {filteredComplaints.map(complaint => {
                    const isNew = complaint.status === 'New';
                    const isAssigned = complaint.status === 'Assigned';
                    const isEnRoute = complaint.status === 'En Route';

                    return (
                      <tr
                        key={complaint.id}
                        className="hover:bg-[#F9FAFB]/80 transition group cursor-pointer"
                        onClick={() => router.push(`/admin/complaints/${complaint.id}`)}
                      >
                        {/* ID & Priority */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="font-extrabold text-[#111827] text-xs font-mono block">
                              {complaint.complaint_number}
                            </span>
                            {getPriorityBadge(complaint.priority)}
                          </div>
                        </td>

                        {/* Scooty Number */}
                        <td className="py-3.5 px-4 font-bold text-[#111827]">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 font-mono text-xs border border-slate-200">
                            {complaint.scooter_number}
                          </div>
                        </td>

                        {/* Customer & Location */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 max-w-xs">
                            <p className="font-bold text-[#111827]">{complaint.customer_name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-[#667085]">
                              <span className="font-mono">{complaint.customer_phone}</span>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenWhatsApp(complaint.customer_phone, complaint.customer_name, complaint.complaint_number);
                                }}
                                title="WhatsApp Customer"
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mt-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{complaint.location_address}</span>
                            </div>
                          </div>
                        </td>

                        {/* Issue */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#111827] line-clamp-1">{complaint.issue_category}</p>
                          <p className="text-[11px] text-[#667085] line-clamp-1 mt-0.5">{complaint.description}</p>
                        </td>

                        {/* Service Hub */}
                        <td className="py-3.5 px-4 font-semibold text-[#111827]">
                          <div className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{complaint.hub_name}</span>
                          </div>
                        </td>

                        {/* Technician */}
                        <td className="py-3.5 px-4">
                          {complaint.technician_name ? (
                            <div className="space-y-0.5">
                              <p className="font-bold text-[#111827]">{complaint.technician_name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {complaint.technician_code || complaint.technician_phone}
                              </p>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {getStatusBadge(complaint.status)}
                            {isEnRoute && complaint.journey_duration_formatted && (
                              <p className="text-[10px] text-purple-700 font-extrabold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{complaint.journey_duration_formatted}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Created At */}
                        <td className="py-3.5 px-4 text-[11px] text-[#667085]">
                          <p>{new Date(complaint.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                          <p className="text-[10px] text-slate-400">{new Date(complaint.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {/* Hub Incharge Assign Button */}
                            {(isNew || isAssigned) && (
                              <button
                                onClick={() => {
                                  setAssigningComplaint(complaint);
                                  setSelectedTechId(complaint.technician_id || technicians[0]?.id || null);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition"
                              >
                                {complaint.technician_name ? 'Reassign' : 'Assign Tech'}
                              </button>
                            )}

                            <Link
                              href={`/admin/complaints/${complaint.id}`}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-[#00A854] hover:bg-[#EAFBF2] transition"
                              title="View Complaint & Live Tracking"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Customer Support Log New Complaint */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Log Breakdown Complaint</h2>
                    <p className="text-[11px] text-slate-500">Customer Care & Emergency Field Service Ticket</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Customer Support Notice:</strong> Customer Care creates the complaint. The ticket will automatically route to the selected Hub Incharge for field technician assignment.
                </p>
              </div>

              <form onSubmit={handleCreateComplaint} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Scooty Number */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Scooty Registration No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={newComplaintForm.scooter_number}
                      onChange={e => setNewComplaintForm({ ...newComplaintForm, scooter_number: e.target.value })}
                      placeholder="e.g. UK-07-EV-1001"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#00D96B] focus:bg-white"
                    />
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Priority Level *
                    </label>
                    <select
                      value={newComplaintForm.priority}
                      onChange={e => setNewComplaintForm({ ...newComplaintForm, priority: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#00D96B]"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent (Roadside Breakdown)</option>
                    </select>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Customer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newComplaintForm.customer_name}
                      onChange={e => setNewComplaintForm({ ...newComplaintForm, customer_name: e.target.value })}
                      placeholder="e.g. Rohit Verma"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00D96B] focus:bg-white"
                    />
                  </div>

                  {/* Customer Phone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Customer Contact Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newComplaintForm.customer_phone}
                      onChange={e => setNewComplaintForm({ ...newComplaintForm, customer_phone: e.target.value })}
                      placeholder="+91 98970 XXXXX"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[#00D96B] focus:bg-white"
                    />
                  </div>
                </div>

                {/* Service Hub Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Route to Service Hub (Hub Incharge) *
                  </label>
                  <select
                    value={newComplaintForm.hub_id}
                    onChange={e => setNewComplaintForm({ ...newComplaintForm, hub_id: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#00D96B]"
                  >
                    {hubs.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.hub_name} ({h.location}) - Incharge: {h.incharge_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Address */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Customer Breakdown Location / Landmark *
                  </label>
                  <input
                    type="text"
                    required
                    value={newComplaintForm.location_address}
                    onChange={e => setNewComplaintForm({ ...newComplaintForm, location_address: e.target.value })}
                    placeholder="e.g. Near Clock Tower, Paltan Bazar Entry, Dehradun"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#00D96B] focus:bg-white"
                  />
                </div>

                {/* Location URL / Google Maps URL */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Google Maps URL or Pin Location (Optional)
                  </label>
                  <input
                    type="url"
                    value={newComplaintForm.location_url}
                    onChange={e => setNewComplaintForm({ ...newComplaintForm, location_url: e.target.value })}
                    placeholder="https://maps.google.com/?q=30.3256,78.0436"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-[#00D96B] focus:bg-white"
                  />
                </div>

                {/* Issue Category */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Scooty Issue Category *
                  </label>
                  <select
                    value={newComplaintForm.issue_category}
                    onChange={e => setNewComplaintForm({ ...newComplaintForm, issue_category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#00D96B]"
                  >
                    {ISSUE_CATEGORIES.map((cat, i) => (
                      <option key={i} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Complaint Description & Customer Symptoms *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newComplaintForm.description}
                    onChange={e => setNewComplaintForm({ ...newComplaintForm, description: e.target.value })}
                    placeholder="Explain what happened (e.g. scooter stopped moving suddenly, error code on display, punctured tyre)..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#00D96B] focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    className="px-5 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 disabled:opacity-50"
                  >
                    {submittingCreate ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>Create & Forward to Hub</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Hub Incharge Assign Technician */}
        {assigningComplaint && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Assign Field Technician</h2>
                    <p className="text-[11px] text-slate-500">Complaint {assigningComplaint.complaint_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setAssigningComplaint(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Complaint Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{assigningComplaint.scooter_number}</span>
                  {getPriorityBadge(assigningComplaint.priority)}
                </div>
                <p className="text-slate-700 font-bold">{assigningComplaint.customer_name} ({assigningComplaint.customer_phone})</p>
                <p className="text-slate-500 text-[11px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{assigningComplaint.location_address}</span>
                </p>
                <p className="text-slate-600 text-[11px] font-medium pt-1">
                  <strong>Issue:</strong> {assigningComplaint.issue_category} - {assigningComplaint.description}
                </p>
              </div>

              {/* Technicians List */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Field Technician for Dispatch:
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                  onClick={() => setAssigningComplaint(null)}
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
