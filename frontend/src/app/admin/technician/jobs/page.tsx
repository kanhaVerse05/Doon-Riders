'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '../../../../components/admin/AdminLayout';
import { useAuth } from '../../../../context/AuthContext';
import { adminApi } from '../../../../lib/adminApi';
import { buildNavigationUrl, getExactLocationUrl, extractCoordsFromUrl, isValidLatLng } from '../../../../lib/locationUtils';
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
  Building,
  Crosshair,
  Activity,
  RotateCcw,
  DollarSign,
  ShieldAlert,
  Truck
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

  // Top Workspace Mode: Workshop Jobs vs Field Complaints vs Return Inspections vs Recovery Inspections
  const [workspaceMode, setWorkspaceMode] = useState<'WORKSHOP' | 'FIELD_COMPLAINTS' | 'RETURN_INSPECTIONS' | 'RECOVERY_INSPECTIONS'>('WORKSHOP');

  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [fieldComplaints, setFieldComplaints] = useState<Complaint[]>([]);
  const [returnInspections, setReturnInspections] = useState<any[]>([]);
  const [recoveryInspections, setRecoveryInspections] = useState<any[]>([]);
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

  const [inspectingReturn, setInspectingReturn] = useState<any | null>(null);
  const [inspectionDamages, setInspectionDamages] = useState<Array<{
    id: string;
    part_name: string;
    category?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    technician_remark?: string;
  }>>([]);
  const [submittingInspection, setSubmittingInspection] = useState(false);

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

  // Fetch Jobs, Field Complaints & Return Inspections
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

      // 3. Scooty Return Inspections
      const returnsRes = await adminApi.get('/admin/returns?limit=100');
      if (returnsRes && returnsRes.success) {
        let allReturns: any[] = returnsRes.data || [];
        if (isTechnicianRole && user) {
          const matchedTech = jobsRes?.technicians?.find(
            (t: Technician) =>
              t.name.toLowerCase() === user.name.toLowerCase() ||
              t.id === user.id ||
              (user.phone && t.phone && user.phone === t.phone)
          );
          const techId = matchedTech ? matchedTech.id : user.id;
          allReturns = allReturns.filter(
            (r: any) => r.technician_id === techId || r.technician_name?.toLowerCase() === user.name?.toLowerCase()
          );
        } else if (selectedTechId !== 'all') {
          allReturns = allReturns.filter((r: any) => r.technician_id === Number(selectedTechId));
        }

        setReturnInspections(allReturns);
      }

      // 4. Scooty Recovery Inspections
      const recoveriesRes = await adminApi.get('/admin/recoveries?limit=100');
      if (recoveriesRes && recoveriesRes.success) {
        let allRecoveries: any[] = recoveriesRes.data || [];
        if (isTechnicianRole && user) {
          const matchedTech = jobsRes?.technicians?.find(
            (t: Technician) =>
              t.name.toLowerCase() === user.name.toLowerCase() ||
              t.id === user.id ||
              (user.phone && t.phone && user.phone === t.phone)
          );
          const techId = matchedTech ? matchedTech.id : user.id;
          allRecoveries = allRecoveries.filter(
            (r: any) => r.technician_id === techId || r.technician_name?.toLowerCase() === user.name?.toLowerCase()
          );
        } else if (selectedTechId !== 'all') {
          allRecoveries = allRecoveries.filter((r: any) => r.technician_id === Number(selectedTechId));
        }

        setRecoveryInspections(allRecoveries);
      }
    } catch (err) {
      console.error('Failed to load technician jobs, complaints, returns and recoveries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [selectedTechId, isTechnicianRole, user]);

  // -------------------------------------------------------------
  // Live Continuous High-Accuracy GPS Broadcaster Engine
  // -------------------------------------------------------------
  const [gpsTelemetry, setGpsTelemetry] = useState<{
    isSupported: boolean;
    isWatching: boolean;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    lastSentAt: string | null;
    pingCount: number;
    errorMessage: string | null;
    isTransmitting: boolean;
  }>({
    isSupported: true,
    isWatching: false,
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    lastSentAt: null,
    pingCount: 0,
    errorMessage: null,
    isTransmitting: false
  });

  const fieldComplaintsRef = useRef<Complaint[]>([]);
  useEffect(() => {
    fieldComplaintsRef.current = fieldComplaints;
  }, [fieldComplaints]);

  // Robust location broadcaster to server
  const broadcastCoordinates = useCallback(async (
    lat: number,
    lng: number,
    accuracy?: number,
    speed?: number,
    heading?: number
  ) => {
    const activeComplaints = fieldComplaintsRef.current.filter(
      c => c.status === 'En Route' || c.status === 'Assigned' || c.status === 'Reached' || c.status === 'Work In Progress'
    );

    if (activeComplaints.length === 0) return;

    setGpsTelemetry(prev => ({ ...prev, isTransmitting: true }));
    const now = new Date().toISOString();

    for (const c of activeComplaints) {
      try {
        await adminApi.post(`/admin/complaints/${c.id}/location`, {
          latitude: lat,
          longitude: lng,
          accuracy: accuracy || null,
          speed: speed || null,
          heading: heading || null
        });
      } catch (err) {
        console.warn(`[GPS Sync Failed] complaint #${c.complaint_number}:`, err);
      }
    }

    setGpsTelemetry(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      accuracy: accuracy ? Math.round(accuracy) : prev.accuracy,
      speed: speed ? Math.round(speed * 3.6) : prev.speed,
      heading: heading !== undefined ? heading : prev.heading,
      lastSentAt: now,
      pingCount: prev.pingCount + 1,
      errorMessage: null,
      isTransmitting: false
    }));
  }, []);

  // Persistent Continuous Watcher with maximumAge: 0
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!navigator.geolocation) {
      setGpsTelemetry(prev => ({
        ...prev,
        isSupported: false,
        errorMessage: 'GPS is not supported on this browser'
      }));
      return;
    }

    setGpsTelemetry(prev => ({ ...prev, isSupported: true, isWatching: true, errorMessage: null }));

    const handleSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed, heading } = pos.coords;
      broadcastCoordinates(latitude, longitude, accuracy, speed || undefined, heading || undefined);
    };

    const handleError = (err: GeolocationPositionError) => {
      let msg = 'Acquiring satellite GPS fix...';
      if (err.code === 1) {
        msg = 'Location permission denied. Please allow GPS access in browser settings.';
      } else if (err.code === 2) {
        msg = 'GPS unavailable. Please enable device Location / GPS.';
      } else if (err.code === 3) {
        msg = 'GPS request timed out. Retrying satellite lock...';
      }
      setGpsTelemetry(prev => ({ ...prev, errorMessage: msg, isTransmitting: false }));
    };

    // 1. Initial lock
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });

    // 2. High-Accuracy watchPosition with maximumAge: 0 (No stale cache)
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    });

    // 3. Periodic 2.5s heartbeat ping when any job is active
    const heartbeatTimer = setInterval(() => {
      const hasActiveJobs = fieldComplaintsRef.current.some(
        c => c.status === 'En Route' || c.status === 'Work In Progress' || c.status === 'Reached' || c.status === 'Assigned'
      );
      if (hasActiveJobs) {
        navigator.geolocation.getCurrentPosition(handleSuccess, () => {}, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 6000
        });
      }
    }, 2500);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeatTimer);
    };
  }, [broadcastCoordinates]);

  const [sendingManualPing, setSendingManualPing] = useState(false);

  // Manual GPS Ping Trigger
  const handleManualGPSPing = async (complaintId?: number) => {
    try {
      setSendingManualPing(true);
      if (!navigator.geolocation) {
        alert('Geolocation is not supported on this browser');
        return;
      }
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 7000,
          enableHighAccuracy: true,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy, speed, heading } = pos.coords;
      await broadcastCoordinates(latitude, longitude, accuracy, speed || undefined, heading || undefined);

      if (complaintId) {
        await adminApi.post(`/admin/complaints/${complaintId}/location`, {
          latitude,
          longitude,
          accuracy
        });
      }

      showToast('Live GPS coordinates broadcasted successfully!');
      fetchData();
    } catch (err: any) {
      alert('Failed to get GPS: ' + (err.message || 'Permission denied'));
    } finally {
      setSendingManualPing(false);
    }
  };

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

  // Return Inspection Handlers (Matching Image 2: S.No, Item from Inventory, Qty Stepper, Price)
  const handleOpenInspectionModal = (returnItem: any) => {
    setInspectingReturn(returnItem);
    const existingDamages = Array.isArray(returnItem.damage_items) && returnItem.damage_items.length > 0
      ? returnItem.damage_items.map((d: any, idx: number) => ({
          id: d.id || `dmg-${idx + 1}-${Date.now()}`,
          part_name: d.part_name || '',
          category: d.category || 'General',
          quantity: Number(d.quantity) || 1,
          unit_price: Number(d.unit_price) || 0,
          total_price: Number(d.total_price) !== undefined ? Number(d.total_price) : (Number(d.quantity) || 1) * (Number(d.unit_price) || 0),
          technician_remark: d.technician_remark || ''
        }))
      : [
          {
            id: `dmg-1-${Date.now()}`,
            part_name: '',
            category: 'General',
            quantity: 1,
            unit_price: 0,
            total_price: 0,
            technician_remark: ''
          }
        ];
    setInspectionDamages(existingDamages);
  };

  const handleAddDamageRow = () => {
    setInspectionDamages(prev => [
      ...prev,
      {
        id: `dmg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        part_name: '',
        category: 'General',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        technician_remark: ''
      }
    ]);
  };

  const handleSelectInventoryItem = (rowId: string, partName: string) => {
    const selected = inventoryList.find(i => i.part_name === partName);
    setInspectionDamages(prev => prev.map(d => {
      if (d.id !== rowId) return d;
      const unitPrice = selected ? Number(selected.unit_price) || 0 : d.unit_price;
      const qty = d.quantity || 1;
      return {
        ...d,
        part_name: partName,
        category: selected?.category || 'General',
        unit_price: unitPrice,
        total_price: qty * unitPrice
      };
    }));
  };

  const handleIncrementQty = (rowId: string) => {
    setInspectionDamages(prev => prev.map(d => {
      if (d.id !== rowId) return d;
      const newQty = (Number(d.quantity) || 1) + 1;
      return {
        ...d,
        quantity: newQty,
        total_price: newQty * (Number(d.unit_price) || 0)
      };
    }));
  };

  const handleDecrementQty = (rowId: string) => {
    setInspectionDamages(prev => prev.map(d => {
      if (d.id !== rowId) return d;
      const newQty = Math.max(1, (Number(d.quantity) || 1) - 1);
      return {
        ...d,
        quantity: newQty,
        total_price: newQty * (Number(d.unit_price) || 0)
      };
    }));
  };

  const handleQuantityInput = (rowId: string, value: string) => {
    const qty = Math.max(1, parseInt(value, 10) || 1);
    setInspectionDamages(prev => prev.map(d => {
      if (d.id !== rowId) return d;
      return {
        ...d,
        quantity: qty,
        total_price: qty * (Number(d.unit_price) || 0)
      };
    }));
  };

  const handlePriceInput = (rowId: string, value: string) => {
    const price = Math.max(0, parseFloat(value) || 0);
    setInspectionDamages(prev => prev.map(d => {
      if (d.id !== rowId) return d;
      return {
        ...d,
        unit_price: price,
        total_price: (Number(d.quantity) || 1) * price
      };
    }));
  };

  const handleCustomNameInput = (rowId: string, value: string) => {
    setInspectionDamages(prev => prev.map(d => {
      if (d.id !== rowId) return d;
      return {
        ...d,
        part_name: value
      };
    }));
  };

  const handleRemoveDamageRow = (rowId: string) => {
    setInspectionDamages(prev => {
      const remaining = prev.filter(d => d.id !== rowId);
      return remaining.length > 0 ? remaining : [
        {
          id: `dmg-${Date.now()}`,
          part_name: '',
          category: 'General',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
          technician_remark: ''
        }
      ];
    });
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingReturn) return;

    // Filter out rows that have empty part name
    const validDamages = inspectionDamages.filter(d => d.part_name && d.part_name.trim() !== '');

    const endpoint = inspectingReturn.recovery_number
      ? `/admin/recoveries/${inspectingReturn.id}/inspection`
      : `/admin/returns/${inspectingReturn.id}/inspection`;

    try {
      setSubmittingInspection(true);
      const res = await adminApi.post(endpoint, {
        damage_items: validDamages
      });

      if (res && res.success) {
        showToast('Damage inspection report submitted successfully!');
        setInspectingReturn(null);
        fetchData();
      } else {
        alert(res?.message || 'Failed to submit inspection report');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting inspection');
    } finally {
      setSubmittingInspection(false);
    }
  };

  // Helper: Open WhatsApp
  const handleWhatsApp = (phone: string, name: string, complaintNo: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formatted = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Hello ${name}, DOON RIDERS Technician here regarding ticket ${complaintNo}.`);
    window.open(`https://wa.me/${formatted}?text=${msg}`, '_blank');
  };

  // Summary counts
  const totalAssignedWorkshop = jobs.length;
  const activeFieldComplaints = fieldComplaints.filter(c => c.status !== 'Closed');
  const activeEnRouteCount = fieldComplaints.filter(c => c.status === 'En Route' || c.status === 'Reached' || c.status === 'Work In Progress').length;
  const pendingReturnsCount = returnInspections.filter(r => r.status === 'Pending Inspection' || r.status === 'Inspection in Progress').length;
  const totalReturnsCount = returnInspections.length;
  const pendingRecoveriesCount = recoveryInspections.filter(r => r.status === 'Pending Inspection' || r.status === 'Inspection in Progress').length;
  const totalRecoveriesCount = recoveryInspections.length;

  const [returnFilterTab, setReturnFilterTab] = useState<'ALL' | 'PENDING' | 'INSPECTED' | 'COMPLETED'>('ALL');
  const [recoveryFilterTab, setRecoveryFilterTab] = useState<'ALL' | 'PENDING' | 'INSPECTED' | 'COMPLETED'>('ALL');

  // Filtered Returns
  const filteredReturns = returnInspections.filter(ret => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = ret.return_number?.toLowerCase().includes(q);
      const matchScoot = ret.scooter_number?.toLowerCase().includes(q);
      const matchRider = ret.rider_name?.toLowerCase().includes(q);
      const matchPhone = ret.rider_phone?.toLowerCase().includes(q);
      if (!matchNum && !matchScoot && !matchRider && !matchPhone) return false;
    }

    if (returnFilterTab === 'PENDING') {
      if (ret.status !== 'Pending Inspection' && ret.status !== 'Inspection in Progress') return false;
    } else if (returnFilterTab === 'INSPECTED') {
      if (ret.status !== 'Inspection Completed') return false;
    } else if (returnFilterTab === 'COMPLETED') {
      if (ret.status !== 'Completed') return false;
    }

    return true;
  });

  // Filtered Recoveries
  const filteredRecoveries = recoveryInspections.filter(rec => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum = rec.recovery_number?.toLowerCase().includes(q);
      const matchScoot = rec.scooter_number?.toLowerCase().includes(q);
      const matchRider = rec.rider_name?.toLowerCase().includes(q);
      const matchPhone = rec.rider_phone?.toLowerCase().includes(q);
      const matchRecBy = rec.recovered_by?.toLowerCase().includes(q);
      if (!matchNum && !matchScoot && !matchRider && !matchPhone && !matchRecBy) return false;
    }

    if (recoveryFilterTab === 'PENDING') {
      if (rec.status !== 'Pending Inspection' && rec.status !== 'Inspection in Progress') return false;
    } else if (recoveryFilterTab === 'INSPECTED') {
      if (rec.status !== 'Inspection Completed') return false;
    } else if (recoveryFilterTab === 'COMPLETED') {
      if (rec.status !== 'Completed') return false;
    }

    return true;
  });

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

        {/* Live GPS Telemetry Status Banner */}
        <div
          className={`p-3.5 sm:p-4 rounded-3xl border transition-all shadow-sm ${
            gpsTelemetry.errorMessage
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-[#0A0F1D] text-white border-slate-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  gpsTelemetry.errorMessage
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-emerald-950 border border-[#00D96B]/40 text-[#00D96B]'
                }`}
              >
                <Radio className={`w-5 h-5 ${gpsTelemetry.errorMessage ? '' : 'animate-ping'}`} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black tracking-tight">
                    {gpsTelemetry.errorMessage
                      ? 'GPS Satellite Lock Needed'
                      : 'Live High-Accuracy GPS Broadcaster'}
                  </span>
                  {!gpsTelemetry.errorMessage && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00D96B]/20 text-[#00D96B] border border-[#00D96B]/40 uppercase tracking-wider">
                      Streaming
                    </span>
                  )}
                  {gpsTelemetry.isTransmitting && (
                    <span className="w-2 h-2 rounded-full bg-[#00D96B] animate-spin" />
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-300">
                  {gpsTelemetry.errorMessage ? (
                    <span className="text-amber-800 font-bold">{gpsTelemetry.errorMessage}</span>
                  ) : gpsTelemetry.latitude && gpsTelemetry.longitude ? (
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-[#00D96B] font-black">
                        {gpsTelemetry.latitude.toFixed(4)}° N, {gpsTelemetry.longitude.toFixed(4)}° E
                      </strong>
                      {gpsTelemetry.accuracy ? (
                        <span className="text-slate-400">(&plusmn;{gpsTelemetry.accuracy}m accuracy)</span>
                      ) : null}
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-slate-400">Pings Sent: <b>#{gpsTelemetry.pingCount}</b></span>
                    </span>
                  ) : (
                    <span>Acquiring device GPS satellite fix...</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {gpsTelemetry.errorMessage ? (
                <button
                  type="button"
                  onClick={() => handleManualGPSPing()}
                  className="px-3.5 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Grant / Retry GPS</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleManualGPSPing()}
                  disabled={sendingManualPing}
                  className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[#00D96B] font-extrabold text-xs transition cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
                  title="Broadcast current live position immediately"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${sendingManualPing ? 'animate-spin' : ''}`} />
                  <span>Force GPS Ping</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Top Mode Switcher Tabs */}
        <div className="flex items-center gap-2 bg-[#F2F4F7] p-1.5 rounded-2xl border border-[#E5E7EB]">
          <button
            onClick={() => setWorkspaceMode('WORKSHOP')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              workspaceMode === 'WORKSHOP'
                ? 'bg-white text-[#111827] shadow-sm border border-[#E5E7EB]'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Workshop</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              workspaceMode === 'WORKSHOP' ? 'bg-[#00D96B] text-[#0A0F1D]' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalAssignedWorkshop}
            </span>
          </button>

          <button
            onClick={() => setWorkspaceMode('FIELD_COMPLAINTS')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              workspaceMode === 'FIELD_COMPLAINTS'
                ? 'bg-[#0A0F1D] text-white shadow-md'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${activeEnRouteCount > 0 ? 'text-[#00D96B] animate-pulse' : ''}`} />
            <span>Field</span>
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

          <button
            onClick={() => setWorkspaceMode('RETURN_INSPECTIONS')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              workspaceMode === 'RETURN_INSPECTIONS'
                ? 'bg-indigo-950 text-white shadow-md'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${pendingReturnsCount > 0 ? 'text-amber-400' : ''}`} />
            <span>Returns</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              pendingReturnsCount > 0
                ? 'bg-amber-400 text-amber-950'
                : workspaceMode === 'RETURN_INSPECTIONS'
                ? 'bg-[#00D96B] text-[#0A0F1D]'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingReturnsCount}
            </span>
          </button>

          <button
            onClick={() => setWorkspaceMode('RECOVERY_INSPECTIONS')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 ${
              workspaceMode === 'RECOVERY_INSPECTIONS'
                ? 'bg-red-950 text-white shadow-md'
                : 'text-[#667085] hover:text-[#111827]'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${pendingRecoveriesCount > 0 ? 'text-amber-400' : ''}`} />
            <span>Recoveries</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              pendingRecoveriesCount > 0
                ? 'bg-amber-400 text-amber-950'
                : workspaceMode === 'RECOVERY_INSPECTIONS'
                ? 'bg-[#00D96B] text-[#0A0F1D]'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {pendingRecoveriesCount}
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

                  let custLat = parseFloat(String(complaint.latitude || ''));
                  let custLng = parseFloat(String(complaint.longitude || ''));

                  // Auto-extract from location_url if coordinates are not valid numbers
                  if (!isValidLatLng(custLat, custLng) && complaint.location_url) {
                    const parsed = extractCoordsFromUrl(complaint.location_url);
                    if (parsed) {
                      custLat = parsed.lat;
                      custLng = parsed.lng;
                    }
                  }

                  const techLat = parseFloat(String(complaint.technician_latitude || ''));
                  const techLng = parseFloat(String(complaint.technician_longitude || ''));

                  // Exact Google Maps turn-by-turn navigation
                  const navigateUrl = buildNavigationUrl(custLat, custLng, techLat, techLng, complaint.location_url);
                  const exactPinUrl = getExactLocationUrl(complaint.location_url, custLat, custLng);

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

                        <div className="pt-2 border-t border-slate-200/60 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                              <span className="text-[11px] text-slate-700 font-medium leading-tight">
                                {complaint.location_address}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {complaint.location_url && (
                                <a
                                  href={complaint.location_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] border border-slate-300 flex items-center gap-1 shrink-0"
                                  title="Open exact Google Maps URL provided in complaint"
                                >
                                  <ExternalLink className="w-3 h-3 text-blue-600" />
                                  <span>Pin Link</span>
                                </a>
                              )}
                              <a
                                href={navigateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] flex items-center gap-1 shrink-0 shadow-sm shadow-emerald-600/20"
                                title="Start GPS turn-by-turn navigation in Google Maps"
                              >
                                <Navigation className="w-3 h-3" />
                                <span>Navigate</span>
                              </a>
                            </div>
                          </div>

                          {/* Exact GPS Coords Tag */}
                          {isValidLatLng(custLat, custLng) && (
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200/80">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Target GPS: {Number(custLat).toFixed(4)}, {Number(custLng).toFixed(4)}</span>
                              </span>
                              <span className="text-emerald-700 font-bold font-sans">Exact Spot</span>
                            </div>
                          )}
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

                          {/* Live Coordinates & Telemetry */}
                          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-400">GPS Stream:</span>
                            <span className="text-[#00D96B] font-bold">
                              {isValidLatLng(complaint.technician_latitude, complaint.technician_longitude)
                                ? `${Number(complaint.technician_latitude).toFixed(4)}, ${Number(complaint.technician_longitude).toFixed(4)}`
                                : 'Broadcasting Live'}
                            </span>
                          </div>

                          {/* Action Bar inside Live Card */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleManualGPSPing(complaint.id)}
                                disabled={sendingManualPing}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 border border-slate-700 active:scale-95 transition"
                              >
                                <Radio className={`w-3 h-3 text-[#00D96B] ${sendingManualPing ? 'animate-spin' : ''}`} />
                                <span>Broadcast GPS</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {complaint.location_url && (
                                <a
                                  href={complaint.location_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-slate-300 hover:text-white font-bold text-[11px] flex items-center gap-1"
                                >
                                  <span>Pin Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <a
                                href={navigateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#00D96B] font-bold hover:underline flex items-center gap-1 text-[11px]"
                              >
                                <span>Open Maps</span>
                                <Navigation className="w-3 h-3" />
                              </a>
                            </div>
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
        {/* TAB 3: SCOOTY RETURN INSPECTIONS WORKFLOW */}
        {/* ========================================================================= */}
        {workspaceMode === 'RETURN_INSPECTIONS' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div
                onClick={() => setReturnFilterTab('ALL')}
                className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                  returnFilterTab === 'ALL'
                    ? 'bg-white border-[#00D96B] shadow-sm ring-2 ring-[#00D96B]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">All Returns</span>
                <p className="text-xl font-black text-slate-900 mt-1">{returnInspections.length}</p>
              </div>

              <div
                onClick={() => setReturnFilterTab('PENDING')}
                className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                  returnFilterTab === 'PENDING'
                    ? 'bg-amber-50 border-amber-400 shadow-sm ring-2 ring-amber-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Inspect Pending</span>
                <p className="text-xl font-black text-amber-900 mt-1">{pendingReturnsCount}</p>
              </div>

              <div
                onClick={() => setReturnFilterTab('INSPECTED')}
                className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                  returnFilterTab === 'INSPECTED'
                    ? 'bg-purple-50 border-purple-400 shadow-sm ring-2 ring-purple-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Inspected</span>
                <p className="text-xl font-black text-purple-900 mt-1">
                  {returnInspections.filter(r => r.status === 'Inspection Completed').length}
                </p>
              </div>

              <div
                onClick={() => setReturnFilterTab('COMPLETED')}
                className={`p-3 rounded-2xl border transition cursor-pointer select-none ${
                  returnFilterTab === 'COMPLETED'
                    ? 'bg-emerald-50 border-[#00D96B] shadow-sm ring-2 ring-[#00D96B]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Settled & Closed</span>
                <p className="text-xl font-black text-emerald-900 mt-1">
                  {returnInspections.filter(r => r.status === 'Completed').length}
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#98A2B3]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search return by ticket #, scooty #, rider name or phone..."
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

            {/* Return Inspection Cards */}
            {loading ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
                <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-bold">Checking Return Inspections...</p>
              </div>
            ) : filteredReturns.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-sm font-black text-slate-900">No Return Inspections Found</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  {search || returnFilterTab !== 'ALL'
                    ? 'No return inspections match the current filter.'
                    : 'You have no pending scooty return inspections assigned from Hub Incharge.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReturns.map(ret => {
                  const isPending = ret.status === 'Pending Inspection' || ret.status === 'Inspection in Progress';
                  const isInspected = ret.status === 'Inspection Completed';
                  const isCompleted = ret.status === 'Completed';
                  const damageCount = Array.isArray(ret.damage_items) ? ret.damage_items.length : 0;

                  return (
                    <div
                      key={ret.id}
                      className={`bg-white rounded-3xl border transition-all p-4 sm:p-5 space-y-3 shadow-xs hover:shadow-md ${
                        isPending
                          ? 'border-amber-300 ring-2 ring-amber-300/20 bg-amber-50/10'
                          : isInspected
                          ? 'border-purple-300 bg-purple-50/10'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {ret.return_number}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{ret.return_date} {ret.return_time || ''}</span>
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                          isPending
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : isInspected
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ret.status}
                        </span>
                      </div>

                      {/* Scooty & Hub Details */}
                      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scooty Number</span>
                          <div className="flex items-center gap-1.5">
                            <Bike className="w-4 h-4 text-emerald-600" />
                            <span className="font-black font-mono text-slate-900 text-sm">{ret.scooter_number}</span>
                          </div>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Receiving Hub</span>
                          <div className="flex items-center gap-1.5">
                            <Building className="w-4 h-4 text-blue-600" />
                            <span className="font-bold text-slate-900 truncate">{ret.hub_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Rider Contact Card */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{ret.rider_name}</p>
                            <p className="text-[11px] font-mono text-slate-500">{ret.rider_phone}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${ret.rider_phone}`}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                          <button
                            onClick={() => handleWhatsApp(ret.rider_phone, ret.rider_name, ret.return_number)}
                            className="p-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Damage Summary Box if already Inspected or Logged */}
                      {damageCount > 0 ? (
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>Logged Damage Items ({damageCount})</span>
                            <span className="text-red-600 font-extrabold">Est. Total: ₹{ret.gross_damage_total || 0}</span>
                          </div>
                          <div className="space-y-1 max-h-28 overflow-y-auto">
                            {ret.damage_items.map((dmg: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                                <span className="font-medium text-slate-800">{dmg.part_name} &times; {dmg.quantity || 1}</span>
                                <span className="font-mono font-bold text-slate-900">₹{dmg.total_price || ((dmg.quantity || 1) * (dmg.unit_price || 0))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : isInspected ? (
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center gap-2 text-emerald-800 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Physical Inspection Completed: Zero damages found (Full Refund).</span>
                        </div>
                      ) : null}

                      {/* Primary Action Button */}
                      <div className="pt-1">
                        {isPending ? (
                          <button
                            onClick={() => handleOpenInspectionModal(ret)}
                            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-98"
                          >
                            <Wrench className="w-4 h-4 stroke-[2.5]" />
                            <span>INSPECT DAMAGED PARTS</span>
                          </button>
                        ) : isInspected ? (
                          <button
                            onClick={() => handleOpenInspectionModal(ret)}
                            className="w-full py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-700/20 transition cursor-pointer active:scale-98"
                          >
                            <FileText className="w-4 h-4" />
                            <span>UPDATE DAMAGE SHEET / RE-INSPECT</span>
                          </button>
                        ) : (
                          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-900 font-bold">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Settlement Closed by Hub Incharge</span>
                            </span>
                            <span className="font-mono">Refund: ₹{ret.refund_amount_to_rider || 0}</span>
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
        {/* TAB 4: SCOOTY RECOVERY INSPECTIONS (HUB RECOVERY DAMAGE CHECK) */}
        {/* ========================================================================= */}
        {workspaceMode === 'RECOVERY_INSPECTIONS' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { key: 'ALL', label: 'All Recoveries', count: recoveryInspections.length },
                { key: 'PENDING', label: 'Inspection Pending', count: pendingRecoveriesCount },
                { key: 'INSPECTED', label: 'Inspected (Review)', count: recoveryInspections.filter(r => r.status === 'Inspection Completed').length },
                { key: 'COMPLETED', label: 'Settled / Closed', count: recoveryInspections.filter(r => r.status === 'Completed').length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setRecoveryFilterTab(tab.key as any)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
                    recoveryFilterTab === tab.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    recoveryFilterTab === tab.key ? 'bg-[#00D96B] text-[#0A0F1D]' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
                <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-bold">Checking Assigned Recovery Inspections...</p>
              </div>
            ) : filteredRecoveries.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900">No Recovery Inspection Tasks</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {recoveryFilterTab !== 'ALL'
                    ? 'No recovery tickets match the selected filter.'
                    : 'There are no assigned recovery inspections right now.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredRecoveries.map(rec => {
                  const isPending = rec.status === 'Pending Inspection' || rec.status === 'Inspection in Progress';
                  const isInspected = rec.status === 'Inspection Completed';
                  const isCompleted = rec.status === 'Completed';
                  const damageCount = rec.damage_items?.length || 0;

                  return (
                    <div
                      key={rec.id}
                      className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-3.5 shadow-xs hover:border-slate-300 transition"
                    >
                      {/* Ticket Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                            {rec.recovery_number}
                          </span>
                          <span className="text-xs text-slate-400">&bull;</span>
                          <span className="text-xs font-mono font-bold text-slate-600">
                            {new Date(rec.recovery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {rec.recovery_time}
                          </span>
                          <span className="text-xs text-slate-400">&bull;</span>
                          <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md font-bold">
                            By: {rec.recovered_by}
                          </span>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isInspected
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {rec.status}
                        </span>
                      </div>

                      {/* Scooty & Hub Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scooty Reg No</span>
                          <p className="font-mono font-black text-sm text-slate-900">{rec.scooter_number}</p>
                        </div>

                        <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Hub</span>
                          <p className="font-bold text-slate-800 truncate">{rec.hub_name}</p>
                        </div>

                        <div className="p-2.5 bg-red-50/60 rounded-2xl border border-red-200 space-y-0.5">
                          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Recovery Fee</span>
                          <p className="font-mono font-black text-red-900">₹{rec.recovery_charge || 1000}</p>
                        </div>

                        <div className="p-2.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-0.5">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Security Deposit</span>
                          <p className="font-mono font-black text-emerald-900">₹{rec.security_deposit_amount || 2000}</p>
                        </div>
                      </div>

                      {/* Rider Contact Card */}
                      <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{rec.rider_name}</p>
                            <p className="text-[11px] font-mono text-slate-500">{rec.rider_phone}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${rec.rider_phone}`}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-[11px] flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                          <button
                            onClick={() => handleWhatsApp(rec.rider_phone, rec.rider_name, rec.recovery_number)}
                            className="p-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold"
                            title="WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Damage Summary Box if already Inspected or Logged */}
                      {damageCount > 0 ? (
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                            <span>Logged Damage Items ({damageCount})</span>
                            <span className="text-red-600 font-extrabold">Damage Total: ₹{rec.gross_damage_total || 0}</span>
                          </div>
                          <div className="space-y-1 max-h-28 overflow-y-auto">
                            {rec.damage_items.map((dmg: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                                <span className="font-medium text-slate-800">{dmg.part_name} &times; {dmg.quantity || 1}</span>
                                <span className="font-mono font-bold text-slate-900">₹{dmg.total_price || ((dmg.quantity || 1) * (dmg.unit_price || 0))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : isInspected ? (
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center gap-2 text-emerald-800 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Physical Inspection Completed: Zero damages found. Fixed ₹1000 fee applies.</span>
                        </div>
                      ) : null}

                      {/* Primary Action Button */}
                      <div className="pt-1">
                        {isPending ? (
                          <button
                            onClick={() => handleOpenInspectionModal(rec)}
                            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-98"
                          >
                            <Wrench className="w-4 h-4 stroke-[2.5]" />
                            <span>INSPECT DAMAGED PARTS</span>
                          </button>
                        ) : isInspected ? (
                          <button
                            onClick={() => handleOpenInspectionModal(rec)}
                            className="w-full py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-purple-700/20 transition cursor-pointer active:scale-98"
                          >
                            <FileText className="w-4 h-4" />
                            <span>UPDATE DAMAGE SHEET / RE-INSPECT</span>
                          </button>
                        ) : (
                          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs flex items-center justify-between text-emerald-900 font-bold">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Settlement Closed by Hub Incharge</span>
                            </span>
                            <span className="font-mono">
                              {rec.settlement_type === 'DUE_FROM_RIDER'
                                ? `Due: ₹${rec.due_amount_from_rider}`
                                : `Refund: ₹${rec.refund_amount_to_rider}`}
                            </span>
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

        {/* ========================================================================= */}
        {/* MODAL: DAMAGE PARTS (AS DRAWN IN IMAGE 2) */}
        {/* ========================================================================= */}
        {inspectingReturn && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[94vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    <Wrench className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      {inspectingReturn.recovery_number ? 'Recovery Damage Parts' : 'Return Damage Parts'}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Ticket: <span className="font-mono font-bold text-slate-800">{inspectingReturn.recovery_number || inspectingReturn.return_number}</span> &bull; Scooty: <span className="font-mono font-black text-emerald-700">{inspectingReturn.scooter_number}</span> &bull; Rider: <span className="font-bold text-slate-800">{inspectingReturn.rider_name}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectingReturn(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Damage Parts Table (S.No | Item from Inventory | Qty [-] [1] [+] | Price) */}
              <div className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/80">
                        <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                        <th className="py-2.5 px-3">Item (Fetch from Inventory)</th>
                        <th className="py-2.5 px-3 w-36 text-center">Qty</th>
                        <th className="py-2.5 px-3 w-32 text-right">Price (₹)</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {inspectionDamages.map((row, index) => {
                        const isCustom = row.part_name && !inventoryList.some(inv => inv.part_name === row.part_name);

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/60 transition">
                            {/* 1. S.No */}
                            <td className="py-3 px-3 text-center font-mono font-black text-slate-700">
                              {index + 1}
                            </td>

                            {/* 2. Item Selector from Inventory */}
                            <td className="py-3 px-3">
                              <div className="space-y-1.5">
                                <select
                                  value={isCustom ? '__CUSTOM__' : row.part_name}
                                  onChange={(e) => {
                                    if (e.target.value === '__CUSTOM__') {
                                      handleCustomNameInput(row.id, row.part_name || 'Custom Damaged Part');
                                    } else {
                                      handleSelectInventoryItem(row.id, e.target.value);
                                    }
                                  }}
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#00D96B] shadow-xs cursor-pointer"
                                >
                                  <option value="">-- Select Item from Inventory --</option>
                                  {inventoryList.map((inv) => (
                                    <option key={inv.id} value={inv.part_name}>
                                      {inv.part_name} (₹{inv.unit_price})
                                    </option>
                                  ))}
                                  <option value="__CUSTOM__">+ Other / Custom Item (Type Name)</option>
                                </select>

                                {/* Custom Text Input if custom is selected */}
                                {isCustom && (
                                  <input
                                    type="text"
                                    value={row.part_name}
                                    onChange={(e) => handleCustomNameInput(row.id, e.target.value)}
                                    placeholder="Type damaged part name..."
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
                                  />
                                )}
                              </div>
                            </td>

                            {/* 3. Quantity Stepper: [-] [ 1 ] [+] */}
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementQty(row.id)}
                                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black text-sm flex items-center justify-center transition cursor-pointer border border-slate-200 select-none shadow-xs"
                                  title="Decrease quantity"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={row.quantity}
                                  onChange={(e) => handleQuantityInput(row.id, e.target.value)}
                                  className="w-12 h-8 text-center bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-[#00D96B]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleIncrementQty(row.id)}
                                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-black text-sm flex items-center justify-center transition cursor-pointer border border-slate-200 select-none shadow-xs"
                                  title="Increase quantity"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* 4. Price (₹) */}
                            <td className="py-3 px-3 text-right">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={row.unit_price || ''}
                                  onChange={(e) => handlePriceInput(row.id, e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-6 pr-2.5 py-2 bg-white border border-slate-200 rounded-xl text-right text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-[#00D96B] shadow-xs"
                                />
                              </div>
                              {row.quantity > 1 && (
                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                  Total: ₹{row.total_price}
                                </span>
                              )}
                            </td>

                            {/* 5. Delete Row Button */}
                            <td className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDamageRow(row.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* + Add Damage Part Button */}
                <button
                  type="button"
                  onClick={handleAddDamageRow}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#00D96B] hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-800 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                  <span>+ Add Damage Part</span>
                </button>
              </div>

              {/* Total Damage Summary Card (White & Green Theme) */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 text-slate-900 rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block">
                    Total Estimated Damage
                  </span>
                  <span className="text-xl font-black text-emerald-700 font-mono">
                    ₹{inspectionDamages.reduce((sum, d) => sum + (d.total_price || 0), 0)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-600 max-w-[200px] font-medium leading-tight">
                  Hub Incharge will review items & apply waivers during final settlement.
                </div>
              </div>

              {/* Submit / Cancel Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInspectingReturn(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitInspection}
                  disabled={submittingInspection}
                  className="px-6 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 disabled:opacity-50 cursor-pointer active:scale-95 transition"
                >
                  {submittingInspection ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Submit Damage Sheet to Hub Incharge</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
