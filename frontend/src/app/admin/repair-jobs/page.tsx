'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/adminApi';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  CreditCard,
  UserCheck,
  Building,
  ArrowUpDown,
  Download,
  Eye,
  X,
  Play,
  Check,
  AlertCircle,
  Phone,
  ShieldCheck,
  FileText,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Boxes,
  Camera,
  Trash2,
  Calendar,
  Send,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Tag,
  User,
  CheckSquare,
  Square,
  ArrowRight,
  Package,
  ChevronDown,
  Star,
  MessageCircle
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
  repair_started_at?: string | null;
  repair_completed_at?: string | null;
  total_duration_seconds?: number;
  total_duration_formatted?: string | null;
  bill_amount?: number | null;
  bill_number?: string | null;
  payment_method?: 'Cash' | 'UPI' | null;
  payment_status?: 'Paid' | 'Pending' | 'Failed' | null;
  payment_amount?: number | null;
  payment_paid_at?: string | null;
  customer_rating?: number | null;
  customer_review?: string | null;
  customer_tags?: string[] | null;
  reviewed_at?: string | null;
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
  email?: string;
  hub_id: number;
  hub_name: string;
  specialization: string;
  status: 'Available' | 'Busy' | 'On Leave';
  active_jobs_count: number;
  rating: number;
}

interface InventoryItem {
  id: number;
  part_code: string;
  part_name: string;
  unit_price: number;
  quantity: number;
}

interface Stats {
  totalJobs: number;
  pendingInspection: number;
  technicianAssigned: number;
  partsApprovalPending: number;
  repairing: number;
  readyForBilling: number;
  paymentPending: number;
  completedClosed: number;
}

