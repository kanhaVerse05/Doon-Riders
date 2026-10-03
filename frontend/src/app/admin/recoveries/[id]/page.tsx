'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi } from '../../../../lib/adminApi';
import {
  ShieldAlert,
  ArrowLeft,
  Phone,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Wrench,
  ShieldCheck,
  Printer,
  DollarSign,
  FileText,
  Building,
  Check,
  Ban,
  Tag,
  Share2,
  Calendar,
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

export default function ScootyRecoveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const recoveryId = params?.id as string;

  const [recoveryRecord, setRecoveryRecord] = useState<ScootyRecovery | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Hub Incharge Settlement State
  const [damageItemsState, setDamageItemsState] = useState<DamageItem[]>([]);
  const [recoveryChargeInput, setRecoveryChargeInput] = useState<number>(1000);
  const [securityDepositInput, setSecurityDepositInput] = useState<number>(2000);
  const [settlementNotesInput, setSettlementNotesInput] = useState<string>('');
  const [paymentModeInput, setPaymentModeInput] = useState<string>('UPI');
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [isSettling, setIsSettling] = useState(false);

  // Assign Technician state
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [assigningTech, setAssigningTech] = useState(false);

  const isHubIncharge = user?.roleName === 'HUB_INCHARGE' || user?.roleName?.includes('HUB') || user?.roleName === 'SUPER_ADMIN' || user?.roleName === 'ADMIN';

  const fetchRecoveryDetails = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await adminApi.get(`/recoveries/${recoveryId}`);
      if (res.success && res.data) {
        setRecoveryRecord(res.data);
        setTimeline(res.timeline || []);
        if (res.technicians) setTechnicians(res.technicians);

        setRecoveryChargeInput(Number(res.data.recovery_charge) || 1000);
        setSecurityDepositInput(Number(res.data.security_deposit_amount) || 2000);
        setSettlementNotesInput(res.data.settlement_notes || '');
        setPaymentModeInput(res.data.rider_payment_mode || 'UPI');
        setPaymentRefInput(res.data.rider_payment_reference || '');

        // Format damage items state with Hub remark controls
        const items = (res.data.damage_items || []).map((d: any, idx: number) => ({
          id: d.id || `item-${idx + 1}`,
          part_name: d.part_name || 'Damage Repair',
          category: d.category || 'General',
          quantity: Number(d.quantity) || 1,
          unit_price: Number(d.unit_price) || 0,
          total_price: Number(d.total_price) !== undefined ? Number(d.total_price) : (Number(d.quantity) || 1) * (Number(d.unit_price) || 0),
          technician_remark: d.technician_remark || '',
          photos: d.photos || [],
          hub_remark_type: d.hub_remark_type || 'Charge Customer',
          hub_remark_text: d.hub_remark_text || '',
          is_payable: d.hub_remark_type === 'No Payment' ? false : true
        }));
        setDamageItemsState(items);
      }
    } catch (err) {
      console.error('Failed to load recovery details', err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (recoveryId) {
      fetchRecoveryDetails();
    }
  }, [recoveryId]);

  // Real-time calculation helper
  // Formula: (Payable Damage Total + Fixed Recovery Charge (1000)) - Security Deposit
  const calculateLiveSettlement = () => {
    let grossDamage = 0;
    let payableDamage = 0;
    let waivedDamage = 0;

    damageItemsState.forEach(item => {
      const itemTotal = Number(item.total_price) || (item.quantity * item.unit_price);
      grossDamage += itemTotal;
      if (item.hub_remark_type === 'No Payment') {
        waivedDamage += itemTotal;
      } else {
        payableDamage += itemTotal;
      }
    });

    const sec = Number(securityDepositInput) >= 0 ? Number(securityDepositInput) : 2000;
    const recFee = Number(recoveryChargeInput) >= 0 ? Number(recoveryChargeInput) : 1000;
    const totalCharges = Math.round((payableDamage + recFee) * 100) / 100;

    let settlementType: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'ZERO_BALANCE' | 'DUE_FROM_RIDER' = 'FULL_REFUND';
    let refund = 0;
    let due = 0;

    if (totalCharges === 0) {
      settlementType = 'FULL_REFUND';
      refund = sec;
      due = 0;
    } else if (totalCharges < sec) {
      settlementType = 'PARTIAL_REFUND';
      refund = Math.round((sec - totalCharges) * 100) / 100;
      due = 0;
    } else if (totalCharges === sec) {
      settlementType = 'ZERO_BALANCE';
      refund = 0;
      due = 0;
    } else {
      settlementType = 'DUE_FROM_RIDER';
      refund = 0;
      due = Math.round((totalCharges - sec) * 100) / 100;
    }

    return {
      grossDamageTotal: grossDamage,
      payableDamageTotal: payableDamage,
      waivedDamageTotal: waivedDamage,
      recoveryCharge: recFee,
      totalCharges,
      settlementType,
      refundAmount: refund,
      dueAmount: due
    };
  };

  const liveCalc = calculateLiveSettlement();

  // Update a single damage item's Hub Incharge remark
  const handleItemRemarkTypeChange = (id: string, newType: 'Charge Customer' | 'No Payment' | 'Custom Remark') => {
    setDamageItemsState(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            hub_remark_type: newType,
            is_payable: newType === 'No Payment' ? false : true,
            hub_remark_text: newType === 'No Payment' ? (item.hub_remark_text || 'Waived off (Normal wear & tear)') : item.hub_remark_text
          };
        }
        return item;
      })
    );
  };

  const handleItemRemarkTextChange = (id: string, text: string) => {
    setDamageItemsState(prev =>
      prev.map(item => (item.id === id ? { ...item, hub_remark_text: text } : item))
    );
  };

  // Assign Technician
  const handleAssignTechnician = async () => {
    if (!selectedTechId) {
      alert('Please select a technician.');
      return;
    }

    setAssigningTech(true);
    try {
      const res = await adminApi.post(`/recoveries/${recoveryId}/assign`, {
        technician_id: Number(selectedTechId)
      });
      if (res.success) {
        fetchRecoveryDetails(true);
      } else {
        alert(res.message || 'Failed to assign technician');
      }
    } catch (err: any) {
      console.error('Error assigning technician:', err);
      alert(err.message || 'Error assigning technician');
    } finally {
      setAssigningTech(false);
    }
  };

  // Settle Recovery & Finalize Payment
  const handleSettleRecovery = async () => {
    if (!confirm('Are you sure you want to approve and finalize this Scooty Recovery settlement? This will update the ledger and return the scooty to available fleet.')) {
      return;
    }

    setIsSettling(true);
    try {
      const payload = {
        damage_items: damageItemsState,
        recovery_charge: Number(recoveryChargeInput) || 1000,
        security_deposit_amount: Number(securityDepositInput) || 2000,
        settlement_notes: settlementNotesInput,
        rider_payment_mode: paymentModeInput,
        rider_payment_reference: paymentRefInput,
        rider_payment_status: 'Paid'
      };

      const res = await adminApi.post(`/recoveries/${recoveryId}/settle`, payload);
      if (res.success) {
        fetchRecoveryDetails(true);
      } else {
        alert(res.message || 'Failed to settle recovery.');
      }
    } catch (err: any) {
      console.error('Error settling recovery:', err);
      alert(err.message || 'Server error settling recovery.');
    } finally {
      setIsSettling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Loading Recovery Ticket Details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!recoveryRecord) {
    return (
      <AdminLayout>
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 max-w-md mx-auto space-y-4 my-12">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="text-base font-black text-slate-900">Recovery Record Not Found</h2>
          <p className="text-xs text-slate-500">The requested recovery ticket does not exist or was removed.</p>
          <Link
            href="/admin/recoveries"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Recoveries List</span>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const isCompleted = recoveryRecord.status === 'Completed';

  return (
    <AdminLayout>
      <div className="space-y-6 pb-16 font-sans">
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/recoveries"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
              title="Back to Recoveries"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                  {recoveryRecord.recovery_number}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : recoveryRecord.status === 'Inspection Completed'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {recoveryRecord.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Created on {new Date(recoveryRecord.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => fetchRecoveryDetails(false)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Refresh"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#00A854]' : ''}`} />
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Settlement Slip</span>
            </button>
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Details, Damage Sheet & Financials */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Recovery Intake & Vehicle Profile Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900">Recovery Vehicle &amp; Rider Profile</h2>
                    <p className="text-[11px] text-slate-500">Intake information logged at Hub</p>
                  </div>
                </div>

                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl">
                  {recoveryRecord.hub_name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Scooty Number</span>
                  <p className="font-mono font-black text-slate-900 text-sm">{recoveryRecord.scooter_number}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Recovered By</span>
                  <p className="font-black text-slate-900 truncate">{recoveryRecord.recovered_by}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Rider Name</span>
                  <p className="font-extrabold text-slate-900 truncate">{recoveryRecord.rider_name}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Rider Contact</span>
                  <a
                    href={`tel:${recoveryRecord.rider_phone}`}
                    className="font-mono font-bold text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{recoveryRecord.rider_phone}</span>
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Recovery Date</span>
                  <p className="font-mono font-bold text-slate-800">
                    {new Date(recoveryRecord.recovery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Recovery Time</span>
                  <p className="font-mono font-bold text-slate-800">{recoveryRecord.recovery_time}</p>
                </div>

                <div className="p-3 bg-red-50/60 rounded-2xl border border-red-200 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-red-700 uppercase">Fixed Recovery Fee</span>
                  <p className="font-mono font-black text-red-900 text-sm">₹{recoveryRecord.recovery_charge}</p>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-0.5">
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase">Security Deposit</span>
                  <p className="font-mono font-black text-emerald-900 text-sm">₹{recoveryRecord.security_deposit_amount}</p>
                </div>
              </div>

              {recoveryRecord.recovery_reason && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block mb-0.5">
                    Reason for Recovery / Notes
                  </span>
                  <p className="text-slate-700">{recoveryRecord.recovery_reason}</p>
                </div>
              )}
            </div>

            {/* 2. Technician Damage Inspection Sheet & Hub Incharge Remark Waiver Control */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      Damage Inspection Sheet
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {damageItemsState.length} Item(s)
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Logged by Technician &bull; Reviewed by Hub Incharge for payment remarks
                    </p>
                  </div>
                </div>

                {recoveryRecord.technician_name && (
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 self-end sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Inspector: <b>{recoveryRecord.technician_name}</b></span>
                  </div>
                )}
              </div>

              {damageItemsState.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="text-xs font-black text-emerald-900">Zero Physical or Mechanical Damages</h3>
                  <p className="text-[11px] text-emerald-700 max-w-sm mx-auto">
                    The recovered vehicle was inspected with zero broken or missing parts. Only the fixed recovery charge (₹{recoveryRecord.recovery_charge}) applies.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {damageItemsState.map((item, index) => {
                    const isNoPayment = item.hub_remark_type === 'No Payment';
                    const itemTotal = Number(item.total_price) || (item.quantity * item.unit_price);

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isNoPayment
                            ? 'bg-amber-50/40 border-amber-300/80 opacity-90'
                            : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        {/* Damage Item Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
                              {index + 1}
                            </span>
                            <div>
                              <h4 className={`text-xs font-black ${isNoPayment ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {item.part_name}
                              </h4>
                              {item.category && (
                                <span className="text-[10px] text-slate-400 font-semibold">{item.category}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto font-mono">
                            <span className="text-xs text-slate-500">
                              Qty: <b>{item.quantity}</b> &times; ₹{item.unit_price}
                            </span>
                            <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                              isNoPayment
                                ? 'bg-amber-100 text-amber-800 border-amber-300 line-through'
                                : 'bg-slate-100 text-slate-900 border-slate-200'
                            }`}>
                              ₹{itemTotal}
                            </span>
                          </div>
                        </div>

                        {/* Technician Remarks */}
                        {item.technician_remark && (
                          <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700">
                            <span className="font-extrabold text-slate-500 block text-[10px] uppercase">
                              Technician Diagnostic Remark:
                            </span>
                            {item.technician_remark}
                          </div>
                        )}

                        {/* Hub Incharge Remark & Payment Waiver Control */}
                        <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Hub Incharge Payment Decision:</span>
                            </label>

                            {!isCompleted ? (
                              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleItemRemarkTypeChange(item.id, 'Charge Customer')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    item.hub_remark_type === 'Charge Customer'
                                      ? 'bg-slate-900 text-white shadow-xs'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  Charge Customer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleItemRemarkTypeChange(item.id, 'No Payment')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                                    item.hub_remark_type === 'No Payment'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'text-amber-700 hover:bg-amber-50'
                                  }`}
                                >
                                  <Ban className="w-3 h-3" />
                                  <span>No Payment (Waive)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleItemRemarkTypeChange(item.id, 'Custom Remark')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    item.hub_remark_type === 'Custom Remark'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-blue-700 hover:bg-blue-50'
                                  }`}
                                >
                                  Custom Remark
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                isNoPayment
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              }`}>
                                {item.hub_remark_type}
                              </span>
                            )}
                          </div>

                          {/* Custom Text input for Hub Incharge */}
                          {!isCompleted ? (
                            <input
                              type="text"
                              value={item.hub_remark_text || ''}
                              onChange={e => handleItemRemarkTextChange(item.id, e.target.value)}
                              placeholder={
                                isNoPayment
                                  ? 'Reason for waiver (e.g. Normal wear & tear / pre-existing scratch)'
                                  : 'Hub incharge note (e.g. Damaged during recovery repossession)'
                              }
                              className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00D96B]"
                            />
                          ) : (
                            item.hub_remark_text && (
                              <p className="text-[11px] text-slate-600 italic">
                                Note: "{item.hub_remark_text}"
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Interactive Smart Financial Calculation & Settlement Box (White & Green Theme) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-[#00A854] flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Smart Recovery &amp; Damage Settlement</h3>
                    <p className="text-[11px] text-slate-500">
                      Formula: (Payable Damage + Fixed ₹1,000 Recovery Fee) - Security Deposit
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-50 text-[#00A854] border border-emerald-200 font-bold">
                  Auto-Balanced
                </span>
              </div>

              {/* Math Summary Line */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Security Paid</span>
                  <p className="text-base font-black text-slate-900">₹{securityDepositInput}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Damage Inspected</span>
                  <p className="text-base font-black text-slate-800">₹{liveCalc.grossDamageTotal}</p>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Waived (₹0)</span>
                  <p className="text-base font-black text-amber-700">- ₹{liveCalc.waivedDamageTotal}</p>
                </div>

                <div className="p-3 bg-red-50 rounded-2xl border border-red-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Payable Damage</span>
                  <p className="text-base font-black text-red-600">₹{liveCalc.payableDamageTotal}</p>
                </div>

                <div className="p-3 bg-red-50 rounded-2xl border border-red-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Recovery Fee</span>
                  <p className="text-base font-black text-red-600">+ ₹{recoveryChargeInput}</p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Charges</span>
                  <p className="text-base font-black text-emerald-700">₹{liveCalc.totalCharges}</p>
                </div>
              </div>

              {/* Final Settlement Result Banner */}
              <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                liveCalc.settlementType === 'DUE_FROM_RIDER'
                  ? 'bg-red-50 border-red-200 text-red-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest font-black block text-slate-500">
                    Final Net Recovery Settlement Outcome:
                  </span>
                  <h4 className="text-lg sm:text-xl font-black mt-0.5 text-slate-900 font-mono">
                    {liveCalc.settlementType === 'FULL_REFUND' && `Full Security Refund: ₹${liveCalc.refundAmount}`}
                    {liveCalc.settlementType === 'PARTIAL_REFUND' && `Net Balance Refund to Rider: ₹${liveCalc.refundAmount}`}
                    {liveCalc.settlementType === 'ZERO_BALANCE' && `Zero Balance (Security Exactly Covered Charges)`}
                    {liveCalc.settlementType === 'DUE_FROM_RIDER' && `Extra Amount Due from Rider: ₹${liveCalc.dueAmount}`}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    {liveCalc.settlementType === 'DUE_FROM_RIDER'
                      ? `Total charges of ₹${liveCalc.totalCharges} (Damages: ₹${liveCalc.payableDamageTotal} + Recovery: ₹${recoveryChargeInput}) exceeded ₹${securityDepositInput} security. Rider must pay remaining ₹${liveCalc.dueAmount}.`
                      : `Total charges of ₹${liveCalc.totalCharges} (Damages: ₹${liveCalc.payableDamageTotal} + Recovery: ₹${recoveryChargeInput}) deducted from ₹${securityDepositInput} security deposit. Rider receives ₹${liveCalc.refundAmount} refund.`}
                  </p>
                </div>

                <div className="font-mono text-right flex-shrink-0">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    {liveCalc.settlementType === 'DUE_FROM_RIDER' ? 'Payable By Rider' : 'Refund to Rider'}
                  </span>
                  <span className={`text-2xl sm:text-3xl font-black ${
                    liveCalc.settlementType === 'DUE_FROM_RIDER' ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    ₹{liveCalc.settlementType === 'DUE_FROM_RIDER' ? liveCalc.dueAmount : liveCalc.refundAmount}
                  </span>
                </div>
              </div>

              {/* Hub Incharge Settle & Payment Form */}
              {!isCompleted ? (
                <div className="space-y-4 pt-2 border-t border-slate-100 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-extrabold mb-1">
                        Settlement Payment / Refund Mode
                      </label>
                      <select
                        value={paymentModeInput}
                        onChange={e => setPaymentModeInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#00D96B] cursor-pointer"
                      >
                        <option value="UPI">UPI / QR Code Transfer</option>
                        <option value="Cash">Cash Handover</option>
                        <option value="Bank Transfer">NEFT / IMPS Bank Transfer</option>
                        <option value="Card">Debit / Credit Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-extrabold mb-1">
                        UTR / Transaction Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={paymentRefInput}
                        onChange={e => setPaymentRefInput(e.target.value)}
                        placeholder="e.g. UPI/129381203912 or Cash Voucher"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-[#00D96B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-extrabold mb-1">
                      Final Recovery Settlement Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={settlementNotesInput}
                      onChange={e => setSettlementNotesInput(e.target.value)}
                      placeholder="e.g. Recovery fee and damage deductions settled with rider. Vehicle cleared and restored to fleet."
                      className="w-full px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSettleRecovery}
                      disabled={isSettling}
                      className="px-6 py-3 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 disabled:opacity-50 cursor-pointer active:scale-95 transition"
                    >
                      {isSettling ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      )}
                      <span>Approve &amp; Close Recovery Settlement</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-extrabold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Settled &amp; Closed by Hub Incharge</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Mode</span>
                      <p className="font-bold text-slate-800">{recoveryRecord.rider_payment_mode || 'UPI'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Transaction Ref</span>
                      <p className="font-mono text-slate-800">{recoveryRecord.rider_payment_reference || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Settled Date</span>
                      <p className="font-mono text-slate-800">
                        {recoveryRecord.settled_at ? new Date(recoveryRecord.settled_at).toLocaleDateString('en-IN') : 'Completed'}
                      </p>
                    </div>
                  </div>
                  {recoveryRecord.settlement_notes && (
                    <p className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-200">
                      "{recoveryRecord.settlement_notes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 Col): Technician Assignment & Audit Activity Timeline */}
          <div className="space-y-6">
            {/* Technician Assignment Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Assigned Inspector</span>
                </h3>
              </div>

              {recoveryRecord.technician_name ? (
                <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900">{recoveryRecord.technician_name}</h4>
                      <span className="text-[10px] text-slate-500 block font-mono">{recoveryRecord.technician_code || 'TECH'}</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>

                  {recoveryRecord.technician_phone && (
                    <a
                      href={`tel:${recoveryRecord.technician_phone}`}
                      className="flex items-center gap-1.5 text-xs text-blue-600 font-mono font-bold hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{recoveryRecord.technician_phone}</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-2">
                  <p className="font-medium text-[11px]">No technician assigned yet for damage check.</p>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={selectedTechId}
                      onChange={e => setSelectedTechId(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="">Select Tech...</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssignTechnician}
                      disabled={assigningTech}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Audit & Activity Timeline Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span>Recovery Timeline</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{timeline.length} Events</span>
              </div>

              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 pl-7">
                {timeline.map((event, idx) => (
                  <div key={event.id || idx} className="relative text-xs space-y-0.5">
                    <div className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-[#00D96B] ring-4 ring-emerald-50" />
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 text-[11px]">{event.title}</h4>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{event.description}</p>
                    {event.performed_by_name && (
                      <span className="text-[9px] text-slate-400 block">
                        By {event.performed_by_name} ({event.performed_by_role || 'Staff'})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
