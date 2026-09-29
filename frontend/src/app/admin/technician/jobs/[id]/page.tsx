'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '../../../../../components/admin/AdminLayout';
import { useAuth } from '../../../../../context/AuthContext';
import { adminApi } from '../../../../../lib/adminApi';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Check,
  Phone,
  Building,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  AlertCircle,
  FileText,
  User,
  CheckSquare,
  Square,
  Bike,
  ShieldAlert,
  Package,
  ChevronDown
} from 'lucide-react';

export default function TechnicianJobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const jobId = params?.id as string;

  const [jobData, setJobData] = useState<any>(null);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Modals
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showAddPartModal, setShowAddPartModal] = useState(false);

  // Step 1: Inspection Form State
  const [inspectProblem, setInspectProblem] = useState('');
  const [inspectNotes, setInspectNotes] = useState('');
  const [inspectEstTime, setInspectEstTime] = useState('1 hour');
  const [inspectParts, setInspectParts] = useState<
    Array<{ part_name: string; part_id: number; quantity: number; notes: string }>
  >([{ part_name: '', part_id: 0, quantity: 1, notes: '' }]);
  const [inspectPhotos, setInspectPhotos] = useState<string[]>([]);

  // Step 2 (Mid-Repair): Additional Part Form State
  const [addPartName, setAddPartName] = useState('');
  const [addPartId, setAddPartId] = useState(0);
  const [addPartQty, setAddPartQty] = useState(1);
  const [addPartNotes, setAddPartNotes] = useState('');

  // Step 3: Complete Work Form State
  const [confirmReplacedParts, setConfirmReplacedParts] = useState<
    Array<{ id?: number; part_name: string; quantity: number; is_replaced: boolean; notes: string }>
  >([]);
  const [additionalParts, setAdditionalParts] = useState<
    Array<{ part_name: string; quantity: number; notes: string }>
  >([]);
  const [finalWorkNotes, setFinalWorkNotes] = useState('');
  const [completePhotos, setCompletePhotos] = useState<string[]>([]);

  // Live Timer Heartbeat
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch Job details
  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get(`/admin/repair-jobs/${jobId}`);
      if (res && res.success && res.data) {
        setJobData(res.data);

        if (res.data.inspection) {
          setInspectProblem(res.data.inspection.problem_found || '');
          setInspectNotes(res.data.inspection.inspection_notes || '');
          setInspectEstTime(res.data.inspection.estimated_repair_time || '1 hour');
        }

        const existingParts = res.data.parts?.all || [];
        if (existingParts.length > 0) {
          setConfirmReplacedParts(
            existingParts.map((p: any) => ({
              id: p.id,
              part_name: p.part_name,
              quantity: p.approved_quantity || p.requested_quantity || p.quantity || 1,
              is_replaced: p.status === 'Replaced' || (p.replaced_quantity && p.replaced_quantity > 0) ? true : true,
              notes: p.notes || ''
            }))
          );
        }
      }
    } catch (err) {
      console.error('Failed to load repair job details', err);
      showToast('Error loading job details. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await adminApi.get('/admin/inventory');
      if (res && res.success && res.data) {
        setInventoryList(res.data);
      }
    } catch (err) {
      console.warn('Inventory fetch error', err);
    }
  };

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
      fetchInventory();
    }
  }, [jobId]);

  const hasAutoOpenedRef = useRef<string | null>(null);
  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'inspect' && jobData && hasAutoOpenedRef.current !== 'inspect') {
      if (jobData.job?.status === 'Pending Inspection' || jobData.job?.status === 'Technician Assigned') {
        setShowInspectModal(true);
        hasAutoOpenedRef.current = 'inspect';
      }
    } else if (action === 'complete' && jobData && jobData.job?.status === 'Repairing' && hasAutoOpenedRef.current !== 'complete') {
      setShowCompleteModal(true);
      hasAutoOpenedRef.current = 'complete';
    }
  }, [searchParams, jobData]);

  const handleCloseInspectModal = () => {
    setShowInspectModal(false);
    hasAutoOpenedRef.current = 'closed_inspect';
    if (searchParams?.get('action')) {
      router.replace(`/admin/technician/jobs/${jobId}`, { scroll: false });
    }
  };

  const handleCloseCompleteModal = () => {
    setShowCompleteModal(false);
    hasAutoOpenedRef.current = 'closed_complete';
    if (searchParams?.get('action')) {
      router.replace(`/admin/technician/jobs/${jobId}`, { scroll: false });
    }
  };

  const getElapsedDuration = (startedAt: string | null | undefined): string => {
    if (!startedAt) return '00:00:00';
    const startMs = new Date(startedAt).getTime();
    const diffSec = Math.max(0, Math.floor((currentTimeMs - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const job = jobData?.job;
  const inspection = jobData?.inspection;
  const parts = jobData?.parts;
  const timing = jobData?.timing;

  const isInspectionPending =
    job?.status === 'Pending Inspection' || job?.status === 'Technician Assigned';
  const isApprovalPending = job?.status === 'Inspection Completed';
  const isRepairApproved = job?.status === 'Repair Approved';
  const isRepairing = job?.status === 'Repairing';
  const isWorkCompleted =
    job?.status === 'Repair Completed' ||
    job?.status === 'Billing Completed' ||
    job?.status === 'Payment Pending' ||
    job?.status === 'Payment Received' ||
    job?.status === 'Closed';

  const handleAddInspectPart = () => {
    setInspectParts([
      ...inspectParts,
      { part_name: '', part_id: 0, quantity: 1, notes: '' }
    ]);
  };

  const handleRemoveInspectPart = (index: number) => {
    if (inspectParts.length === 1) {
      setInspectParts([{ part_name: '', part_id: 0, quantity: 1, notes: '' }]);
    } else {
      setInspectParts(inspectParts.filter((_, i) => i !== index));
    }
  };

  const handleSelectInventoryPart = (index: number, partName: string) => {
    const matched = inventoryList.find(
      (item) => item.part_name.toLowerCase() === partName.toLowerCase()
    );
    const updated = [...inspectParts];
    updated[index].part_name = partName;
    if (matched) {
      updated[index].part_id = matched.id;
    }
    setInspectParts(updated);
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectProblem.trim()) {
      alert('Please enter the Problem Found during inspection.');
      return;
    }

    try {
      setSubmitting(true);
      const validParts = inspectParts.filter((p) => p.part_name.trim().length > 0);

      const payload = {
        problem_found: inspectProblem.trim(),
        inspection_notes: inspectNotes.trim(),
        estimated_repair_time: inspectEstTime,
        photos: inspectPhotos,
        required_parts: validParts.map((p) => ({
          part_name: p.part_name,
          part_id: p.part_id,
          requested_quantity: p.quantity,
          quantity: p.quantity,
          notes: p.notes
        }))
      };

      const res = await adminApi.post(`/admin/repair-jobs/${jobId}/inspection`, payload);
      if (res && res.success) {
        showToast(res.message || 'Inspection submitted successfully!', 'success');
        setShowInspectModal(false);
        hasAutoOpenedRef.current = 'submitted_inspect';
        if (searchParams?.get('action')) {
          router.replace(`/admin/technician/jobs/${jobId}`, { scroll: false });
        }
        fetchJobDetails();
      } else {
        showToast(res?.message || 'Failed to submit inspection', 'error');
      }
    } catch (err: any) {
      console.error('Inspection error:', err);
      showToast(err?.message || 'Failed to submit inspection', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartWork = async () => {
    if (!window.confirm('Start repair work timer now for this vehicle?')) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await adminApi.post(`/admin/repair-jobs/${jobId}/start-repair`, {
        technician_notes: 'Technician started active repair work.'
      });
      if (res && res.success) {
        showToast(res.message || 'Work Started! Live repair timer is running.', 'success');
        fetchJobDetails();
      } else {
        showToast(res?.message || 'Failed to start work', 'error');
      }
    } catch (err: any) {
      console.error('Start repair error:', err);
      showToast(err?.message || 'Failed to start work', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPartName.trim()) {
      alert('Please enter or select a part name.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        part_name: addPartName.trim(),
        part_id: addPartId || undefined,
        requested_quantity: Math.max(1, addPartQty),
        notes: addPartNotes.trim()
      };

      const res = await adminApi.post(`/admin/repair-jobs/${jobId}/add-part`, payload);
      if (res && res.success) {
        showToast(res.message || 'Additional part request submitted successfully!', 'success');
        setShowAddPartModal(false);
        setAddPartName('');
        setAddPartId(0);
        setAddPartQty(1);
        setAddPartNotes('');
        fetchJobDetails();
      } else {
        showToast(res?.message || 'Failed to add additional part', 'error');
      }
    } catch (err: any) {
      console.error('Add part error:', err);
      showToast(err?.message || 'Failed to add additional part', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReplacedPart = (index: number) => {
    const updated = [...confirmReplacedParts];
    updated[index].is_replaced = !updated[index].is_replaced;
    setConfirmReplacedParts(updated);
  };

  const handleAddExtraPart = () => {
    setAdditionalParts([
      ...additionalParts,
      { part_name: '', quantity: 1, notes: '' }
    ]);
  };

  const handleRemoveExtraPart = (index: number) => {
    setAdditionalParts(additionalParts.filter((_, i) => i !== index));
  };

  const handleSubmitCompleteWork = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const actuallyReplaced = confirmReplacedParts.map((p) => ({
        id: p.id,
        part_name: p.part_name,
        replaced_quantity: p.is_replaced ? p.quantity : 0,
        status: p.is_replaced ? 'Replaced' : 'Not Replaced',
        notes: p.notes
      }));

      additionalParts.forEach((extra) => {
        if (extra.part_name.trim().length > 0) {
          actuallyReplaced.push({
            id: undefined,
            part_name: extra.part_name.trim(),
            replaced_quantity: extra.quantity,
            status: 'Replaced',
            notes: extra.notes || 'Emergency additional part'
          });
        }
      });

      const payload = {
        actually_replaced_parts: actuallyReplaced,
        technician_notes: finalWorkNotes.trim() || 'Repair completed and tested.',
        completion_photos: completePhotos
      };

      const res = await adminApi.post(`/admin/repair-jobs/${jobId}/complete-repair`, payload);
      if (res && res.success) {
        showToast(res.message || 'Work Completed! Handed over to Hub Incharge for billing.', 'success');
        setShowCompleteModal(false);
        hasAutoOpenedRef.current = 'submitted_complete';
        if (searchParams?.get('action')) {
          router.replace(`/admin/technician/jobs/${jobId}`, { scroll: false });
        }
        fetchJobDetails();
      } else {
        showToast(res?.message || 'Failed to complete repair', 'error');
      }
    } catch (err: any) {
      console.error('Complete work error:', err);
      showToast(err?.message || 'Failed to complete repair', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-md mx-auto shadow-xs">
          <Clock className="w-8 h-8 text-[#00A854] animate-spin mx-auto mb-3" />
          <h2 className="text-sm font-bold text-gray-900">Loading Job Details...</h2>
        </div>
      </AdminLayout>
    );
  }

  if (!job) {
    return (
      <AdminLayout>
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center max-w-md mx-auto shadow-xs">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-gray-900">Repair Job Not Found</h2>
          <Link
            href="/admin/technician/jobs"
            className="mt-4 inline-flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Jobs
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-3.5 max-w-md mx-auto pb-28 pt-1 select-none sm:select-auto">
        {/* ========================================================= */}
        {/* TOAST NOTIFICATION */}
        {/* ========================================================= */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border text-xs animate-bounce ${
              toastType === 'error'
                ? 'bg-red-950 text-white border-red-500'
                : 'bg-[#111827] text-white border-[#00D96B]/40'
            }`}
          >
            {toastType === 'error' ? (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#00D96B]" />
            )}
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. COMPACT JOB HEADER: ‹ JOB-000122 [NORMAL] */}
        {/* ========================================================= */}
        <div className="flex items-center gap-2 px-0.5 pt-0.5 pb-1">
          <Link
            href="/admin/technician/jobs"
            className="w-8 h-8 -ml-1 flex items-center justify-center text-gray-700 hover:text-black active:bg-gray-100 rounded-full transition"
            title="Back to Job Work Summary"
          >
            <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          </Link>
          <h1 className="font-bold text-xl sm:text-2xl text-gray-900 tracking-tight">
            {job.job_number}
          </h1>
          {job.priority === 'Urgent' ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 ml-1">
              URGENT
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200 ml-1">
              NORMAL
            </span>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. WORKFLOW PROGRESS CARD */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            WORKFLOW PROGRESS
          </h3>

          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            {/* Step 1: Inspection */}
            <div className="flex-1 bg-[#F0FDF4] border border-[#00D96B]/30 rounded-2xl py-3 px-1 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-[#00D96B] flex items-center justify-center text-[#00A854] shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                STEP 1
              </span>
              <span className="text-xs font-bold text-[#00A854] mt-0.5 leading-tight">
                1. Inspection
              </span>
            </div>

            {/* Connector Line 1 */}
            <div className="w-3 sm:w-6 h-[2px] bg-[#00D96B] flex-shrink-0" />

            {/* Step 2: Work Started */}
            <div className="flex-1 bg-[#F0FDF4] border border-[#00D96B]/30 rounded-2xl py-3 px-1 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-[#00D96B] flex items-center justify-center text-[#00A854] shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                STEP 2
              </span>
              <span className="text-xs font-bold text-[#00A854] mt-0.5 leading-tight">
                2. Work Started
              </span>
            </div>

            {/* Connector Line 2 */}
            <div className="w-3 sm:w-6 h-[2px] bg-[#00D96B] flex-shrink-0" />

            {/* Step 3: Work Completed */}
            <div className="flex-1 bg-[#F0FDF4] border border-[#00D96B]/30 rounded-2xl py-3 px-1 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full bg-white border-2 border-[#00D96B] flex items-center justify-center text-[#00A854] shadow-xs">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1.5">
                STEP 3
              </span>
              <span className="text-xs font-bold text-[#00A854] mt-0.5 leading-tight">
                3. Work Completed
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. RIDER DETAILS CARD */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#00A854] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-gray-900 tracking-wider uppercase">
              RIDER DETAILS
            </h3>
          </div>

          <div className="divide-y divide-gray-100">
            {/* Rider Name */}
            <div className="flex items-start gap-3 py-2.5 first:pt-1">
              <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[11px] text-gray-400 font-medium block">
                  Rider Name
                </span>
                <span className="text-sm font-bold text-gray-900 block mt-0.5">
                  {job.rider_name}
                </span>
              </div>
            </div>

            {/* Contact Number */}
            <div className="flex items-start gap-3 py-2.5">
              <Phone className="w-4 h-4 text-[#00A854] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[11px] text-gray-400 font-medium block">
                  Contact Number
                </span>
                <a
                  href={`tel:${job.rider_contact}`}
                  className="text-sm font-bold text-[#00A854] hover:underline block mt-0.5"
                >
                  {job.rider_contact}
                </a>
              </div>
            </div>

            {/* Scooter Number */}
            <div className="flex items-start gap-3 py-2.5 last:pb-1">
              <Bike className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[11px] text-gray-400 font-medium block">
                  Scooter Number
                </span>
                <span className="text-sm font-bold text-gray-900 font-mono block mt-0.5">
                  {job.scooter_number}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. JOB DETAILS CARD (WITH HIGHLIGHTED REPORTED ISSUE) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-gray-900 tracking-wider uppercase">
              JOB DETAILS
            </h3>
          </div>

          <div className="space-y-3">
            {/* 2-Column: Job ID + Hub Station */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-400 font-medium block">
                    Job ID
                  </span>
                  <span className="text-sm font-bold text-gray-900 font-mono block mt-0.5">
                    {job.job_number}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 border-l border-gray-100 pl-3">
                <Building className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-400 font-medium block">
                    Hub Station
                  </span>
                  <span className="text-sm font-bold text-gray-900 block mt-0.5 break-words">
                    {job.hub_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Date & Time */}
            <div className="flex items-start gap-2.5 pt-1.5 border-t border-gray-100">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[11px] text-gray-400 font-medium block">
                  Assigned Date &amp; Time
                </span>
                <span className="text-xs sm:text-sm font-bold text-gray-900 block mt-0.5">
                  {new Date(job.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}, {new Date(job.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Highlighted Reported Issue (Subtle Yellow/Orange Background) */}
            <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-3.5 flex items-start gap-2.5 mt-1">
              <AlertTriangle className="w-4 h-4 text-[#D97706] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider block mb-0.5">
                  REPORTED ISSUE:
                </span>
                <p className="text-xs font-bold text-gray-900 leading-relaxed">
                  “{job.complaint || 'Punctured rear tire and minor rim alignment'}”
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. WORKFLOW CONTEXTUAL ACTION AREA */}
        {/* ========================================================= */}

        {/* STEP 1: INSPECTION REQUIRED */}
        {isInspectionPending && (
          <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Inspection Pending</h4>
              <p className="text-xs text-gray-500">Diagnose problem and request parts</p>
            </div>

            <button
              onClick={() => setShowInspectModal(true)}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-xs transition transform active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Inspect Vehicle</span>
            </button>
          </div>
        )}

        {/* STEP 1.5: PARTS APPROVAL PENDING */}
        {isApprovalPending && (
          <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <h4 className="text-sm font-bold text-gray-900">Parts Approval Pending</h4>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Awaiting Hub Incharge
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Inspection submitted. Work can start immediately once parts are approved by the Hub Incharge.
            </p>

            {parts?.requested && parts.requested.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Requested Parts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {parts.requested.map((p: any, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 bg-purple-50 border border-purple-200 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-bold"
                    >
                      <Package className="w-3 h-3 text-purple-600" />
                      <span>{p.part_name} × {p.requested_quantity || p.quantity || 1}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: READY TO START WORK */}
        {isRepairApproved && (
          <div className="bg-white rounded-2xl border border-[#00D96B] p-4 shadow-xs flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Ready to Start Repair</h4>
              <p className="text-xs text-gray-500">Parts approved. Click to start live work timer.</p>
            </div>

            <button
              onClick={handleStartWork}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-xs transition transform active:scale-95 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{submitting ? 'Starting...' : 'Start Work'}</span>
            </button>
          </div>
        )}

        {/* STEP 2 ACTIVE: LIVE REPAIR TIMER */}
        {isRepairing && (
          <div className="bg-[#111827] rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-4 border border-[#00D96B]/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00A854] animate-ping" />
                <span className="text-xs font-bold text-[#00D96B] uppercase tracking-wider">
                  Work In Progress
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-[#00D96B]">
                {getElapsedDuration(timing?.repair_started_at)}
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddPartModal(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#00A854]" />
                <span>+ Request Part</span>
              </button>

              <button
                onClick={() => setShowCompleteModal(true)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#00A854] hover:bg-[#008744] text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md transition transform active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Complete Work</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: WORK COMPLETED SUMMARY */}
        {isWorkCompleted && (
          <div className="bg-white rounded-2xl border border-[#00D96B]/50 p-4 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00A854] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Work Completed</h4>
                <p className="text-xs text-gray-500">
                  Total duration: {timing?.total_duration_formatted || 'Completed'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Ready for Billing
            </span>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: INSPECTION FORM (STEP 1) */}
        {/* ========================================================= */}
        {showInspectModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-3.5 my-4 border border-gray-100 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
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
                  onClick={handleCloseInspectModal}
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
                      onChange={(e) => setInspectProblem(e.target.value)}
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
                      onChange={(e) => setInspectNotes(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D96B] focus:border-transparent text-gray-900 placeholder:text-gray-400 resize-y leading-relaxed transition"
                    />
                  </div>
                </div>

                {/* Parts Required */}
                <div className="bg-[#F8F9FA] rounded-xl p-3 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-900">
                      PARTS REQUIRED
                    </label>
                    <button
                      type="button"
                      onClick={handleAddInspectPart}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#00A854] text-[#00A854] hover:bg-emerald-50 text-[11px] font-bold transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>Add Another Part</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-44 overflow-y-auto pr-0.5">
                    {inspectParts.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-lg border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                      >
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            list={`inventory-parts-${idx}`}
                            placeholder="Part name (e.g. Brake Pad, Cable)"
                            value={p.part_name}
                            onChange={(e) => handleSelectInventoryPart(idx, e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-transparent border-0 focus:outline-none text-gray-900 placeholder:text-gray-400"
                          />
                          <datalist id={`inventory-parts-${idx}`}>
                            {inventoryList.map((inv) => (
                              <option key={inv.id} value={inv.part_name}>
                                {inv.part_code} (Stock: {inv.quantity})
                              </option>
                            ))}
                          </datalist>
                        </div>

                        <div className="flex items-center border border-gray-200 rounded-md bg-white overflow-hidden flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...inspectParts];
                              updated[idx].quantity = Math.max(1, (updated[idx].quantity || 1) - 1);
                              setInspectParts(updated);
                            }}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-bold transition text-xs border-r border-gray-200 cursor-pointer select-none"
                          >
                            −
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-gray-900 select-none">
                            {p.quantity || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...inspectParts];
                              updated[idx].quantity = (updated[idx].quantity || 1) + 1;
                              setInspectParts(updated);
                            }}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-bold transition text-xs border-l border-gray-200 cursor-pointer select-none"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveInspectPart(idx)}
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
                      onChange={(e) => setInspectEstTime(e.target.value)}
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
                    onClick={handleCloseInspectModal}
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

        {/* ========================================================= */}
        {/* MODAL 2: REQUEST ADDITIONAL PART MID-REPAIR */}
        {/* ========================================================= */}
        {showAddPartModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-8 border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00A854] flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      Request Additional Spare Part
                    </h3>
                    <p className="text-xs text-gray-500">
                      {job.job_number} • Mid-Repair Spare Part Request
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddPartModal(false)}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddPartSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-900 mb-1">
                    Select Spare Part <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="add-part-inventory"
                    placeholder="Search inventory spare parts..."
                    value={addPartName}
                    onChange={(e) => {
                      setAddPartName(e.target.value);
                      const matched = inventoryList.find(
                        (item) => item.part_name.toLowerCase() === e.target.value.toLowerCase()
                      );
                      if (matched) setAddPartId(matched.id);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D96B] text-gray-900"
                  />
                  <datalist id="add-part-inventory">
                    {inventoryList.map((inv) => (
                      <option key={inv.id} value={inv.part_name}>
                        {inv.part_code} (Stock: {inv.quantity})
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-900 mb-1">
                    Quantity Required
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={addPartQty}
                    onChange={(e) => setAddPartQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D96B] text-gray-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-900 mb-1">
                    Reason / Technical Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Why is this additional part required mid-repair?..."
                    value={addPartNotes}
                    onChange={(e) => setAddPartNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D96B] text-gray-900"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAddPartModal(false)}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 bg-[#00A854] hover:bg-[#008744] text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider shadow-sm transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Adding...' : 'SUBMIT PART REQUEST'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 3: COMPLETE WORK CONFIRMATION (STEP 3) */}
        {/* ========================================================= */}
        {showCompleteModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-4 my-6 border border-gray-100 max-h-[92vh] flex flex-col justify-between overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      Complete Repair Work Confirmation
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {job.job_number} • Confirm replaced parts & final notes
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseCompleteModal}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitCompleteWork} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-900 mb-1.5">
                    Parts Associated With This Job (Confirm Replaced)
                  </label>

                  {confirmReplacedParts.length > 0 ? (
                    <div className="space-y-1.5 bg-[#F9FAFB] p-2.5 rounded-xl border border-gray-200 max-h-40 overflow-y-auto">
                      {confirmReplacedParts.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleToggleReplacedPart(idx)}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                            item.is_replaced
                              ? 'bg-[#EAFBF2] border-[#00D96B]/50 text-gray-900'
                              : 'bg-white border-gray-200 text-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {item.is_replaced ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#00A854]" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span className="text-xs font-bold">{item.part_name}</span>
                          </div>

                          <span className="font-mono text-xs font-bold text-[#00A854]">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic bg-[#F9FAFB] p-2.5 rounded-xl border border-gray-200">
                      No spare parts requested during initial inspection.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-900">
                      Additional Part Used (If Any)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddExtraPart}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Extra Part</span>
                    </button>
                  </div>

                  {additionalParts.map((extra, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-[#F9FAFB] p-2 rounded-xl border border-gray-200"
                    >
                      <input
                        type="text"
                        placeholder="Additional part name..."
                        value={extra.part_name}
                        onChange={(e) => {
                          const updated = [...additionalParts];
                          updated[idx].part_name = e.target.value;
                          setAdditionalParts(updated);
                        }}
                        className="flex-1 px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none"
                      />
                      <input
                        type="number"
                        min={1}
                        value={extra.quantity}
                        onChange={(e) => {
                          const updated = [...additionalParts];
                          updated[idx].quantity = Math.max(1, Number(e.target.value));
                          setAdditionalParts(updated);
                        }}
                        className="w-14 px-2 py-1 text-xs text-center font-bold bg-white border border-gray-200 rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraPart(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-900 mb-1">
                    Final Work Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Repair completed, test drive results, final check notes..."
                    value={finalWorkNotes}
                    onChange={(e) => setFinalWorkNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#F9FAFB] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={handleCloseCompleteModal}
                    className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 bg-[#00A854] hover:bg-[#008744] text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider shadow-sm transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{submitting ? 'Completing...' : 'MARK AS COMPLETED'}</span>
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
