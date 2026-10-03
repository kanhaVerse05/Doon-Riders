'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/adminApi';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  User,
  RotateCw,
  Building,
  Check,
  X,
  SlidersHorizontal,
  Wrench,
  ShieldCheck,
  Printer,
  DollarSign,
  FileText,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

interface DamageItem {
  id: string;
  part_name: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  technician_remark?: string;
  photos?: string[];
  hub_remark_type?: 'Charge Customer' | 'No Payment' | 'Custom Remark';
  hub_remark_text?: string;
  is_payable?: boolean;
}

interface ScootyReturn {
  id: number;
  return_number: string;
  rider_name: string;
  rider_phone: string;
  scooter_number: string;
  scooter_id?: number | null;
  hub_id: number;
  hub_name: string;
  hub_incharge_id?: number | null;
  hub_incharge_name?: string | null;
  return_date: string;
  return_time: string;
  initial_meter_reading?: number | null;
  security_deposit_amount: number;
  technician_id?: number | null;
  technician_name?: string | null;
  technician_phone?: string | null;
  technician_code?: string | null;
  status:
    | 'Pending Inspection'
    | 'Inspection in Progress'
    | 'Inspection Completed'
    | 'Completed'
    | 'Cancelled';
  damage_items?: DamageItem[];
  gross_damage_total: number;
  payable_damage_total: number;
  waived_damage_total: number;
  settlement_type: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'ZERO_BALANCE' | 'DUE_FROM_RIDER';
  refund_amount_to_rider: number;
  due_amount_from_rider: number;
  rider_payment_status: 'Pending' | 'Paid' | 'Refunded' | 'Waived';
  rider_payment_mode?: string | null;
  rider_payment_reference?: string | null;
  settlement_notes?: string | null;
  initial_remarks?: string | null;
  inspection_started_at?: string | null;
  inspection_completed_at?: string | null;
  settled_at?: string | null;
  created_at: string;
  updated_at: string;
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
}