export default function RepairJobsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Active Role Simulation: Allows switching view between Super Admin and Hub Incharge
  const [activeRoleView, setActiveRoleView] = useState<'ADMIN' | 'HUB_INCHARGE'>('ADMIN');
  const [selectedHubFilter, setSelectedHubFilter] = useState<string>('all');
  const [selectedTechFilter, setSelectedTechFilter] = useState<string>('all');

  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    pendingInspection: 0,
    technicianAssigned: 0,
    partsApprovalPending: 0,
    repairing: 0,
    readyForBilling: 0,
    paymentPending: 0,
    completedClosed: 0
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [techFilterTab, setTechFilterTab] = useState<'ALL' | 'INSPECT' | 'APPROVAL' | 'REPAIRING' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Timer Heartbeat for Active Repairs
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modals state
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const [selectedJob, setSelectedJob] = useState<RepairJob | null>(null);
  const [detailedJobData, setDetailedJobData] = useState<any>(null);

  // 1. Create Job Form State
  const [newScooterNo, setNewScooterNo] = useState('');
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [newHubId, setNewHubId] = useState<number>(1);
  const [newComplaint, setNewComplaint] = useState('');
  const [newPriority, setNewPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [newTechId, setNewTechId] = useState<string>('');
  const [newJobDate, setNewJobDate] = useState<string>(new Date().toISOString().slice(0, 16));

  // 2. Assign Tech Form State
  const [assignTechId, setAssignTechId] = useState<number | ''>('');

  // 3. Inspection Form State
  const [inspectProblem, setInspectProblem] = useState('');
  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectEstTime, setInspectEstTime] = useState('1 hour');
  const [inspectParts, setInspectParts] = useState<Array<{ part_name: string; part_id: number; requested_quantity: number; unit_price: number; notes: string }>>([
    { part_name: '', part_id: 0, requested_quantity: 1, unit_price: 0, notes: '' }
  ]);

  // 4. Parts Approval Form State
  const [approvePartsList, setApprovePartsList] = useState<Array<{ id?: number; part_name: string; part_id: number; requested_quantity: number; approved_quantity: number; unit_price: number; notes: string }>>([]);
  const [approveLabourCharge, setApproveLabourCharge] = useState<number>(250);
  const [approveOtherCharge, setApproveOtherCharge] = useState<number>(0);
  const [approveNotes, setApproveNotes] = useState('');

  // 5. Complete Repair Form State
  const [completePartsList, setCompletePartsList] = useState<Array<{ id?: number; part_name: string; part_id: number; approved_quantity: number; replaced_quantity: number; unit_price: number; status: 'Replaced' | 'Not Replaced'; notes: string }>>([]);
  const [completeRemarks, setCompleteRemarks] = useState('');

  // 6. Billing Form State
  const [billLabourCharge, setBillLabourCharge] = useState<number>(250);
  const [billOtherCharge, setBillOtherCharge] = useState<number>(0);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [billNotes, setBillNotes] = useState('');

  // 7. Payment Form State
  const [payMethod, setPayMethod] = useState<'Cash' | 'UPI'>('UPI');
  const [payStatus, setPayStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [payTxnId, setPayTxnId] = useState('');
  const [payCashReceivedBy, setPayCashReceivedBy] = useState('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payNotes, setPayNotes] = useState('');

  // 8. Close Form State
  const [closeRemarks, setCloseRemarks] = useState('');
  const [closeOverridePayment, setCloseOverridePayment] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Jobs List
  const fetchJobs = async () => {
    try {
      setLoading(true);
      let queryUrl = `/admin/repair-jobs?search=${encodeURIComponent(search)}&priority=${priorityFilter}&payment_status=${paymentFilter}&sort_by=${sortBy}&sort_order=${sortOrder}`;
      
      if (selectedHubFilter !== 'all') {
        queryUrl += `&hub_id=${selectedHubFilter}`;
      }
      if (selectedTechFilter !== 'all') {
        queryUrl += `&technician_id=${selectedTechFilter}`;
      }
      if (statusTab !== 'All') {
        queryUrl += `&status=${encodeURIComponent(statusTab)}`;
      }

      const res = await adminApi.get(queryUrl);
      if (res && res.success) {
        setJobs(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.hubs) setHubs(res.hubs);
        if (res.technicians) setTechnicians(res.technicians);
      }
    } catch (err: any) {
      console.error('Error fetching repair jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Inventory for Auto-complete
  const fetchInventory = async () => {
    try {
      const res = await adminApi.get('/admin/inventory');
      if (res && res.success && res.data) {
        setInventoryList(res.data);
      }
    } catch (e) {
      console.warn('Inventory fetch error:', e);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchInventory();
  }, [search, selectedHubFilter, selectedTechFilter, statusTab, priorityFilter, paymentFilter, sortBy, sortOrder]);

  // Format Elapsed Live Time
  const getElapsedDuration = (startedAt: string | null | undefined): string => {
    if (!startedAt) return '00:00:00';
    const startMs = new Date(startedAt).getTime();
    const diffSec = Math.max(0, Math.floor((currentTimeMs - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // -------------------------------------------------------------
  // ACTION HANDLERS
  // -------------------------------------------------------------

  // 1. Create Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScooterNo || !newRiderName || !newRiderPhone || !newComplaint) {
      showToast('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        scooter_number: newScooterNo,
        rider_name: newRiderName,
        rider_contact: newRiderPhone,
        hub_id: newHubId,
        complaint: newComplaint,
        priority: newPriority,
        technician_id: newTechId ? Number(newTechId) : null,
        job_date: newJobDate
      };

      const res = await adminApi.post('/admin/repair-jobs', payload);
      if (res && res.success) {
        showToast(res.message || 'Job created successfully!');
        setShowCreateModal(false);
        // Reset
        setNewScooterNo('');
        setNewRiderName('');
        setNewRiderPhone('');
        setNewComplaint('');
        setNewPriority('Normal');
        setNewTechId('');
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to create job');
      }
    } catch (err: any) {
      showToast(err.message || 'Network error');
    }
  };

  // 2. Open Assign Technician Modal
  const openAssignModal = (job: RepairJob) => {
    setSelectedJob(job);
    setAssignTechId(job.technician_id || '');
    setShowAssignModal(true);
  };

  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !assignTechId) {
      showToast('Please select a technician');
      return;
    }

    try {
      const res = await adminApi.patch(`/admin/repair-jobs/${selectedJob.id}/assign-technician`, {
        technician_id: Number(assignTechId)
      });
      if (res && res.success) {
        showToast(res.message || 'Technician assigned successfully!');
        setShowAssignModal(false);
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to assign technician');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const shareReviewOnWhatsApp = (job: RepairJob) => {
    const cleanPhone = (job.rider_contact || '').replace(/\D/g, '');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://doon-riders.vercel.app';
    const reviewUrl = `${origin}/review/${job.job_number || job.id}`;
    
    const text = `Namaste ${job.rider_name || 'Rider'},\n\nYour DOON Riders EV service for Scooter *${job.scooter_number}* (Job #${job.job_number}) has been completed by Lead Technician *${job.technician_name || 'our service team'}*.\n\nPlease share your valuable feedback and rating for our technician here:\n${reviewUrl}\n\nThank you for choosing DOON Riders - Smart Electric Scooter Workshop!`;

    const waUrl = cleanPhone 
      ? `https://wa.me/91${cleanPhone.length === 10 ? cleanPhone : cleanPhone.slice(-10)}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    window.open(waUrl, '_blank');
  };

  // 3. Open Inspection Modal
  const openInspectModal = async (job: RepairJob) => {
    setSelectedJob(job);
    try {
      const res = await adminApi.get(`/admin/repair-jobs/${job.id}`);
      if (res && res.success) {
        const d = res.data;
        setDetailedJobData(d);
        if (d.inspection) {
          setInspectProblem(d.inspection.problem_found || '');
          setInspectNotes(d.inspection.inspection_notes || '');
          setInspectEstTime(d.inspection.estimated_repair_time || '1 hour');
        } else {
          setInspectProblem('');
          setInspectNotes('');
          setInspectEstTime('1 hour');
        }

        if (d.parts?.requested && d.parts.requested.length > 0) {
          setInspectParts(d.parts.requested.map((p: any) => ({
            part_name: p.part_name,
            part_id: p.part_id,
            requested_quantity: p.requested_quantity || 1,
            unit_price: p.unit_price || 0,
            notes: p.notes || ''
          })));
        } else {
          setInspectParts([{ part_name: '', part_id: 0, requested_quantity: 1, unit_price: 0, notes: '' }]);
        }
      }
    } catch (e) {
      console.warn(e);
    }
    setShowInspectModal(true);
  };

  const handleAddInspectPartRow = () => {
    setInspectParts([...inspectParts, { part_name: '', part_id: 0, requested_quantity: 1, unit_price: 0, notes: '' }]);
  };

  const handleRemoveInspectPartRow = (index: number) => {
    setInspectParts(inspectParts.filter((_, i) => i !== index));
  };

  const handleSelectInventoryForInspect = (index: number, partId: number) => {
    const found = inventoryList.find(p => p.id === partId);
    if (found) {
      const updated = [...inspectParts];
      updated[index].part_name = found.part_name;
      updated[index].part_id = found.id;
      updated[index].unit_price = found.unit_price;
      setInspectParts(updated);
    }
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    if (!inspectProblem.trim()) {
      showToast('Problem description is required');
      return;
    }

    try {
      setSubmitting(true);
      const validParts = inspectParts.filter(p => p.part_name.trim().length > 0);
      const payload = {
        problem_found: inspectProblem,
        inspection_notes: inspectNotes,
        estimated_repair_time: inspectEstTime,
        photos: [],
        required_parts: validParts
      };

      const res = await adminApi.post(`/admin/repair-jobs/${selectedJob.id}/inspection`, payload);
      if (res && res.success) {
        showToast(res.message || 'Inspection submitted successfully!');
        setShowInspectModal(false);
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to submit inspection');
      }
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Open Parts Approval Modal
  const openApproveModal = async (job: RepairJob) => {
    setSelectedJob(job);
    try {
      const res = await adminApi.get(`/admin/repair-jobs/${job.id}`);
      if (res && res.success) {
        const d = res.data;
        setDetailedJobData(d);
        const parts = d.parts?.all || [];
        setApprovePartsList(parts.map((p: any) => ({
          id: p.id,
          part_name: p.part_name,
          part_id: p.part_id,
          requested_quantity: p.requested_quantity || 1,
          approved_quantity: p.approved_quantity > 0 ? p.approved_quantity : p.requested_quantity || 1,
          unit_price: p.unit_price || 0,
          notes: p.notes || ''
        })));
        setApproveLabourCharge(250);
        setApproveOtherCharge(0);
        setApproveNotes('');
      }
    } catch (e) {
      console.warn(e);
    }
    setShowApproveModal(true);
  };

  const handleApprovePartsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const payload = {
        approved_parts: approvePartsList,
        labour_charge: approveLabourCharge,
        other_charge: approveOtherCharge,
        notes: approveNotes
      };

      const res = await adminApi.post(`/admin/repair-jobs/${selectedJob.id}/approve-parts`, payload);
      if (res && res.success) {
        showToast(res.message || 'Parts approved successfully!');
        setShowApproveModal(false);
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to approve parts');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // 5. Start Repair Handler
  const handleStartRepair = async (job: RepairJob) => {
    try {
      const res = await adminApi.post(`/admin/repair-jobs/${job.id}/start-repair`, {});
      if (res && res.success) {
        showToast(`Repair timer started for ${job.job_number}!`);
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to start repair');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // 6. Open Complete Repair Modal
  const openCompleteModal = async (job: RepairJob) => {
    setSelectedJob(job);
    try {
      const res = await adminApi.get(`/admin/repair-jobs/${job.id}`);
      if (res && res.success) {
        const d = res.data;
        setDetailedJobData(d);
        const parts = d.parts?.approved || d.parts?.all || [];
        setCompletePartsList(parts.map((p: any) => ({
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
      }
    } catch (e) {
      console.warn(e);
    }
    setShowCompleteModal(true);
  };

  const handleCompleteRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const payload = {
        actually_replaced_parts: completePartsList,
        technician_notes: completeRemarks,
        completion_photos: []
      };

      const res = await adminApi.post(`/admin/repair-jobs/${selectedJob.id}/complete-repair`, payload);
      if (res && res.success) {
        showToast(res.message || 'Repair marked completed! Ready for billing.');
        setShowCompleteModal(false);
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to complete repair');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // 7. Open Final Billing Modal
  const openBillModal = async (job: RepairJob) => {
    setSelectedJob(job);
    try {
      const res = await adminApi.get(`/admin/repair-jobs/${job.id}`);
      if (res && res.success) {
        const d = res.data;
        setDetailedJobData(d);
        if (d.bill) {
          setBillLabourCharge(d.bill.labour_charge || 250);
          setBillOtherCharge(d.bill.other_charge || 0);
          setBillDiscount(d.bill.discount || 0);
          setBillNotes(d.bill.notes || '');
        } else {
          setBillLabourCharge(250);
          setBillOtherCharge(0);
          setBillDiscount(0);
          setBillNotes('');
        }
      }
    } catch (e) {
      console.warn(e);
    }
    setShowBillModal(true);
  };

  const handleGenerateBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const replacedParts = detailedJobData?.parts?.replaced || detailedJobData?.parts?.all || [];
      const payload = {
        parts: replacedParts,
        labour_charge: billLabourCharge,
        other_charge: billOtherCharge,
        discount: billDiscount,
        notes: billNotes
      };

      const res = await adminApi.post(`/admin/repair-jobs/${selectedJob.id}/generate-bill`, payload);
      if (res && res.success) {
        showToast(res.message || 'Bill generated successfully!');
        setShowBillModal(false);
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to generate bill');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // 8. Open Payment Modal
  const openPaymentModal = async (job: RepairJob) => {
    setSelectedJob(job);
    try {
      const res = await adminApi.get(`/admin/repair-jobs/${job.id}`);
      if (res && res.success) {
        const d = res.data;
        setDetailedJobData(d);
        const billAmt = d.bill?.grand_total || job.bill_amount || 0;
        setPayAmount(billAmt);
        setPayMethod(d.payment?.payment_method || 'UPI');
        setPayStatus('Paid');
        setPayTxnId(d.payment?.transaction_id || `UPI/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Math.floor(100000 + Math.random() * 900000)}`);
        setPayCashReceivedBy(d.payment?.cash_received_by || user?.name || 'Hub Incharge');
        setPayNotes(d.payment?.notes || '');
      }
    } catch (e) {
      console.warn(e);
    }
    setShowPaymentModal(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const payload = {
        payment_method: payMethod,
        payment_status: payStatus,
        transaction_id: payMethod === 'UPI' ? payTxnId : null,
        cash_received_by: payMethod === 'Cash' ? payCashReceivedBy : null,
        amount: payAmount,
        notes: payNotes
      };

      const res = await adminApi.post(`/admin/repair-jobs/${selectedJob.id}/record-payment`, payload);
      if (res && res.success) {
        showToast(res.message || 'Payment recorded successfully!');
        setShowPaymentModal(false);
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to record payment');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // 9. Open Close Job Modal
  const openCloseModal = async (job: RepairJob) => {
    setSelectedJob(job);
    try {
      const res = await adminApi.get(`/admin/repair-jobs/${job.id}`);
      if (res && res.success) {
        setDetailedJobData(res.data);
      }
    } catch (e) {
      console.warn(e);
    }
    setCloseRemarks('');
    setCloseOverridePayment(false);
    setShowCloseModal(true);
  };

  const handleCloseJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    try {
      const payload = {
        override_payment: closeOverridePayment,
        remarks: closeRemarks
      };

      const res = await adminApi.post(`/admin/repair-jobs/${selectedJob.id}/close-job`, payload);
      if (res && res.success) {
        showToast(res.message || 'Job closed successfully!');
        setShowCloseModal(false);
        fetchJobs();
      } else {
        showToast(res.message || 'Failed to close job');
      }
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // CSV Export
  const exportCsv = () => {
    if (jobs.length === 0) {
      showToast('No jobs to export');
      return;
    }
    const headers = ['Job ID', 'Scooter No', 'Rider Name', 'Phone', 'Hub', 'Technician', 'Priority', 'Status', 'Duration', 'Bill Amount', 'Payment Method', 'Payment Status', 'Created At'];
    const rows = jobs.map(j => [
      j.job_number,
      j.scooter_number,
      `"${j.rider_name}"`,
      j.rider_contact,
      `"${j.hub_name}"`,
      `"${j.technician_name || 'Unassigned'}"`,
      j.priority,
      j.status,
      j.total_duration_formatted || '-',
      j.bill_amount ? `₹${j.bill_amount}` : '-',
      j.payment_method || '-',
      j.payment_status || '-',
      new Date(j.created_at).toLocaleString('en-IN')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DOON_Riders_Repair_Jobs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported repair jobs report to CSV!');
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string, job?: RepairJob) => {
    switch (status) {
      case 'Pending Inspection':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <span>Pending Inspection</span>
          </span>
        );
      case 'Technician Assigned':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <UserCheck className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <span>Tech Assigned</span>
          </span>
        );
      case 'Inspection Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
            <FileText className="w-3 h-3 text-purple-600 flex-shrink-0" />
            <span>Parts Approval Pending</span>
          </span>
        );
      case 'Repair Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap">
            <Check className="w-3 h-3 text-indigo-600 flex-shrink-0" />
            <span>Repair Approved</span>
          </span>
        );
      case 'Repairing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-300 shadow-xs animate-pulse whitespace-nowrap">
            <Wrench className="w-3.5 h-3.5 text-orange-600 animate-spin flex-shrink-0" style={{ animationDuration: '3s' }} />
            <span>Repairing ({getElapsedDuration(job?.repair_started_at)})</span>
          </span>
        );
      case 'Repair Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-teal-600 flex-shrink-0" />
            <span>Ready for Billing</span>
          </span>
        );
      case 'Billing Completed':
      case 'Payment Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
            <DollarSign className="w-3 h-3 text-rose-600 flex-shrink-0" />
            <span>Payment Pending</span>
          </span>
        );
      case 'Payment Received':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
            <span>Payment Received</span>
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300 whitespace-nowrap">
            <ShieldCheck className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <span>Closed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  // Status Filter Tabs List
  const STATUS_TABS = [
    { label: 'All Jobs', value: 'All', count: stats.totalJobs },
    { label: 'Pending Inspection', value: 'Pending Inspection', count: stats.pendingInspection },
    { label: 'Tech Assigned', value: 'Technician Assigned', count: stats.technicianAssigned },
    { label: 'Approval Pending', value: 'Inspection Completed', count: stats.partsApprovalPending },
    { label: 'Repairing', value: 'Repairing', count: stats.repairing },
    { label: 'Ready for Bill', value: 'Repair Completed', count: stats.readyForBilling },
    { label: 'Payment Pending', value: 'Payment Pending', count: stats.paymentPending },
    { label: 'Closed', value: 'Closed', count: stats.completedClosed }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#111827] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#00D96B]/40 flex items-center gap-3 animate-fadeIn">
            <div className="w-6 h-6 rounded-full bg-[#00D96B]/20 flex items-center justify-center text-[#00D96B]">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Top Header & Role Perspective */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854] shadow-sm">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-heading font-black text-[#111827] tracking-tight">
                    Job Assignment &amp; Repair Management
                  </h1>
                  <p className="text-xs text-[#667085]">
                    End-to-end electric scooter workshop workflow, live timers, multi-hub technician dispatch &amp; invoicing
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={exportCsv}
                className="px-3.5 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#344054] hover:bg-[#F7F9FA] flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-[#00D96B] hover:bg-[#00A854] text-white text-xs font-bold shadow-sm shadow-[#00D96B]/30 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Repair Job</span>
              </button>
            </div>
          </div>

          {/* Role Perspective Selector */}
          <div className="pt-3 border-t border-[#F2F4F7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F9FAFB] p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-[#475467]">
              <ShieldCheck className="w-4 h-4 text-[#00A854]" />
              <span className="font-bold text-[#111827]">Role Perspective:</span>
              <span className="text-[11px] text-[#667085]">Switch perspective to test role permissions:</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#E5E7EB]">
              {(['ADMIN', 'HUB_INCHARGE'] as const).map(role => (
                <button
                  key={role}
                  onClick={() => setActiveRoleView(role)}
                  className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    activeRoleView === role
                      ? 'bg-[#111827] text-white shadow-xs'
                      : 'text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  {role === 'ADMIN' && 'Super Admin'}
                  {role === 'HUB_INCHARGE' && 'Hub Incharge'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* FLEET MANAGEMENT WORKSPACE (SUPER ADMIN & HUB INCHARGE)   */}
        {/* ========================================================= */}
        <div className="space-y-6">
          {/* Top 8 KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-[#667085] tracking-wider uppercase">Total Jobs</span>
                <Wrench className="w-3.5 h-3.5 text-[#00A854]" />
              </div>
              <p className="text-xl font-heading font-black text-[#111827]">{stats.totalJobs}</p>
              <span className="text-[10px] text-[#667085]">All time service</span>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-amber-700 tracking-wider uppercase">Pending Insp.</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-xl font-heading font-black text-amber-700">{stats.pendingInspection}</p>
              <span className="text-[10px] text-amber-600">Needs check</span>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-blue-700 tracking-wider uppercase">Assigned</span>
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-xl font-heading font-black text-blue-700">{stats.technicianAssigned}</p>
              <span className="text-[10px] text-blue-600">With technician</span>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-purple-700 tracking-wider uppercase">Parts Approval</span>
                <FileText className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <p className="text-xl font-heading font-black text-purple-700">{stats.partsApprovalPending}</p>
              <span className="text-[10px] text-purple-600">Incharge approval</span>
            </div>

            <div className="bg-white border border-orange-200 bg-orange-50/40 rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-orange-700 tracking-wider uppercase">Repairing</span>
                <Wrench className="w-3.5 h-3.5 text-orange-600 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <p className="text-xl font-heading font-black text-orange-700">{stats.repairing}</p>
              <span className="text-[10px] text-orange-600 font-bold">Active Timers</span>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-teal-700 tracking-wider uppercase">Ready Bill</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-xl font-heading font-black text-teal-700">{stats.readyForBilling}</p>
              <span className="text-[10px] text-teal-600">Repair done</span>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-rose-700 tracking-wider uppercase">Pay Pending</span>
                <CreditCard className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <p className="text-xl font-heading font-black text-rose-700">{stats.paymentPending}</p>
              <span className="text-[10px] text-rose-600">Bill generated</span>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 shadow-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-extrabold text-emerald-700 tracking-wider uppercase">Closed</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-heading font-black text-emerald-700">{stats.completedClosed}</p>
              <span className="text-[10px] text-emerald-600">Handed over</span>
            </div>
          </div>

          {/* Filter Toolbar & Status Tabs */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm space-y-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#F2F4F7]">
              {STATUS_TABS.map(tab => {
                const active = statusTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setStatusTab(tab.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-[#111827] text-white shadow-sm'
                        : 'text-[#475467] hover:bg-[#F7F9FA] hover:text-[#111827]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-[#F2F4F7] text-[#667085]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              <div className="relative">
                <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Job ID, Scooter, Rider..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:ring-1 focus:ring-[#00D96B]"
                />
              </div>

              <div>
                <select
                  value={selectedHubFilter}
                  onChange={e => setSelectedHubFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                >
                  <option value="all">All Service Hubs ({hubs.length})</option>
                  {hubs.map(h => (
                    <option key={h.id} value={h.id}>{h.hub_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedTechFilter}
                  onChange={e => setSelectedTechFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                >
                  <option value="all">All Technicians ({technicians.length})</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.specialization.split(' ')[0]})</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                >
                  <option value="all">All Priorities</option>
                  <option value="Normal">Normal Priority</option>
                  <option value="Urgent">Urgent Priority</option>
                </select>
              </div>

              <div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="priority">Sort: Priority (Urgent First)</option>
                  <option value="duration">Sort: Repair Duration</option>
                  <option value="bill_amount">Sort: Bill Amount</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Fleet Management Jobs Data Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-sm text-[#111827]">Active Repair Workflows</span>
                <span className="text-xs bg-[#EAFBF2] text-[#00A854] font-bold px-2.5 py-0.5 rounded-full">
                  {jobs.length} Jobs Listed
                </span>
              </div>

              <button
                onClick={fetchJobs}
                className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#111827] hover:bg-[#F7F9FA] transition"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#667085] font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3.5 whitespace-nowrap">Job ID</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Scooter &amp; Rider</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Hub &amp; Technician</th>
                    <th className="py-3 px-3.5 min-w-[180px] max-w-[260px]">Complaint Description</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-center">Priority</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Current Status</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Repair Duration</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Bill &amp; Payment</th>
                    <th className="py-3 px-3.5 whitespace-nowrap text-right">Workflow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#667085]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 text-[#00A854] animate-spin" />
                          <span className="text-xs font-semibold">Loading repair jobs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#667085]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Wrench className="w-8 h-8 text-[#98A2B3]" />
                          <span className="text-sm font-bold text-[#111827]">No repair jobs found</span>
                          <p className="text-xs text-[#98A2B3]">Create a new repair job or adjust your search filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    jobs.map(job => (
                      <tr key={job.id} className="hover:bg-[#F9FAFB] transition-colors group">
                        {/* Job ID */}
                        <td className="py-3 px-3.5 font-mono font-bold text-xs text-[#111827] whitespace-nowrap">
                          <Link
                            href={`/admin/repair-jobs/${job.id}`}
                            className="text-[#00A854] hover:underline inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform whitespace-nowrap"
                          >
                            <span>{job.job_number}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </Link>
                          <span className="text-[10px] text-[#98A2B3] font-normal block whitespace-nowrap mt-0.5">
                            {new Date(job.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* Scooter & Rider */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-[#111827] text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold whitespace-nowrap">
                              {job.scooter_number}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-[#111827] mt-1 whitespace-nowrap">
                            {job.rider_name}
                          </div>
                          <div className="text-[10px] text-[#667085] flex items-center gap-1 mt-0.5 whitespace-nowrap">
                            <Phone className="w-3 h-3 text-[#00A854] flex-shrink-0" />
                            <span>{job.rider_contact}</span>
                          </div>
                        </td>

                        {/* Hub & Tech */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="text-xs font-semibold text-[#111827] flex items-center gap-1.5 whitespace-nowrap">
                            <Building className="w-3.5 h-3.5 text-[#667085] flex-shrink-0" />
                            <span>{job.hub_name}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {job.technician_name ? (
                              <>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#344054] bg-[#F2F4F7] px-2 py-0.5 rounded-md whitespace-nowrap">
                                  <UserCheck className="w-3 h-3 text-[#00A854] flex-shrink-0" />
                                  <span>{job.technician_name}</span>
                                </span>
                                {job.status !== 'Closed' && job.status !== 'Cancelled' && (
                                  <button
                                    onClick={() => openAssignModal(job)}
                                    title="Change / Reassign Technician"
                                    className="p-1 rounded text-[#0066FF] hover:bg-blue-50 text-[10px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    <span>Change</span>
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => openAssignModal(job)}
                                className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer whitespace-nowrap"
                              >
                                + Assign Tech
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Complaint */}
                        <td className="py-3 px-3.5 min-w-[180px] max-w-[260px]">
                          <p className="text-xs text-[#344054] line-clamp-2 leading-snug" title={job.complaint}>
                            {job.complaint}
                          </p>
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {job.priority === 'Urgent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
                              <AlertTriangle className="w-3 h-3 text-red-600 flex-shrink-0" />
                              <span>Urgent</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
                              Normal
                            </span>
                          )}
                        </td>

                        {/* Current Status */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="space-y-1">
                            {renderStatusBadge(job.status, job)}
                            {job.customer_rating && (
                              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-amber-800 text-[10px] font-bold w-fit">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>{job.customer_rating} ⭐ Rating</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {job.status === 'Repairing' ? (
                            <div className="font-mono text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 inline-flex items-center gap-1 animate-pulse whitespace-nowrap">
                              <Clock className="w-3 h-3 text-orange-600 animate-spin flex-shrink-0" />
                              <span>{getElapsedDuration(job.repair_started_at)}</span>
                            </div>
                          ) : job.total_duration_formatted ? (
                            <span className="text-xs font-semibold text-[#344054] whitespace-nowrap">
                              {job.total_duration_formatted}
                            </span>
                          ) : (
                            <span className="text-xs text-[#98A2B3] whitespace-nowrap">-</span>
                          )}
                        </td>

                        {/* Bill & Payment */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {job.bill_amount ? (
                            <div>
                              <span className="font-heading font-black text-xs text-[#111827] block whitespace-nowrap">
                                ₹{job.bill_amount.toLocaleString('en-IN')}
                              </span>
                              {job.payment_status === 'Paid' ? (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                  <span>Paid ({job.payment_method})</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-flex items-center gap-1 mt-0.5 whitespace-nowrap">
                                  <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                  <span>Unpaid</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#98A2B3] whitespace-nowrap">No bill yet</span>
                          )}
                        </td>

                        {/* Workflow Actions (Super Admin / Hub Incharge) */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {/* If unassigned, show assign button */}
                            {job.status === 'Pending Inspection' && !job.technician_id && (
                              <button
                                onClick={() => openAssignModal(job)}
                                className="px-3 py-1.5 rounded-lg bg-[#00D96B] hover:bg-[#00A854] text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap flex-shrink-0"
                              >
                                <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Assign Tech</span>
                              </button>
                            )}

                            {/* If assigned and awaiting inspection by technician */}
                            {(job.status === 'Pending Inspection' && job.technician_id) || job.status === 'Technician Assigned' ? (
                              <span className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200 inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                                <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span>Awaiting Inspection</span>
                              </span>
                            ) : null}

                            {/* Hub Incharge Parts Approval */}
                            {job.status === 'Inspection Completed' && (
                              <button
                                onClick={() => openApproveModal(job)}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700 text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                              >
                                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Approve Parts</span>
                              </button>
                            )}

                            {/* Repair Approved - Tech is ready */}
                            {job.status === 'Repair Approved' && (
                              <span className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 text-[11px] font-bold border border-indigo-200 inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                                <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                                <span>Tech Ready to Start</span>
                              </span>
                            )}

                            {/* Repairing in progress */}
                            {job.status === 'Repairing' && (
                              <span className="px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-800 text-[11px] font-bold border border-orange-200 inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                                <Wrench className="w-3.5 h-3.5 text-orange-600 animate-spin flex-shrink-0" />
                                <span>Repairing</span>
                              </span>
                            )}

                            {/* Repair Completed - Generate Bill */}
                            {job.status === 'Repair Completed' && (
                              <button
                                onClick={() => openBillModal(job)}
                                className="px-3 py-1.5 rounded-lg bg-[#111827] text-white hover:bg-black text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                              >
                                <DollarSign className="w-3.5 h-3.5 text-[#00D96B] flex-shrink-0" />
                                <span>Generate Bill</span>
                              </button>
                            )}

                            {/* WhatsApp Review Share for Completed Repairs */}
                            {(job.status === 'Repair Completed' ||
                              job.status === 'Billing Completed' ||
                              job.status === 'Payment Pending' ||
                              job.status === 'Payment Received' ||
                              job.status === 'Closed') && (
                              <button
                                onClick={() => shareReviewOnWhatsApp(job)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold shadow-xs transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap flex-shrink-0"
                                title="Share Review & Rating Link on WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5 fill-white flex-shrink-0" />
                                <span>WhatsApp Rating</span>
                              </button>
                            )}

                            {/* Billing Completed - Record Payment */}
                            {(job.status === 'Billing Completed' || job.status === 'Payment Pending') && (
                              <button
                                onClick={() => openPaymentModal(job)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                              >
                                <CreditCard className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Record Pay</span>
                              </button>
                            )}

                            {/* Payment Received - Close Job */}
                            {job.status === 'Payment Received' && (
                              <button
                                onClick={() => openCloseModal(job)}
                                className="px-3 py-1.5 rounded-lg bg-[#111827] text-white hover:bg-black text-xs font-bold shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-[#00D96B] flex-shrink-0" />
                                <span>Close Job</span>
                              </button>
                            )}

                            {/* Closed Job */}
                            {job.status === 'Closed' && (
                              <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 inline-flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                <span>Closed</span>
                              </span>
                            )}

                            {/* Details eye button */}
                            <Link
                              href={`/admin/repair-jobs/${job.id}`}
                              className="p-1.5 rounded-lg text-[#667085] hover:text-[#111827] hover:bg-[#F2F4F7] transition cursor-pointer flex-shrink-0"
                              title="View Full Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. CREATE NEW REPAIR JOB MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E7EB] space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#111827]">Create New Repair Job</h3>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-[#98A2B3] hover:text-[#111827] hover:bg-[#F2F4F7] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Scooter Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UK-07-EV-1008"
                    value={newScooterNo}
                    onChange={e => setNewScooterNo(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold uppercase focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Priority *</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  >
                    <option value="Normal">Normal Priority</option>
                    <option value="Urgent">Urgent Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Rider Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Sharma"
                    value={newRiderName}
                    onChange={e => setNewRiderName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Rider Contact *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98970 12345"
                    value={newRiderPhone}
                    onChange={e => setNewRiderPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Service Hub *</label>
                  <select
                    value={newHubId}
                    onChange={e => setNewHubId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  >
                    {hubs.map(h => (
                      <option key={h.id} value={h.id}>{h.hub_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Assign Technician (Optional)</label>
                  <select
                    value={newTechId}
                    onChange={e => setNewTechId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  >
                    <option value="">-- Assign Later --</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status}) - {t.active_jobs_count} active
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Complaint / Problem Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the issue reported by the rider (e.g., Brake lever loose, squeaking motor sound, dead headlight...)"
                  value={newComplaint}
                  onChange={e => setNewComplaint(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold text-[#475467] hover:bg-[#F2F4F7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00D96B] hover:bg-[#00A854] text-white text-xs font-bold shadow-sm shadow-[#00D96B]/30"
                >
                  Create Repair Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ASSIGN TECHNICIAN MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      {showAssignModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E5E7EB] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="font-heading font-black text-base text-[#111827]">
                  {selectedJob.technician_id ? 'Change / Reassign Technician' : 'Assign Technician'}
                </h3>
                <p className="text-xs text-[#00A854] font-bold">{selectedJob.job_number} ({selectedJob.scooter_number})</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-1.5 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignTechnician} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#344054] block">Select Certified Technician</label>
                {technicians.map(t => (
                  <label
                    key={t.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                      assignTechId === t.id
                        ? 'border-[#00D96B] bg-[#EAFBF2] shadow-xs'
                        : 'border-[#E5E7EB] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="technician"
                        checked={assignTechId === t.id}
                        onChange={() => setAssignTechId(t.id)}
                        className="text-[#00D96B] focus:ring-[#00D96B]"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#111827]">{t.name} ({t.technician_code})</p>
                        <p className="text-[11px] text-[#667085]">{t.specialization} • {t.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {t.status}
                      </span>
                      <span className="text-[10px] text-[#98A2B3] block mt-0.5">{t.active_jobs_count} active jobs</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475467]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00D96B] hover:bg-[#00A854] text-white text-xs font-bold"
                >
                  {selectedJob.technician_id ? 'Confirm Reassignment' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. TECHNICIAN INSPECTION MODAL                                 */}
      {/* ------------------------------------------------------------- */}
      {showInspectModal && selectedJob && (
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
                    {selectedJob.job_number} • Scooter: {selectedJob.scooter_number}
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
                    onClick={handleAddInspectPartRow}
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

                      {/* Part selector or text input */}
                      <div className="flex-1 min-w-0">
                        <select
                          value={part.part_id || ''}
                          onChange={e => handleSelectInventoryForInspect(idx, Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs bg-transparent border-0 focus:outline-none text-gray-900"
                        >
                          <option value="">-- Choose from Inventory or Type Custom --</option>
                          {inventoryList.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.part_name} (₹{inv.unit_price} • In Stock: {inv.quantity})
                            </option>
                          ))}
                        </select>
                        {!part.part_id && (
                          <input
                            type="text"
                            placeholder="Custom Part Name (e.g. Brake Pad)"
                            value={part.part_name}
                            onChange={e => {
                              const updated = [...inspectParts];
                              updated[idx].part_name = e.target.value;
                              setInspectParts(updated);
                            }}
                            className="w-full px-2 py-1 mt-1 text-xs border-t border-gray-100 focus:outline-none text-gray-900 placeholder:text-gray-400"
                          />
                        )}
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
                        onClick={() => handleRemoveInspectPartRow(idx)}
                        disabled={inspectParts.length === 1}
                        className="w-7 h-7 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition flex-shrink-0 cursor-pointer disabled:opacity-30"
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

      {/* ------------------------------------------------------------- */}
      {/* 4. PARTS APPROVAL MODAL (HUB INCHARGE)                         */}
      {/* ------------------------------------------------------------- */}
      {showApproveModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E5E7EB] space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#111827]">Parts & Labour Approval</h3>
                  <p className="text-xs text-[#667085]">
                    Hub Incharge Review • <span className="text-[#00A854] font-bold">{selectedJob.job_number}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowApproveModal(false)} className="p-1.5 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspection Findings Review */}
            {detailedJobData?.inspection && (
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs space-y-1">
                <span className="text-[10px] font-extrabold text-blue-700 uppercase">Technician Inspection Finding</span>
                <p className="text-[#111827] font-semibold">{detailedJobData.inspection.problem_found}</p>
                {detailedJobData.inspection.inspection_notes && (
                  <p className="text-[#667085] text-[11px]">Notes: {detailedJobData.inspection.inspection_notes}</p>
                )}
              </div>
            )}

            <form onSubmit={handleApprovePartsSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#344054] block">Review & Approve Requested Parts</label>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {approvePartsList.map((part, idx) => (
                    <div key={idx} className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                      <div className="sm:col-span-2">
                        <p className="text-xs font-bold text-[#111827]">{part.part_name}</p>
                        <span className="text-[10px] text-[#667085]">Requested: {part.requested_quantity} unit(s)</span>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#667085] block">Approve Qty</label>
                        <input
                          type="number"
                          min={0}
                          value={part.approved_quantity}
                          onChange={e => {
                            const updated = [...approvePartsList];
                            updated[idx].approved_quantity = Number(e.target.value);
                            setApprovePartsList(updated);
                          }}
                          className="w-full px-2 py-1 rounded-lg border text-xs text-center font-bold bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#667085] block">Unit Price (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={part.unit_price}
                          onChange={e => {
                            const updated = [...approvePartsList];
                            updated[idx].unit_price = Number(e.target.value);
                            setApprovePartsList(updated);
                          }}
                          className="w-full px-2 py-1 rounded-lg border text-xs font-bold bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Other Service Charges (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={approveOtherCharge}
                  onChange={e => setApproveOtherCharge(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              {/* Estimated Total Calculation */}
              <div className="bg-[#EAFBF2] p-3 rounded-xl border border-[#00D96B]/30 flex items-center justify-between text-xs">
                <span className="font-bold text-[#111827]">Estimated Repair Total:</span>
                <span className="text-base font-heading font-black text-[#00A854]">
                  ₹{(
                    approvePartsList.reduce((sum, p) => sum + p.approved_quantity * p.unit_price, 0) +
                    approveOtherCharge
                  ).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475467]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
                >
                  Approve Parts & Authorize Repair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. COMPLETE REPAIR MODAL (ACTUAL REPLACED PARTS CONFIRMATION) */}
      {/* ------------------------------------------------------------- */}
      {showCompleteModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E5E7EB] space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#111827]">Technician Repair Completion</h3>
                  <p className="text-xs text-[#667085]">
                    Confirm Actually Replaced Parts • <span className="text-[#00A854] font-bold">{selectedJob.job_number}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="p-1.5 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteRepairSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#344054]">Parts Actually Replaced *</label>
                  <span className="text-[11px] text-[#667085]">Confirm each component replaced</span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {completePartsList.map((part, idx) => (
                    <div key={idx} className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#111827]">{part.part_name}</p>
                        <span className="text-[10px] text-[#667085]">Approved Qty: {part.approved_quantity} • Unit Price: ₹{part.unit_price}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <input
                            type="number"
                            min={0}
                            placeholder="Replaced"
                            value={part.replaced_quantity}
                            onChange={e => {
                              const updated = [...completePartsList];
                              updated[idx].replaced_quantity = Number(e.target.value);
                              updated[idx].status = Number(e.target.value) > 0 ? 'Replaced' : 'Not Replaced';
                              setCompletePartsList(updated);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border text-xs text-center font-bold bg-white"
                          />
                        </div>

                        <select
                          value={part.status}
                          onChange={e => {
                            const updated = [...completePartsList];
                            updated[idx].status = e.target.value as any;
                            if (e.target.value === 'Not Replaced') updated[idx].replaced_quantity = 0;
                            setCompletePartsList(updated);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                            part.status === 'Replaced' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <option value="Replaced">Replaced</option>
                          <option value="Not Replaced">Not Replaced</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Final Technician Remarks & Safety Checks</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Brake test drive completed, throttle response normal, battery connections torqued."
                  value={completeRemarks}
                  onChange={e => setCompleteRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475467]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
                >
                  Submit Completion & Stop Timer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. FINAL BILLING MODAL (HUB INCHARGE)                          */}
      {/* ------------------------------------------------------------- */}
      {showBillModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#E5E7EB] space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#111827] text-[#00D96B] flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#111827]">Generate Final Invoice</h3>
                  <p className="text-xs text-[#667085]">
                    Invoice No: <span className="font-bold text-[#111827]">INV-{selectedJob.job_number}</span> • Rider: <span className="font-bold">{selectedJob.rider_name}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBillModal(false)} className="p-1.5 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateBillSubmit} className="space-y-4">
              {/* Replaced Parts Line Items */}
              <div className="border border-[#E5E7EB] rounded-2xl p-3 bg-[#F9FAFB] space-y-2">
                <span className="text-[10px] font-extrabold text-[#667085] uppercase tracking-wider block">Replaced Spare Parts Breakdown</span>
                <div className="divide-y divide-[#E5E7EB]">
                  {(detailedJobData?.parts?.replaced || []).map((p: any, idx: number) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#111827]">{p.part_name}</span>
                        <span className="text-[#667085] text-[11px] block">{p.replaced_quantity || 1} unit(s) × ₹{p.unit_price}</span>
                      </div>
                      <span className="font-bold text-[#111827]">
                        ₹{((p.replaced_quantity || 1) * p.unit_price).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                  {(detailedJobData?.parts?.replaced || []).length === 0 && (
                    <p className="py-2 text-xs text-[#667085] italic">No spare parts replaced (General Labour only)</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Other Charges (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={billOtherCharge}
                    onChange={e => setBillOtherCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={billDiscount}
                    onChange={e => setBillDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-bold text-red-600 focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              {/* Grand Total Highlight */}
              <div className="bg-[#111827] text-white p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#98A2B3] uppercase tracking-wider block">Grand Total Payable</span>
                  <span className="text-[11px] text-[#00D96B]">Includes all replaced parts & discounts</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-heading font-black text-[#00D96B]">
                    ₹{Math.max(
                      0,
                      (detailedJobData?.parts?.replaced || []).reduce((sum: number, p: any) => sum + (p.replaced_quantity || 1) * p.unit_price, 0) +
                        billOtherCharge -
                        billDiscount
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475467]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00D96B] hover:bg-[#00A854] text-white text-xs font-bold shadow-sm"
                >
                  Confirm & Generate Final Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. RECORD PAYMENT MODAL                                        */}
      {/* ------------------------------------------------------------- */}
      {showPaymentModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E5E7EB] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#111827]">Record Payment</h3>
                  <p className="text-xs text-[#00A854] font-bold">{selectedJob.job_number} • ₹{payAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1.5 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash at Hub Counter</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Payment Status</label>
                  <select
                    value={payStatus}
                    onChange={e => setPayStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  >
                    <option value="Paid">Payment Received (Paid)</option>
                    <option value="Pending">Payment Pending</option>
                  </select>
                </div>
              </div>

              {payMethod === 'UPI' ? (
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">UPI Transaction Reference ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UPI/20260928/988712398451"
                    value={payTxnId}
                    onChange={e => setPayTxnId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">Cash Received By *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karan Joshi (Hub Cashier)"
                    value={payCashReceivedBy}
                    onChange={e => setPayCashReceivedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Amount Collected (₹)</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-black text-[#111827] focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475467]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Save Payment & Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. CLOSE JOB SUMMARY MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {showCloseModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E7EB] space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#111827] text-[#00D96B] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-[#111827]">Close Repair Job</h3>
                  <p className="text-xs text-[#667085]">Final Vehicle Handover Confirmation</p>
                </div>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="p-1.5 text-[#98A2B3]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Final Summary Card */}
            <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-[#E5E7EB] space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#E5E7EB]">
                <div>
                  <span className="text-[#667085] text-[10px] uppercase block">Job ID</span>
                  <span className="font-mono font-bold text-[#111827]">{selectedJob.job_number}</span>
                </div>
                <div>
                  <span className="text-[#667085] text-[10px] uppercase block">Scooter</span>
                  <span className="font-bold text-[#111827]">{selectedJob.scooter_number}</span>
                </div>
                <div>
                  <span className="text-[#667085] text-[10px] uppercase block">Rider</span>
                  <span className="font-bold text-[#111827]">{selectedJob.rider_name}</span>
                </div>
                <div>
                  <span className="text-[#667085] text-[10px] uppercase block">Technician</span>
                  <span className="font-bold text-[#111827]">{selectedJob.technician_name || 'Assigned Tech'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[#667085] text-[10px] uppercase block">Repair Duration</span>
                  <span className="font-bold text-[#111827]">{selectedJob.total_duration_formatted || '1h 35m'}</span>
                </div>
                <div>
                  <span className="text-[#667085] text-[10px] uppercase block">Grand Total Paid</span>
                  <span className="font-bold text-[#00A854]">₹{selectedJob.bill_amount?.toLocaleString('en-IN') || '1,150'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleCloseJobSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Handover Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Scooter handed over to rider in 100% working condition."
                  value={closeRemarks}
                  onChange={e => setCloseRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-semibold focus:outline-none focus:border-[#00D96B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-[#475467]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-bold shadow-sm"
                >
                  Confirm & Close Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
