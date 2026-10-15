'use client';

import React, { useState, useEffect } from 'react';
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
  RotateCw,
  X,
  Wrench,
  Check,
  ArrowRight,
  Truck,
  MapPin,
  Camera,
  UserCheck
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

interface RecoveryAgentUser {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  role_name?: string;
  role_display_name?: string;
}

interface ScootyRecovery {
  id: number;
  recovery_number: string;
  rider_name: string;
  rider_phone: string;
  scooter_number: string;
  scooter_id?: number | null;
  pickup_location?: string;
  pickup_live_location?: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  pickup_photos?: Array<{ id: string; angle: string; url: string; uploaded_at?: string }>;
  recovery_agent_id?: number | null;
  recovery_agent_name?: string | null;
  recovery_agent_phone?: string | null;
  accepted_at?: string | null;
  picked_up_at?: string | null;
  reached_hub_at?: string | null;
  agent_notes?: string | null;
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
    | 'ASSIGNED'
    | 'ACCEPTED'
    | 'PICKED_UP'
    | 'REACHED_HUB'
    | 'INSPECTION_IN_PROGRESS'
    | 'INSPECTION_COMPLETED'
    | 'Completed'
    | 'Pending Inspection'
    | 'Inspection in Progress'
    | 'Inspection Completed'
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
  const { user, hasPermission } = useAuth();

  const userRoleName = (user?.roleName || user?.roleDisplayName || '').toUpperCase();
  const isSuperAdmin = userRoleName === 'SUPER_ADMIN';
  const isRecoveryAgent = (userRoleName.includes('RECOVERY') || userRoleName.includes('AGENT')) && !isSuperAdmin;
  const isHubIncharge = userRoleName.includes('HUB') && !isSuperAdmin;
  const canCreateRecovery = hasPermission('recoveries.create');

