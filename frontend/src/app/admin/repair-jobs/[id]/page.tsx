'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi } from '../../../../lib/adminApi';
import {
  Wrench,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  CreditCard,
  ShieldCheck,
  Play,
  Check,
  Share2,
  Printer,
  Boxes,
  Eye,
  Camera,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  X,
  UserCheck,
  Tag,
  Package,
  ChevronDown
} from 'lucide-react';

interface RepairJob {
  id: number;
  job_number: string;
  scooter_id?: number | null;
  scooter_number: string;
  rider_name: string;
  rider_contact: string;
  hub_id: number;
  hub_name: string;
  technician_id?: number | null;
  technician_name?: string | null;
  technician_phone?: string | null;
  technician_code?: string | null;
  complaint: string;
  priority: 'Normal' | 'Urgent';
  status:
    | 'Pending Inspection'
    | 'Technician Assigned'
    | 'Inspection Completed'
    | 'Repair Approved'
    | 'Repairing'
    | 'Repair Completed'
    | 'Billing Completed'
    | 'Payment Pending'
    | 'Payment Received'
    | 'Closed'
    | 'Cancelled';
  created_by_id?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
}

interface RepairPart {
  id: number;
  job_id: number;
  part_id?: number;
  part_name: string;
  requested_quantity: number;
  approved_quantity: number;
  replaced_quantity: number;
  unit_price: number;
  total_price: number;
  status: 'Requested' | 'Approved' | 'Replaced' | 'Rejected' | 'Not Replaced';
  notes?: string;
}

interface TimelineEvent {
  id: number;
  job_id: number;
  event_type: string;
  title: string;
  description: string;
  performed_by_name: string;
  performed_by_role: string;
  created_at: string;
}

const WORKFLOW_STEPS = [
  { key: 'CREATED', label: 'Job Created', statuses: ['Pending Inspection', 'Technician Assigned', 'Inspection Completed', 'Repair Approved', 'Repairing', 'Repair Completed', 'Billing Completed', 'Payment Pending', 'Payment Received', 'Closed'] },
  { key: 'ASSIGNED', label: 'Tech Assigned', statuses: ['Technician Assigned', 'Inspection Completed', 'Repair Approved', 'Repairing', 'Repair Completed', 'Billing Completed', 'Payment Pending', 'Payment Received', 'Closed'] },
  { key: 'INSPECTED', label: 'Inspected', statuses: ['Inspection Completed', 'Repair Approved', 'Repairing', 'Repair Completed', 'Billing Completed', 'Payment Pending', 'Payment Received', 'Closed'] },
  { key: 'APPROVED', label: 'Parts Approved', statuses: ['Repair Approved', 'Repairing', 'Repair Completed', 'Billing Completed', 'Payment Pending', 'Payment Received', 'Closed'] },
  { key: 'REPAIRING', label: 'Repairing', statuses: ['Repairing', 'Repair Completed', 'Billing Completed', 'Payment Pending', 'Payment Received', 'Closed'] },
  { key: 'COMPLETED', label: 'Repair Done', statuses: ['Repair Completed', 'Billing Completed', 'Payment Pending', 'Payment Received', 'Closed'] },
  { key: 'BILLED', label: 'Bill Generated', statuses: ['Billing Completed', 'Payment Pending', 'Payment Received', 'Closed'] },
  { key: 'PAID', label: 'Payment Done', statuses: ['Payment Received', 'Closed'] },
  { key: 'CLOSED', label: 'Job Closed', statuses: ['Closed'] }
];

