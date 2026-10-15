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
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Wrench,
  Printer,
  DollarSign,
  FileText,
  Building,
  Check,
  Share2,
  Truck,
  MapPin,
  Camera,
  Upload,
  Trash2,
  Navigation,
  UserCheck,
  Plus,
  Eye,
  X
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

interface PhotoEntry {
  id: string;
  angle: string;
  url: string;
  uploaded_at?: string;
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
  pickup_photos?: PhotoEntry[];
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

// Client-side Image Compression (Reduces 5-10MB mobile photos to ~70-100KB JPEG)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280;
        const MAX_HEIGHT = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        } else {
          resolve(event.target?.result as string);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const COMMON_PARTS = [
  { name: 'Side Mirror (Right)', price: 250 },
  { name: 'Side Mirror (Left)', price: 250 },
  { name: 'Brake Lever (Right)', price: 350 },
  { name: 'Brake Lever (Left)', price: 350 },
  { name: 'Headlight Assembly', price: 1200 },
  { name: 'Taillight Cover', price: 600 },
  { name: 'Front Mudguard', price: 850 },
  { name: 'Side Panel Scratch/Dent', price: 950 },
  { name: 'Throttle Grip', price: 400 },
  { name: 'Footrest Assembly', price: 450 },
  { name: 'Battery Compartment Lock', price: 500 }
];

export default function ScootyRecoveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const recoveryId = params?.id as string;

  const [recoveryRecord, setRecoveryRecord] = useState<ScootyRecovery | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Agent Pickup State (Step 2)
  const [pickupLiveLocation, setPickupLiveLocation] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [agentNotesInput, setAgentNotesInput] = useState('');
  const [mandatoryPhotos, setMandatoryPhotos] = useState<{
    front: string;
    back: string;
    right: string;
    left: string;
  }>({ front: '', back: '', right: '', left: '' });
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [isPickingUp, setIsPickingUp] = useState(false);

  // Agent Step Actions
  const [isAccepting, setIsAccepting] = useState(false);
  const [isMarkingReachedHub, setIsMarkingReachedHub] = useState(false);

  // Hub Incharge Assign Tech State (Step 4)
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  const [assigningTech, setAssigningTech] = useState(false);

  // Technician Damage Items State (Step 5)
  const [techDamageItems, setTechDamageItems] = useState<
    Array<{ part_name: string; quantity: number; unit_price: number; technician_remark: string }>
  >([
    { part_name: '', quantity: 1, unit_price: 0, technician_remark: '' }
  ]);
  const [techRemarksInput, setTechRemarksInput] = useState('');
  const [isSubmittingInspection, setIsSubmittingInspection] = useState(false);

  // Hub Incharge Settlement State (Step 6)
  const [damageItemsState, setDamageItemsState] = useState<DamageItem[]>([]);
  const [recoveryChargeInput, setRecoveryChargeInput] = useState<number>(1000);
  const [securityDepositInput, setSecurityDepositInput] = useState<number>(2000);
  const [settlementNotesInput, setSettlementNotesInput] = useState<string>('');
  const [paymentModeInput, setPaymentModeInput] = useState<string>('UPI');
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [isSettling, setIsSettling] = useState(false);

  // Lightbox preview for photos
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const printSlipRef = useRef<HTMLDivElement>(null);

  const fetchRecoveryDetails = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await adminApi.get(`/recoveries/${recoveryId}`);
      if (res.success && res.data) {
        const data: ScootyRecovery = res.data;
        setRecoveryRecord(data);
        setTimeline(res.timeline || []);
        if (res.technicians) setTechnicians(res.technicians);

        setPickupLiveLocation(data.pickup_live_location || data.pickup_location || '');
        setRecoveryChargeInput(Number(data.recovery_charge) || 1000);
        setSecurityDepositInput(Number(data.security_deposit_amount) || 2000);
        setSettlementNotesInput(data.settlement_notes || '');
        setPaymentModeInput(data.rider_payment_mode || 'UPI');
        setPaymentRefInput(data.rider_payment_reference || '');

        if (data.technician_id) {
          setSelectedTechId(String(data.technician_id));
        }

        const items = (data.damage_items || []).map((d: any, idx: number) => ({
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

        if (items.length > 0) {
          setTechDamageItems(
            items.map(it => ({
              part_name: it.part_name,
              quantity: it.quantity,
              unit_price: it.unit_price,
              technician_remark: it.technician_remark || ''
            }))
          );
        }
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
  // Formula: (Payable Damage Total + Fixed Recovery Charge (1000)) - Security Deposit (2000)
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

  // Step 1: Agent Accept Request
  const handleAgentAccept = async () => {
    setIsAccepting(true);
    try {
      const res = await adminApi.post(`/recoveries/${recoveryId}/accept`, {});
      if (res.success) {
        fetchRecoveryDetails(true);
      } else {
        alert(res.message || 'Failed to accept recovery request.');
      }
    } catch (err: any) {
      alert(err.message || 'Server error accepting request.');
    } finally {
      setIsAccepting(false);
    }
  };

  // Step 2: Auto-fetch GPS Location
  const handleFetchGPSLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPickupLat(lat);
        setPickupLng(lng);
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const geo = await resp.json();
          if (geo && geo.display_name) {
            setPickupLiveLocation(geo.display_name);
          } else {
            setPickupLiveLocation(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          }
        } catch (_) {
          setPickupLiveLocation(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
          setFetchingLocation(false);
        }
      },
      (err) => {
        console.warn('GPS fetch failed:', err);
        alert('Could not fetch GPS automatically. Please type the location manually.');
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Step 2: Photo Upload Handlers with compression
  const handleMandatoryPhotoChange = async (angle: 'front' | 'back' | 'right' | 'left', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setMandatoryPhotos(prev => ({ ...prev, [angle]: compressed }));
    } catch (err) {
      console.error('Compression error:', err);
      alert('Failed to process image.');
    }
  };

  const handleAdditionalPhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (additionalPhotos.length >= 4) {
      alert('Maximum 4 additional photos allowed.');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setAdditionalPhotos(prev => [...prev, compressed]);
    } catch (err) {
      console.error('Compression error:', err);
      alert('Failed to process image.');
    }
  };

  // Step 2 Submit: Confirm Scooty Picked Up
  const handleConfirmPickup = async () => {
    if (!mandatoryPhotos.front || !mandatoryPhotos.back || !mandatoryPhotos.right || !mandatoryPhotos.left) {
      alert('All 4 mandatory pictures (Front, Back, Right, Left) are required before pickup.');
      return;
    }
    if (!pickupLiveLocation.trim()) {
      alert('Please provide the pickup location.');
      return;
    }

    setIsPickingUp(true);
    try {
      const payload = {
        photos: {
          front: mandatoryPhotos.front,
          back: mandatoryPhotos.back,
          right: mandatoryPhotos.right,
          left: mandatoryPhotos.left,
          additional: additionalPhotos
        },
        pickup_live_location: pickupLiveLocation.trim(),
        pickup_latitude: pickupLat,
        pickup_longitude: pickupLng,
        agent_notes: agentNotesInput.trim()
      };

      const res = await adminApi.post(`/recoveries/${recoveryId}/pickup`, payload);
      if (res.success) {
        fetchRecoveryDetails(true);
      } else {
        alert(res.message || 'Failed to record pickup.');
      }
    } catch (err: any) {
      alert(err.message || 'Server error recording pickup.');
    } finally {
      setIsPickingUp(false);
    }
  };

  // Step 3: Agent Reached Hub
  const handleAgentReachedHub = async () => {
    setIsMarkingReachedHub(true);
    try {
      const res = await adminApi.post(`/recoveries/${recoveryId}/reached-hub`, {
        hub_id: recoveryRecord?.hub_id
      });
      if (res.success) {
        fetchRecoveryDetails(true);
      } else {
        alert(res.message || 'Failed to record hub arrival.');
      }
    } catch (err: any) {
      alert(err.message || 'Server error.');
    } finally {
      setIsMarkingReachedHub(false);
    }
  };

  // Step 4: Hub Incharge Assigns Technician
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
        alert(res.message || 'Failed to assign technician.');
      }
    } catch (err: any) {
      alert(err.message || 'Server error assigning technician.');
    } finally {
      setAssigningTech(false);
    }
  };

  // Step 5: Technician Adds Damage Item
  const handleAddTechDamageRow = () => {
    setTechDamageItems(prev => [
      ...prev,
      { part_name: '', quantity: 1, unit_price: 0, technician_remark: '' }
    ]);
  };

  const handleRemoveTechDamageRow = (idx: number) => {
    setTechDamageItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTechItemChange = (idx: number, field: string, value: any) => {
    setTechDamageItems(prev =>
      prev.map((item, i) => {
        if (i === idx) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSelectCommonPart = (idx: number, partName: string, price: number) => {
    setTechDamageItems(prev =>
      prev.map((item, i) => {
        if (i === idx) {
          return { ...item, part_name: partName, unit_price: price };
        }
        return item;
      })
    );
  };

  // Step 5 Submit: Technician Inspection
  const handleSubmitTechInspection = async () => {
    const validItems = techDamageItems.filter(i => i.part_name.trim() !== '');
    setIsSubmittingInspection(true);
    try {
      const res = await adminApi.post(`/recoveries/${recoveryId}/inspection`, {
        damage_items: validItems,
        technician_remarks: techRemarksInput
      });
      if (res.success) {
        fetchRecoveryDetails(true);
      } else {
        alert(res.message || 'Failed to submit inspection report.');
      }
    } catch (err: any) {
      alert(err.message || 'Server error submitting inspection.');
    } finally {
      setIsSubmittingInspection(false);
    }
  };

  // Step 6: Hub Incharge Settle
  const handleSettleRecovery = async () => {
    if (!confirm('Finalize recovery settlement? Vehicle will be marked Available in fleet.')) {
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
      alert(err.message || 'Server error settling recovery.');
    } finally {
      setIsSettling(false);
    }
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    if (!recoveryRecord) return;
    const phone = recoveryRecord.rider_phone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone}`;
    const text = encodeURIComponent(
      `*DOON RIDERS - SCOOTY RECOVERY SLIP*\n\n` +
      `Ticket: ${recoveryRecord.recovery_number}\n` +
      `Vehicle: ${recoveryRecord.scooter_number}\n` +
      `Rider: ${recoveryRecord.rider_name}\n` +
      `Recovery Fee: ₹${liveCalc.recoveryCharge}\n` +
      `Damage Charges: ₹${liveCalc.payableDamageTotal}\n` +
      `Total Charges: ₹${liveCalc.totalCharges}\n` +
      `Security Deposit: ₹${securityDepositInput}\n\n` +
      `${liveCalc.settlementType === 'FULL_REFUND' || liveCalc.settlementType === 'PARTIAL_REFUND'
        ? `Refund Amount: ₹${liveCalc.refundAmount}`
        : liveCalc.settlementType === 'ZERO_BALANCE'
        ? `Balance: ₹0 (Fully Settled)`
        : `Due Payable by Rider: ₹${liveCalc.dueAmount}`}\n\n` +
      `Thank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold">Loading recovery details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!recoveryRecord) {
    return (
      <AdminLayout>
        <div className="py-20 text-center space-y-4">
          <p className="text-sm font-bold text-slate-800">Recovery Record Not Found</p>
          <Link href="/admin/recoveries" className="text-xs text-[#00D96B] font-bold underline">
            &larr; Back to Recoveries
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const status = recoveryRecord.status;
  const isAssigned = status === 'ASSIGNED' || status === 'Pending Inspection';
  const isAccepted = status === 'ACCEPTED';
  const isPickedUp = status === 'PICKED_UP';
  const isReachedHub = status === 'REACHED_HUB';
  const isUnderInspection = status === 'INSPECTION_IN_PROGRESS' || status === 'Inspection in Progress';
  const isInspected = status === 'INSPECTION_COMPLETED' || status === 'Inspection Completed';
  const isCompleted = status === 'Completed';

  // Role booleans and permission gates
  const userRoleName = (user?.roleName || user?.roleDisplayName || '').toUpperCase();
  const isSuperAdmin = userRoleName === 'SUPER_ADMIN';
  const isRecoveryAgent = (userRoleName.includes('RECOVERY') || userRoleName.includes('AGENT')) && !isSuperAdmin;
  const isHubIncharge = userRoleName.includes('HUB') && !isSuperAdmin;
  const isTechnician = userRoleName.includes('TECH') && !isSuperAdmin;

  // Check if current user is the recovery agent assigned to this recovery ticket
  const isAssignedAgent = recoveryRecord && (
    (user?.id && recoveryRecord.recovery_agent_id && Number(recoveryRecord.recovery_agent_id) === Number(user.id)) ||
    (user?.name && recoveryRecord.recovery_agent_name && user.name.toLowerCase().trim() === recoveryRecord.recovery_agent_name.toLowerCase().trim()) ||
    (user?.name && recoveryRecord.recovered_by && user.name.toLowerCase().trim() === recoveryRecord.recovered_by.toLowerCase().trim())
  );

  const canAcceptRecovery = hasPermission('recoveries.accept') && (isAssignedAgent || isSuperAdmin || !recoveryRecord.recovery_agent_id);
  const canPickupScooty = hasPermission('recoveries.pickup') && (isAssignedAgent || isSuperAdmin);
  const canMarkReachedHub = hasPermission('recoveries.reached_hub') && (isAssignedAgent || isSuperAdmin);
  const canAssignTech = hasPermission('recoveries.assign_tech');
  const canInspect = hasPermission('recoveries.inspect');
  const canSettle = hasPermission('recoveries.settle');

  // Step Tracker indices
  const stepIdx = isAssigned ? 1 : isAccepted ? 2 : isPickedUp ? 3 : isReachedHub ? 4 : (isUnderInspection || isInspected) ? 5 : 6;

  return (
    <AdminLayout>
      <div className="space-y-5 pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/recoveries"
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Back to Recoveries"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 font-mono">
                  {recoveryRecord.recovery_number}
                </h1>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {recoveryRecord.scooter_number}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Customer: <b>{recoveryRecord.rider_name}</b> ({recoveryRecord.rider_phone}) &bull; Hub: {recoveryRecord.hub_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => fetchRecoveryDetails(false)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Refresh"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#00A854]' : ''}`} />
            </button>
            {isCompleted && !isRecoveryAgent && (
              <>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp Slip</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Multi-Step Visual Progress Bar */}
        <div className="bg-white p-4 rounded-3xl border border-[#E5E7EB] shadow-xs">
          <div className={`grid ${isRecoveryAgent ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-6'} gap-2 text-center text-xs`}>
            {(isRecoveryAgent
              ? [
                  { num: 1, label: '1. Assigned' },
                  { num: 2, label: '2. Accepted' },
                  { num: 3, label: '3. Picked Up' },
                  { num: 4, label: '4. Delivered to Hub' }
                ]
              : [
                  { num: 1, label: '1. Assigned' },
                  { num: 2, label: '2. Accepted' },
                  { num: 3, label: '3. Picked Up' },
                  { num: 4, label: '4. At Hub' },
                  { num: 5, label: '5. Inspection' },
                  { num: 6, label: '6. Settled' }
                ]
            ).map((step) => {
              const isPast = isRecoveryAgent && step.num === 4 ? stepIdx >= 4 : stepIdx > step.num;
              const isCurrent = isRecoveryAgent && step.num === 4 ? stepIdx >= 4 : stepIdx === step.num;
              return (
                <div
                  key={step.num}
                  className={`p-2.5 rounded-2xl border transition-all ${
                    isPast
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                      : isCurrent
                      ? 'bg-slate-900 border-slate-900 text-white font-black shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="text-[11px] font-bold flex items-center justify-center gap-1">
                    {isPast && <Check className="w-3 h-3 stroke-[3] text-emerald-600" />}
                    <span>{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: ASSIGNED (Agent Acceptance View) */}
        {isAssigned && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Step 1: Recovery Request Pending Acceptance</h2>
                {canAcceptRecovery && (
                  <p className="text-[11px] text-slate-500">
                    You are assigned to this recovery task. Please accept to proceed to the pickup location.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Recovery Location</span>
                <p className="font-bold text-slate-800 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{recoveryRecord.pickup_location || 'Customer Location'}</span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Recovery Agent</span>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{recoveryRecord.recovery_agent_name || recoveryRecord.recovered_by || 'Recovery Team'}</span>
                  {recoveryRecord.recovery_agent_phone && ` (${recoveryRecord.recovery_agent_phone})`}
                </p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-emerald-900 font-medium">
                <span className="font-bold block">Standard Recovery Terms:</span>
                Fixed Recovery Charge: ₹1,000 &bull; Security Deposit: ₹2,000
              </div>

              {canAcceptRecovery ? (
                <button
                  onClick={handleAgentAccept}
                  disabled={isAccepting}
                  className="px-6 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#00D96B]/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isAccepting ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Accept Recovery Request</span>
                </button>
              ) : (
                <div role="status" className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-slate-500" />
                  <span>You do not have permission to accept this recovery request.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: ACCEPTED (Agent At Location - GPS & 4 Mandatory Photos Upload) */}
        {isAccepted && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Step 2: Scooty Pickup &amp; Vehicle Photos</h2>
                  <p className="text-[11px] text-slate-500">Live GPS address + 4 mandatory photos (Front, Back, Right, Left)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                Auto 30-Day Purge
              </span>
            </div>

            {/* GPS Live Location Picker */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>Pickup Location (Auto-fetch or edit manually)</span>
                </label>
                <button
                  type="button"
                  onClick={handleFetchGPSLocation}
                  disabled={fetchingLocation}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Navigation className={`w-3 h-3 ${fetchingLocation ? 'animate-spin text-emerald-600' : ''}`} />
                  <span>{fetchingLocation ? 'Fetching GPS...' : '📍 Auto-Fetch GPS'}</span>
                </button>
              </div>

              <input
                type="text"
                value={pickupLiveLocation}
                onChange={e => setPickupLiveLocation(e.target.value)}
                placeholder="Live pickup address / landmark..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
              />
            </div>

            {/* 4 Mandatory Photos Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800">
                  4 Mandatory Inspection Photos <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Compressed automatically &bull; Server light
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'front', label: '1. Front View' },
                  { key: 'back', label: '2. Back View' },
                  { key: 'right', label: '3. Right Side' },
                  { key: 'left', label: '4. Left Side' }
                ].map(slot => {
                  const hasPhoto = !!(mandatoryPhotos as any)[slot.key];
                  return (
                    <div
                      key={slot.key}
                      className={`relative p-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition min-h-[140px] ${
                        hasPhoto ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
                      {hasPhoto ? (
                        <>
                          <img
                            src={(mandatoryPhotos as any)[slot.key]}
                            alt={slot.label}
                            className="w-full h-24 object-cover rounded-xl cursor-pointer"
                            onClick={() => setPreviewImage((mandatoryPhotos as any)[slot.key])}
                          />
                          <div className="flex items-center justify-between w-full mt-1.5 px-1">
                            <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> {slot.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMandatoryPhotos(prev => ({ ...prev, [slot.key]: '' }))}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-2">
                          <Camera className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-[11px] font-bold text-slate-700">{slot.label}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Click / Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={e => handleMandatoryPhotoChange(slot.key as any, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Up to 4 Additional Photos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800">
                  Additional Photos (Optional, max 4)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {additionalPhotos.length} / 4 added
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {additionalPhotos.map((img, i) => (
                  <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0 group">
                    <img
                      src={img}
                      alt={`Additional ${i + 1}`}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setPreviewImage(img)}
                    />
                    <button
                      type="button"
                      onClick={() => setAdditionalPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-red-600 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {additionalPhotos.length < 4 && (
                  <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer flex-shrink-0">
                    <Plus className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleAdditionalPhotoAdd}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Agent Notes */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700">Agent Pickup Notes (Optional)</label>
              <input
                type="text"
                value={agentNotesInput}
                onChange={e => setAgentNotesInput(e.target.value)}
                placeholder="e.g. Scooter found unlocked near mall entrance, keys retrieved"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-[#00D96B]"
              />
            </div>

            {/* Submit Pickup Button */}
            {canPickupScooty ? (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleConfirmPickup}
                  disabled={isPickingUp}
                  className="px-6 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isPickingUp ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Confirm Scooty Picked Up</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between text-xs text-blue-900">
                <span className="font-bold flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600 animate-pulse" />
                  <span>Agent ({recoveryRecord.recovery_agent_name || 'Agent'}) is at pickup location capturing mandatory vehicle photos.</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: PICKED UP (In Transit - Agent Reached Hub View) */}
        {isPickedUp && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Step 3: Scooty In Transit to Hub</h2>
                  <p className="text-[11px] text-slate-500">Agent is bringing vehicle back to {recoveryRecord.hub_name}</p>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                In Transit
              </span>
            </div>

            {/* Picked up info */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Picked Up Location</span>
                <span className="font-bold text-slate-800">{recoveryRecord.pickup_live_location || recoveryRecord.pickup_location}</span>
              </div>
              {recoveryRecord.picked_up_at && (
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(recoveryRecord.picked_up_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {/* Photo gallery preview */}
            {recoveryRecord.pickup_photos && recoveryRecord.pickup_photos.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">Inspection Photos ({recoveryRecord.pickup_photos.length}):</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {recoveryRecord.pickup_photos.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setPreviewImage(p.url)}
                      className="relative h-24 rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group"
                    >
                      <img src={p.url} alt={p.angle} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[9px] font-bold">
                        {p.angle}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reached Hub Button */}
            {canMarkReachedHub ? (
              <div className="p-4 bg-slate-900 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black">Reached Service Hub?</h4>
                  <p className="text-[11px] text-slate-400">Click to notify Hub Incharge that scooty has safely arrived at hub.</p>
                </div>

                <button
                  onClick={handleAgentReachedHub}
                  disabled={isMarkingReachedHub}
                  className="px-5 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#00D96B]/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isMarkingReachedHub ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Done</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between text-xs text-indigo-900">
                <span className="font-bold flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600 animate-bounce" />
                  <span>Agent is bringing vehicle to {recoveryRecord.hub_name}. Awaiting hub arrival.</span>
                </span>
              </div>
            )}
          </div>
        )}

        {/* RECOVERY AGENT COMPLETION BANNER (For Recovery Agent when Reached Hub or Beyond) */}
        {isRecoveryAgent && stepIdx >= 4 && (
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-emerald-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-emerald-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Scooty Safely Delivered to Hub</h2>
                <p className="text-xs text-slate-500">
                  Your recovery assignment is complete. Vehicle is now in {recoveryRecord.hub_name} possession.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Service Hub</span>
                <p className="font-black text-slate-800 text-sm">{recoveryRecord.hub_name}</p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hub Arrival Logged</span>
                <p className="font-black text-slate-800 text-sm">
                  {recoveryRecord.reached_hub_at
                    ? new Date(recoveryRecord.reached_hub_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'Delivered at Hub'}
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Fixed Recovery Fee</span>
                <p className="font-black text-emerald-700 text-sm">₹{recoveryRecord.recovery_charge || 1000}</p>
              </div>
            </div>

            {/* Photos Uploaded by Agent */}
            {recoveryRecord.pickup_photos && recoveryRecord.pickup_photos.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-black text-slate-800 block">
                  Your Uploaded Inspection Photos ({recoveryRecord.pickup_photos.length}):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {recoveryRecord.pickup_photos.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setPreviewImage(p.url)}
                      className="relative h-28 rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group shadow-xs"
                    >
                      <img src={p.url} alt={p.angle} className="w-full h-full object-cover group-hover:scale-105 transition" />
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                        {p.angle}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3] text-emerald-600 flex-shrink-0" />
              <span>
                Task Completed: You have successfully picked up and delivered the vehicle to the hub. Damage inspection and rider settlement will be handled by the Hub Incharge.
              </span>
            </div>
          </div>
        )}

        {/* STEP 4: AT HUB (Hub Incharge Assigns Technician) */}
        {isReachedHub && !isRecoveryAgent && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900">Step 4: Scooty Arrived at Hub</h2>
                <p className="text-[11px] text-slate-500">Hub Incharge assigns technician to check damaged parts</p>
              </div>
            </div>

            {/* Standard Charges Banner */}
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">Fixed Recovery Charges: ₹1,000</span>
              <span className="font-bold text-emerald-900">Security Deposit: ₹2,000</span>
            </div>

            {/* Assign Technician Form */}
            <div className="space-y-2 text-xs">
              <label className="font-extrabold text-slate-800">
                Select Technician for Damage Inspection <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <select
                  value={selectedTechId}
                  onChange={e => setSelectedTechId(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#00D96B] cursor-pointer"
                >
                  <option value="">-- Choose Technician --</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialization} - {t.hub_name})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAssignTechnician}
                  disabled={assigningTech}
                  className="px-5 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {assigningTech ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Assign Technician</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: TECHNICIAN DAMAGE INSPECTION (Add parts changed & submit) */}
        {isUnderInspection && !isRecoveryAgent && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Step 5: Technician Damage Inspection</h2>
                  <p className="text-[11px] text-slate-500">Record parts replaced / repaired and damage costs</p>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Technician: {recoveryRecord.technician_name}
              </span>
            </div>

            {/* Quick Common Parts Buttons */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500">Quick Add Common Damaged Parts:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {COMMON_PARTS.slice(0, 6).map((cp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTechDamageItems(prev => [
                        ...prev.filter(p => p.part_name !== ''),
                        { part_name: cp.name, quantity: 1, unit_price: cp.price, technician_remark: '' }
                      ]);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold whitespace-nowrap transition cursor-pointer"
                  >
                    + {cp.name} (₹{cp.price})
                  </button>
                ))}
              </div>
            </div>

            {/* Itemized Parts Table */}
            <div className="space-y-2">
              {techDamageItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center text-xs">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Part name (e.g. Right Mirror)"
                      value={item.part_name}
                      onChange={e => handleTechItemChange(idx, 'part_name', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>

                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={e => handleTechItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-center focus:outline-none"
                    />
                  </div>

                  <div className="w-28 relative flex items-center">
                    <span className="absolute left-2 text-slate-400 font-mono text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={e => handleTechItemChange(idx, 'unit_price', Number(e.target.value))}
                      className="w-full pl-6 pr-2 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Remark / Condition"
                      value={item.technician_remark}
                      onChange={e => handleTechItemChange(idx, 'technician_remark', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveTechDamageRow(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 transition cursor-pointer self-end sm:self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddTechDamageRow}
                className="px-3.5 py-1.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Damaged Part</span>
              </button>
            </div>

            {/* Inspection Submission */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-600 font-mono">
                Total Parts Damage: ₹{techDamageItems.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0)}
              </span>

              <button
                type="button"
                onClick={handleSubmitTechInspection}
                disabled={isSubmittingInspection}
                className="px-6 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center gap-2 shadow-lg shadow-[#00D96B]/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmittingInspection ? (
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>Submit Damage Inspection</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: HUB INCHARGE SETTLEMENT & MATHEMATICS */}
        {(isInspected || isCompleted) && !isRecoveryAgent && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Step 6: Final Recovery Settlement</h2>
                  <p className="text-[11px] text-slate-500">
                    Formula: (Damage Charges + Fixed Recovery ₹1000) &minus; Security Deposit ₹2000 = Balance
                  </p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isCompleted ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-purple-50 text-purple-800 border-purple-200 animate-pulse'
              }`}>
                {isCompleted ? 'Settled & Closed' : 'Ready for Settlement'}
              </span>
            </div>

            {/* Damaged Parts Review */}
            <div className="space-y-2 text-xs">
              <span className="font-extrabold text-slate-800">Parts Damaged &amp; Replaced ({damageItemsState.length}):</span>
              {damageItemsState.length === 0 ? (
                <p className="text-slate-400 italic">No parts damaged. Scooty is in clean condition.</p>
              ) : (
                <div className="space-y-2">
                  {damageItemsState.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-slate-900">{item.part_name}</span>
                        <span className="text-slate-500 ml-2 font-mono">({item.quantity} &times; ₹{item.unit_price})</span>
                        {item.technician_remark && (
                          <span className="block text-[11px] text-slate-500 italic mt-0.5">{item.technician_remark}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold ${item.is_payable ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                          ₹{item.total_price}
                        </span>

                        {!isCompleted && (
                          <select
                            value={item.hub_remark_type || 'Charge Customer'}
                            onChange={e => {
                              const val = e.target.value as any;
                              setDamageItemsState(prev =>
                                prev.map(it => it.id === item.id ? { ...it, hub_remark_type: val, is_payable: val !== 'No Payment' } : it)
                              );
                            }}
                            className="px-2 py-1 rounded-xl bg-white border border-slate-200 text-[11px] font-bold cursor-pointer"
                          >
                            <option value="Charge Customer">Charge</option>
                            <option value="No Payment">Waive (₹0)</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Smart Calculation Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-600">Payable Damage Charges:</span>
                <span className="font-bold text-slate-900">₹{liveCalc.payableDamageTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-600">Fixed Recovery Charges:</span>
                <span className="font-bold text-red-600">+ ₹{liveCalc.recoveryCharge}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2 font-bold">
                <span className="font-sans text-slate-900">Total Charges:</span>
                <span className="text-slate-900">₹{liveCalc.totalCharges}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span className="font-sans">Less Security Deposit:</span>
                <span>&minus; ₹{securityDepositInput}</span>
              </div>

              {/* Settlement Outcome Result */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between font-sans ${
                liveCalc.settlementType === 'FULL_REFUND' || liveCalc.settlementType === 'PARTIAL_REFUND'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : liveCalc.settlementType === 'ZERO_BALANCE'
                  ? 'bg-slate-100 border-slate-300 text-slate-800'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    {liveCalc.settlementType === 'FULL_REFUND' || liveCalc.settlementType === 'PARTIAL_REFUND'
                      ? 'Refund to Customer'
                      : liveCalc.settlementType === 'ZERO_BALANCE'
                      ? 'Zero Balance'
                      : 'Due from Customer'}
                  </span>
                  <span className="text-base font-black font-mono">
                    {liveCalc.settlementType === 'FULL_REFUND' || liveCalc.settlementType === 'PARTIAL_REFUND'
                      ? `₹${liveCalc.refundAmount}`
                      : liveCalc.settlementType === 'ZERO_BALANCE'
                      ? '₹0'
                      : `₹${liveCalc.dueAmount}`}
                  </span>
                </div>

                <span className="text-[11px] font-bold">
                  {liveCalc.settlementType === 'FULL_REFUND' || liveCalc.settlementType === 'PARTIAL_REFUND'
                    ? 'Eligible for Refund'
                    : liveCalc.settlementType === 'ZERO_BALANCE'
                    ? 'Security offsets charges'
                    : 'Collect from Rider'}
                </span>
              </div>
            </div>

            {/* Settle Action / Closed Slip */}
            {!isCompleted ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Payment Mode:</span>
                  <select
                    value={paymentModeInput}
                    onChange={e => setPaymentModeInput(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold cursor-pointer"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="NetBanking">Net Banking</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSettleRecovery}
                  disabled={isSettling}
                  className="px-6 py-2.5 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#00D96B]/25 transition cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSettling ? (
                    <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>Approve &amp; Settle Recovery</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Settlement Finalized on {recoveryRecord.settled_at ? new Date(recoveryRecord.settled_at).toLocaleDateString('en-IN') : 'Today'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold hover:bg-emerald-100 transition cursor-pointer"
                  >
                    Print Slip
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition cursor-pointer"
                  >
                    WhatsApp Slip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Uploaded Inspection Photos Gallery (Always visible when photos exist) */}
        {recoveryRecord.pickup_photos && recoveryRecord.pickup_photos.length > 0 && !isAccepted && !isAssigned && !isRecoveryAgent && (
          <div className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Scooty Condition Photos at Pickup ({recoveryRecord.pickup_photos.length})</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Auto-deletes after 30 days
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recoveryRecord.pickup_photos.map(p => (
                <div
                  key={p.id}
                  onClick={() => setPreviewImage(p.url)}
                  className="relative h-28 rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group"
                >
                  <img src={p.url} alt={p.angle} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-bold">
                    {p.angle}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline Log */}
        {timeline.length > 0 && (
          <div className="bg-white p-5 rounded-3xl border border-[#E5E7EB] shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Recovery Audit Timeline
            </h3>
            <div className="space-y-2 text-xs">
              {timeline.map((event, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{event.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(event.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Printable Slip (Hidden on screen, rendered on Print) */}
        <div className="hidden print:block font-sans p-6 text-black" ref={printSlipRef}>
          <div className="text-center border-b pb-3 mb-3">
            <h1 className="text-xl font-black">DOON RIDERS</h1>
            <p className="text-xs text-slate-600">Scooty Recovery &amp; Settlement Receipt</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div>
              <p><b>Recovery Ticket:</b> {recoveryRecord.recovery_number}</p>
              <p><b>Vehicle:</b> {recoveryRecord.scooter_number}</p>
              <p><b>Customer:</b> {recoveryRecord.rider_name}</p>
            </div>
            <div>
              <p><b>Contact:</b> {recoveryRecord.rider_phone}</p>
              <p><b>Location:</b> {recoveryRecord.pickup_live_location || recoveryRecord.pickup_location}</p>
              <p><b>Date:</b> {recoveryRecord.recovery_date}</p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse mb-3">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Description</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1">Fixed Recovery Fee</td>
                <td className="text-right py-1">₹{liveCalc.recoveryCharge}</td>
              </tr>
              {damageItemsState.filter(i => i.is_payable).map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1">{item.part_name} ({item.quantity} &times; ₹{item.unit_price})</td>
                  <td className="text-right py-1">₹{item.total_price}</td>
                </tr>
              ))}
              <tr className="border-t font-bold">
                <td className="py-1">Total Payable Charges</td>
                <td className="text-right py-1">₹{liveCalc.totalCharges}</td>
              </tr>
              <tr>
                <td className="py-1">Security Deposit Paid</td>
                <td className="text-right py-1">&minus; ₹{securityDepositInput}</td>
              </tr>
              <tr className="border-t-2 font-black text-sm">
                <td className="py-1">
                  {liveCalc.settlementType === 'FULL_REFUND' || liveCalc.settlementType === 'PARTIAL_REFUND'
                    ? 'Total Refund to Customer'
                    : liveCalc.settlementType === 'ZERO_BALANCE'
                    ? 'Final Balance'
                    : 'Total Due from Customer'}
                </td>
                <td className="text-right py-1">
                  {liveCalc.settlementType === 'FULL_REFUND' || liveCalc.settlementType === 'PARTIAL_REFUND'
                    ? `₹${liveCalc.refundAmount}`
                    : liveCalc.settlementType === 'ZERO_BALANCE'
                    ? '₹0'
                    : `₹${liveCalc.dueAmount}`}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="border-t pt-2 text-[10px] text-center text-slate-500">
            Thank you for riding with DOON RIDERS &bull; Authorized Signature
          </div>
        </div>

        {/* Modal: Lightbox Image Preview */}
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-2xl max-h-[90vh]">
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