  const [recoveries, setRecoveries] = useState<ScootyRecovery[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [recoveryAgents, setRecoveryAgents] = useState<RecoveryAgentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'REACHED_HUB' | 'INSPECTED' | 'COMPLETED'>('ALL');
  const [selectedHub, setSelectedHub] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    accepted: 0,
    pickedUp: 0,
    reachedHub: 0,
    inProgress: 0,
    inspectionCompleted: 0,
    completed: 0,
    totalRefunded: 0,
    totalDueCollected: 0
  });

  // Modal: Create New Recovery (Step 1 Hub Incharge Assignment)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingRecovery, setCreatingRecovery] = useState(false);
  const [newRecoveryForm, setNewRecoveryForm] = useState({
    rider_name: '',
    scooter_number: '',
    rider_phone: '',
    pickup_location: '',
    recovery_agent_id: '',
    hub_id: '',
    recovery_charge: 1000,
    security_deposit_amount: 2000,
    recovery_reason: 'Non-payment / overdue vehicle'
  });

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
        if (res.recoveryAgents) setRecoveryAgents(res.recoveryAgents);

        if (!newRecoveryForm.hub_id && res.hubs && res.hubs.length > 0) {
          const defaultHub = (user as any)?.hub_id
            ? res.hubs.find((h: any) => h.id === (user as any).hub_id) || res.hubs[0]
            : res.hubs[0];
          setNewRecoveryForm(prev => ({
            ...prev,
            hub_id: String(defaultHub.id)
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
    if (
      !newRecoveryForm.rider_name.trim() ||
      !newRecoveryForm.scooter_number.trim() ||
      !newRecoveryForm.rider_phone.trim() ||
      !newRecoveryForm.pickup_location.trim()
    ) {
      alert('Please fill in Rider Name, Scooty Number, Contact Number, and Recovery Location.');
      return;
    }

    setCreatingRecovery(true);
    try {
      const selectedAgent = recoveryAgents.find(a => String(a.id) === String(newRecoveryForm.recovery_agent_id));
      const payload = {
        rider_name: newRecoveryForm.rider_name.trim(),
        scooter_number: newRecoveryForm.scooter_number.toUpperCase().trim(),
        rider_phone: newRecoveryForm.rider_phone.trim(),
        pickup_location: newRecoveryForm.pickup_location.trim(),
        recovery_agent_id: newRecoveryForm.recovery_agent_id ? Number(newRecoveryForm.recovery_agent_id) : null,
        recovery_agent_name: selectedAgent?.name || null,
        recovery_agent_phone: selectedAgent?.phone || null,
        hub_id: Number(newRecoveryForm.hub_id) || (hubs[0]?.id || 1),
        recovery_charge: Number(newRecoveryForm.recovery_charge) || 1000,
        security_deposit_amount: Number(newRecoveryForm.security_deposit_amount) || 2000,
        recovery_reason: newRecoveryForm.recovery_reason.trim()
      };

      const res = await adminApi.post('/recoveries', payload);
      if (res.success) {
        setShowCreateModal(false);
        setNewRecoveryForm({
          rider_name: '',
          scooter_number: '',
          rider_phone: '',
          pickup_location: '',
          recovery_agent_id: '',
          hub_id: String(hubs[0]?.id || '1'),
          recovery_charge: 1000,
          security_deposit_amount: 2000,
          recovery_reason: 'Non-payment / overdue vehicle'
        });
        fetchRecoveries(true);
        if (res.data?.id) {
          router.push(`/admin/recoveries/${res.data.id}`);
        }
      } else {
        alert(res.message || 'Failed to assign recovery.');
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
        item.recovery_number?.toLowerCase().includes(term) ||
        item.scooter_number?.toLowerCase().includes(term) ||
        item.rider_name?.toLowerCase().includes(term) ||
        item.rider_phone?.toLowerCase().includes(term) ||
        item.recovery_agent_name?.toLowerCase().includes(term) ||
        item.pickup_location?.toLowerCase().includes(term) ||
        item.hub_name?.toLowerCase().includes(term);
      if (!matchSearch) return false;
    }

    // Status Tab
    if (statusTab === 'ASSIGNED') {
      if (item.status !== 'ASSIGNED' && item.status !== 'Pending Inspection') return false;
    } else if (statusTab === 'ACCEPTED') {
      if (item.status !== 'ACCEPTED') return false;
    } else if (statusTab === 'PICKED_UP') {
      if (item.status !== 'PICKED_UP') return false;
    } else if (statusTab === 'REACHED_HUB') {
      if (isRecoveryAgent) {
        const isDelivered = (
          item.status === 'REACHED_HUB' ||
          item.status === 'INSPECTION_IN_PROGRESS' ||
          item.status === 'INSPECTION_COMPLETED' ||
          item.status === 'Inspection in Progress' ||
          item.status === 'Inspection Completed' ||
          item.status === 'Completed'
        );
        if (!isDelivered) return false;
      } else {
        if (item.status !== 'REACHED_HUB') return false;
      }
    } else if (statusTab === 'INSPECTED') {
      if (
        item.status !== 'INSPECTION_IN_PROGRESS' &&
        item.status !== 'INSPECTION_COMPLETED' &&
        item.status !== 'Inspection in Progress' &&
        item.status !== 'Inspection Completed'
      ) return false;
    } else if (statusTab === 'COMPLETED') {
      if (item.status !== 'Completed') return false;
    }

    // Hub
    if (selectedHub !== 'all' && item.hub_id !== Number(selectedHub)) return false;

    return true;
  });

  const getStatusBadge = (status: string) => {
    if (isRecoveryAgent) {
      if (
        status === 'REACHED_HUB' ||
        status === 'INSPECTION_IN_PROGRESS' ||
        status === 'INSPECTION_COMPLETED' ||
        status === 'Inspection in Progress' ||
        status === 'Inspection Completed' ||
        status === 'Completed'
      ) {
        return {
          label: 'Delivered at Hub ✓',
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
        };
      }
      if (status === 'ASSIGNED' || status === 'Pending Inspection') {
        return {
          label: 'Assigned to You',
          style: 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
        };
      }
    }

    switch (status) {
      case 'ASSIGNED':
      case 'Pending Inspection':
        return {
          label: 'Pending Acceptance',
          style: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'ACCEPTED':
        return {
          label: 'Agent Accepted',
          style: 'bg-blue-50 text-blue-800 border-blue-200 font-bold'
        };
      case 'PICKED_UP':
        return {
          label: 'Scooty Picked Up',
          style: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold'
        };
      case 'REACHED_HUB':
        return {
          label: 'At Hub (Assign Tech)',
          style: 'bg-orange-50 text-orange-900 border-orange-200 font-bold animate-pulse'
        };
      case 'INSPECTION_IN_PROGRESS':
      case 'Inspection in Progress':
        return {
          label: 'Inspection In Progress',
          style: 'bg-sky-50 text-sky-800 border-sky-200 font-medium'
        };
      case 'INSPECTION_COMPLETED':
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
      default:
        return {
          label: status,
          style: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  const tabs = isRecoveryAgent
    ? [
        { key: 'ALL', label: 'All My Tasks', count: recoveries.length },
        {
          key: 'ASSIGNED',
          label: 'Assigned',
          count: recoveries.filter(r => r.status === 'ASSIGNED' || r.status === 'Pending Inspection').length
        },
        {
          key: 'ACCEPTED',
          label: 'Accepted',
          count: recoveries.filter(r => r.status === 'ACCEPTED').length
        },
        {
          key: 'PICKED_UP',
          label: 'Picked Up',
          count: recoveries.filter(r => r.status === 'PICKED_UP').length
        },
        {
          key: 'REACHED_HUB',
          label: 'Delivered at Hub',
          count: recoveries.filter(r =>
            r.status === 'REACHED_HUB' ||
            r.status === 'INSPECTION_IN_PROGRESS' ||
            r.status === 'INSPECTION_COMPLETED' ||
            r.status === 'Inspection in Progress' ||
            r.status === 'Inspection Completed' ||
            r.status === 'Completed'
          ).length
        }
      ]
    : [
        { key: 'ALL', label: 'All Recoveries', count: recoveries.length },
        { key: 'ASSIGNED', label: 'Assigned', count: stats.assigned || recoveries.filter(r => r.status === 'ASSIGNED' || r.status === 'Pending Inspection').length },
        { key: 'ACCEPTED', label: 'Accepted', count: stats.accepted || recoveries.filter(r => r.status === 'ACCEPTED').length },
        { key: 'PICKED_UP', label: 'Picked Up', count: stats.pickedUp || recoveries.filter(r => r.status === 'PICKED_UP').length },
        { key: 'REACHED_HUB', label: 'At Hub', count: stats.reachedHub || recoveries.filter(r => r.status === 'REACHED_HUB').length },
        { key: 'INSPECTED', label: 'Inspection', count: (stats.inProgress || 0) + (stats.inspectionCompleted || 0) },
        { key: 'COMPLETED', label: 'Settled', count: stats.completed || recoveries.filter(r => r.status === 'Completed').length }
      ];

  return (
    <AdminLayout>
      <div className="space-y-5 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <Truck className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isRecoveryAgent ? 'My Recovery Tasks' : 'Scooty Recovery'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isRecoveryAgent
                ? 'Assigned Task → Accept Request → Vehicle Pickup (Live GPS & 4 Mandatory Photos) → Deliver at Hub'
                : 'Hub Incharge → Recovery Agent → Scooty Pickup (GPS & 4 Photos) → Hub Arrival → Technician Damage Check → Settlement'}
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

            {canCreateRecovery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 transition cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Assign Recovery</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Stats Cards */}
        {isRecoveryAgent ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Assigned
                </span>
                <Truck className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5 font-mono">
                {recoveries.length}
              </p>
              <span className="text-[11px] text-slate-500 mt-0.5 block font-medium">
                My total recovery tasks
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                  Pending Accept
                </span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-900 mt-1.5 font-mono">
                {recoveries.filter(r => r.status === 'ASSIGNED' || r.status === 'Pending Inspection').length}
              </p>
              <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">
                New task assignments
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  In Transit
                </span>
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-900 mt-1.5 font-mono">
                {recoveries.filter(r => r.status === 'ACCEPTED' || r.status === 'PICKED_UP').length}
              </p>
              <span className="text-[11px] text-blue-700 mt-0.5 block font-medium">
                Accepted &amp; on the way
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Delivered at Hub
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-900 mt-1.5 font-mono">
                {recoveries.filter(r =>
                  r.status === 'REACHED_HUB' ||
                  r.status === 'INSPECTION_IN_PROGRESS' ||
                  r.status === 'INSPECTION_COMPLETED' ||
                  r.status === 'Inspection in Progress' ||
                  r.status === 'Inspection Completed' ||
                  r.status === 'Completed'
                ).length}
              </p>
              <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">
                Safely delivered ✓
              </span>
            </div>
          </div>
        ) : (
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
                All registered tickets
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  Active In Transit
                </span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-900 mt-1.5 font-mono">
                {(stats.assigned || 0) + (stats.accepted || 0) + (stats.pickedUp || 0)}
              </p>
              <span className="text-[11px] text-blue-700 mt-0.5 block font-medium">
                With recovery agent
              </span>
            </div>

            <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                  At Hub / Inspection
                </span>
                <Wrench className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-purple-900 mt-1.5 font-mono">
                {(stats.reachedHub || 0) + (stats.inProgress || 0) + (stats.inspectionCompleted || 0)}
              </p>
              <span className="text-[11px] text-purple-700 mt-0.5 block font-medium">
                Ready for Hub settlement
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
                Security reconciled
              </span>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Scooty #, Rider Name, Phone, Location, or Agent..."
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

            {/* Hub Selector */}
            <select
              value={selectedHub}
              onChange={e => setSelectedHub(e.target.value)}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:bg-white focus:border-[#00D96B] cursor-pointer"
            >
              <option value="all">All Service Hubs</option>
              {hubs.map(h => (
                <option key={h.id} value={h.id}>
                  {h.hub_name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
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
              <ShieldAlert className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-black text-slate-900">No Recovery Records Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No recovery records match this filter. Click "Assign Recovery" to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecoveries.map(item => {
              const statusInfo = getStatusBadge(item.status);
              const photoCount = item.pickup_photos?.length || 0;

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E7EB] hover:border-slate-300 hover:shadow-sm transition-all space-y-3.5"
                >
                  {/* Row 1: Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                        {item.recovery_number}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs font-mono text-slate-600 font-medium">
                        {item.recovery_date} {item.recovery_time}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full font-bold">
                        {item.hub_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border ${statusInfo.style}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {/* Vehicle & Location */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Scooty Number
                        </span>
                        {photoCount > 0 && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            <Camera className="w-3 h-3" />
                            <span>{photoCount} Photos</span>
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {item.scooter_number}
                      </div>
                      <div className="flex items-start gap-1 text-[11px] text-slate-600">
                        <MapPin className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="truncate">{item.pickup_live_location || item.pickup_location || 'Customer Location'}</span>
                      </div>
                    </div>

                    {/* Rider Info */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Customer Details
                      </span>
                      <div className="font-extrabold text-slate-800 text-xs">
                        {item.rider_name}
                      </div>
                      <a
                        href={`tel:${item.rider_phone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-mono font-bold"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{item.rider_phone}</span>
                      </a>
                    </div>

                    {/* Assigned Agent */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Recovery Agent
                      </span>
                      <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{item.recovery_agent_name || item.recovered_by || 'Not assigned'}</span>
                      </div>
                      {item.recovery_agent_phone ? (
                        <a
                          href={`tel:${item.recovery_agent_phone}`}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-600 font-mono"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.recovery_agent_phone}</span>
                        </a>
                      ) : (
                        <span className="text-[10px] text-slate-400">Agent assigned by Hub</span>
                      )}
                    </div>
                  </div>

                  {/* Row 3: Actions & Financials */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
                      <span>Recovery Fee: <b className="text-slate-800">₹{item.recovery_charge || 1000}</b></span>
                      <span>&bull;</span>
                      <span>Security: <b className="text-slate-800">₹{item.security_deposit_amount || 2000}</b></span>
                      {!isRecoveryAgent && Number(item.gross_damage_total) > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="text-red-600 font-bold">Damages: ₹{item.gross_damage_total}</span>
                        </>
                      )}
                    </div>

                    <Link
                      href={`/admin/recoveries/${item.id}`}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95 self-end sm:self-auto"
                    >
                      <span>
                        {isRecoveryAgent ? (
                          item.status === 'ASSIGNED' || item.status === 'Pending Inspection'
                            ? 'Accept Task'
                            : item.status === 'ACCEPTED'
                            ? 'Pickup & Photos'
                            : item.status === 'PICKED_UP'
                            ? 'Submit Hub Arrival'
                            : 'Delivered at Hub ✓'
                        ) : (
                          item.status === 'ASSIGNED' || item.status === 'Pending Inspection'
                            ? 'Waiting for Agent'
                            : item.status === 'ACCEPTED'
                            ? 'Agent En Route'
                            : item.status === 'PICKED_UP'
                            ? 'In Transit'
                            : item.status === 'REACHED_HUB'
                            ? 'Assign Tech'
                            : item.status === 'Completed'
                            ? 'View Slip'
                            : 'Review & Settle'
                        )}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Step 1 Hub Incharge Assigns Recovery Agent */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl border border-[#E5E7EB] w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      Step 1: Assign Recovery Agent
                    </h3>
                    <p className="text-[11px] text-slate-500">Hub Incharge dispatches agent to pick up scooty</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRecoverySubmit} className="space-y-3.5 text-xs">
                {/* 1. Customer Name */}
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter customer name"
                    value={newRecoveryForm.rider_name}
                    onChange={e => setNewRecoveryForm(prev => ({ ...prev, rider_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                  />
                </div>

                {/* 2. Scooty Number & 3. Contact Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Scooty Number <span className="text-red-500">*</span>
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
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={newRecoveryForm.rider_phone}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, rider_phone: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                {/* 4. Recovery Location */}
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    Recovery Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter pickup address / landmark (e.g. Clock Tower, Dehradun)"
                    value={newRecoveryForm.pickup_location}
                    onChange={e => setNewRecoveryForm(prev => ({ ...prev, pickup_location: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                  />
                </div>

                {/* Assign Recovery Agent Dropdown */}
                <div>
                  <label className="block text-slate-700 font-extrabold mb-1">
                    Assign Recovery Agent <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newRecoveryForm.recovery_agent_id}
                    onChange={e => setNewRecoveryForm(prev => ({ ...prev, recovery_agent_id: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#00D96B] cursor-pointer"
                  >
                    <option value="">-- Select Recovery Agent --</option>
                    {recoveryAgents.map(ag => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.role_display_name || ag.role_name || 'Agent'}{ag.phone ? ` - ${ag.phone}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Hub & Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Destination Hub
                    </label>
                    <select
                      value={newRecoveryForm.hub_id}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, hub_id: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#00D96B] cursor-pointer"
                    >
                      {hubs.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.hub_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Reason
                    </label>
                    <input
                      type="text"
                      value={newRecoveryForm.recovery_reason}
                      onChange={e => setNewRecoveryForm(prev => ({ ...prev, recovery_reason: e.target.value }))}
                      placeholder="e.g. Overdue / Repossession"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                {/* Standard Charges Pill */}
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 block">Fixed Standard Rates</span>
                    <span className="text-[10px] text-emerald-700">Recovery Fee: ₹1,000 &bull; Security Deposit: ₹2,000</span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full">
                    Auto-Configured
                  </span>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
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
                    className="px-5 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 disabled:opacity-50 cursor-pointer active:scale-95 transition"
                  >
                    {creatingRecovery ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>Assign Recovery Agent</span>
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
