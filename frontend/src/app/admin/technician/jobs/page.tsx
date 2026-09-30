'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi } from '../../../../lib/adminApi';
import {
  Wrench,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronDown,
  User,
  SlidersHorizontal,
  X,
  Bike,
  FileText,
  RotateCw,
  ArrowDown,
  Navigation,
  MapPin,
  Phone,
  MessageSquare,
  AlertCircle,
  Radio,
  ExternalLink,
  Check,
  Package,
  Plus,
  Trash2,
  Building
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
  created_at: string;
  updated_at: string;
  repair_started_at?: string | null;
  repair_completed_at?: string | null;
  total_duration_seconds?: number;
  total_duration_formatted?: string | null;
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
  return_journey_started_at?: string | null;
  created_at: string;
  updated_at: string;
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

export default function TechnicianJobsSummaryPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Top Workspace Mode: Workshop Jobs vs Field Complaints
  const [workspaceMode, setWorkspaceMode] = useState<'WORKSHOP' | 'FIELD_COMPLAINTS'>('WORKSHOP');

  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [fieldComplaints, setFieldComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'INSPECTION_PENDING' | 'WORK_PENDING' | 'WORK_IN_PROGRESS' | 'COMPLETED_TODAY'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Normal' | 'Urgent'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [selectedTechId, setSelectedTechId] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);

  // Live Timer Heartbeat for active repairs & field journeys
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Field Service Work Done Modal State
  const [completingComplaint, setCompletingComplaint] = useState<Complaint | null>(null);
  const [workDoneForm, setWorkDoneForm] = useState({
    work_performed: '',
    parts_used: [] as Array<{ part_name: string; quantity: number; unit_price: number; total_price: number }>,
    technician_remarks: '',
    completion_notes: ''
  });
  const [submittingWorkDone, setSubmittingWorkDone] = useState(false);

  // Return to Hub State
  const [returnToHubComplaintId, setReturnToHubComplaintId] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isTechnicianRole = user?.roleName === 'TECHNICIAN' || user?.roleName?.includes('TECH');

  // Load Inventory for parts selector
  useEffect(() => {
    adminApi.get('/admin/inventory').then(res => {
      if (res && res.success) setInventoryList(res.data || []);
    }).catch(() => {});
  }, []);

  // Fetch Jobs & Field Complaints
  const fetchData = async () => {
    try {
      // 1. Workshop Jobs
      const jobsUrl = `/admin/repair-jobs?limit=100`;
      const jobsRes = await adminApi.get(jobsUrl);
      if (jobsRes && jobsRes.success) {
        let allJobs: RepairJob[] = jobsRes.data || [];
        if (jobsRes.technicians) setTechnicians(jobsRes.technicians);

        if (isTechnicianRole && user) {
          const matchedTech = jobsRes.technicians?.find(
            (t: Technician) =>
              t.name.toLowerCase() === user.name.toLowerCase() ||
              t.id === user.id ||
              (user.phone && t.phone && user.phone === t.phone)
          );
          const techId = matchedTech ? matchedTech.id : user.id;
          allJobs = allJobs.filter(
            (j: RepairJob) => j.technician_id === techId || j.technician_name?.toLowerCase() === user.name?.toLowerCase()
          );
        } else if (selectedTechId !== 'all') {
          allJobs = allJobs.filter((j: RepairJob) => j.technician_id === Number(selectedTechId));
        }

        setJobs(allJobs);
      }

      // 2. Field Breakdown Complaints
      const complaintsRes = await adminApi.get('/admin/complaints?limit=100');
      if (complaintsRes && complaintsRes.success) {
        let allComplaints: Complaint[] = complaintsRes.data || [];
        if (isTechnicianRole && user) {
          const matchedTech = jobsRes?.technicians?.find(
            (t: Technician) =>
              t.name.toLowerCase() === user.name.toLowerCase() ||
              t.id === user.id ||
              (user.phone && t.phone && user.phone === t.phone)
          );
          const techId = matchedTech ? matchedTech.id : user.id;
          allComplaints = allComplaints.filter(
            (c: Complaint) => c.technician_id === techId || c.technician_name?.toLowerCase() === user.name?.toLowerCase()
          );
        } else if (selectedTechId !== 'all') {
          allComplaints = allComplaints.filter((c: Complaint) => c.technician_id === Number(selectedTechId));
        }

        setFieldComplaints(allComplaints);
      }
    } catch (err) {
      console.error('Failed to load technician jobs and complaints', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedTechId, isTechnicianRole, user]);

  // Live Background Geolocation Tracker when En Route
  useEffect(() => {
    const activeEnRouteComplaint = fieldComplaints.find(c => c.status === 'En Route');
    if (!activeEnRouteComplaint || typeof window === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const { latitude, longitude, speed, heading } = pos.coords;
        adminApi.post(`/admin/complaints/${activeEnRouteComplaint.id}/location`, {
          latitude,
          longitude,
          speed,
          heading
        }).catch(() => {});
      },
      err => {
        console.warn('Geolocation watch error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [fieldComplaints]);

  // Pull to Refresh Touch Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (typeof window !== 'undefined' && window.scrollY <= 10) {
      touchStartYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;
    if (diff > 0 && typeof window !== 'undefined' && window.scrollY <= 10) {
      const distance = Math.min(diff * 0.4, 85);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    if (pullDistance >= 50) {
      setIsRefreshing(true);
      setPullDistance(45);
      await fetchData();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 400);
    } else {
      setPullDistance(0);
    }
  };

  // Live Timer Helper
  const getTimerString = (startedAt: string | null | undefined): string => {
    if (!startedAt) return '00:00:00';
    const startMs = new Date(startedAt).getTime();
    const diffSec = Math.max(0, Math.floor((currentTimeMs - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getTechnicianStatus = (status: string) => {
    switch (status) {
      case 'Pending Inspection':
      case 'Technician Assigned':
        return { label: 'Assigned (Inspection Pending)', pill: 'bg-amber-50 text-amber-700 border border-amber-200' };
      case 'Inspection Completed':
        return { label: 'Inspection Done (Pending Approval)', pill: 'bg-purple-50 text-purple-700 border border-purple-200' };
      case 'Repair Approved':
        return { label: 'Repair Approved (Ready to Start)', pill: 'bg-blue-50 text-blue-700 border border-blue-200' };
      case 'Repairing':
        return { label: 'Repair in Progress', pill: 'bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/30' };
      case 'Repair Completed':
      case 'Billing Completed':
      case 'Payment Pending':
      case 'Payment Received':
      case 'Closed':
        return { label: 'Repair Completed', pill: 'bg-gray-100 text-[#475467] border border-gray-200' };
      default:
        return { label: status, pill: 'bg-gray-50 text-gray-700 border border-gray-200' };
    }
  };

  // Field Service Workflow Actions:
  // 1. START JOURNEY
  const handleStartJourney = async (complaintId: number) => {
    let lat: number | null = null;
    let lng: number | null = null;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
    }

    try {
      const res = await adminApi.patch(`/admin/complaints/${complaintId}/status`, {
        status: 'En Route',
        latitude: lat,
        longitude: lng
      });

      if (res && res.success) {
        showToast('Journey started! GPS live tracking activated.');
        fetchData();
      } else {
        alert(res?.message || 'Failed to start journey');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // 2. REACHED LOCATION
  const handleReachedLocation = async (complaintId: number) => {
    let lat: number | null = null;
    let lng: number | null = null;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
    }

    try {
      const res = await adminApi.patch(`/admin/complaints/${complaintId}/status`, {
        status: 'Reached',
        latitude: lat,
        longitude: lng
      });

      if (res && res.success) {
        showToast('Arrival recorded! Journey timer saved.');
        fetchData();
      } else {
        alert(res?.message || 'Failed to record arrival');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // 3. START WORK
  const handleStartWork = async (complaintId: number) => {
    try {
      const res = await adminApi.patch(`/admin/complaints/${complaintId}/status`, {
        status: 'Work In Progress'
      });

      if (res && res.success) {
        showToast('Work started! Work timer running.');
        fetchData();
      } else {
        alert(res?.message || 'Failed to start work');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // 4. OPEN WORK DONE MODAL
  const handleOpenWorkDoneModal = (complaint: Complaint) => {
    setCompletingComplaint(complaint);
    setWorkDoneForm({
      work_performed: '',
      parts_used: [],
      technician_remarks: '',
      completion_notes: ''
    });
  };

  // 5. SUBMIT WORK DONE
  const handleSubmitWorkDone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingComplaint) return;

    if (!workDoneForm.work_performed.trim()) {
      alert('Please describe the work performed');
      return;
    }

    let lat: number | null = null;
    let lng: number | null = null;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
    }

    try {
      setSubmittingWorkDone(true);
      const res = await adminApi.patch(`/admin/complaints/${completingComplaint.id}/status`, {
        status: 'Work Done',
        work_performed: workDoneForm.work_performed.trim(),
        parts_used: workDoneForm.parts_used,
        technician_remarks: workDoneForm.technician_remarks.trim(),
        completion_notes: workDoneForm.completion_notes.trim(),
        latitude: lat,
        longitude: lng
      });

      if (res && res.success) {
        showToast('Field service repair marked as Work Done!');
        setCompletingComplaint(null);
        fetchData();
      } else {
        alert(res?.message || 'Failed to complete job');
      }
    } catch (err: any) {
      alert(err.message || 'Error completing job');
    } finally {
      setSubmittingWorkDone(false);
    }
  };

  // 6. RETURN TO HUB
  const handleReturnToHub = async (complaintId: number) => {
    try {
      const res = await adminApi.patch(`/admin/complaints/${complaintId}/status`, {
        status: 'Return to Hub'
      });

      if (res && res.success) {
        setReturnToHubComplaintId(complaintId);
        showToast('Return journey started! Returning to service hub.');
        fetchData();
      } else {
        alert(res?.message || 'Failed to start return');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  // Helper: Open WhatsApp
  const handleWhatsApp = (phone: string, name: string, complaintNo: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Hello ${name}, DOON RIDERS Technician here regarding breakdown ticket ${complaintNo}. I am on my way to your location.`);
    window.open(`https://wa.me/${formatted}?text=${msg}`, '_blank');
  };

  // Summary counts
  const totalAssignedWorkshop = jobs.length;
  const activeFieldComplaints = fieldComplaints.filter(c => c.status !== 'Closed');
  const activeEnRouteCount = fieldComplaints.filter(c => c.status === 'En Route' || c.status === 'Reached' || c.status === 'Work In Progress').length;

  // Filtered Workshop Jobs based on search, filterTab, priority, date
  const filteredJobs = jobs.filter(job => {
    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNumber = job.job_number?.toLowerCase().includes(q);
      const matchScooter = job.scooter_number?.toLowerCase().includes(q);
      const matchRider = job.rider_name?.toLowerCase().includes(q);
      const matchComplaint = job.complaint?.toLowerCase().includes(q);
      if (!matchNumber && !matchScooter && !matchRider && !matchComplaint) return false;
    }

    // 2. Filter Tab
    if (filterTab === 'INSPECTION_PENDING') {
      if (job.status !== 'Pending Inspection' && job.status !== 'Technician Assigned') return false;
    } else if (filterTab === 'WORK_PENDING') {
      if (job.status !== 'Inspection Completed' && job.status !== 'Repair Approved') return false;
    } else if (filterTab === 'WORK_IN_PROGRESS') {
      if (job.status !== 'Repairing') return false;
    } else if (filterTab === 'COMPLETED_TODAY') {
      const completedStatuses = ['Repair Completed', 'Billing Completed', 'Payment Pending', 'Payment Received', 'Closed'];
      if (!completedStatuses.includes(job.status)) return false;
    }

    // 3. Priority Filter
    if (priorityFilter !== 'all' && job.priority !== priorityFilter) {
      return false;
    }

    // 4. Date Filter
    if (dateFilter === 'today') {
      const jobDate = new Date(job.created_at).toDateString();
      const today = new Date().toDateString();
      if (jobDate !== today) return false;
    } else if (dateFilter === 'week') {
      const jobTime = new Date(job.created_at).getTime();
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (jobTime < oneWeekAgo) return false;
    }

    return true;
  });

  return (
    <AdminLayout>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative space-y-4 max-w-xl md:max-w-4xl mx-auto pb-24 select-none sm:select-auto"
      >
        {/* Pull To Refresh Indicator */}
        <div
          style={{
            transform: `translateY(${pullDistance}px)`,
            opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
            transition: isPullingRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s'
          }}
          className="fixed top-14 left-0 right-0 z-30 flex justify-center pointer-events-none"
        >
          <div className="bg-white rounded-full p-2.5 shadow-lg border border-gray-100 flex items-center justify-center">
            {isRefreshing ? (
              <RotateCw className="w-5 h-5 text-[#00A854] animate-spin" />
            ) : (
              <ArrowDown
                style={{ transform: `rotate(${Math.min(pullDistance * 4, 180)}deg)` }}
                className="w-5 h-5 text-[#00A854] transition-transform"
              />
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#111827] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-[#00D96B]/40 text-xs animate-bounce">
            <Sparkles className="w-4 h-4 text-[#00D96B]" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
              Technician Tasks
            </h1>
            <p className="text-xs text-[#667085] font-medium mt-0.5">
              Workshop Repairs & Emergency Field Breakdown Jobs
            </p>
          </div>

          {/* Admin Switcher for Testing */}
          {!isTechnicianRole && technicians.length > 0 && (
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="text-xs font-bold bg-white border border-[#E5E7EB] rounded-2xl px-2.5 py-1.5 text-[#111827] focus:outline-none shadow-xs"
            >
              <option value="all">All Technicians</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Top Mode Switcher Tabs */}
        <div className="flex items-center gap-2 bg-[#F2F4F7] p-1.5 rounded-2xl border border-[#E5E7EB]">
          <button
            onClick={() => setWorkspaceMode('WORKSHOP')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
              workspaceMode === 'WORKSHOP'
                ? 'bg-white text-[#111827] shadow-sm border border-[#E5E7EB]'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Workshop Jobs</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              workspaceMode === 'WORKSHOP' ? 'bg-[#00D96B] text-[#0A0F1D]' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalAssignedWorkshop}
            </span>
          </button>

          <button
            onClick={() => setWorkspaceMode('FIELD_COMPLAINTS')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
              workspaceMode === 'FIELD_COMPLAINTS'
                ? 'bg-[#0A0F1D] text-white shadow-md'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <Radio className={`w-4 h-4 ${activeEnRouteCount > 0 ? 'text-[#00D96B] animate-pulse' : ''}`} />
            <span>Field Complaints</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeEnRouteCount > 0
                ? 'bg-red-500 text-white animate-pulse'
                : workspaceMode === 'FIELD_COMPLAINTS'
                ? 'bg-[#00D96B] text-[#0A0F1D]'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {activeFieldComplaints.length}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FIELD BREAKDOWN COMPLAINTS WORKFLOW */}
        {/* ========================================================================= */}
        {workspaceMode === 'FIELD_COMPLAINTS' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {loading ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
                <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-bold">Checking Assigned Field Complaints...</p>
              </div>
            ) : fieldComplaints.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-sm font-black text-slate-900">No Field Complaints Assigned</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  You currently have no pending on-site breakdown tickets assigned from Hub Incharge.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {fieldComplaints.map((complaint, index) => {
                  const isAssigned = complaint.status === 'Assigned';
                  const isEnRoute = complaint.status === 'En Route';
                  const isReached = complaint.status === 'Reached';
                  const isWIP = complaint.status === 'Work In Progress';
                  const isDone = complaint.status === 'Work Done';
                  const isClosed = complaint.status === 'Closed';

                  const techLat = complaint.technician_latitude || 30.2863;
                  const techLng = complaint.technician_longitude || 78.0069;
                  const custLat = complaint.latitude || 30.3256;
                  const custLng = complaint.longitude || 78.0436;
                  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${techLat},${techLng}&destination=${custLat},${custLng}&travelmode=driving`;

                  // Check if there is another complaint next in line
                  const remainingAssigned = fieldComplaints.filter(c => c.id !== complaint.id && (c.status === 'Assigned' || c.status === 'En Route'));
                  const nextComplaint = remainingAssigned[0];

                  return (
                    <div
                      key={complaint.id}
                      className={`bg-white rounded-3xl border transition-all p-5 space-y-4 shadow-sm ${
                        isEnRoute || isWIP
                          ? 'border-[#00D96B] ring-2 ring-[#00D96B]/20 bg-emerald-50/10'
                          : isAssigned
                          ? 'border-blue-300'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Top Job Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {complaint.complaint_number}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              complaint.priority === 'Urgent'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {complaint.priority} Priority
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-900 flex items-center gap-1.5 pt-0.5">
                            <Bike className="w-4 h-4 text-emerald-600" />
                            <span>Scooty: {complaint.scooter_number}</span>
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                            isEnRoute
                              ? 'bg-purple-100 text-purple-800 border border-purple-300 animate-pulse'
                              : isReached
                              ? 'bg-indigo-100 text-indigo-800'
                              : isWIP
                              ? 'bg-orange-100 text-orange-800'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : isClosed
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {complaint.status}
                          </span>
                        </div>
                      </div>

                      {/* Customer & Location Box */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900">{complaint.customer_name}</p>
                            <p className="text-[11px] font-mono text-slate-500">{complaint.customer_phone}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${complaint.customer_phone}`}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Call</span>
                            </a>
                            <button
                              onClick={() => handleWhatsApp(complaint.customer_phone, complaint.customer_name, complaint.complaint_number)}
                              className="p-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[11px] text-slate-700 font-medium leading-tight">
                              {complaint.location_address}
                            </span>
                          </div>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] border border-blue-200 flex items-center gap-1 shrink-0"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Navigate</span>
                          </a>
                        </div>
                      </div>

                      {/* Issue Description */}
                      <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80 text-xs">
                        <p className="font-extrabold text-amber-900">{complaint.issue_category}</p>
                        <p className="text-[11px] text-slate-700 mt-0.5">{complaint.description}</p>
                      </div>

                      {/* ================================================================= */}
                      {/* ACTIVE EN ROUTE / WIP LIVE TIMER & RADAR MAP */}
                      {/* ================================================================= */}
                      {(isEnRoute || isWIP) && (
                        <div className="bg-[#0A0F1D] text-white p-4 rounded-2xl border border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[#00D96B] animate-ping" />
                              <span className="text-xs font-black text-white">
                                {isEnRoute ? 'En Route to Customer' : 'Work In Progress'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-xs font-black text-[#00D96B] bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{getTimerString(isEnRoute ? complaint.journey_started_at : complaint.work_started_at)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                            <span>GPS live sync enabled</span>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#00D96B] font-bold hover:underline flex items-center gap-1"
                            >
                              <span>Open Google Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      )}

                      {/* ================================================================= */}
                      {/* WORK DONE SUMMARY (IF ALREADY COMPLETED) */}
                      {/* ================================================================= */}
                      {isDone && (
                        <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-emerald-900 font-bold">
                            <span>Field Repair Completed</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </div>
                          <p className="text-slate-700 text-[11px]">{complaint.work_performed}</p>
                          {complaint.journey_duration_formatted && (
                            <p className="text-[10px] text-slate-500 pt-1 font-mono">
                              Travel Time: {complaint.journey_duration_formatted} &bull; Work Duration: {complaint.work_duration_formatted || 'Done'}
                            </p>
                          )}
                        </div>
                      )}

                      {/* ================================================================= */}
                      {/* LARGE PRIMARY ACTION BUTTON HIERARCHY */}
                      {/* ================================================================= */}
                      <div className="pt-2">
                        {/* 1. START JOURNEY */}
                        {isAssigned && (
                          <button
                            onClick={() => handleStartJourney(complaint.id)}
                            className="w-full py-4 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-[#00D96B]/25 transition-all active:scale-98 cursor-pointer"
                          >
                            <Navigation className="w-5 h-5 stroke-[2.5]" />
                            <span>START JOURNEY</span>
                          </button>
                        )}

                        {/* 2. REACHED LOCATION */}
                        {isEnRoute && (
                          <button
                            onClick={() => handleReachedLocation(complaint.id)}
                            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition-all active:scale-98 cursor-pointer"
                          >
                            <MapPin className="w-5 h-5 stroke-[2.5]" />
                            <span>REACHED LOCATION</span>
                          </button>
                        )}

                        {/* 3. START WORK */}
                        {isReached && (
                          <button
                            onClick={() => handleStartWork(complaint.id)}
                            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all active:scale-98 cursor-pointer"
                          >
                            <Wrench className="w-5 h-5 stroke-[2.5]" />
                            <span>START WORK</span>
                          </button>
                        )}

                        {/* 4. WORK DONE */}
                        {isWIP && (
                          <button
                            onClick={() => handleOpenWorkDoneModal(complaint)}
                            className="w-full py-4 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-[#00D96B]/25 transition-all active:scale-98 cursor-pointer"
                          >
                            <Check className="w-5 h-5 stroke-[3]" />
                            <span>WORK DONE</span>
                          </button>
                        )}

                        {/* 5. AFTER WORK DONE: NEXT COMPLAINT OR RETURN TO HUB */}
                        {isDone && (
                          <div className="space-y-2 pt-1">
                            {nextComplaint ? (
                              <button
                                onClick={() => handleStartJourney(nextComplaint.id)}
                                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all active:scale-98 cursor-pointer"
                              >
                                <Navigation className="w-4 h-4" />
                                <span>START JOURNEY: NEXT COMPLAINT ({nextComplaint.complaint_number})</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReturnToHub(complaint.id)}
                                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer"
                              >
                                <Building className="w-4 h-4 text-[#00D96B]" />
                                <span>RETURN TO SERVICE HUB</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: WORKSHOP JOBS (EXISTING IN-HOUSE JOBS) */}
        {/* ========================================================================= */}
        {workspaceMode === 'WORKSHOP' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Workshop summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div
                onClick={() => setFilterTab('ALL')}
                className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                  filterTab === 'ALL'
                    ? 'bg-white border-[#00D96B] shadow-sm ring-2 ring-[#00D96B]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">All Assigned</span>
                <p className="text-xl font-black text-slate-900 mt-1">{jobs.length}</p>
              </div>

              <div
                onClick={() => setFilterTab('INSPECTION_PENDING')}
                className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                  filterTab === 'INSPECTION_PENDING'
                    ? 'bg-amber-50 border-amber-400 shadow-sm ring-2 ring-amber-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Inspect Pending</span>
                <p className="text-xl font-black text-amber-900 mt-1">
                  {jobs.filter(j => j.status === 'Pending Inspection' || j.status === 'Technician Assigned').length}
                </p>
              </div>

              <div
                onClick={() => setFilterTab('WORK_PENDING')}
                className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                  filterTab === 'WORK_PENDING'
                    ? 'bg-blue-50 border-blue-400 shadow-sm ring-2 ring-blue-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Work Pending</span>
                <p className="text-xl font-black text-blue-900 mt-1">
                  {jobs.filter(j => j.status === 'Inspection Completed' || j.status === 'Repair Approved').length}
                </p>
              </div>

              <div
                onClick={() => setFilterTab('WORK_IN_PROGRESS')}
                className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                  filterTab === 'WORK_IN_PROGRESS'
                    ? 'bg-emerald-50 border-[#00D96B] shadow-sm ring-2 ring-[#00D96B]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Repairing</span>
                <p className="text-xl font-black text-emerald-900 mt-1">
                  {jobs.filter(j => j.status === 'Repairing').length}
                </p>
              </div>
            </div>

            {/* Search and Secondary Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by Job #, Scooty #, Rider or Complaint..."
                  className="w-full pl-9 pr-8 py-2.5 bg-white border border-[#E5E7EB] rounded-2xl text-xs font-semibold text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] transition shadow-xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#111827]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={priorityFilter}
                  onChange={(e: any) => setPriorityFilter(e.target.value)}
                  className="text-xs font-bold bg-white border border-[#E5E7EB] rounded-2xl px-3 py-2.5 text-[#111827] focus:outline-none shadow-xs"
                >
                  <option value="all">All Priorities</option>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e: any) => setDateFilter(e.target.value)}
                  className="text-xs font-bold bg-white border border-[#E5E7EB] rounded-2xl px-3 py-2.5 text-[#111827] focus:outline-none shadow-xs"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Past 7 Days</option>
                </select>
              </div>
            </div>

            {/* Workshop Jobs List */}
            {filteredJobs.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-sm font-black text-slate-900">No Workshop Jobs Found</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {search || filterTab !== 'ALL' || priorityFilter !== 'all' || dateFilter !== 'all'
                    ? 'No repair jobs match the selected filter or search query.'
                    : 'No workshop in-house repair tasks currently assigned.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredJobs.map(job => {
                  const techStatus = getTechnicianStatus(job.status);
                  const isRepairing = job.status === 'Repairing';
                  const isUrgent = job.priority === 'Urgent';

                  return (
                    <div
                      key={job.id}
                      className="bg-white rounded-3xl border border-[#E5E7EB] p-4 sm:p-5 space-y-3 shadow-xs hover:shadow-md transition-all"
                    >
                      {/* Top Job Header: Job Number, Priority & Status Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-[#111827] tracking-tight">
                            {job.job_number}
                          </span>
                          {isUrgent ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                              <span>URGENT</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-[#475467] border border-gray-200">
                              NORMAL
                            </span>
                          )}
                        </div>

                        {/* Status Badge Pill */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${techStatus.pill}`}
                        >
                          {isRepairing && (
                            <span className="w-2 h-2 rounded-full bg-[#00A854] animate-ping" />
                          )}
                          {techStatus.label}
                        </span>
                      </div>

                      {/* Main Information: Scooter & Rider Info */}
                      <div className="space-y-3 pt-0.5">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                          {/* Scooter */}
                          <div className="flex items-start gap-2.5">
                            <Bike className="w-4 h-4 text-[#667085] mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-xs sm:text-sm text-[#111827] font-mono leading-tight">
                                {job.scooter_number}
                              </p>
                              <span className="text-[11px] text-[#98A2B3] font-medium block mt-0.5">
                                Scooter
                              </span>
                            </div>
                          </div>

                          {/* Rider */}
                          <div className="flex items-start gap-2.5">
                            <User className="w-4 h-4 text-[#667085] mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-xs sm:text-sm text-[#111827] leading-tight truncate">
                                {job.rider_name}
                              </p>
                              <span className="text-[11px] text-[#98A2B3] font-medium block mt-0.5">
                                Rider
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Complaint / Issue Description */}
                        <div className="bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-2.5 sm:p-3 space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#475467] uppercase tracking-wider">
                            <FileText className="w-3.5 h-3.5 text-[#00A854]" />
                            <span>Complaint / Issue Description</span>
                          </div>
                          <p className="text-xs text-[#111827] font-medium leading-relaxed">
                            {job.complaint ? job.complaint : 'General vehicle diagnostic inspection & service check requested.'}
                          </p>
                        </div>

                        {/* Bottom Row: Assigned Time & Primary Action Button */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          {/* Assigned Time & Live Timer */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-[#98A2B3] flex-shrink-0" />
                            <span className="text-xs text-[#667085] font-medium truncate">
                              {new Date(job.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isRepairing && (
                              <span className="font-mono text-[10px] font-bold bg-[#EAFBF2] text-[#00A854] px-1.5 py-0.5 rounded border border-[#00D96B]/30 ml-1">
                                {getTimerString(job.repair_started_at)}
                              </span>
                            )}
                          </div>

                          {/* Action Button */}
                          <div>
                            {job.status === 'Pending Inspection' || job.status === 'Technician Assigned' ? (
                              <Link
                                href={`/admin/technician/jobs/${job.id}?action=inspect`}
                                className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95 whitespace-nowrap cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            ) : job.status === 'Inspection Completed' ? (
                              <Link
                                href={`/admin/technician/jobs/${job.id}`}
                                className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs rounded-xl transition whitespace-nowrap cursor-pointer hover:bg-purple-100"
                              >
                                <span>Awaiting Approval</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            ) : job.status === 'Repair Approved' ? (
                              <Link
                                href={`/admin/technician/jobs/${job.id}?action=start`}
                                className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95 whitespace-nowrap cursor-pointer"
                              >
                                <span>Start Work</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            ) : job.status === 'Repairing' ? (
                              <Link
                                href={`/admin/technician/jobs/${job.id}?action=complete`}
                                className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#00A854] hover:bg-[#008744] text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95 whitespace-nowrap cursor-pointer"
                              >
                                <span>Continue Work</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            ) : (
                              <Link
                                href={`/admin/technician/jobs/${job.id}`}
                                className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#EAFBF2] hover:bg-emerald-100 text-[#00A854] border border-[#00D96B]/30 font-bold text-xs rounded-xl transition whitespace-nowrap cursor-pointer"
                              >
                                <span>View Work</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: FIELD WORK DONE COMPLETION DRAWER */}
        {/* ========================================================================= */}
        {completingComplaint && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00A854] flex items-center justify-center font-bold">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Complete Field Repair</h2>
                    <p className="text-[11px] text-slate-500">Ticket {completingComplaint.complaint_number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCompletingComplaint(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitWorkDone} className="space-y-4 text-xs">
                {/* Work Performed */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Work Performed / Service Summary *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={workDoneForm.work_performed}
                    onChange={e => setWorkDoneForm({ ...workDoneForm, work_performed: e.target.value })}
                    placeholder="Describe what you repaired (e.g. replaced puncture tube, tightened front caliper, re-plugged BMS connector)..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#00D96B] focus:bg-white"
                  />
                </div>

                {/* Technician Remarks */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Technician Remarks / Road Test Notes
                  </label>
                  <input
                    type="text"
                    value={workDoneForm.technician_remarks}
                    onChange={e => setWorkDoneForm({ ...workDoneForm, technician_remarks: e.target.value })}
                    placeholder="e.g. Test drove 2km, brakes & acceleration smooth"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#00D96B] focus:bg-white"
                  />
                </div>

                {/* Parts Used Selection */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-slate-700">Spare Parts Replaced (Optional)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const defaultPart = inventoryList[0];
                        setWorkDoneForm({
                          ...workDoneForm,
                          parts_used: [
                            ...workDoneForm.parts_used,
                            {
                              part_name: defaultPart?.part_name || 'Tubeless Tyre Puncture Strip',
                              quantity: 1,
                              unit_price: defaultPart?.unit_price || 150,
                              total_price: defaultPart?.unit_price || 150
                            }
                          ]
                        });
                      }}
                      className="text-[11px] font-bold text-[#00A854] flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Part</span>
                    </button>
                  </div>

                  {workDoneForm.parts_used.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2">
                      <select
                        value={part.part_name}
                        onChange={e => {
                          const selected = inventoryList.find(i => i.part_name === e.target.value);
                          const updated = [...workDoneForm.parts_used];
                          updated[idx] = {
                            ...updated[idx],
                            part_name: e.target.value,
                            unit_price: selected?.unit_price || 150,
                            total_price: (selected?.unit_price || 150) * updated[idx].quantity
                          };
                          setWorkDoneForm({ ...workDoneForm, parts_used: updated });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                      >
                        {inventoryList.map(inv => (
                          <option key={inv.id} value={inv.part_name}>
                            {inv.part_name} (₹{inv.unit_price})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={e => {
                          const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
                          const updated = [...workDoneForm.parts_used];
                          updated[idx].quantity = qty;
                          updated[idx].total_price = qty * updated[idx].unit_price;
                          setWorkDoneForm({ ...workDoneForm, parts_used: updated });
                        }}
                        className="w-14 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-bold"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const updated = workDoneForm.parts_used.filter((_, i) => i !== idx);
                          setWorkDoneForm({ ...workDoneForm, parts_used: updated });
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCompletingComplaint(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingWorkDone}
                    className="px-6 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingWorkDone ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>Submit & Finish Work</span>
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