export default function RepairJobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [jobData, setJobData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'inspection' | 'parts' | 'repair' | 'billing' | 'payment' | 'timeline'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Timer Heartbeat
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Modals for in-page execution
  const [submitting, setSubmitting] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Modal Form States
  const [inspectProblem, setInspectProblem] = useState('');
  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectEstTime, setInspectEstTime] = useState('1 hour');
  const [inspectParts, setInspectParts] = useState<Array<{ part_name: string; part_id: number; requested_quantity: number; unit_price: number; notes: string }>>([]);

  const [approvePartsList, setApprovePartsList] = useState<Array<{ id?: number; part_name: string; part_id: number; requested_quantity: number; approved_quantity: number; unit_price: number; notes: string }>>([]);
  const [approveLabourCharge, setApproveLabourCharge] = useState<number>(250);
  const [approveOtherCharge, setApproveOtherCharge] = useState<number>(0);

  const [completePartsList, setCompletePartsList] = useState<Array<{ id?: number; part_name: string; part_id: number; approved_quantity: number; replaced_quantity: number; unit_price: number; status: 'Replaced' | 'Not Replaced'; notes: string }>>([]);
  const [completeRemarks, setCompleteRemarks] = useState('');

  const [billLabourCharge, setBillLabourCharge] = useState<number>(250);
  const [billOtherCharge, setBillOtherCharge] = useState<number>(0);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [billNotes, setBillNotes] = useState('');

  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI'>('UPI');
  const [payStatus, setPayStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [payTxnId, setPayTxnId] = useState('');
  const [payCashReceivedBy, setPayCashReceivedBy] = useState('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState('');

  const [closeRemarks, setCloseRemarks] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get(`/admin/repair-jobs/${jobId}`);
      if (res && res.success && res.data) {
        setJobData(res.data);
      } else {
        showToast('Job not found');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error loading job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) fetchJobDetails();
  }, [jobId]);

  const job: RepairJob = jobData?.job;
  const hub = jobData?.hub;
  const technician = jobData?.technician;
  const inspection = jobData?.inspection;
  const parts = jobData?.parts;
  const timing = jobData?.timing;
  const bill = jobData?.bill;
  const payment = jobData?.payment;
  const timeline: TimelineEvent[] = jobData?.timeline || [];

  // Elapsed Time Calculator
  const getElapsedDuration = (startedAt: string | null | undefined): string => {
    if (!startedAt) return '00:00:00';
    const startMs = new Date(startedAt).getTime();
    const diffSec = Math.max(0, Math.floor((currentTimeMs - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Step Status Helper
  const isStepCompleted = (stepStatuses: string[]) => {
    if (!job) return false;
    return stepStatuses.includes(job.status);
  };

  const isStepActive = (stepStatuses: string[]) => {
    if (!job) return false;
    return stepStatuses[0] === job.status;
  };

  // Quick Action Handlers
  const handleStartRepair = async () => {
    try {
      const res = await adminApi.post(`/admin/repair-jobs/${job.id}/start-repair`, {});
      if (res && res.success) {
        showToast('Repair timer started!');
        fetchJobDetails();
      } else {
        showToast(res.message || 'Failed to start repair');
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const openInspectModalHandler = () => {
    if (inspection) {
      setInspectProblem(inspection.problem_found || '');
      setInspectNotes(inspection.inspection_notes || '');
      setInspectEstTime(inspection.estimated_repair_time || '1 hour');
    }
    if (parts?.requested && parts.requested.length > 0) {
      setInspectParts(parts.requested.map((p: any) => ({
        part_name: p.part_name,
        part_id: p.part_id,
        requested_quantity: p.requested_quantity || 1,
        unit_price: p.unit_price || 0,
        notes: p.notes || ''
      })));
    } else {
      setInspectParts([{ part_name: '', part_id: 0, requested_quantity: 1, unit_price: 0, notes: '' }]);
    }
    setShowInspectModal(true);
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectProblem.trim()) {
      showToast('Problem description required');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        problem_found: inspectProblem,
        inspection_notes: inspectNotes,
        estimated_repair_time: inspectEstTime,
        photos: [],
        required_parts: inspectParts.filter(p => p.part_name.trim().length > 0)
      };
      const res = await adminApi.post(`/admin/repair-jobs/${job.id}/inspection`, payload);
      if (res && res.success) {
        showToast('Inspection submitted!');
        setShowInspectModal(false);
        fetchJobDetails();
      }
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openApproveModalHandler = () => {
    const list = parts?.all || [];
    setApprovePartsList(list.map((p: any) => ({
      id: p.id,
      part_name: p.part_name,
      part_id: p.part_id,
      requested_quantity: p.requested_quantity || 1,
      approved_quantity: p.approved_quantity > 0 ? p.approved_quantity : (p.requested_quantity || 1),
      unit_price: p.unit_price || 0,
      notes: p.notes || ''
    })));
    setApproveLabourCharge(250);
    setApproveOtherCharge(0);
    setShowApproveModal(true);
  };

  const handleApprovePartsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        approved_parts: approvePartsList,
        labour_charge: approveLabourCharge,
        other_charge: approveOtherCharge,
        notes: ''
      };
      const res = await adminApi.post(`/admin/repair-jobs/${job.id}/approve-parts`, payload);
      if (res && res.success) {
        showToast('Parts approved!');
        setShowApproveModal(false);
        fetchJobDetails();
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const openCompleteModalHandler = () => {
    const list = parts?.approved || parts?.all || [];
    setCompletePartsList(list.map((p: any) => ({
      id: p.id,
      part_name: p.part_name,
      part_id: p.part_id,
      approved_quantity: p.approved_quantity || p.requested_quantity || 1,
      replaced_quantity: p.replaced_quantity > 0 ? p.replaced_quantity : (p.approved_quantity || 1),
      unit_price: p.unit_price || 0,
      status: 'Replaced',
      notes: ''
    })));
    setCompleteRemarks('');
    setShowCompleteModal(true);
  };

  const handleCompleteRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        actually_replaced_parts: completePartsList,
        technician_notes: completeRemarks,
        completion_photos: []
      };
      const res = await adminApi.post(`/admin/repair-jobs/${job.id}/complete-repair`, payload);
      if (res && res.success) {
        showToast('Repair completed!');
        setShowCompleteModal(false);
        fetchJobDetails();
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const openBillModalHandler = () => {
    if (bill) {
      setBillLabourCharge(bill.labour_charge || 250);
      setBillOtherCharge(bill.other_charge || 0);
      setBillDiscount(bill.discount || 0);
      setBillNotes(bill.notes || '');
    } else {
      setBillLabourCharge(250);
      setBillOtherCharge(0);
      setBillDiscount(0);
      setBillNotes('');
    }
    setShowBillModal(true);
  };

  const handleGenerateBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const replacedParts = parts?.replaced || parts?.all || [];
      const payload = {
        parts: replacedParts,
        labour_charge: billLabourCharge,
        other_charge: billOtherCharge,
        discount: billDiscount,
        notes: billNotes
      };
      const res = await adminApi.post(`/admin/repair-jobs/${job.id}/generate-bill`, payload);
      if (res && res.success) {
        showToast('Invoice generated!');
        setShowBillModal(false);
        fetchJobDetails();
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const openPaymentModalHandler = () => {
    setPayAmount(bill?.grand_total || 0);
    setPayMethod(payment?.payment_method || 'UPI');
    setPayStatus('Paid');
    setPayTxnId(payment?.transaction_id || `UPI/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Math.floor(100000 + Math.random() * 900000)}`);
    setPayCashReceivedBy(payment?.cash_received_by || user?.name || 'Hub Incharge');
    setPayNotes(payment?.notes || '');
    setShowPaymentModal(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        payment_method: payMethod,
        payment_status: payStatus,
        transaction_id: payMethod === 'UPI' ? payTxnId : null,
        cash_received_by: payMethod === 'Cash' ? payCashReceivedBy : null,
        amount: payAmount,
        notes: payNotes
      };
      const res = await adminApi.post(`/admin/repair-jobs/${job.id}/record-payment`, payload);
      if (res && res.success) {
        showToast('Payment recorded!');
        setShowPaymentModal(false);
        fetchJobDetails();
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const openCloseModalHandler = () => {
    setCloseRemarks('');
    setShowCloseModal(true);
  };

  const handleCloseJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        override_payment: false,
        remarks: closeRemarks
      };
      const res = await adminApi.post(`/admin/repair-jobs/${job.id}/close-job`, payload);
      if (res && res.success) {
        showToast('Job closed successfully!');
        setShowCloseModal(false);
        fetchJobDetails();
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // WhatsApp Share Invoice
  const shareReceiptWhatsApp = () => {
    if (!job) return;
    const billAmt = bill?.grand_total || 0;
    const msg = encodeURIComponent(
      `*DOON RIDERS EV MOBILITY - SERVICE INVOICE*\n\n` +
      `*Job ID:* ${job.job_number}\n` +
      `*Scooter:* ${job.scooter_number}\n` +
      `*Rider:* ${job.rider_name}\n` +
      `*Service Hub:* ${job.hub_name}\n` +
      `*Technician:* ${job.technician_name || 'DOON Certified Tech'}\n\n` +
      `*Problem:* ${job.complaint}\n` +
      `*Repair Duration:* ${timing?.total_duration_formatted || 'Completed'}\n` +
      `*Total Amount:* ₹${billAmt.toLocaleString('en-IN')}\n` +
      `*Payment Status:* ${payment?.payment_status || 'Paid'}\n\n` +
      `Thank you for choosing DOON Riders Electric Mobility!`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-[#00A854] animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[#667085]">Loading Job Details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!job) {
    return (
      <AdminLayout>
        <div className="py-24 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[#111827]">Repair Job Not Found</h2>
          <p className="text-xs text-[#667085] mt-1 mb-4">The requested job ID could not be loaded.</p>
          <Link
            href="/admin/repair-jobs"
            className="px-4 py-2 rounded-xl bg-[#00D96B] text-white text-xs font-bold inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Jobs</span>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#111827] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#00D96B]/40 flex items-center gap-3 animate-fadeIn">
            <div className="w-6 h-6 rounded-full bg-[#00D96B]/20 flex items-center justify-center text-[#00D96B]">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Top Header Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/repair-jobs"
                className="p-2 rounded-xl border border-[#E5E7EB] text-[#667085] hover:text-[#111827] hover:bg-[#F7F9FA] transition cursor-pointer"
                title="Back to All Jobs"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-heading font-black text-xl text-[#111827] font-mono">
                    {job.job_number}
                  </h1>
                  <span className="bg-[#111827] text-[#00D96B] font-mono font-bold text-xs px-2.5 py-0.5 rounded-md">
                    {job.scooter_number}
                  </span>
                  {job.priority === 'Urgent' && (
                    <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                      URGENT
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  Rider: <span className="font-bold text-[#111827]">{job.rider_name}</span> ({job.rider_contact}) • Hub: <span className="font-bold">{job.hub_name}</span>
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => window.print()}
                className="p-2 rounded-xl border border-[#E5E7EB] text-[#344054] hover:bg-[#F7F9FA] text-xs font-bold transition flex items-center gap-1.5"
                title="Print Job Card / Invoice"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                onClick={shareReceiptWhatsApp}
                className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center gap-1.5"
                title="Share on WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              {/* Primary Contextual Action Button */}
              {job.status === 'Pending Inspection' && (
                <button
                  onClick={openInspectModalHandler}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Perform Inspection</span>
                </button>
              )}

              {job.status === 'Technician Assigned' && (
                <button
                  onClick={openInspectModalHandler}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Start Inspection</span>
                </button>
              )}

              {job.status === 'Inspection Completed' && (
                <button
                  onClick={openApproveModalHandler}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Review & Approve Parts</span>
                </button>
              )}

              {job.status === 'Repair Approved' && (
                <button
                  onClick={handleStartRepair}
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 animate-bounce"
                  style={{ animationDuration: '2s' }}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Repair Timer</span>
                </button>
              )}

              {job.status === 'Repairing' && (
                <button
                  onClick={openCompleteModalHandler}
                  className="px-4 py-2 rounded-xl bg-[#00D96B] hover:bg-[#00A854] text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Repair ({getElapsedDuration(timing?.repair_started_at)})</span>
                </button>
              )}

              {job.status === 'Repair Completed' && (
                <button
                  onClick={openBillModalHandler}
                  className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <DollarSign className="w-4 h-4 text-[#00D96B]" />
                  <span>Generate Final Bill</span>
                </button>
              )}

              {(job.status === 'Billing Completed' || job.status === 'Payment Pending') && (
                <button
                  onClick={openPaymentModalHandler}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Record Payment</span>
                </button>
              )}

              {job.status === 'Payment Received' && (
                <button
                  onClick={openCloseModalHandler}
                  className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-[#00D96B]" />
                  <span>Close & Handover Vehicle</span>
                </button>
              )}
            </div>
          </div>

          {/* Workflow Stepper Bar */}
          <div className="pt-2 border-t border-[#F2F4F7] overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 min-w-[700px]">
              {WORKFLOW_STEPS.map((step, idx) => {
                const done = isStepCompleted(step.statuses);
                const active = isStepActive(step.statuses);

                return (
                  <React.Fragment key={step.key}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        done
                          ? 'bg-[#00D96B] text-white shadow-xs'
                          : active
                          ? 'bg-orange-500 text-white animate-pulse'
                          : 'bg-[#F2F4F7] text-[#98A2B3]'
                      }`}>
                        {done ? <Check className="w-3 h-3 text-white stroke-[3]" /> : idx + 1}
                      </div>
                      <span className={`text-[11px] font-bold whitespace-nowrap ${
                        active
                          ? 'text-orange-600 underline'
                          : done
                          ? 'text-[#111827]'
                          : 'text-[#98A2B3]'
                      }`}>
                        {step.label}
                      </span>
                    </div>

                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 min-w-[16px] ${
                        done ? 'bg-[#00D96B]' : 'bg-[#E5E7EB]'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Repair Timer Banner (Active while repairing) */}
        {job.status === 'Repairing' && (
          <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Wrench className="w-6 h-6 text-white animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-orange-100 font-bold block">
                  Live Repair Timer Running
                </span>
                <h2 className="text-3xl font-heading font-black font-mono">
                  {getElapsedDuration(timing?.repair_started_at)}
                </h2>
                <p className="text-[11px] text-orange-100 mt-0.5">
                  Started at {timing?.repair_started_at ? new Date(timing.repair_started_at).toLocaleTimeString('en-IN') : 'Just now'} by {timing?.started_by_name || 'Technician'}
                </p>
              </div>
            </div>

            <button
              onClick={openCompleteModalHandler}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-heading font-black shadow-md transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Complete Repair & Stop Timer</span>
            </button>
          </div>
        )}

        {/* Main Grid: Left Tabs & Content (8 cols) + Right Activity Timeline (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Tabbed Sections */}
          <div className="lg:col-span-8 space-y-4">
            {/* Tab Navigation */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2 flex items-center gap-1 overflow-x-auto shadow-xs">
              {[
                { key: 'overview', label: 'Overview & Complaint', icon: Wrench },
                { key: 'inspection', label: 'Inspection Report', icon: FileText },
                { key: 'parts', label: 'Parts 3-Way Audit', icon: Boxes },
                { key: 'repair', label: 'Repair & Timing', icon: Clock },
                { key: 'billing', label: 'Final Billing', icon: DollarSign },
                { key: 'payment', label: 'Payment & Receipt', icon: CreditCard }
              ].map(t => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-[#111827] text-white shadow-xs'
                        : 'text-[#475467] hover:bg-[#F7F9FA] hover:text-[#111827]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW & COMPLAINT */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Complaint Card */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider">
                      Rider Complaint Description
                    </span>
                    <span className="text-xs font-bold text-[#00A854] bg-[#EAFBF2] px-2 py-0.5 rounded-full">
                      Recorded on Intake
                    </span>
                  </div>
                  <p className="text-sm text-[#111827] font-semibold leading-relaxed bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB]">
                    "{job.complaint}"
                  </p>
                </div>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Rider Profile Card */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
                    <div className="flex items-center gap-2 text-[#00A854]">
                      <User className="w-4 h-4" />
                      <span className="font-bold text-xs text-[#111827]">Rider Profile</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="text-[#667085]">Name: <span className="font-bold text-[#111827]">{job.rider_name}</span></p>
                      <p className="text-[#667085]">Contact: <span className="font-bold text-[#111827]">{job.rider_contact}</span></p>
                      <p className="text-[#667085]">Scooter: <span className="font-bold font-mono text-[#111827]">{job.scooter_number}</span></p>
                    </div>
                  </div>

                  {/* Assigned Tech & Hub */}
                  <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Building className="w-4 h-4" />
                      <span className="font-bold text-xs text-[#111827]">Service Hub & Technician</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="text-[#667085]">Hub: <span className="font-bold text-[#111827]">{job.hub_name}</span></p>
                      <p className="text-[#667085]">Technician: <span className="font-bold text-[#111827]">{job.technician_name || 'Unassigned'}</span></p>
                      <p className="text-[#667085]">Specialization: <span className="font-semibold text-[#344054]">{technician?.specialization || 'General EV Tech'}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INSPECTION REPORT */}
            {activeTab === 'inspection' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-heading font-black text-sm text-[#111827]">Technician Diagnostic Check</h3>
                  </div>
                  {inspection && (
                    <span className="text-xs text-[#667085]">
                      Inspected on {new Date(inspection.inspected_at).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {inspection ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Problem Found</span>
                      <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-[#111827] font-semibold">
                        {inspection.problem_found}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Inspection Notes</span>
                        <p className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB] text-[#344054]">
                          {inspection.inspection_notes || 'No extra notes recorded.'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block mb-1">Estimated Repair Time</span>
                        <p className="bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB] text-[#344054] font-bold">
                          ⏱️ {inspection.estimated_repair_time || '1 hour'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[#667085] space-y-2">
                    <FileText className="w-8 h-8 text-[#98A2B3] mx-auto" />
                    <p className="text-xs font-semibold">Inspection has not been completed yet.</p>
                    <button
                      onClick={openInspectModalHandler}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                    >
                      Perform Inspection Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PARTS 3-WAY AUDIT (REQUESTED vs APPROVED vs ACTUALLY REPLACED) */}
            {activeTab === 'parts' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-[#00A854]" />
                    <div>
                      <h3 className="font-heading font-black text-sm text-[#111827]">Parts 3-Way Audit Trail</h3>
                      <p className="text-[11px] text-[#667085]">Requested by Tech vs Approved by Incharge vs Actually Installed</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#667085] font-extrabold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Spare Part</th>
                        <th className="py-2.5 px-3 text-center">1. Requested</th>
                        <th className="py-2.5 px-3 text-center">2. Approved</th>
                        <th className="py-2.5 px-3 text-center">3. Actually Replaced</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {(parts?.all || []).map((p: RepairPart, idx: number) => (
                        <tr key={idx} className="hover:bg-[#F9FAFB]">
                          <td className="py-3 px-3 font-semibold text-[#111827]">
                            {p.part_name}
                            {p.notes && <span className="text-[10px] text-[#667085] block">{p.notes}</span>}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-[#667085]">
                            {p.requested_quantity || 0}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-purple-700">
                            {p.approved_quantity || 0}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-700">
                            {p.replaced_quantity || 0}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-[#344054]">
                            ₹{p.unit_price}
                          </td>
                          <td className="py-3 px-3 text-right font-heading font-black text-[#111827]">
                            ₹{((p.replaced_quantity > 0 ? p.replaced_quantity : p.approved_quantity) * p.unit_price).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      {(parts?.all || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#98A2B3]">
                            No parts requested or replaced for this job.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: REPAIR & TIMING */}
            {activeTab === 'repair' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <h3 className="font-heading font-black text-sm text-[#111827]">Repair Execution & Timers</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#F9FAFB] p-3.5 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] font-extrabold text-[#667085] uppercase block">Started At</span>
                    <span className="font-bold text-xs text-[#111827]">
                      {timing?.repair_started_at ? new Date(timing.repair_started_at).toLocaleString('en-IN') : 'Not Started'}
                    </span>
                  </div>

                  <div className="bg-[#F9FAFB] p-3.5 rounded-xl border border-[#E5E7EB]">
                    <span className="text-[10px] font-extrabold text-[#667085] uppercase block">Completed At</span>
                    <span className="font-bold text-xs text-[#111827]">
                      {timing?.repair_completed_at ? new Date(timing.repair_completed_at).toLocaleString('en-IN') : (job.status === 'Repairing' ? 'In Progress' : 'Pending')}
                    </span>
                  </div>

                  <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-200">
                    <span className="text-[10px] font-extrabold text-orange-700 uppercase block">Total Duration</span>
                    <span className="font-heading font-black text-base text-orange-700">
                      {job.status === 'Repairing' ? getElapsedDuration(timing?.repair_started_at) : (timing?.total_duration_formatted || '-')}
                    </span>
                  </div>
                </div>

                {timing?.technician_notes && (
                  <div>
                    <span className="text-[10px] font-extrabold text-[#667085] uppercase block mb-1">Technician Final Notes</span>
                    <p className="bg-[#F9FAFB] p-3.5 rounded-xl border border-[#E5E7EB] text-xs text-[#344054]">
                      {timing.technician_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: FINAL BILLING */}
            {activeTab === 'billing' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#00A854]" />
                    <h3 className="font-heading font-black text-sm text-[#111827]">Tax Invoice & Billing Summary</h3>
                  </div>
                  {bill && (
                    <span className="font-mono font-bold text-xs text-[#111827] bg-[#F2F4F7] px-2.5 py-1 rounded-lg">
                      {bill.bill_number}
                    </span>
                  )}
                </div>

                {bill ? (
                  <div className="space-y-4 text-xs">
                    <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] space-y-2">
                      <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                        <span className="text-[#667085]">Spare Parts Total:</span>
                        <span className="font-bold text-[#111827]">₹{bill.parts_total.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                        <span className="text-[#667085]">Labour / Service Charges:</span>
                        <span className="font-bold text-[#111827]">₹{bill.labour_charge.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#E5E7EB]">
                        <span className="text-[#667085]">Other Diagnostic Charges:</span>
                        <span className="font-bold text-[#111827]">₹{bill.other_charge.toLocaleString('en-IN')}</span>
                      </div>
                      {bill.discount > 0 && (
                        <div className="flex justify-between py-1 border-b border-[#E5E7EB] text-red-600">
                          <span>Discount Applied:</span>
                          <span className="font-bold">-₹{bill.discount.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 text-sm font-heading font-black text-[#111827]">
                        <span>Grand Total:</span>
                        <span className="text-[#00A854] text-lg">₹{bill.grand_total.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-[#667085] space-y-2">
                    <DollarSign className="w-8 h-8 text-[#98A2B3] mx-auto" />
                    <p className="text-xs font-semibold">Bill has not been generated yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: PAYMENT & RECEIPT */}
            {activeTab === 'payment' && (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-heading font-black text-sm text-[#111827]">Payment & Settlement Details</h3>
                  </div>
                  {payment?.payment_status === 'Paid' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Paid in Full</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending Payment</span>
                    </span>
                  )}
                </div>

                {payment ? (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#F9FAFB] p-3.5 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[10px] font-extrabold text-[#667085] uppercase block">Payment Method</span>
                      <span className="font-bold text-sm text-[#111827]">{payment.payment_method}</span>
                    </div>

                    <div className="bg-[#F9FAFB] p-3.5 rounded-xl border border-[#E5E7EB]">
                      <span className="text-[10px] font-extrabold text-[#667085] uppercase block">Amount</span>
                      <span className="font-heading font-black text-sm text-[#00A854]">₹{payment.amount?.toLocaleString('en-IN')}</span>
                    </div>

                    {payment.transaction_id && (
                      <div className="col-span-2 bg-[#F9FAFB] p-3.5 rounded-xl border border-[#E5E7EB]">
                        <span className="text-[10px] font-extrabold text-[#667085] uppercase block">UPI Transaction Reference</span>
                        <span className="font-mono font-bold text-xs text-[#111827]">{payment.transaction_id}</span>
                      </div>
                    )}

                    {payment.cash_received_by && (
                      <div className="col-span-2 bg-[#F9FAFB] p-3.5 rounded-xl border border-[#E5E7EB]">
                        <span className="text-[10px] font-extrabold text-[#667085] uppercase block">Cash Received By</span>
                        <span className="font-bold text-xs text-[#111827]">{payment.cash_received_by}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[#667085] space-y-2">
                    <CreditCard className="w-8 h-8 text-[#98A2B3] mx-auto" />
                    <p className="text-xs font-semibold">No payment recorded yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Activity Timeline & Quick Summary (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Quick Status Card */}
            <div className="bg-[#111827] text-white rounded-2xl p-5 shadow-sm space-y-3">
              <span className="text-[10px] font-extrabold text-[#00D96B] uppercase tracking-wider block">
                Workflow Status
              </span>
              <div className="flex items-center justify-between">
                <span className="font-heading font-black text-base">{job.status}</span>
                <span className="text-xs font-bold text-gray-300 font-mono">
                  {timing?.total_duration_formatted || (job.status === 'Repairing' ? getElapsedDuration(timing?.repair_started_at) : '')}
                </span>
              </div>
            </div>

            {/* Vertical Activity Timeline */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                <Clock className="w-4 h-4 text-[#00A854]" />
                <h3 className="font-heading font-black text-xs text-[#111827] uppercase tracking-wider">
                  Audit Activity Timeline
                </h3>
              </div>

              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
                {timeline.map((event, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#00D96B] border-2 border-white shadow-xs" />
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#111827]">{event.title}</span>
                        <span className="text-[10px] text-[#98A2B3]">
                          {new Date(event.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#475467] mt-0.5 leading-relaxed">{event.description}</p>
                      <span className="text-[9px] text-[#98A2B3] font-semibold block mt-1">
                        By {event.performed_by_name} ({event.performed_by_role})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODALS IN PAGE                                                */}
      {/* ------------------------------------------------------------- */}
      {/* 1. Inspection Modal */}
      {showInspectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-gray-100 space-y-3.5 my-4 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 tracking-tight">
                    Technician Inspection Form
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {job?.job_number} • Scooter: {job?.scooter_number}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInspectModal(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-3">
              {/* Problem Found */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-900 mb-1">
                  PROBLEM FOUND <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-2.5 top-2.5 w-6 h-6 bg-gray-50 border border-gray-100 rounded-md flex items-center justify-center text-gray-400 pointer-events-none">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <textarea
                    required
                    rows={2}
                    placeholder="Describe exact mechanical / electrical fault found during diagnostic inspection..."
                    value={inspectProblem}
                    onChange={e => setInspectProblem(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D96B] focus:border-transparent text-gray-900 placeholder:text-gray-400 resize-y leading-relaxed transition"
                  />
                </div>
              </div>

              {/* Inspection Notes */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-900 mb-1">
                  INSPECTION NOTES
                </label>
                <div className="relative">
                  <div className="absolute left-2.5 top-2.5 w-6 h-6 bg-gray-50 border border-gray-100 rounded-md flex items-center justify-center text-gray-400 pointer-events-none">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="General observations, diagnostic test results, safety checklist notes..."
                    value={inspectNotes}
                    onChange={e => setInspectNotes(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D96B] focus:border-transparent text-gray-900 placeholder:text-gray-400 resize-y leading-relaxed transition"
                  />
                </div>
              </div>

              {/* Required Parts List */}
              <div className="bg-[#F8F9FA] rounded-xl p-3 border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-900">
                    PARTS REQUIRED
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setInspectParts([
                        ...inspectParts,
                        { part_name: '', part_id: 0, requested_quantity: 1, unit_price: 0, notes: '' }
                      ]);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#00A854] text-[#00A854] hover:bg-emerald-50 text-[11px] font-bold transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>Add Another Part</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                  {inspectParts.map((part, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-lg border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                    >
                      {/* Package Icon */}
                      <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                        <Package className="w-3.5 h-3.5" />
                      </div>

                      {/* Part Name Input */}
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          placeholder="Part name (e.g. Brake Pad, Cable)"
                          value={part.part_name}
                          onChange={e => {
                            const updated = [...inspectParts];
                            updated[idx].part_name = e.target.value;
                            setInspectParts(updated);
                          }}
                          className="w-full px-2 py-1 text-xs bg-transparent border-0 focus:outline-none text-gray-900 placeholder:text-gray-400"
                        />
                      </div>

                      {/* Modern Quantity Stepper: [-] [ 1 ] [+] */}
                      <div className="flex items-center border border-gray-200 rounded-md bg-white overflow-hidden flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...inspectParts];
                            updated[idx].requested_quantity = Math.max(1, (updated[idx].requested_quantity || 1) - 1);
                            setInspectParts(updated);
                          }}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-bold transition text-xs border-r border-gray-200 cursor-pointer select-none"
                        >
                          −
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-gray-900 select-none">
                          {part.requested_quantity || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...inspectParts];
                            updated[idx].requested_quantity = (updated[idx].requested_quantity || 1) + 1;
                            setInspectParts(updated);
                          }}
                          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-bold transition text-xs border-l border-gray-200 cursor-pointer select-none"
                        >
                          +
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (inspectParts.length === 1) {
                            setInspectParts([{ part_name: '', part_id: 0, requested_quantity: 1, unit_price: 0, notes: '' }]);
                          } else {
                            setInspectParts(inspectParts.filter((_, i) => i !== idx));
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition flex-shrink-0 cursor-pointer"
                        title="Remove part"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estimated Repair Time */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-900 mb-1">
                  ESTIMATED REPAIR TIME
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <select
                    value={inspectEstTime}
                    onChange={e => setInspectEstTime(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D96B] focus:border-transparent text-gray-900 appearance-none cursor-pointer"
                  >
                    <option value="30 mins">30 minutes</option>
                    <option value="45 mins">45 minutes</option>
                    <option value="1 hour">1 hour</option>
                    <option value="1.5 hours">1.5 hours</option>
                    <option value="2 hours">2 hours</option>
                    <option value="3+ hours">3+ hours</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center justify-center">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowInspectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 bg-[#00A854] hover:bg-[#008744] text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider shadow-sm transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{submitting ? 'Submitting...' : 'SUBMIT INSPECTION'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <h3 className="font-heading font-black text-base text-[#111827]">Approve Parts</h3>
            <form onSubmit={handleApprovePartsSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Labour Charge (₹)</label>
                  <input
                    type="number"
                    value={approveLabourCharge}
                    onChange={e => setApproveLabourCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Other Charge (₹)</label>
                  <input
                    type="number"
                    value={approveOtherCharge}
                    onChange={e => setApproveOtherCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowApproveModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold">Approve</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <h3 className="font-heading font-black text-base text-[#111827]">Complete Repair</h3>
            <form onSubmit={handleCompleteRepairSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Technician Remarks</label>
                <input
                  type="text"
                  placeholder="All mechanical tests passed"
                  value={completeRemarks}
                  onChange={e => setCompleteRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold">Complete</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Billing Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <h3 className="font-heading font-black text-base text-[#111827]">Generate Bill</h3>
            <form onSubmit={handleGenerateBillSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold block mb-1">Labour (₹)</label>
                  <input
                    type="number"
                    value={billLabourCharge}
                    onChange={e => setBillLabourCharge(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl border text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold block mb-1">Other (₹)</label>
                  <input
                    type="number"
                    value={billOtherCharge}
                    onChange={e => setBillOtherCharge(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl border text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold block mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={billDiscount}
                    onChange={e => setBillDiscount(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-xl border text-xs font-bold text-red-600"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowBillModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#00D96B] text-white rounded-xl text-xs font-bold">Generate Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <h3 className="font-heading font-black text-base text-[#111827]">Record Payment</h3>
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Cash">Cash at Hub Counter</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border space-y-4">
            <h3 className="font-heading font-black text-base text-[#111827]">Close Job</h3>
            <form onSubmit={handleCloseJobSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Handover Remarks</label>
                <input
                  type="text"
                  placeholder="Vehicle handed over to rider."
                  value={closeRemarks}
                  onChange={e => setCloseRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCloseModal(false)} className="px-4 py-2 border rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#111827] text-white rounded-xl text-xs font-bold">Confirm & Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
