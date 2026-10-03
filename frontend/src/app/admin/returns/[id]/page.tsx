'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi } from '../../../../lib/adminApi';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Building,
  User,
  RotateCw,
  Printer,
  Check,
  X,
  Wrench,
  Package,
  Camera,
  Calendar,
  Layers,
  Sparkles,
  DollarSign,
  FileText,
  AlertCircle,
  Share2,
  ChevronRight,
  ShieldCheck,
  Ban,
  Tag
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
  hub_remark_type: 'Charge Customer' | 'No Payment' | 'Custom Remark';
  hub_remark_text: string;
  is_payable: boolean;
}

interface ReturnEvent {
  id: number;
  return_id: number;
  event_type: string;
  title: string;
  description: string;
  status: string;
  performed_by_name: string;
  performed_by_role: string;
  metadata?: any;
  created_at: string;
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
  damage_items: DamageItem[];
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

export default function ScootyReturnDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const returnId = params?.id as string;

  const [returnRecord, setReturnRecord] = useState<ScootyReturn | null>(null);
  const [timeline, setTimeline] = useState<ReturnEvent[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Editable Settlement State for Hub Incharge
  const [damageItemsState, setDamageItemsState] = useState<DamageItem[]>([]);
  const [securityDepositInput, setSecurityDepositInput] = useState<number>(2000);
  const [settlementNotesInput, setSettlementNotesInput] = useState<string>('');
  const [paymentModeInput, setPaymentModeInput] = useState<string>('UPI');
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  // Assign Tech Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchReturnDetails = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await adminApi.get(`/admin/returns/${returnId}`);
      if (res && res.success && res.data) {
        setReturnRecord(res.data);
        setTimeline(res.timeline || []);
        if (res.technicians) setTechnicians(res.technicians);

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
      console.error('Failed to load return details', err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (returnId) {
      fetchReturnDetails();
    }
  }, [returnId]);

  // Real-time calculation helper
  const calculateLiveSettlement = () => {
    let gross = 0;
    let payable = 0;
    let waived = 0;

    damageItemsState.forEach(item => {
      const itemTotal = Number(item.total_price) || (item.quantity * item.unit_price);
      gross += itemTotal;
      if (item.hub_remark_type === 'No Payment') {
        waived += itemTotal;
      } else {
        payable += itemTotal;
      }
    });

    const sec = Number(securityDepositInput) >= 0 ? Number(securityDepositInput) : 2000;
    let settlementType: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'ZERO_BALANCE' | 'DUE_FROM_RIDER' = 'FULL_REFUND';
    let refund = 0;
    let due = 0;

    if (payable === 0) {
      settlementType = 'FULL_REFUND';
      refund = sec;
      due = 0;
    } else if (payable < sec) {
      settlementType = 'PARTIAL_REFUND';
      refund = Math.round((sec - payable) * 100) / 100;
      due = 0;
    } else if (payable === sec) {
      settlementType = 'ZERO_BALANCE';
      refund = 0;
      due = 0;
    } else {
      settlementType = 'DUE_FROM_RIDER';
      refund = 0;
      due = Math.round((payable - sec) * 100) / 100;
    }

    return {
      grossTotal: gross,
      payableTotal: payable,
      waivedTotal: waived,
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
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            hub_remark_text: text
          };
        }
        return item;
      })
    );
  };

  // Submit Final Settlement (Hub Incharge Action)
  const handleFinalizeSettlement = async () => {
    if (!returnRecord) return;

    const confirmMsg = liveCalc.settlementType === 'DUE_FROM_RIDER'
      ? `Confirm Settlement? Rider owes ₹${liveCalc.dueAmount} for damages after adjusting ₹${securityDepositInput} security deposit.`
      : `Confirm Settlement? Rider will be refunded ₹${liveCalc.refundAmount} from initial ₹${securityDepositInput} security deposit.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmittingSettlement(true);
      const res = await adminApi.post(`/admin/returns/${returnRecord.id}/settle`, {
        damage_items: damageItemsState,
        security_deposit_amount: securityDepositInput,
        settlement_notes: settlementNotesInput,
        rider_payment_mode: paymentModeInput,
        rider_payment_reference: paymentRefInput,
        rider_payment_status: 'Paid'
      });

      if (res && res.success) {
        showToast('Scooty return settlement approved and closed successfully!');
        fetchReturnDetails();
      } else {
        alert(res?.message || 'Failed to settle return');
      }
    } catch (err: any) {
      alert(err.message || 'Error settling return');
    } finally {
      setSubmittingSettlement(false);
    }
  };

  // Assign Technician
  const handleAssignTechnician = async () => {
    if (!returnRecord || !selectedTechId) {
      alert('Please select a technician');
      return;
    }

    try {
      setSubmittingAssign(true);
      const res = await adminApi.post(`/admin/returns/${returnRecord.id}/assign`, {
        technician_id: selectedTechId
      });

      if (res && res.success) {
        showToast('Technician assigned successfully!');
        setShowAssignModal(false);
        fetchReturnDetails();
      } else {
        alert(res?.message || 'Failed to assign technician');
      }
    } catch (err: any) {
      alert(err.message || 'Error assigning technician');
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Open WhatsApp Settlement Message
  const handleWhatsApp = () => {
    if (!returnRecord) return;
    const cleanPhone = returnRecord.rider_phone.replace(/[^0-9]/g, '');
    const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    let settlementMsg = '';
    if (liveCalc.settlementType === 'FULL_REFUND') {
      settlementMsg = `Inspection Result: Zero damages detected. Full security deposit refund of ₹${liveCalc.refundAmount} has been processed.`;
    } else if (liveCalc.settlementType === 'PARTIAL_REFUND') {
      settlementMsg = `Inspection Result: Damage deduction of ₹${liveCalc.payableTotal} applied. Balance refund of ₹${liveCalc.refundAmount} has been processed.`;
    } else if (liveCalc.settlementType === 'ZERO_BALANCE') {
      settlementMsg = `Inspection Result: Damage total of ₹${liveCalc.payableTotal} settled against ₹${securityDepositInput} security deposit. Zero balance due.`;
    } else {
      settlementMsg = `Inspection Result: Damage deduction of ₹${liveCalc.payableTotal} exceeds security deposit (₹${securityDepositInput}). Net due amount of ₹${liveCalc.dueAmount} to be paid.`;
    }

    const msg = encodeURIComponent(
      `Hello ${returnRecord.rider_name},\nDOON RIDERS Hub return settlement for scooty ${returnRecord.scooter_number} (Ticket: ${returnRecord.return_number}).\n\n${settlementMsg}\n\nThank you for riding with DOON RIDERS!`
    );
    window.open(`https://wa.me/${formatted}?text=${msg}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !returnRecord) {
    return (
      <AdminLayout>
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Loading Return & Inspection Details...</p>
        </div>
      </AdminLayout>
    );
  }

  const isCompleted = returnRecord.status === 'Completed';

  return (
    <AdminLayout>
      <div className="space-y-6 pb-24 max-w-[1500px] mx-auto">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#0A0F1D] border border-[#00D96B]/50 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="w-6 h-6 rounded-full bg-[#00D96B]/20 border border-[#00D96B]/40 flex items-center justify-center text-[#00D96B]">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span className="text-xs font-bold">{toastMessage}</span>
          </div>
        )}

        {/* Top Breadcrumb & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E7EB] shadow-sm">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => router.push('/admin/returns')}
              className="p-2 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex-shrink-0 cursor-pointer"
              title="Back to Returns"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black text-slate-900 tracking-tight font-mono whitespace-nowrap">
                  {returnRecord.return_number}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : returnRecord.status === 'Inspection Completed'
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {returnRecord.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Vehicle <strong className="font-mono text-slate-800">{returnRecord.scooter_number}</strong> &bull; Returned to {returnRecord.hub_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs transition flex items-center gap-2 cursor-pointer"
              title="Print Settlement Invoice & Inspection Sheet"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Receipt</span>
            </button>

            <button
              onClick={handleWhatsApp}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-200 transition flex items-center gap-2 cursor-pointer"
              title="Send WhatsApp Settlement Summary"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Rider</span>
            </button>

            {!isCompleted && (
              <button
                onClick={() => {
                  setSelectedTechId(returnRecord.technician_id || technicians[0]?.id || null);
                  setShowAssignModal(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs border border-blue-200 transition flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>{returnRecord.technician_name ? 'Reassign Tech' : 'Assign Tech'}</span>
              </button>
            )}

            <button
              onClick={() => fetchReturnDetails(true)}
              className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition flex items-center justify-center cursor-pointer"
              title="Refresh"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Return Info, Damage Sheet & Settlement Engine */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Vehicle & Rider Information Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Check-in & Rental Details</h2>
                  <p className="text-[11px] text-slate-500">Vehicle intake metadata at service hub</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Scooty Reg No</span>
                  <p className="text-sm font-mono font-black text-slate-900 mt-0.5">{returnRecord.scooter_number}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Rider Name</span>
                  <p className="text-xs font-black text-slate-900 mt-0.5 truncate">{returnRecord.rider_name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{returnRecord.rider_phone}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Return Date & Time</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {new Date(returnRecord.return_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {returnRecord.return_time}
                  </p>
                  {returnRecord.initial_meter_reading && (
                    <p className="text-[10px] text-slate-500 font-mono">Meter: {returnRecord.initial_meter_reading} KM</p>
                  )}
                </div>

                <div className="p-3 bg-[#0A0F1D] text-white rounded-2xl">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Security Deposit</span>
                  <p className="text-base font-black text-[#00D96B] mt-0.5 font-mono">
                    ₹{returnRecord.security_deposit_amount}
                  </p>
                  <span className="text-[9px] text-slate-400 block font-mono">Paid at time of rental</span>
                </div>
              </div>

              {returnRecord.initial_remarks && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase block mb-0.5">
                    Initial Check-in Notes
                  </span>
                  <p className="text-slate-700">{returnRecord.initial_remarks}</p>
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

                {returnRecord.technician_name && (
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 self-end sm:self-auto bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Inspector: <b>{returnRecord.technician_name}</b></span>
                  </div>
                )}
              </div>

              {damageItemsState.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h3 className="text-xs font-black text-emerald-900">Zero Physical or Mechanical Damages</h3>
                  <p className="text-[11px] text-emerald-700 max-w-sm mx-auto">
                    The vehicle was inspected with zero broken or missing parts. 100% of the security deposit is eligible for refund to the rider.
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
                                      ? 'bg-[#0A0F1D] text-white shadow-xs'
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
                                  : 'Hub incharge note (e.g. Broken during rental tenure, charging full cost)'
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

            {/* 3. Interactive Smart Financial Calculation & Settlement Box */}
            <div className="bg-[#0A0F1D] text-white p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#00D96B]/20 border border-[#00D96B]/40 text-[#00D96B] flex items-center justify-center font-bold">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Smart Security & Damage Settlement</h3>
                    <p className="text-[11px] text-slate-400">Automated net refund & penalty computation</p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-900 text-[#00D96B] border border-slate-700 font-bold">
                  Auto-Balanced
                </span>
              </div>

              {/* Math Summary Line */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400">Security Collected</span>
                  <p className="text-base font-black text-white">₹{securityDepositInput}</p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400">Total Inspected</span>
                  <p className="text-base font-black text-slate-300">₹{liveCalc.grossTotal}</p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-amber-400 font-bold">Waived Off (₹0)</span>
                  <p className="text-base font-black text-amber-400">- ₹{liveCalc.waivedTotal}</p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-red-400 font-bold">Payable Damage</span>
                  <p className="text-base font-black text-red-400">₹{liveCalc.payableTotal}</p>
                </div>
              </div>

              {/* Final Settlement Result Banner */}
              <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                liveCalc.settlementType === 'DUE_FROM_RIDER'
                  ? 'bg-red-950/50 border-red-500/40 text-red-200'
                  : 'bg-emerald-950/50 border-[#00D96B]/40 text-emerald-200'
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest font-black block text-slate-400">
                    Final Net Settlement Outcome:
                  </span>
                  <h4 className="text-lg sm:text-xl font-black mt-0.5 text-white font-mono">
                    {liveCalc.settlementType === 'FULL_REFUND' && `Full Security Refund: ₹${liveCalc.refundAmount}`}
                    {liveCalc.settlementType === 'PARTIAL_REFUND' && `Balance Refund to Rider: ₹${liveCalc.refundAmount}`}
                    {liveCalc.settlementType === 'ZERO_BALANCE' && `Zero Balance (Security Exactly Covered Damage)`}
                    {liveCalc.settlementType === 'DUE_FROM_RIDER' && `Extra Amount Due from Rider: ₹${liveCalc.dueAmount}`}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {liveCalc.settlementType === 'DUE_FROM_RIDER'
                      ? `Security of ₹${securityDepositInput} was exhausted. Rider must pay remaining ₹${liveCalc.dueAmount}.`
                      : `₹${liveCalc.payableTotal} deducted from security deposit. Rider receives ₹${liveCalc.refundAmount} refund.`}
                  </p>
                </div>

                <div className="text-right font-mono self-end sm:self-auto">
                  <span className={`text-2xl sm:text-3xl font-black ${
                    liveCalc.settlementType === 'DUE_FROM_RIDER' ? 'text-red-400' : 'text-[#00D96B]'
                  }`}>
                    ₹{liveCalc.settlementType === 'DUE_FROM_RIDER' ? liveCalc.dueAmount : liveCalc.refundAmount}
                  </span>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    {liveCalc.settlementType === 'DUE_FROM_RIDER' ? 'Payable by Rider' : 'Refund to Rider'}
                  </span>
                </div>
              </div>

              {/* Payment Settlement Method Form (If not closed yet) */}
              {!isCompleted && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                        Refund / Payment Method
                      </label>
                      <select
                        value={paymentModeInput}
                        onChange={e => setPaymentModeInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-[#00D96B]"
                      >
                        <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                        <option value="Cash">Cash at Hub Counter</option>
                        <option value="Bank Transfer">Direct Bank Transfer / NEFT</option>
                        <option value="Card">Debit / Credit Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                        UTR / Transaction Reference No
                      </label>
                      <input
                        type="text"
                        value={paymentRefInput}
                        onChange={e => setPaymentRefInput(e.target.value)}
                        placeholder="e.g. UPI Ref # / Cash Receipt"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-[#00D96B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Hub Incharge Settlement Notes / Remarks
                    </label>
                    <textarea
                      rows={2}
                      value={settlementNotesInput}
                      onChange={e => setSettlementNotesInput(e.target.value)}
                      placeholder="e.g. Scooter inspected in presence of rider Rahul. Refund issued via UPI. Keys and helmet received in good shape."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>

                  {/* Approve & Settle Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleFinalizeSettlement}
                      disabled={submittingSettlement}
                      className="w-full py-4 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-[#00D96B]/25 transition cursor-pointer active:scale-98"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>{submittingSettlement ? 'Processing Settlement...' : 'APPROVE & CLOSE SCOOTY RETURN'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* If already completed, show settled summary */}
              {isCompleted && (
                <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#00D96B] font-bold">
                    <span>Return Closed & Settled</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <p className="text-slate-300">
                    Payment Mode: <b>{returnRecord.rider_payment_mode}</b> {returnRecord.rider_payment_reference ? `(Ref: ${returnRecord.rider_payment_reference})` : ''}
                  </p>
                  {returnRecord.settlement_notes && (
                    <p className="text-slate-400 italic">Notes: "{returnRecord.settlement_notes}"</p>
                  )}
                  {returnRecord.settled_at && (
                    <p className="text-[10px] text-slate-500 font-mono pt-1">
                      Settled on {new Date(returnRecord.settled_at).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Timeline & Technician info */}
          <div className="space-y-6">
            {/* Technician Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black text-slate-900">Inspection Technician</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {returnRecord.technician_name ? 'Assigned' : 'Unassigned'}
                </span>
              </div>

              {returnRecord.technician_name ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                      👨‍🔧
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{returnRecord.technician_name}</p>
                      <p className="text-[11px] text-slate-500">{returnRecord.technician_phone}</p>
                    </div>
                  </div>
                  {returnRecord.technician_code && (
                    <p className="text-[10px] font-mono text-slate-400">
                      Code: {returnRecord.technician_code}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-slate-500">No technician assigned yet.</p>
                  <button
                    onClick={() => {
                      setSelectedTechId(technicians[0]?.id || null);
                      setShowAssignModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                  >
                    Assign Technician Now
                  </button>
                </div>
              )}
            </div>

            {/* Lifecycle Timeline */}
            <div className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Return Ticket Lifecycle Log
                </h3>
              </div>

              <div className="space-y-4">
                {timeline.map((event, idx) => (
                  <div key={event.id || idx} className="flex gap-3 text-xs">
                    <div className="relative flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-[#EAFBF2] border border-[#00D96B]/50 flex items-center justify-center text-[#00A854] text-[10px] font-bold">
                        {idx + 1}
                      </div>
                      {idx !== timeline.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-200 my-1" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{event.title}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{event.description}</p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        By: {event.performed_by_name} ({event.performed_by_role})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Assign Tech */}
        {showAssignModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Assign Technician for Inspection</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {technicians.map(t => (
                  <label
                    key={t.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                      selectedTechId === t.id
                        ? 'bg-[#EAFBF2] border-[#00D96B] ring-1 ring-[#00D96B]/30'
                        : 'bg-slate-50 border-slate-200'
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
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-2xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignTechnician}
                  disabled={submittingAssign}
                  className="px-5 py-2 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs"
                >
                  {submittingAssign ? 'Assigning...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
