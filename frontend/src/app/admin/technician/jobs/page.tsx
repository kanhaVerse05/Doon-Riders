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
  ArrowDown
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

  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'INSPECTION_PENDING' | 'WORK_PENDING' | 'WORK_IN_PROGRESS' | 'COMPLETED_TODAY'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Normal' | 'Urgent'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [selectedTechId, setSelectedTechId] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pull-to-refresh state & handlers
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartYRef = useRef(0);
  const isPullingRef = useRef(false);

  // Live Timer Heartbeat for active repairs
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Determine current technician identity
  const isTechnicianRole = user?.roleName === 'TECHNICIAN' || user?.roleName?.includes('TECH');

  const fetchJobs = async () => {
    try {
      const url = `/admin/repair-jobs?limit=100`;
      const res = await adminApi.get(url);
      if (res && res.success) {
        let allJobs: RepairJob[] = res.data || [];
        if (res.technicians) {
          setTechnicians(res.technicians);
        }

        // If user is a technician, strictly match to their technician record or user id
        if (isTechnicianRole && user) {
          const matchedTech = res.technicians?.find(
            (t: Technician) =>
              t.name.toLowerCase() === user.name.toLowerCase() ||
              t.id === user.id ||
              (user.email && t.phone && user.phone === t.phone)
          );
          const techId = matchedTech ? matchedTech.id : user.id;
          allJobs = allJobs.filter((j: RepairJob) => j.technician_id === techId || j.technician_name?.toLowerCase() === user.name?.toLowerCase());
        } else if (selectedTechId !== 'all') {
          allJobs = allJobs.filter((j: RepairJob) => j.technician_id === Number(selectedTechId));
        }

        setJobs(allJobs);
      }
    } catch (err) {
      console.error('Failed to load technician jobs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchJobs();
  }, [selectedTechId, isTechnicianRole, user]);

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
      await fetchJobs();
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 400);
    } else {
      setPullDistance(0);
    }
  };

  // Compute live elapsed duration string
  const getElapsedDuration = (startedAt: string | null | undefined): string => {
    if (!startedAt) return '00:00:00';
    const startMs = new Date(startedAt).getTime();
    const diffSec = Math.max(0, Math.floor((currentTimeMs - startMs) / 1000));
    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Helper to map DB status to Technician-facing simplified status
  const getTechStatus = (status: string) => {
    if (status === 'Pending Inspection' || status === 'Technician Assigned') {
      return {
        label: 'Inspection Pending',
        pill: 'bg-amber-50 text-amber-600',
        step: 1
      };
    }
    if (status === 'Inspection Completed') {
      return {
        label: 'Approval Pending',
        pill: 'bg-purple-50 text-purple-700',
        step: 2
      };
    }
    if (status === 'Repair Approved') {
      return {
        label: 'Work Pending',
        pill: 'bg-[#EFF6FF] text-[#0066FF]',
        step: 2
      };
    }
    if (status === 'Repairing') {
      return {
        label: 'Work In Progress',
        pill: 'bg-[#EAFBF2] text-[#00A854]',
        step: 2
      };
    }
    return {
      label: 'Work Completed',
      pill: 'bg-[#EAFBF2] text-[#00A854]',
      step: 3
    };
  };

  // Summary Metrics calculations
  const totalAssigned = jobs.length;
  const inspectionPending = jobs.filter(
    j => j.status === 'Pending Inspection' || j.status === 'Technician Assigned'
  ).length;
  const workPending = jobs.filter(
    j => j.status === 'Inspection Completed' || j.status === 'Repair Approved'
  ).length;
  const workInProgress = jobs.filter(j => j.status === 'Repairing').length;

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const completedToday = jobs.filter(j => {
    const isCompletedStatus =
      j.status === 'Repair Completed' ||
      j.status === 'Billing Completed' ||
      j.status === 'Payment Pending' ||
      j.status === 'Payment Received' ||
      j.status === 'Closed';
    const completionDate = j.repair_completed_at || j.updated_at || '';
    return isCompletedStatus && completionDate.startsWith(todayDateStr);
  }).length;

  // Filter and search application
  const filteredJobs = jobs.filter(job => {
    const s = search.toLowerCase().trim();
    const matchesSearch =
      !s ||
      job.job_number.toLowerCase().includes(s) ||
      job.scooter_number.toLowerCase().includes(s) ||
      job.rider_name.toLowerCase().includes(s) ||
      job.rider_contact.toLowerCase().includes(s) ||
      job.complaint.toLowerCase().includes(s) ||
      job.hub_name.toLowerCase().includes(s);

    if (!matchesSearch) return false;

    if (priorityFilter !== 'all' && job.priority !== priorityFilter) {
      return false;
    }

    if (dateFilter === 'today') {
      const jobDate = job.created_at ? job.created_at.slice(0, 10) : '';
      if (jobDate !== todayDateStr) return false;
    } else if (dateFilter === 'week') {
      const now = new Date();
      const jobDate = new Date(job.created_at);
      const diffDays = (now.getTime() - jobDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays > 7) return false;
    }

    if (filterTab === 'INSPECTION_PENDING') {
      return job.status === 'Pending Inspection' || job.status === 'Technician Assigned';
    }
    if (filterTab === 'WORK_PENDING') {
      return job.status === 'Inspection Completed' || job.status === 'Repair Approved';
    }
    if (filterTab === 'WORK_IN_PROGRESS') {
      return job.status === 'Repairing';
    }
    if (filterTab === 'COMPLETED_TODAY') {
      const isCompleted =
        job.status === 'Repair Completed' ||
        job.status === 'Billing Completed' ||
        job.status === 'Payment Pending' ||
        job.status === 'Payment Received' ||
        job.status === 'Closed';
      return isCompleted;
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
        {/* ========================================================= */}
        {/* PULL TO REFRESH ANIMATED INDICATOR (INSTAGRAM STYLE) */}
        {/* ========================================================= */}
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

        {/* ========================================================= */}
        {/* TOAST NOTIFICATION */}
        {/* ========================================================= */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 bg-[#111827] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-[#00D96B]/40 text-xs animate-bounce">
            <Sparkles className="w-4 h-4 text-[#00D96B]" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 1. PAGE HEADER (CLEAN - REFRESH BUTTON REMOVED AS REQUESTED) */}
        {/* ========================================================= */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#111827] tracking-tight">
              Job Work Summary
            </h1>
            <p className="text-xs text-[#667085] font-medium mt-0.5">
              Track and manage your assigned jobs
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

        {/* ========================================================= */}
        {/* 2. JOB SUMMARY CARDS */}
        {/* ========================================================= */}
        {loading ? (
          /* SKELETON KPI CARDS */
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-3.5 border border-[#E5E7EB] shadow-xs animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gray-200" />
                    <div className="w-20 h-3 bg-gray-200 rounded" />
                  </div>
                  <div className="w-6 h-6 rounded-full bg-gray-100" />
                </div>
                <div className="w-10 h-7 bg-gray-200 rounded" />
                <div className="w-full h-1.5 bg-gray-100 rounded-full" />
              </div>
            ))}
            <div className="col-span-2 bg-white rounded-2xl p-3.5 border border-[#E5E7EB] shadow-xs animate-pulse space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-200" />
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-100" />
              </div>
              <div className="w-10 h-7 bg-gray-200 rounded" />
              <div className="w-full h-1.5 bg-gray-100 rounded-full" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
            {/* Card 1: Assigned Jobs */}
            <div
              onClick={() => setFilterTab(filterTab === 'ALL' ? 'ALL' : 'ALL')}
              className={`bg-white rounded-2xl p-3.5 border transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                filterTab === 'ALL'
                  ? 'border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#344054]">
                    Assigned Jobs
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#EAFBF2] text-[#00A854] flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-[#111827] mt-2 tracking-tight">
                {totalAssigned}
              </div>

              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-[#00D96B] rounded-full w-2/5" />
              </div>
            </div>

            {/* Card 2: Inspect Pending */}
            <div
              onClick={() => setFilterTab(filterTab === 'INSPECTION_PENDING' ? 'ALL' : 'INSPECTION_PENDING')}
              className={`bg-white rounded-2xl p-3.5 border transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                filterTab === 'INSPECTION_PENDING'
                  ? 'border-amber-400 ring-2 ring-amber-500/20'
                  : 'border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#344054]">
                    Inspect Pending
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-[#111827] mt-2 tracking-tight">
                {inspectionPending}
              </div>

              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-2/5" />
              </div>
            </div>

            {/* Card 3: Work Pending */}
            <div
              onClick={() => setFilterTab(filterTab === 'WORK_PENDING' ? 'ALL' : 'WORK_PENDING')}
              className={`bg-white rounded-2xl p-3.5 border transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                filterTab === 'WORK_PENDING'
                  ? 'border-blue-400 ring-2 ring-blue-500/20'
                  : 'border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#0066FF] flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 fill-blue-500/20 stroke-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-[#344054]">
                    Work Pending
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#EFF6FF] text-[#0066FF] flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-[#111827] mt-2 tracking-tight">
                {workPending}
              </div>

              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-[#0066FF] rounded-full w-2/5" />
              </div>
            </div>

            {/* Card 4: In Progress */}
            <div
              onClick={() => setFilterTab(filterTab === 'WORK_IN_PROGRESS' ? 'ALL' : 'WORK_IN_PROGRESS')}
              className={`bg-white rounded-2xl p-3.5 border transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                filterTab === 'WORK_IN_PROGRESS'
                  ? 'border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center flex-shrink-0">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#00A854] inline-block shadow-xs" />
                  </div>
                  <span className="text-xs font-bold text-[#344054]">
                    In Progress
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#EAFBF2] text-[#00A854] flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-[#111827] mt-2 tracking-tight">
                {workInProgress}
              </div>

              <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-[#00D96B] rounded-full w-2/5" />
              </div>
            </div>

            {/* Card 5: Completed (Spans Full Width) */}
            <div
              onClick={() => setFilterTab(filterTab === 'COMPLETED_TODAY' ? 'ALL' : 'COMPLETED_TODAY')}
              className={`col-span-2 bg-white rounded-2xl p-3.5 border transition cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                filterTab === 'COMPLETED_TODAY'
                  ? 'border-purple-400 ring-2 ring-purple-500/20'
                  : 'border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#344054]">
                    Completed
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-[#111827] mt-1.5 tracking-tight">
                {completedToday}
              </div>

              <div className="w-full h-1.5 bg-purple-50 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full w-2/5" />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. SEARCH + FILTER SECTION */}
        {/* ========================================================= */}
        <div className="space-y-2.5">
          {/* Search Box */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3] pointer-events-none" />
            <input
              type="text"
              placeholder="Search Job ID, Scooter, Rider, Issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-[#111827] placeholder:text-[#98A2B3] shadow-[0_1px_3px_rgba(0,0,0,0.02)] focus:outline-none focus:ring-2 focus:ring-[#00D96B] focus:border-transparent transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#111827] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns: 2-Column Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Priority Filter */}
            <div className="relative bg-white border border-[#E5E7EB] rounded-2xl px-3 py-2 flex items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#667085] mr-2 flex-shrink-0" />
              <select
                value={priorityFilter}
                onChange={(e: any) => setPriorityFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-[#344054] focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent Priority</option>
                <option value="Normal">Normal Priority</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#98A2B3] absolute right-3 pointer-events-none" />
            </div>

            {/* Date Filter */}
            <div className="relative bg-white border border-[#E5E7EB] rounded-2xl px-3 py-2 flex items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <Calendar className="w-3.5 h-3.5 text-[#667085] mr-2 flex-shrink-0" />
              <select
                value={dateFilter}
                onChange={(e: any) => setDateFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-[#344054] focus:outline-none cursor-pointer appearance-none pr-4"
              >
                <option value="all">Today</option>
                <option value="today">Today Only</option>
                <option value="week">This Week</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#98A2B3] absolute right-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. JOB WORK CARDS (NATIVE MOBILE STYLE WITH SKELETON) */}
        {/* ========================================================= */}
        {loading ? (
          /* SKELETON JOB CARDS */
          <div className="space-y-3.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-xs space-y-3.5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-5 bg-gray-200 rounded-md" />
                    <div className="w-14 h-4 bg-gray-100 rounded-md" />
                  </div>
                  <div className="w-24 h-6 bg-gray-100 rounded-full" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100" />
                    <div className="space-y-1">
                      <div className="w-20 h-3.5 bg-gray-200 rounded" />
                      <div className="w-12 h-2.5 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100" />
                    <div className="space-y-1">
                      <div className="w-20 h-3.5 bg-gray-200 rounded" />
                      <div className="w-12 h-2.5 bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                  <div className="w-32 h-3 bg-gray-200 rounded" />
                  <div className="w-full h-3.5 bg-gray-200 rounded" />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                  <div className="w-28 h-8 bg-gray-200 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-10 text-center shadow-xs">
            <div className="w-12 h-12 bg-[#EAFBF2] text-[#00A854] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#111827]">No Assigned Jobs Found</h3>
            <p className="text-xs text-[#667085] mt-1">
              {filterTab !== 'ALL'
                ? `No jobs in "${filterTab.replace('_', ' ')}" status.`
                : 'You have no assigned jobs in queue right now. Pull down to refresh anytime.'}
            </p>
            {filterTab !== 'ALL' && (
              <button
                onClick={() => setFilterTab('ALL')}
                className="mt-3 px-3.5 py-1.5 bg-[#111827] text-white text-xs font-bold rounded-xl"
              >
                Show All Jobs
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredJobs.map((job) => {
              const techStatus = getTechStatus(job.status);
              const isUrgent = job.priority === 'Urgent';
              const isRepairing = job.status === 'Repairing';

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-3.5"
                >
                  {/* Card Header: Job ID + Priority Badge (Left) & Status Badge (Right) */}
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

                    {/* Complaint / Issue Description (Replaced Hub & Contact as requested) */}
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
                            {getElapsedDuration(job.repair_started_at)}
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      <div>
                        {job.status === 'Pending Inspection' || job.status === 'Technician Assigned' ? (
                          <Link
                            href={`/admin/technician/jobs/${job.id}?action=inspect`}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95 whitespace-nowrap"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : job.status === 'Inspection Completed' ? (
                          <Link
                            href={`/admin/technician/jobs/${job.id}`}
                            className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs rounded-xl transition whitespace-nowrap"
                          >
                            <span>Awaiting Approval</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : job.status === 'Repair Approved' ? (
                          <Link
                            href={`/admin/technician/jobs/${job.id}?action=start`}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95 whitespace-nowrap"
                          >
                            <span>Start Work</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : job.status === 'Repairing' ? (
                          <Link
                            href={`/admin/technician/jobs/${job.id}?action=complete`}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#00A854] hover:bg-[#008744] text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95 whitespace-nowrap"
                          >
                            <span>Continue Work</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <Link
                            href={`/admin/technician/jobs/${job.id}`}
                            className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-[#EAFBF2] hover:bg-emerald-100 text-[#00A854] border border-[#00D96B]/30 font-bold text-xs rounded-xl transition whitespace-nowrap"
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
    </AdminLayout>
  );
}
