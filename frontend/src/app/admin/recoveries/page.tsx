'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/adminApi';
import {
  ShieldAlert,
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
  AlertCircle,
  Truck
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

interface ScootyRecovery {
  id: number;
  recovery_number: string;
  rider_name: string;
  rider_phone: string;
  scooter_number: string;
  scooter_id?: number | null;
  hub_id: number;
  hub_name: string;
  hub_incharge_id?: number | null;
  hub_incharge_name?: string | null;
  recovered_by: string;
  recovery_date: string;
  recovery_time: string;
  recovery_charge: number;
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
  total_charges: number;
  settlement_type: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'ZERO_BALANCE' | 'DUE_FROM_RIDER';
  refund_amount_to_rider: number;
  due_amount_from_rider: number;
  rider_payment_status: 'Pending' | 'Paid' | 'Refunded' | 'Waived';
  rider_payment_mode?: string | null;
  rider_payment_reference?: string | null;
  settlement_notes?: string | null;
  recovery_reason?: string | null;
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

export default function ScootyRecoveriesListPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [recoveries, setRecoveries] = useState<ScootyRecovery[]>([]);
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

  // Modal: Create New Recovery
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingRecovery, setCreatingRecovery] = useState(false);
  const [newRecoveryForm, setNewRecoveryForm] = useState({
    rider_name: '',
    rider_phone: '',
    scooter_number: '',
    hub_id: '',
    recovered_by: '',
    recovery_date: new Date().toISOString().split('T')[0],
    recovery_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    recovery_charge: 1000,
    security_deposit_amount: 2000,
    technician_id: '',
    recovery_reason: 'Vehicle overdue / recovery operation',
    initial_remarks: ''
  });

  const isHubIncharge = user?.roleName === 'HUB_INCHARGE' || user?.roleName?.includes('HUB');

  const fetchRecoveries = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await adminApi.get('/recoveries');
      if (res.success) {
        setRecoveries(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.hubs) setHubs(res.hubs);
        if (res.technicians) setTechnicians(res.technicians);

        if (!newRecoveryForm.hub_id && res.hubs && res.hubs.length > 0) {
          const defaultHub = (user as any)?.hub_id
            ? res.hubs.find((h: any) => h.id === (user as any).hub_id) || res.hubs[0]
            : res.hubs[0];
          setNewRecoveryForm(prev => ({
            ...prev,
            hub_id: String(defaultHub.id),
            recovered_by: user?.name || defaultHub.incharge_name || ''
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load recoveries list', err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecoveries();
  }, []);

  // Handle Form Submit for New Recovery
  const handleCreateRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecoveryForm.rider_name.trim() || !newRecoveryForm.rider_phone.trim() || !newRecoveryForm.scooter_number.trim()) {
      alert('Please fill in Rider Name, Phone Number, and Scooter Number.');
      return;
    }

    setCreatingRecovery(true);
    try {
      const payload = {
        ...newRecoveryForm,
        hub_id: Number(newRecoveryForm.hub_id) || (hubs[0]?.id || 1),
        technician_id: newRecoveryForm.technician_id ? Number(newRecoveryForm.technician_id) : null,
        recovery_charge: Number(newRecoveryForm.recovery_charge) || 1000,
        security_deposit_amount: Number(newRecoveryForm.security_deposit_amount) || 2000
      };

      const res = await adminApi.post('/recoveries', payload);
      if (res.success) {
        setShowCreateModal(false);
        setNewRecoveryForm({
          rider_name: '',
          rider_phone: '',
          scooter_number: '',
          hub_id: String(hubs[0]?.id || '1'),
          recovered_by: user?.name || hubs[0]?.incharge_name || '',
          recovery_date: new Date().toISOString().split('T')[0],
          recovery_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          recovery_charge: 1000,
          security_deposit_amount: 2000,
          technician_id: '',
          recovery_reason: 'Vehicle overdue / recovery operation',
          initial_remarks: ''
        });
        fetchRecoveries(true);
        if (res.data?.id) {
          router.push(`/admin/recoveries/${res.data.id}`);
        }
      } else {
        alert(res.message || 'Failed to create recovery record.');
      }
    } catch (err: any) {
      console.error('Error creating recovery:', err);
      alert(err.message || 'Server error creating recovery.');
    } finally {
      setCreatingRecovery(false);
    }
  };

  // Filtered list
  const filteredRecoveries = recoveries.filter(item => {
    // Search
    const term = search.toLowerCase().trim();
    if (term) {
      const matchSearch =
        item.recovery_number.toLowerCase().includes(term) ||
        item.scooter_number.toLowerCase().includes(term) ||
        item.rider_name.toLowerCase().includes(term) ||
        item.rider_phone.toLowerCase().includes(term) ||
        item.recovered_by?.toLowerCase().includes(term) ||
        item.hub_name.toLowerCase().includes(term);
      if (!matchSearch) return false;
    }

    // Status Tab
    if (statusTab === 'PENDING') {
      if (item.status !== 'Pending Inspection' && item.status !== 'Inspection in Progress') return false;
    } else if (statusTab === 'INSPECTED') {
      if (item.status !== 'Inspection Completed') return false;
    } else if (statusTab === 'COMPLETED') {
      if (item.status !== 'Completed') return false;
    }

    // Hub
    if (selectedHub !== 'all' && item.hub_id !== Number(selectedHub)) return false;

    // Technician
    if (selectedTechnician !== 'all' && item.technician_id !== Number(selectedTechnician)) return false;

    // Date
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      if (item.recovery_date !== today) return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending Inspection':
        return {
          label: 'Pending Inspection',
          style: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'Inspection in Progress':
        return {
          label: 'Inspection In Progress',
          style: 'bg-blue-50 text-blue-800 border-blue-200'
        };
      case 'Inspection Completed':
        return {
          label: 'Inspected (Ready to Settle)',
          style: 'bg-purple-50 text-purple-800 border-purple-200 font-bold'
        };
      case 'Completed':
        return {
          label: 'Settled & Closed',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
        };
      case 'Cancelled':
        return {
          label: 'Cancelled',
          style: 'bg-red-50 text-red-700 border-red-200'
        };
      default:
        return {
          label: status,
          style: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans">
                Scooty Recovery Management
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Log recovered vehicles &bull; Fixed ₹1,000 Recovery Fee &bull; Technician Damage Inspection &bull; Smart Security Settlement
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchRecoveries(false)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-center cursor-pointer shadow-xs disabled:opacity-50"
              title="Refresh Recoveries"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#00A854]' : ''}`} />
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Log Scooty Recovery</span>
            </button>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Recoveries
              </span>
              <Truck className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">
              {stats.total}
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
              Registered vehicle recoveries
            </span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Pending Inspection
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-900 mt-1.5 font-mono">
              {stats.pendingInspection + stats.inProgress}
            </p>
            <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">
              Assigned for technician check
            </span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                Inspection Ready
              </span>
              <Wrench className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-900 mt-1.5 font-mono">
              {stats.inspectionCompleted}
            </p>
            <span className="text-[11px] text-purple-700 mt-0.5 block font-medium">
              Ready for Hub Incharge settlement
            </span>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                Settled &amp; Closed
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
                placeholder="Search by Recovery Ticket #, Scooty #, Rider Name, Phone, or Recovered By..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B] transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                <option value="today">Recovered Today</option>
                <option value="week">Past 7 Days</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
            {[
              { key: 'ALL', label: 'All Recoveries', count: recoveries.length },
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

        {/* Recoveries List View */}
        {loading ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
            <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-bold">Loading Recovery Records...</p>
          </div>
        ) : filteredRecoveries.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-sm font-black text-slate-900">No Recovery Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No recovery tickets match your current filters. Click "Log Scooty Recovery" to register a recovered vehicle.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredRecoveries.map(item => {
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
                        {item.recovery_number}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs font-mono text-slate-600 font-bold">
                        Recovered on {new Date(item.recovery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {item.recovery_time}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs text-slate-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full font-bold">
                        By: {item.recovered_by}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${statusInfo.style}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Scooty Details & Rider Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Vehicle */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Recovered Scooty
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-900 font-mono">
                          {item.scooter_number}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {item.hub_name}
                        </span>
                      </div>
                    </div>

                    {/* Rider Contact */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Rider Details
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800 text-xs truncate max-w-[140px]">
                          {item.rider_name}
                        </span>
                        <a
                          href={`tel:${item.rider_phone}`}
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-mono font-bold"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{item.rider_phone}</span>
                        </a>
                      </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 font-mono">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Financial Overview
                      </span>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-sans font-medium">Sec: ₹{item.security_deposit_amount}</span>
                        <span className="text-red-700 font-sans font-bold">+ ₹{item.recovery_charge} Fee</span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800">
                        {item.status === 'Completed' ? (
                          item.settlement_type === 'DUE_FROM_RIDER' ? (
                            <span className="text-red-700">Due Collected: ₹{item.due_amount_from_rider}</span>
                          ) : (
                            <span className="text-emerald-700">Refunded: ₹{item.refund_amount_to_rider}</span>
                          )
                        ) : (
                          <span className="text-slate-600">Damage: ₹{item.gross_damage_total} ({damageCount} parts)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                      {item.technician_name ? (
                        <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                          <User className="w-3 h-3 text-blue-600" />
                          <span>Inspector: <b>{item.technician_name}</b></span>
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          No technician assigned
                        </span>
                      )}

                      {item.recovery_reason && (
                        <span className="truncate max-w-xs text-slate-500 italic">
                          "{item.recovery_reason}"
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link
                        href={`/admin/recoveries/${item.id}`}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                      >
                        <span>{item.status === 'Completed' ? 'View Settlement' : 'Review & Settle'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create New Scooty Recovery */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl border border-[#E5E7EB] w-full max-w-lg p-5 sm:p-7 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      Log New Scooty Recovery
                    </h3>
                    <p className="text-xs text-slate-500">Record recovered vehicle &amp; initiate damage inspection</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRecoverySubmit} className="space-y-4 text-xs font-sans">
                {/* Rider Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Rider Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Verma"
                      value={newRecoveryForm.rider_name}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, rider_name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Rider Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={newRecoveryForm.rider_phone}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, rider_phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                {/* Scooter Number & Hub */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Vehicle / Scooter Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UK-07-EV-1001"
                      value={newRecoveryForm.scooter_number}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, scooter_number: e.target.value.toUpperCase() }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Service Hub <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newRecoveryForm.hub_id}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, hub_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00D96B] cursor-pointer"
                    >
                      {hubs.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.hub_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recovered By & Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Recovered By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Karan Joshi / Recovery Team"
                      value={newRecoveryForm.recovered_by}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, recovered_by: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Recovery Date
                    </label>
                    <input
                      type="date"
                      value={newRecoveryForm.recovery_date}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, recovery_date: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Recovery Time
                    </label>
                    <input
                      type="text"
                      value={newRecoveryForm.recovery_time}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, recovery_time: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                {/* Fixed Recovery Charge & Security Deposit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-red-50/70 rounded-2xl border border-red-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-red-900 font-extrabold text-[11px] uppercase tracking-wider">
                        Fixed Recovery Charge
                      </label>
                      <span className="text-[10px] font-extrabold bg-red-200 text-red-900 px-2 py-0.2 rounded-full">
                        Standard Fee
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-black text-red-800 text-sm">
                      <span>₹</span>
                      <input
                        type="number"
                        value={newRecoveryForm.recovery_charge}
                        onChange={e => setNewRecoveryForm(prev => ({ ...prev, recovery_charge: Number(e.target.value) }))}
                        className="w-full bg-transparent font-mono font-black text-red-900 text-sm focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-red-700">Added to total damages during final settlement.</p>
                  </div>

                  <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-emerald-900 font-extrabold text-[11px] uppercase tracking-wider">
                        Security Deposit Paid
                      </label>
                      <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.2 rounded-full">
                        Collected
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-black text-emerald-800 text-sm">
                      <span>₹</span>
                      <input
                        type="number"
                        value={newRecoveryForm.security_deposit_amount}
                        onChange={e => setNewRecoveryForm(prev => ({ ...prev, security_deposit_amount: Number(e.target.value) }))}
                        className="w-full bg-transparent font-mono font-black text-emerald-900 text-sm focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-emerald-700">Subtracted from (Damages + Recovery Fee).</p>
                  </div>
                </div>

                {/* Assign Technician */}
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    Assign Technician for Damage Inspection
                  </label>
                  <select
                    value={newRecoveryForm.technician_id}
                    onChange={e => setNewRecoveryForm(prev => ({ ...prev, technician_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00D96B] cursor-pointer"
                  >
                    <option value="">-- Assign Later / Select Technician --</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialization} - {t.hub_name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recovery Reason */}
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    Reason for Recovery &amp; Initial Condition
                  </label>
                  <textarea
                    rows={2}
                    value={newRecoveryForm.recovery_reason}
                    onChange={e => setNewRecoveryForm(prev => ({ ...prev, recovery_reason: e.target.value }))}
                    placeholder="e.g. Non-payment of weekly rental / abandoned near railway station / repossession"
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingRecovery}
                    className="px-6 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 disabled:opacity-50 cursor-pointer active:scale-95 transition"
                  >
                    {creatingRecovery ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>Create Recovery &amp; Send to Technician</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