export default function ScootyReturnsListPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [returns, setReturns] = useState<ScootyReturn[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [fleetList, setFleetList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'INSPECTED' | 'COMPLETED'>('ALL');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pendingInspection: 0,
    inProgress: 0,
    inspectionCompleted: 0,
    completed: 0,
    totalRefunded: 0,
    totalDueCollected: 0
  });

  // Modal: Create New Return
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingReturn, setCreatingReturn] = useState(false);
  const [newReturnForm, setNewReturnForm] = useState({
    rider_name: '',
    rider_phone: '',
    scooter_number: '',
    hub_id: '',
    return_date: new Date().toISOString().split('T')[0],
    return_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    initial_meter_reading: '',
    security_deposit_amount: '2000',
    technician_id: '',
    initial_remarks: ''
  });

  // Modal: Assign Technician
  const [assigningReturn, setAssigningReturn] = useState<ScootyReturn | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isHubIncharge = user?.roleName === 'HUB_INCHARGE' || user?.roleName?.includes('HUB');

  const fetchReturns = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await adminApi.get('/admin/returns?limit=100');
      if (res && res.success) {
        setReturns(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.hubs) setHubs(res.hubs);
        if (res.technicians) setTechnicians(res.technicians);
      }
    } catch (err) {
      console.error('Failed to load returns', err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReturns();
    // Load fleet for auto-filling vehicle numbers
    adminApi.get('/admin/inventory').then(res => {
      // also try fleet
    }).catch(() => {});
  }, []);

  // Set default hub in form for Hub Incharge
  useEffect(() => {
    if (hubs.length > 0 && !newReturnForm.hub_id) {
      const userHub = (user as any)?.hub_id ? hubs.find(h => h.id === (user as any).hub_id) : hubs[0];
      setNewReturnForm(prev => ({
        ...prev,
        hub_id: String(userHub?.id || hubs[0]?.id || '')
      }));
    }
  }, [hubs, user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReturns(false);
  };

  // Open WhatsApp
  const handleOpenWhatsApp = (phone: string, name: string, returnNo: string, scooterNo: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `Hello ${name}, DOON RIDERS Hub here regarding your scooty return ${returnNo} for vehicle ${scooterNo}. We have initiated the return inspection and security settlement.`
    );
    window.open(`https://wa.me/${formatted}?text=${msg}`, '_blank');
  };

  // Create Return Submit
  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReturnForm.rider_name.trim() || !newReturnForm.rider_phone.trim() || !newReturnForm.scooter_number.trim()) {
      alert('Please fill in Rider Name, Phone Number, and Scooter Number.');
      return;
    }

    try {
      setCreatingReturn(true);
      const res = await adminApi.post('/admin/returns', {
        rider_name: newReturnForm.rider_name.trim(),
        rider_phone: newReturnForm.rider_phone.trim(),
        scooter_number: newReturnForm.scooter_number.toUpperCase().trim(),
        hub_id: newReturnForm.hub_id ? Number(newReturnForm.hub_id) : undefined,
        return_date: newReturnForm.return_date,
        return_time: newReturnForm.return_time,
        initial_meter_reading: newReturnForm.initial_meter_reading ? Number(newReturnForm.initial_meter_reading) : undefined,
        security_deposit_amount: Number(newReturnForm.security_deposit_amount) || 2000,
        technician_id: newReturnForm.technician_id ? Number(newReturnForm.technician_id) : undefined,
        initial_remarks: newReturnForm.initial_remarks.trim()
      });

      if (res && res.success) {
        showToast(`Return ticket ${res.data?.return_number} logged successfully!`);
        setShowCreateModal(false);
        setNewReturnForm({
          rider_name: '',
          rider_phone: '',
          scooter_number: '',
          hub_id: String(hubs[0]?.id || ''),
          return_date: new Date().toISOString().split('T')[0],
          return_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          initial_meter_reading: '',
          security_deposit_amount: '2000',
          technician_id: '',
          initial_remarks: ''
        });
        fetchReturns();
      } else {
        alert(res?.message || 'Failed to log return ticket');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating return ticket');
    } finally {
      setCreatingReturn(false);
    }
  };

  // Assign Technician Submit
  const handleAssignTechnician = async () => {
    if (!assigningReturn || !selectedTechId) {
      alert('Please select a technician');
      return;
    }

    try {
      setSubmittingAssign(true);
      const res = await adminApi.post(`/admin/returns/${assigningReturn.id}/assign`, {
        technician_id: selectedTechId
      });

      if (res && res.success) {
        showToast('Technician assigned for return inspection!');
        setAssigningReturn(null);
        fetchReturns();
      } else {
        alert(res?.message || 'Failed to assign technician');
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning technician');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Filtered Returns
  const filteredReturns = returns.filter(item => {
    // 1. Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNo = item.return_number?.toLowerCase().includes(q);
      const matchScooter = item.scooter_number?.toLowerCase().includes(q);
      const matchRider = item.rider_name?.toLowerCase().includes(q);
      const matchPhone = item.rider_phone?.toLowerCase().includes(q);
      const matchHub = item.hub_name?.toLowerCase().includes(q);
      if (!matchNo && !matchScooter && !matchRider && !matchPhone && !matchHub) return false;
    }

    // 2. Status Tab
    if (statusTab === 'PENDING') {
      if (item.status !== 'Pending Inspection' && item.status !== 'Inspection in Progress') return false;
    } else if (statusTab === 'INSPECTED') {
      if (item.status !== 'Inspection Completed') return false;
    } else if (statusTab === 'COMPLETED') {
      if (item.status !== 'Completed') return false;
    }

    // 3. Hub Filter
    if (selectedHub !== 'all' && item.hub_id !== Number(selectedHub)) return false;

    // 4. Technician Filter
    if (selectedTechnician !== 'all' && item.technician_id !== Number(selectedTechnician)) return false;

    // 5. Date Filter
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      if (item.return_date !== today) return false;
    } else if (dateFilter === 'week') {
      const itemTime = new Date(item.return_date).getTime();
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (itemTime < oneWeekAgo) return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending Inspection':
        return {
          label: 'Pending Inspection',
          style: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20'
        };
      case 'Inspection in Progress':
        return {
          label: 'Inspecting',
          style: 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/20 animate-pulse'
        };
      case 'Inspection Completed':
        return {
          label: 'Inspection Done (Settlement Due)',
          style: 'bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-400/30'
        };
      case 'Completed':
        return {
          label: 'Settled & Completed',
          style: 'bg-[#EAFBF2] text-[#00A854] border-[#00D96B]/40 ring-1 ring-[#00D96B]/20'
        };
      case 'Cancelled':
        return {
          label: 'Cancelled',
          style: 'bg-slate-100 text-slate-600 border-slate-300'
        };
      default:
        return {
          label: status,
          style: 'bg-slate-100 text-slate-700 border-slate-200'
        };
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20 max-w-[1500px] mx-auto">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#0A0F1D] border border-[#00D96B]/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-6 h-6 rounded-full bg-[#00D96B]/20 border border-[#00D96B]/40 flex items-center justify-center text-[#00D96B]">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Top Header & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854]">
                <RotateCcw className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Scooty Returns & Inspection
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Hub return check-in, technician damage inspection sheets, security deposit deduction & refund settlement
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center justify-center cursor-pointer"
              title="Refresh Returns"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs shadow-lg shadow-[#00D96B]/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Initiate Scooty Return</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            onClick={() => setStatusTab('ALL')}
            className={`p-4 rounded-3xl border transition cursor-pointer select-none ${
              statusTab === 'ALL'
                ? 'bg-white border-[#00D96B] shadow-md ring-2 ring-[#00D96B]/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Total Returns
              </span>
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">{stats.total}</p>
            <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">All logged return tickets</span>
          </div>

          <div
            onClick={() => setStatusTab('PENDING')}
            className={`p-4 rounded-3xl border transition cursor-pointer select-none ${
              statusTab === 'PENDING'
                ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider">
                Pending Inspection
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-900 mt-1.5 font-mono">
              {stats.pendingInspection + stats.inProgress}
            </p>
            <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">Technician inspecting vehicle</span>
          </div>

          <div
            onClick={() => setStatusTab('INSPECTED')}
            className={`p-4 rounded-3xl border transition cursor-pointer select-none ${
              statusTab === 'INSPECTED'
                ? 'bg-purple-50 border-purple-400 shadow-md ring-2 ring-purple-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider">
                Inspection Completed
              </span>
              <Wrench className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-900 mt-1.5 font-mono">
              {stats.inspectionCompleted}
            </p>
            <span className="text-[11px] text-purple-700 mt-0.5 block font-medium">Ready for settlement review</span>
          </div>

          <div
            onClick={() => setStatusTab('COMPLETED')}
            className={`p-4 rounded-3xl border transition cursor-pointer select-none ${
              statusTab === 'COMPLETED'
                ? 'bg-emerald-50 border-[#00D96B] shadow-md ring-2 ring-[#00D96B]/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider">
                Settled & Closed
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-900 mt-1.5 font-mono">
              {stats.completed}
            </p>
            <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">
              Refunded: ₹{stats.totalRefunded.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by Ticket #, Scooty #, Rider Name, Phone, or Hub..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B] transition"
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

            {/* Select Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {!isHubIncharge && (
                <select
                  value={selectedHub}
                  onChange={e => setSelectedHub(e.target.value)}
                  className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#00D96B] cursor-pointer"
                >
                  <option value="all">All Service Hubs</option>
                  {hubs.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.hub_name}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedTechnician}
                onChange={e => setSelectedTechnician(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#00D96B] cursor-pointer"
              >
                <option value="all">All Technicians</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#00D96B] cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Returned Today</option>
                <option value="week">Past 7 Days</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
            {[
              { key: 'ALL', label: 'All Returns', count: returns.length },
              { key: 'PENDING', label: 'Pending Inspection', count: stats.pendingInspection + stats.inProgress },
              { key: 'INSPECTED', label: 'Inspection Completed (Review)', count: stats.inspectionCompleted },
              { key: 'COMPLETED', label: 'Settled / Closed', count: stats.completed }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  statusTab === tab.key
                    ? 'bg-[#0A0F1D] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  statusTab === tab.key ? 'bg-[#00D96B] text-black' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Returns List View */}
        {loading ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
            <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">Loading Scooty Return Records...</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-black text-slate-900">No Return Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No return tickets match your current filters. Click "Initiate Scooty Return" to check in a returned vehicle.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredReturns.map(item => {
              const statusInfo = getStatusBadge(item.status);
              const damageCount = item.damage_items?.length || 0;
              const hasWaived = Number(item.waived_damage_total) > 0;

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E7EB] hover:border-slate-300 hover:shadow-md transition-all space-y-4"
                >
                  {/* Row 1: Ticket Header & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                        {item.return_number}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs font-mono text-slate-600 font-bold">
                        Returned on {new Date(item.return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {item.return_time}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${statusInfo.style}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Rider, Vehicle, Hub & Financial Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    {/* 1. Rider Info */}
                    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Rider / Customer
                      </span>
                      <p className="text-sm font-black text-slate-900 truncate">{item.rider_name}</p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-slate-600 font-mono text-[11px]">{item.rider_phone}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(item.rider_phone, item.rider_name, item.return_number, item.scooter_number)}
                          className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition cursor-pointer"
                          title="Open WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                        <a
                          href={`tel:${item.rider_phone}`}
                          className="p-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 transition"
                          title="Call Rider"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* 2. Scooty & Hub Info */}
                    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Vehicle & Service Hub
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          {item.scooter_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                        {item.hub_name}
                      </p>
                      {item.initial_meter_reading && (
                        <p className="text-[10px] font-mono text-slate-400">
                          Meter: {item.initial_meter_reading} KM
                        </p>
                      )}
                    </div>

                    {/* 3. Technician Inspection State */}
                    <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        Inspection State
                      </span>
                      {item.technician_name ? (
                        <div>
                          <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>{item.technician_name}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {damageCount > 0 ? (
                              <span className="text-red-700 font-bold">{damageCount} Damage item(s) logged</span>
                            ) : item.status === 'Inspection Completed' || item.status === 'Completed' ? (
                              <span className="text-emerald-700 font-bold">Zero Damages (Clean Check)</span>
                            ) : (
                              <span>Inspection in progress</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-amber-700 font-bold">No Technician Assigned</p>
                          <button
                            onClick={() => {
                              setAssigningReturn(item);
                              setSelectedTechId(technicians[0]?.id || null);
                            }}
                            className="mt-1 text-[11px] font-extrabold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Assign Technician</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 4. Financial Settlement Breakdown */}
                    <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1 font-mono">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Security Deposit:</span>
                        <span className="text-white font-bold">₹{item.security_deposit_amount}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Payable Damages:</span>
                        <span className="text-amber-400 font-bold">₹{item.payable_damage_total || 0}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold text-[11px]">
                          {item.settlement_type === 'DUE_FROM_RIDER' ? 'Rider Due:' : 'Rider Refund:'}
                        </span>
                        <span className={`font-black text-sm ${
                          item.settlement_type === 'DUE_FROM_RIDER'
                            ? 'text-red-400'
                            : 'text-[#00D96B]'
                        }`}>
                          ₹{item.settlement_type === 'DUE_FROM_RIDER' ? item.due_amount_from_rider : item.refund_amount_to_rider}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
                    <div className="text-[11px] text-slate-500 font-medium">
                      {hasWaived && (
                        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold mr-2">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>₹{item.waived_damage_total} Waived Off (No Payment)</span>
                        </span>
                      )}
                      {item.initial_remarks && (
                        <span className="text-slate-500 italic">Note: "{item.initial_remarks}"</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                      {!item.technician_id && item.status === 'Pending Inspection' && (
                        <button
                          onClick={() => {
                            setAssigningReturn(item);
                            setSelectedTechId(technicians[0]?.id || null);
                          }}
                          className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Assign Tech</span>
                        </button>
                      )}

                      <Link
                        href={`/admin/returns/${item.id}`}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <span>{item.status === 'Completed' ? 'View Settlement Receipt' : 'Review & Settle Return'}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#00D96B]" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: INITIATE SCOOTY RETURN */}
        {/* ========================================================================= */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854]">
                    <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Initiate Scooty Return</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Record rental check-in & dispatch for damage inspection</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateReturn} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Rider Name */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Rider / Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newReturnForm.rider_name}
                      onChange={e => setNewReturnForm(prev => ({ ...prev, rider_name: e.target.value }))}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>

                  {/* Rider Phone */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Contact Phone (10-Digit) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={newReturnForm.rider_phone}
                      onChange={e => setNewReturnForm(prev => ({ ...prev, rider_phone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Vehicle / Scooty Number */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Scooty / Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newReturnForm.scooter_number}
                      onChange={e => setNewReturnForm(prev => ({ ...prev, scooter_number: e.target.value.toUpperCase() }))}
                      placeholder="e.g. UK-07-EV-1001"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>

                  {/* Initial Security Deposit */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Initial Security Deposit (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newReturnForm.security_deposit_amount}
                      onChange={e => setNewReturnForm(prev => ({ ...prev, security_deposit_amount: e.target.value }))}
                      placeholder="2000"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-black text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Return Date */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Return Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={newReturnForm.return_date}
                      onChange={e => setNewReturnForm(prev => ({ ...prev, return_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>

                  {/* Return Timing */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Return Timing <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={newReturnForm.return_time}
                      onChange={e => setNewReturnForm(prev => ({ ...prev, return_time: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Service Hub */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Receiving Hub
                    </label>
                    <select
                      value={newReturnForm.hub_id}
                      onChange={e => setNewReturnForm(prev => ({ ...prev, hub_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    >
                      {hubs.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.hub_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assign Technician */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1">
                      Assign Technician for Inspection
                    </label>
                    <select
                      value={newReturnForm.technician_id}
                      onChange={e => setNewReturnForm(prev => ({ ...prev, technician_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    >
                      <option value="">Assign Later</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.specialization})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Initial Remarks / Check-in Notes
                  </label>
                  <textarea
                    rows={2}
                    value={newReturnForm.initial_remarks}
                    onChange={e => setNewReturnForm(prev => ({ ...prev, initial_remarks: e.target.value }))}
                    placeholder="e.g. Helmet returned, minor dust on body, keys submitted..."
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingReturn}
                    className="px-5 py-2.5 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs shadow-lg shadow-[#00D96B]/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{creatingReturn ? 'Initiating...' : 'Log & Send to Inspection'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: ASSIGN TECHNICIAN */}
        {/* ========================================================================= */}
        {assigningReturn && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Assign Technician for Inspection</h3>
                  <p className="text-[11px] text-slate-500">Return Ticket: {assigningReturn.return_number}</p>
                </div>
                <button
                  onClick={() => setAssigningReturn(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Select a technician to perform damage & mechanical inspection on vehicle <b>{assigningReturn.scooter_number}</b>:
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {technicians.map(t => (
                    <label
                      key={t.id}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none ${
                        selectedTechId === t.id
                          ? 'bg-[#EAFBF2] border-[#00D96B] ring-1 ring-[#00D96B]/30'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="technician"
                          checked={selectedTechId === t.id}
                          onChange={() => setSelectedTechId(t.id)}
                          className="w-4 h-4 text-[#00D96B] focus:ring-[#00D96B]"
                        />
                        <div>
                          <p className="text-xs font-black text-slate-900">{t.name}</p>
                          <p className="text-[10px] text-slate-500">{t.specialization} &bull; {t.phone}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {t.status}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningReturn(null)}
                  className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-600 font-extrabold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignTechnician}
                  disabled={submittingAssign}
                  className="px-5 py-2 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs shadow-md transition flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{submittingAssign ? 'Assigning...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
