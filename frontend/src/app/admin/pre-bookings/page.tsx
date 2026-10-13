'use client';

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/adminApi';
import {
  Ticket,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  Banknote,
  Copy,
  Printer,
  Calendar,
  Phone,
  User,
  Zap,
  Download,
  Eye,
  Trash2,
  X,
  Sparkles,
  Settings,
  Upload,
  Share2,
  ShieldCheck,
  Lock,
  ExternalLink,
  Check,
  Image as ImageIcon,
  Hash,
  RotateCw
} from 'lucide-react';

interface PreBooking {
  id: number;
  booking_code: string;
  customer_name: string;
  mobile_number: string;
  booking_date: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  payment_mode: 'UPI' | 'Cash';
  payment_status: 'PAID' | 'CANCELLED' | 'PENDING';
  notes?: string;
  created_by_id?: number | null;
  created_by_name?: string | null;
  created_at: string;
}

interface QrSettings {
  upi_id: string;
  merchant_name: string;
  qr_image_url: string;
  booking_id_prefix?: string;
  starting_booking_number?: number;
  next_booking_number?: number;
}

// Custom WhatsApp SVG Icon
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.886 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.94c0 2.103.549 4.156 1.591 5.961L0 24l6.335-1.662c1.746.953 3.71 1.455 5.704 1.456h.006c6.58 0 11.94-5.36 11.944-11.941.002-3.19-1.233-6.19-3.469-8.404" />
  </svg>
);

// Helpers to format Date & Time in Indian Standard Time (IST)
const formatIndianDateTime = (createdOrDate?: string, fallbackDate?: string): string => {
  try {
    const raw = createdOrDate || fallbackDate;
    if (!raw) {
      return new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
    }

    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);

    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  } catch (e) {
    return createdOrDate || '';
  }
};

const formatIndianDateOnly = (dateVal?: string): string => {
  try {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateVal || '';
  }
};

const getCustomerInitials = (nameStr?: string): string => {
  if (!nameStr) return 'CU';
  const parts = nameStr.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

export default function PreBookingsAdminPage() {
  const { user, hasPermission } = useAuth();
  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN' || user?.roleName?.includes('SUPER');
  const isPreBookingUser = 
    user?.roleName === 'PRE_BOOKING' || 
    user?.roleName?.includes('PRE_BOOK') || 
    user?.roleDisplayName?.toLowerCase().includes('pre-booking');
  const canCreatePreBooking = isSuperAdmin || hasPermission('pre_bookings.create') || isPreBookingUser;
  const canViewAllBookings = isSuperAdmin || hasPermission('pre_bookings.view_all') || hasPermission('pre_bookings.view', 'ALL');

  const [bookings, setBookings] = useState<PreBooking[]>([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    totalRevenue: 0,
    totalQty: 0,
    upiCount: 0,
    upiAmount: 0,
    cashCount: 0,
    cashAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // QR & Series Settings
  const [qrSettings, setQrSettings] = useState<QrSettings>({
    upi_id: 'doonriders@icici',
    merchant_name: 'DOON RIDERS EV MOBILITY',
    qr_image_url: '',
    booking_id_prefix: 'DR-PB-',
    starting_booking_number: 1001,
    next_booking_number: 1001
  });
  const [showQrSettingsModal, setShowQrSettingsModal] = useState(false);
  const [tempUpiId, setTempUpiId] = useState('');
  const [tempMerchantName, setTempMerchantName] = useState('');
  const [tempQrImageUrl, setTempQrImageUrl] = useState('');
  const [tempBookingPrefix, setTempBookingPrefix] = useState('DR-PB-');
  const [tempStartingNumber, setTempStartingNumber] = useState(1001);
  const [savingQr, setSavingQr] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Pre-Booking Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState(1);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Cash'>('UPI');
  const [notes, setNotes] = useState('');
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<PreBooking | null>(null);
  const receiptCardRef = useRef<HTMLDivElement>(null);

  const FIXED_UNIT_PRICE = 499;
  const totalPayable = quantity * FIXED_UNIT_PRICE;

  // 1. Fetch QR & Series Settings
  const fetchQrSettings = async () => {
    try {
      const res = await adminApi.get('/admin/pre-bookings/settings/qr');
      if (res && res.success && res.data) {
        setQrSettings(res.data);
      }
    } catch (e) {
      console.warn('QR settings fetch error:', e);
    }
  };

  // 2. Fetch Pre-Bookings (Scoped by Role)
  const fetchPreBookings = async () => {
    setLoading(true);
    try {
      const roleParam = user?.roleName || 'SALES_EXECUTIVE';
      const userIdParam = user?.id || 1;

      let query = `/admin/pre-bookings?role=${encodeURIComponent(roleParam)}&user_id=${userIdParam}&status=${statusFilter}&paymentMode=${paymentModeFilter}&view_all=${canViewAllBookings ? 'true' : 'false'}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (dateFilter) query += `&date=${encodeURIComponent(dateFilter)}`;

      const res = await adminApi.get(query);
      if (res && res.success && Array.isArray(res.data)) {
        setBookings(res.data);
        if (res.stats) setStats(res.stats);
      } else {
        setBookings([]);
        setStats({
          totalCount: 0,
          totalRevenue: 0,
          totalQty: 0,
          upiCount: 0,
          upiAmount: 0,
          cashCount: 0,
          cashAmount: 0
        });
      }
    } catch (err) {
      console.warn('Pre-bookings fetch notice:', err);
      setBookings([]);
      setStats({
        totalCount: 0,
        totalRevenue: 0,
        totalQty: 0,
        upiCount: 0,
        upiAmount: 0,
        cashCount: 0,
        cashAmount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQrSettings();
  }, []);

  useEffect(() => {
    fetchPreBookings();
  }, [user, statusFilter, paymentModeFilter, search, dateFilter]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(qrSettings.upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchPreBookings(), fetchQrSettings()]);
      setToastMessage('Pre-bookings and settings refreshed!');
    } catch (e) {
      console.warn('Refresh notice:', e);
    } finally {
      setRefreshing(false);
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleCopyBookingCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setToastMessage(`Booking code "${code}" copied to clipboard!`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Open QR & Series Settings Modal (Super Admin only)
  const handleOpenQrSettings = () => {
    setTempUpiId(qrSettings.upi_id || 'doonriders@icici');
    setTempMerchantName(qrSettings.merchant_name || 'DOON RIDERS EV MOBILITY');
    setTempQrImageUrl(qrSettings.qr_image_url || '');
    setTempBookingPrefix(qrSettings.booking_id_prefix || 'DR-PB-');
    setTempStartingNumber(qrSettings.next_booking_number || qrSettings.starting_booking_number || 1001);
    setShowQrSettingsModal(true);
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB limit. Please select an image under 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawBase64 = evt.target?.result as string;
      if (!rawBase64) return;

      // Optimize image via Canvas to keep base64 ultra-clean (< 80KB) and razor sharp
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 800; // QR codes are optimal and crisp at 600-800px
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);
            setTempQrImageUrl(optimizedBase64);
            return;
          }
        } catch (err) {
          console.warn('QR image canvas resize notice:', err);
        }
        setTempQrImageUrl(rawBase64);
      };
      img.onerror = () => {
        setTempQrImageUrl(rawBase64);
      };
      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQrSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQr(true);
    try {
      const startNum = Number(tempStartingNumber) || 1001;
      const payload = {
        upi_id: tempUpiId.trim() || 'doonriders@icici',
        merchant_name: tempMerchantName.trim() || 'DOON RIDERS EV MOBILITY',
        qr_image_url: tempQrImageUrl,
        booking_id_prefix: tempBookingPrefix.trim() || 'DR-PB-',
        starting_booking_number: startNum,
        next_booking_number: startNum
      };

      const res = await adminApi.post('/admin/pre-bookings/settings/qr', payload);
      if (res && res.success && res.data) {
        setQrSettings(res.data);
        setShowQrSettingsModal(false);
        setToastMessage('Payment QR & Receipt Series settings updated successfully!');
      } else {
        alert(res?.message || 'Failed to update QR & ID settings in database.');
      }
    } catch (err: any) {
      alert('Error updating settings: ' + err.message);
    } finally {
      setSavingQr(false);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Create Pre-Booking
  const handleCreatePreBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !mobileNumber.trim()) {
      alert('Please enter Customer Name and Mobile Number');
      return;
    }

    if (paymentMode === 'Cash' && !cashConfirmed) {
      alert('Please confirm that Cash payment has been received.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName.trim(),
        mobile_number: mobileNumber.trim(),
        booking_date: bookingDate,
        quantity: quantity,
        unit_price: FIXED_UNIT_PRICE,
        total_amount: totalPayable,
        payment_mode: paymentMode,
        payment_status: 'PAID',
        notes: notes.trim(),
        created_by_id: user?.id || 1,
        created_by_name: user?.name || 'Staff'
      };

      const res = await adminApi.post('/admin/pre-bookings', payload);
      if (res && res.success) {
        setToastMessage(`Pre-Booking ${res.data?.booking_code || 'DR-PB-New'} confirmed successfully!`);
        setShowCreateModal(false);
        setSelectedReceipt(res.data);
        resetForm();
        fetchPreBookings();
        fetchQrSettings();
      } else {
        alert(res?.message || 'Failed to save pre-booking in database. Please check backend connection.');
      }
    } catch (err: any) {
      alert('Error creating pre-booking: ' + err.message);
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setMobileNumber('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setQuantity(1);
    setPaymentMode('UPI');
    setNotes('');
    setCashConfirmed(false);
  };

  const handleUpdateStatus = async (id: number, newStatus: 'PAID' | 'CANCELLED' | 'PENDING') => {
    if (!isSuperAdmin && !hasPermission('pre_bookings.status_update')) {
      alert('You do not have permission to change booking status or cancel bookings.');
      return;
    }
    try {
      await adminApi.patch(`/admin/pre-bookings/${id}`, { payment_status: newStatus });
      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, payment_status: newStatus } : b))
      );
      setToastMessage(`Booking status updated to ${newStatus}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.warn('Update notice:', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isSuperAdmin && !hasPermission('pre_bookings.delete')) {
      alert('You do not have permission to delete pre-booking records.');
      return;
    }
    if (!confirm('Are you sure you want to delete this pre-booking record?')) return;
    try {
      await adminApi.delete(`/admin/pre-bookings/${id}`);
      setBookings(prev => prev.filter(b => b.id !== id));
      setToastMessage('Pre-booking deleted');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.warn('Delete notice:', e);
    }
  };

  // Generate WhatsApp Message
  const generateWhatsAppMessage = (b: PreBooking) => {
    const formattedDateTime = formatIndianDateTime(b.created_at, b.booking_date);
    const formattedAmount = Number(b.total_amount).toFixed(2);

    return (
`🛵 *DOON RIDERS - OFFICIAL PRE-BOOKING CONFIRMATION* ⚡

Hello *${b.customer_name}*, thank you for pre-booking your EV Scooty with DOON Riders!

📄 *Booking Reference:* ${b.booking_code}
📅 *Booking Date:* ${formattedDateTime}
🛵 *EV Scooty Units:* ${b.quantity} Unit(s)
💰 *Amount Paid:* ₹${formattedAmount} (PAID via ${b.payment_mode})
✅ *Payment Status:* PAID & CONFIRMED

📍 *Pickup Hubs across Dehradun:*
• Sahastradhara Rd, opposite Shiv Mandir, Kulhan, Kirsali, Dehradun, Uttarakhand 248013

📞 *Customer Helpline:* +91 84394 31999
🌐 *Website:* https://doonriders.in

_Please present this receipt confirmation at the hub during vehicle handover._
*DOON Riders — 100% Smart Electric Mobility in Dehradun*`
    );
  };

  // Download Receipt Card as High-Res PNG Image (Explicit Save button only)
  const handleDownloadReceiptImage = async (b: PreBooking) => {
    if (!receiptCardRef.current) return;
    try {
      setGeneratingImage(true);
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `DOON_Riders_Receipt_${b.booking_code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToastMessage(`Receipt image downloaded for ${b.booking_code}`);
    } catch (e) {
      console.error('Error downloading receipt image:', e);
      alert('Could not download image. Please try again.');
    } finally {
      setGeneratingImage(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Share Receipt on WhatsApp (Sends Image + Text together on Mobile, Copies Image to Clipboard on Desktop)
  const handleShareWhatsApp = async (b: PreBooking) => {
    const cleanPhone = b.mobile_number.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msgText = generateWhatsAppMessage(b);
    const waUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msgText)}`;

    if (!receiptCardRef.current) {
      window.open(waUrl, '_blank');
      return;
    }

    try {
      setGeneratingImage(true);
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // 1. Mobile Web Share API: Attaches Image File + Text together directly to WhatsApp
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const imageFile = new File([blob], `DOON_Riders_Receipt_${b.booking_code}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [imageFile] })) {
              await navigator.share({
                files: [imageFile],
                title: `DOON Riders Receipt - ${b.booking_code}`,
                text: msgText
              });
              setGeneratingImage(false);
              return;
            }
          }
        } catch (shareErr) {
          console.warn('Web share notice:', shareErr);
        }
      }

      // 2. Desktop Browser: Copy image to Clipboard so user can press Ctrl+V in WhatsApp chat
      try {
        canvas.toBlob(async (blob) => {
          if (blob && typeof ClipboardItem !== 'undefined') {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              setToastMessage('📋 Receipt image copied to clipboard! Press Ctrl+V in WhatsApp to send Image + Text.');
            } catch (clipErr) {
              console.warn('Clipboard write notice:', clipErr);
            }
          }
        }, 'image/png');
      } catch (e) {}

      // Open WhatsApp Web with text
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error('WhatsApp share error:', err);
      window.open(waUrl, '_blank');
    } finally {
      setGeneratingImage(false);
      setTimeout(() => setToastMessage(null), 4500);
    }
  };

  const handleCopyWhatsAppText = (b: PreBooking) => {
    navigator.clipboard.writeText(generateWhatsAppMessage(b));
    setCopiedWhatsApp(true);
    setToastMessage('Receipt text copied to clipboard!');
    setTimeout(() => {
      setCopiedWhatsApp(false);
      setToastMessage(null);
    }, 2500);
  };

  const handleExportCsv = () => {
    const headers = 'Booking Code,Customer Name,Mobile Number,Booking Date,Quantity,Total Amount,Payment Mode,Status,Created By,Notes,Created At';
    const rows = bookings.map(b =>
      `"${b.booking_code}","${b.customer_name}","${b.mobile_number}","${b.booking_date}",${b.quantity},${b.total_amount},"${b.payment_mode}","${b.payment_status}","${b.created_by_name || 'Staff'}","${b.notes || ''}","${b.created_at}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `doon_riders_pre_bookings_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        
        {/* ========================================================================= */}
        {/* MOBILE NATIVE APP BAR (md:hidden) */}
        {/* ========================================================================= */}
        <div className="flex md:hidden items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854] shrink-0 shadow-xs">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00D96B] animate-pulse" />
                <h1 className="text-sm font-black text-[#111827] tracking-tight uppercase">
                  Pre-Bookings
                </h1>
              </div>
              <p className="text-[10px] text-[#667085] font-semibold">
                {isSuperAdmin ? 'Super Admin Overview' : `Agent: ${user?.name || 'Staff'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] rounded-xl border border-[#E5E7EB] transition active:scale-95 cursor-pointer"
              title="Refresh pre-bookings"
            >
              <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#00A854]' : ''}`} />
            </button>

            {/* QR Settings Button (Super Admin) */}
            {(isSuperAdmin || hasPermission('pre_bookings.settings')) && (
              <button
                onClick={handleOpenQrSettings}
                className="p-2 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] rounded-xl border border-[#E5E7EB] transition active:scale-95 cursor-pointer"
                title="QR & ID Settings"
              >
                <Settings className="w-4 h-4 text-[#00A854]" />
              </button>
            )}

            {/* Export CSV Button */}
            {(isSuperAdmin || hasPermission('pre_bookings.export')) && (
              <button
                onClick={handleExportCsv}
                className="p-2 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#475467] hover:text-[#00A854] rounded-xl border border-[#E5E7EB] transition active:scale-95 cursor-pointer"
                title="Export CSV"
              >
                <Download className="w-4 h-4 text-[#00A854]" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP PAGE HEADER (hidden md:flex) */}
        {/* ========================================================================= */}
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D96B] animate-pulse" />
              <h1 className="text-2xl font-black text-[#111827] tracking-tight uppercase">
                DOON RIDERS PRE-BOOKING
              </h1>
              
              {isSuperAdmin && (
                <span className="bg-[#EAFBF2] text-[#00A854] text-[11px] font-black px-3 py-1 rounded-full border border-[#00D96B]/30 flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SUPER ADMIN (COMPANY OVERVIEW)</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FA] transition shadow-sm cursor-pointer"
              title="Refresh Pre-Bookings"
            >
              <RotateCw className={`w-4 h-4 text-[#00A854] ${refreshing ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>

            {/* Super Admin Settings Button */}
            {(isSuperAdmin || hasPermission('pre_bookings.settings')) && (
              <button
                onClick={handleOpenQrSettings}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FA] transition shadow-sm cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#00A854]" />
                <span>QR &amp; ID SETTINGS</span>
              </button>
            )}

            {(isSuperAdmin || hasPermission('pre_bookings.export')) && (
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FA] transition shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#00A854]" />
                <span>EXPORT CSV</span>
              </button>
            )}

            {canCreatePreBooking && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-[#070D18] font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition transform hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ NEW PRE-BOOKING</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-[#EAFBF2] border border-[#00D96B] text-[#00A854] p-3 sm:p-3.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 stroke-[3] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MOBILE REACT NATIVE FINTECH WALLET OVERVIEW CARD (md:hidden) */}
        {/* ========================================================================= */}
        <div className="block md:hidden bg-gradient-to-br from-[#0B1528] via-[#0E2238] to-[#0A1728] text-white rounded-3xl p-4.5 border border-slate-800 shadow-xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#00D96B]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative space-y-3.5">
            {/* Header chip row */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-400 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D96B] animate-pulse" />
                <span>COLLECTIONS OVERVIEW</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-300">
                {stats.totalCount} Bookings • {stats.totalQty} Units
              </span>
            </div>

            {/* Big Revenue Number */}
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Collected</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-black text-[#00D96B] font-mono tracking-tight">
                    ₹{stats.totalRevenue.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">INR</span>
                </div>
              </div>

              {/* Quick Action Button right inside Wallet Card */}
              {canCreatePreBooking && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="bg-[#00D96B] active:bg-[#00A854] text-[#070D18] font-black text-[11px] uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-[0_2px_12px_rgba(0,217,107,0.4)] flex items-center gap-1.5 active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ BOOKING</span>
                </button>
              )}
            </div>

            {/* UPI & Cash Quick Split Pills */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-400 mb-0.5">
                  <span className="flex items-center gap-1"><QrCode className="w-3 h-3" /> UPI</span>
                  <span>{stats.upiCount} txns</span>
                </div>
                <p className="text-sm font-black text-white font-mono">₹{stats.upiAmount.toLocaleString()}</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 mb-0.5">
                  <span className="flex items-center gap-1"><Banknote className="w-3 h-3" /> Cash</span>
                  <span>{stats.cashCount} txns</span>
                </div>
                <p className="text-sm font-black text-white font-mono">₹{stats.cashAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP STATS SUMMARY METRIC CARDS (hidden md:grid) */}
        {/* ========================================================================= */}
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TOTAL PRE-BOOKINGS */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                {canViewAllBookings ? 'Total Pre-Bookings' : 'My Pre-Bookings'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854]">
                <Ticket className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#111827]">{stats.totalCount}</span>
              <span className="text-xs font-bold text-[#00A854]">({stats.totalQty} EV Units)</span>
            </div>
            <p className="text-[11px] text-[#98A2B3]">
              {canViewAllBookings ? 'Company-wide bookings' : 'Created by you'}
            </p>
          </div>

          {/* TOTAL REVENUE (GREEN & WHITE CARD) */}
          <div className="bg-white border-2 border-[#00D96B]/40 hover:border-[#00D96B] rounded-2xl p-5 shadow-sm space-y-2 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#00A854] uppercase tracking-wider">
                {canViewAllBookings ? 'Total Collected' : 'My Revenue'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#EAFBF2] border border-[#00D96B]/40 flex items-center justify-center text-[#00A854]">
                <Zap className="w-4 h-4 fill-current" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#00A854]">₹{stats.totalRevenue.toLocaleString()}</span>
              <span className="text-[11px] text-[#667085] font-bold">INR</span>
            </div>
            <p className="text-[11px] text-[#667085] font-mono">₹499 × {stats.totalQty} Units</p>
          </div>

          {/* UPI PAYMENTS */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">UPI Collections</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#111827]">₹{stats.upiAmount.toLocaleString()}</span>
              <span className="text-xs font-bold text-blue-600">({stats.upiCount} txns)</span>
            </div>
            <p className="text-[11px] text-[#98A2B3]">Direct QR / UPI payments</p>
          </div>

          {/* CASH PAYMENTS */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Cash Collections</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-[#111827]">₹{stats.cashAmount.toLocaleString()}</span>
              <span className="text-xs font-bold text-amber-600">({stats.cashCount} txns)</span>
            </div>
            <p className="text-[11px] text-[#98A2B3]">On-counter cash collected</p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE SEARCH & SEGMENTED FILTER CHIP BAR (md:hidden) */}
        {/* ========================================================================= */}
        <div className="block md:hidden space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontal Chip Slider */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {/* Status chips */}
            {['All', 'PAID', 'PENDING', 'CANCELLED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition active:scale-95 cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#00D96B] text-[#070D18] shadow-sm font-black'
                    : 'bg-white text-[#475467] border border-[#E5E7EB] hover:bg-gray-50'
                }`}
              >
                {st === 'All' ? 'All Status' : st}
              </button>
            ))}

            <div className="w-[1px] h-5 bg-[#E5E7EB] shrink-0 mx-0.5" />

            {/* Mode chips */}
            {['All', 'UPI', 'Cash'].map(pm => (
              <button
                key={pm}
                onClick={() => setPaymentModeFilter(pm)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition active:scale-95 cursor-pointer ${
                  paymentModeFilter === pm
                    ? 'bg-[#111827] text-white shadow-sm font-black'
                    : 'bg-white text-[#475467] border border-[#E5E7EB] hover:bg-gray-50'
                }`}
              >
                {pm === 'All' ? 'All Mode' : pm}
              </button>
            ))}

            {/* Date reset if active */}
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="px-2.5 py-1.5 rounded-full text-[11px] font-bold shrink-0 bg-red-50 text-red-600 border border-red-200 flex items-center gap-1"
              >
                <span>{dateFilter}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP TOOLBAR & FILTERS (hidden md:flex) */}
        {/* ========================================================================= */}
        <div className="hidden md:flex bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-2 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-[#F7F9FA] p-1 rounded-xl border border-[#E5E7EB]">
              {['All', 'PAID', 'PENDING', 'CANCELLED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-[#00A854] shadow-sm font-extrabold'
                      : 'text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Payment Mode Filter */}
            <div className="flex items-center gap-1 bg-[#F7F9FA] p-1 rounded-xl border border-[#E5E7EB]">
              {['All', 'UPI', 'Cash'].map(pm => (
                <button
                  key={pm}
                  onClick={() => setPaymentModeFilter(pm)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    paymentModeFilter === pm
                      ? 'bg-white text-[#111827] shadow-sm font-extrabold'
                      : 'text-[#667085] hover:text-[#111827]'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B]"
            />

            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs font-bold text-[#667085] hover:text-red-600 px-1"
                title="Clear date filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE REACT NATIVE APP CARD LIST (block md:hidden) */}
        {/* ========================================================================= */}
        <div className="block md:hidden space-y-3 pb-24">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-4 border border-[#E5E7EB] shadow-xs animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-xl" />
                  <div className="h-9 bg-gray-200 rounded-xl" />
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-[#E5E7EB] shadow-xs text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#111827]">No Pre-Bookings Found</p>
                <p className="text-xs text-[#667085] mt-0.5">
                  {search || statusFilter !== 'All' || paymentModeFilter !== 'All'
                    ? 'Try clearing active filters to see more results.'
                    : 'Start by creating your first customer pre-booking.'}
                </p>
              </div>
              {canCreatePreBooking && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-[#00D96B] text-[#070D18] font-bold text-xs px-4 py-2 rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Create Pre-Booking</span>
                </button>
              )}
            </div>
          ) : (
            bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition active:bg-slate-50 overflow-hidden"
              >
                {/* Card Top: Avatar, Name, Direct Call, Status */}
                <div className="p-3.5 pb-2.5 flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/30 text-[#00A854] font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                      {getCustomerInitials(booking.customer_name)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-[#111827] truncate">
                        {booking.customer_name}
                      </h4>
                      <a
                        href={`tel:${booking.mobile_number}`}
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#00A854] hover:underline"
                        title="Tap to call"
                      >
                        <Phone className="w-3 h-3 fill-current" />
                        <span>{booking.mobile_number}</span>
                      </a>
                    </div>
                  </div>

                  {/* Payment Status Pill */}
                  <div className="shrink-0">
                    {booking.payment_status === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/30 px-2 py-0.5 rounded-full text-[10px] font-black">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>PAID</span>
                      </span>
                    ) : booking.payment_status === 'CANCELLED' ? (
                      <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-black">
                        <XCircle className="w-3 h-3" />
                        <span>CANCELLED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Clock className="w-3 h-3" />
                        <span>PENDING</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle Info Strip: Booking Code, Qty, Amount, Payment Mode */}
                <div className="bg-[#F8FAFC] px-3.5 py-2 border-y border-[#F1F5F9] flex items-center justify-between text-xs">
                  {/* Left: Booking Code pill + Payment Mode badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopyBookingCode(booking.booking_code)}
                      className="inline-flex items-center gap-1 bg-white border border-[#E2E8F0] px-2 py-1 rounded-lg text-[11px] font-mono font-bold text-[#0F172A] active:bg-[#EAFBF2] transition shadow-2xs cursor-pointer"
                      title="Tap to copy booking code"
                    >
                      <span>{booking.booking_code}</span>
                      <Copy className="w-3 h-3 text-[#94A3B8]" />
                    </button>

                    {booking.payment_mode === 'UPI' ? (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <QrCode className="w-3 h-3" />
                        <span>UPI</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Banknote className="w-3 h-3" />
                        <span>Cash</span>
                      </span>
                    )}
                  </div>

                  {/* Right: Units & Total Amount */}
                  <div className="text-right">
                    <span className="text-[11px] text-[#64748B] font-mono mr-1">
                      {booking.quantity} {booking.quantity > 1 ? 'Units' : 'Unit'} •
                    </span>
                    <span className="text-sm font-black text-[#0F172A] font-mono">
                      ₹{Number(booking.total_amount).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Date & Note Row */}
                <div className="px-3.5 py-2 text-[11px] text-[#64748B] flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#94A3B8]" />
                    <span>{formatIndianDateTime(booking.created_at, booking.booking_date)}</span>
                  </div>
                  {booking.created_by_name && (
                    <span className="text-[10px] text-[#94A3B8]">
                      By: <strong className="text-[#334155]">{booking.created_by_name}</strong>
                    </span>
                  )}
                </div>

                {booking.notes && (
                  <div className="mx-3.5 mb-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-2.5 py-1.5 text-[11px] text-[#475467] italic">
                    "{booking.notes}"
                  </div>
                )}

                {/* Bottom Native Action Bar */}
                <div className="p-3 pt-1 flex items-center gap-2">
                  {/* 1-Tap WhatsApp Share Button */}
                  <button
                    onClick={() => {
                      setSelectedReceipt(booking);
                      handleShareWhatsApp(booking);
                    }}
                    className="flex-1 bg-[#25D366] active:bg-[#1EBE5D] text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(37,211,102,0.3)] transition cursor-pointer"
                  >
                    <WhatsAppIcon className="w-4 h-4 fill-white" />
                    <span>WhatsApp Receipt</span>
                  </button>

                  {/* View Voucher / Receipt modal */}
                  <button
                    onClick={() => setSelectedReceipt(booking)}
                    className="p-2.5 bg-[#F8FAFC] active:bg-[#EAFBF2] text-[#334155] border border-[#E2E8F0] rounded-xl transition cursor-pointer"
                    title="View / Print Receipt"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Download Image Button */}
                  <button
                    onClick={() => {
                      setSelectedReceipt(booking);
                      setTimeout(() => handleDownloadReceiptImage(booking), 250);
                    }}
                    className="p-2.5 bg-[#F8FAFC] active:bg-[#EAFBF2] text-[#334155] border border-[#E2E8F0] rounded-xl transition cursor-pointer"
                    title="Download Receipt Image"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Status Toggle (if authorized) */}
                  {(isSuperAdmin || hasPermission('pre_bookings.status_update')) && (
                    booking.payment_status === 'PAID' ? (
                      <button
                        onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}
                        className="p-2.5 bg-[#F8FAFC] active:bg-red-50 text-[#64748B] active:text-red-600 border border-[#E2E8F0] rounded-xl transition cursor-pointer"
                        title="Mark Cancelled"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(booking.id, 'PAID')}
                        className="p-2.5 bg-[#F8FAFC] active:bg-[#EAFBF2] text-[#64748B] active:text-[#00A854] border border-[#E2E8F0] rounded-xl transition cursor-pointer"
                        title="Mark Paid"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )
                  )}

                  {/* Delete Button (if authorized) */}
                  {(isSuperAdmin || hasPermission('pre_bookings.delete')) && (
                    <button
                      onClick={() => handleDelete(booking.id)}
                      className="p-2.5 bg-[#F8FAFC] active:bg-red-50 text-[#94A3B8] active:text-red-600 border border-[#E2E8F0] rounded-xl transition cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP PRE-BOOKINGS TABLE (hidden md:block) */}
        {/* ========================================================================= */}
        <div className="hidden md:block bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F7F9FA] text-[#667085] uppercase text-[11px] font-bold">
                  <th className="p-3.5 px-4">Booking Code</th>
                  <th className="p-3.5 px-4">Customer Name</th>
                  <th className="p-3.5 px-4">Mobile Number</th>
                  <th className="p-3.5 px-4">Date</th>
                  <th className="p-3.5 px-4 text-center">Qty (EV)</th>
                  <th className="p-3.5 px-4 text-right">Amount</th>
                  <th className="p-3.5 px-4 text-center">Payment Mode</th>
                  <th className="p-3.5 px-4 text-center">Status</th>
                  {canViewAllBookings && <th className="p-3.5 px-4">Created By</th>}
                  <th className="p-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={canViewAllBookings ? 10 : 9} className="p-8 text-center text-[#98A2B3]">
                      Loading pre-bookings...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={canViewAllBookings ? 10 : 9} className="p-10 text-center text-[#98A2B3]">
                      <Ticket className="w-8 h-8 text-[#D0D5DD] mx-auto mb-2" />
                      <p className="font-bold text-sm text-[#475467]">No Pre-Bookings Found</p>
                      <p className="text-xs text-[#98A2B3] mt-1">Click "+ New Pre-Booking" to create a customer booking.</p>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-[#F7F9FA] transition">
                      {/* CODE */}
                      <td className="p-3.5 px-4 font-mono font-bold">
                        <span className="bg-[#EAFBF2] text-[#00A854] px-2.5 py-1 rounded-lg border border-[#00D96B]/30 shadow-xs">
                          {booking.booking_code}
                        </span>
                      </td>

                      {/* NAME */}
                      <td className="p-3.5 px-4 font-bold text-[#111827]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#98A2B3]" />
                          <span>{booking.customer_name}</span>
                        </div>
                      </td>

                      {/* PHONE */}
                      <td className="p-3.5 px-4 font-mono text-[#475467]">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#98A2B3]" />
                          <span>{booking.mobile_number}</span>
                        </div>
                      </td>

                      {/* DATE */}
                      <td className="p-3.5 px-4 text-[#667085]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#98A2B3]" />
                          <span>{formatIndianDateOnly(booking.booking_date || booking.created_at)}</span>
                        </div>
                      </td>

                      {/* QTY */}
                      <td className="p-3.5 px-4 text-center">
                        <span className="bg-[#F2F4F7] text-[#344054] px-2.5 py-0.5 rounded-full font-bold font-mono">
                          {booking.quantity} {booking.quantity > 1 ? 'Units' : 'Unit'}
                        </span>
                      </td>

                      {/* TOTAL AMOUNT */}
                      <td className="p-3.5 px-4 text-right">
                        <span className="font-black text-[#111827] text-sm">
                          ₹{Number(booking.total_amount).toLocaleString()}
                        </span>
                      </td>

                      {/* PAYMENT MODE */}
                      <td className="p-3.5 px-4 text-center">
                        {booking.payment_mode === 'UPI' ? (
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <QrCode className="w-3 h-3" />
                            <span>UPI</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <Banknote className="w-3 h-3" />
                            <span>Cash</span>
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="p-3.5 px-4 text-center">
                        {booking.payment_status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 bg-[#EAFBF2] text-[#00A854] border border-[#00D96B]/30 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>PAID</span>
                          </span>
                        ) : booking.payment_status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                            <XCircle className="w-3 h-3" />
                            <span>CANCELLED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <Clock className="w-3 h-3" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      {/* CREATED BY (Company Overview Mode) */}
                      {canViewAllBookings && (
                        <td className="p-3.5 px-4 text-[#667085] text-[11px]">
                          <span className="font-bold text-[#111827]">{booking.created_by_name || 'Staff'}</span>
                        </td>
                      )}

                      {/* ACTIONS */}
                      <td className="p-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Share Button with WhatsApp Icon */}
                          <button
                            onClick={() => {
                              setSelectedReceipt(booking);
                              handleShareWhatsApp(booking);
                            }}
                            title="Share on WhatsApp"
                            className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 rounded-lg transition cursor-pointer"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </button>

                          {/* View Receipt */}
                          <button
                            onClick={() => setSelectedReceipt(booking)}
                            title="View / Print Receipt"
                            className="p-1.5 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#111827] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/40 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Status (Only with pre_bookings.status_update permission or Super Admin) */}
                          {(isSuperAdmin || hasPermission('pre_bookings.status_update')) && (
                            booking.payment_status === 'PAID' ? (
                              <button
                                onClick={() => handleUpdateStatus(booking.id, 'CANCELLED')}
                                title="Mark as Cancelled"
                                className="p-1.5 bg-[#F7F9FA] hover:bg-red-50 text-[#667085] hover:text-red-600 border border-[#E5E7EB] hover:border-red-200 rounded-lg transition cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(booking.id, 'PAID')}
                                title="Mark as Paid"
                                className="p-1.5 bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#667085] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/40 rounded-lg transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}

                          {/* Delete (Only with pre_bookings.delete permission or Super Admin) */}
                          {(isSuperAdmin || hasPermission('pre_bookings.delete')) && (
                            <button
                              onClick={() => handleDelete(booking.id)}
                              title="Delete Record"
                              className="p-1.5 bg-[#F7F9FA] hover:bg-red-50 text-[#98A2B3] hover:text-red-600 border border-[#E5E7EB] hover:border-red-200 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* ========================================================================= */}
      {/* REACT NATIVE STYLE FLOATING ACTION BUTTON (FAB) (fixed md:hidden) */}
      {/* ========================================================================= */}
      {canCreatePreBooking && (
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="fixed bottom-20 right-4 z-30 md:hidden bg-[#00D96B] active:bg-[#00A854] text-[#070D18] font-black text-xs uppercase tracking-wider px-4.5 py-3.5 rounded-full shadow-[0_8px_24px_rgba(0,217,107,0.5)] flex items-center gap-2 active:scale-95 transition-all cursor-pointer border border-[#00D96B]/50"
          title="Create New Pre-Booking"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>New Booking</span>
        </button>
      )}

      {/* ========================================================================= */}
      {/* PRE-BOOKING MODAL (MAIN USER FLOW - NATIVE BOTTOM SHEET ON MOBILE) */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-t-[28px] sm:rounded-[32px] border-t sm:border border-[#E5E7EB] w-full max-w-xl p-5 sm:p-8 shadow-2xl space-y-5 relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Native Mobile Swipe Drag Indicator */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-1 sm:hidden shrink-0" />
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/40 flex items-center justify-center text-[#00A854] shadow-sm">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111827] uppercase tracking-tight">
                    New Pre-Booking
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    Agent: <strong className="text-[#111827]">{user?.name || 'Staff'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-[#98A2B3] hover:text-[#111827] hover:bg-[#F2F4F7] rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePreBooking} className="space-y-5">
              
              {/* SECTION 1: CUSTOMER DETAILS */}
              <div className="space-y-3.5 bg-[#F7F9FA] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00A854] block">
                  1. Customer Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-xs font-bold text-[#111827] mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikas Negi"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B] font-medium"
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-[#111827] mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-[#111827] focus:outline-none focus:border-[#00D96B] font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Booking Date (Auto picked today, manually editable) */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Booking Date (Auto-picked Today, Editable) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#00A854] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-3 py-2 text-xs text-[#111827] font-bold focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: QUANTITY & DYNAMIC 499 MULTIPLIER (GREEN & WHITE THEME) */}
              <div className="bg-[#F0FDF4] text-[#0F172A] p-5 rounded-2xl border-2 border-[#86EFAC] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00A854]">
                    2. Pre-Booking Amount &amp; Qty
                  </span>
                  <span className="bg-white text-[#00A854] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#00D96B]/50 shadow-xs">
                    FIXED ₹499 / BOOKING
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#0F172A] font-bold">Select Pre-Booking Quantity:</p>
                    <p className="text-[11px] text-[#64748B]">Number of EV Scooties to pre-book</p>
                  </div>

                  {/* Quantity Selector [-] [Number] [+] */}
                  <div className="inline-flex items-center bg-white border border-[#86EFAC] rounded-xl p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-[#EAFBF2] hover:bg-[#00D96B] hover:text-[#070D18] text-[#00A854] font-black text-lg flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 text-center font-black text-lg bg-transparent text-[#0F172A] focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="w-9 h-9 rounded-lg bg-[#EAFBF2] hover:bg-[#00D96B] hover:text-[#070D18] text-[#00A854] font-black text-lg flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Live Dynamic Total Calculation Box */}
                <div className="pt-3 border-t border-[#86EFAC] flex items-center justify-between bg-white p-3.5 rounded-xl border border-[#DCFCE7] shadow-xs">
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Calculation Breakdown:</span>
                    <span className="text-xs font-mono text-[#0F172A] font-bold">
                      {quantity} {quantity > 1 ? 'Units' : 'Unit'} × ₹499
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748B] uppercase font-bold block">Amount</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#00A854] tracking-tight">
                      ₹{totalPayable.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PAYMENT OPTION SELECTOR (UPI / CASH) */}
              <div className="space-y-3.5 bg-[#F7F9FA] p-4 rounded-2xl border border-[#E5E7EB]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00A854] block">
                  3. Select Payment Option
                </span>

                {/* Option Tabs */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      paymentMode === 'UPI'
                        ? 'bg-[#EAFBF2] border-[#00D96B] text-[#00A854] shadow-sm ring-2 ring-[#00D96B]/30'
                        : 'bg-white border-[#E5E7EB] text-[#475467] hover:bg-[#F2F4F7]'
                    }`}
                  >
                    <QrCode className="w-6 h-6 shrink-0" />
                    <div>
                      <p className="font-bold text-xs uppercase text-[#111827]">UPI Payment</p>
                      <p className="text-[10px] text-[#667085]">Instant QR Scan &amp; Pay</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('Cash')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      paymentMode === 'Cash'
                        ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-sm ring-2 ring-amber-300'
                        : 'bg-white border-[#E5E7EB] text-[#475467] hover:bg-[#F2F4F7]'
                    }`}
                  >
                    <Banknote className="w-6 h-6 shrink-0" />
                    <div>
                      <p className="font-bold text-xs uppercase text-[#111827]">Cash on Counter</p>
                      <p className="text-[10px] text-[#667085]">Physical Cash Receipt</p>
                    </div>
                  </button>
                </div>

                {/* UPI QR Code Container (Dynamic Custom QR from Super Admin or Default) */}
                {paymentMode === 'UPI' && (
                  <div className="bg-white border border-[#00D96B]/40 rounded-2xl p-5 text-center space-y-3.5 shadow-sm animate-fadeIn">
                    <div className="inline-flex items-center gap-1.5 bg-[#EAFBF2] text-[#00A854] px-3 py-1 rounded-full text-[11px] font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Scan &amp; Pay ₹{totalPayable.toLocaleString()} via Any UPI App</span>
                    </div>

                    {/* QR Code Graphic Container (Custom Uploaded Image or Dynamic QR) */}
                    <div className="relative w-48 h-48 mx-auto bg-white p-2 rounded-2xl border-2 border-[#00D96B] shadow-md flex items-center justify-center overflow-hidden">
                      {qrSettings.qr_image_url ? (
                        <img
                          src={qrSettings.qr_image_url}
                          alt="DOON Riders UPI QR"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=${encodeURIComponent(qrSettings.upi_id)}%26pn=${encodeURIComponent(qrSettings.merchant_name)}%26am=${totalPayable}%26cu=INR`}
                          alt="DOON Riders UPI QR"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      )}
                    </div>

                    {/* UPI ID Copy Box */}
                    <div className="flex items-center justify-center gap-2 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-4 py-2 max-w-xs mx-auto">
                      <span className="text-xs font-mono font-bold text-[#111827]">{qrSettings.upi_id}</span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="text-[#00A854] hover:text-[#008f47] p-1 cursor-pointer"
                        title="Copy UPI ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {copiedUpi && <span className="text-[10px] text-[#00A854] font-bold">Copied!</span>}
                    </div>
                  </div>
                )}

                {/* Cash Confirmation */}
                {paymentMode === 'Cash' && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <Banknote className="w-4 h-4 text-amber-600" />
                      <span>Cash Collection Confirmation</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Please collect <strong className="text-amber-950">₹{totalPayable.toLocaleString()}</strong> in cash from the customer before confirming.
                    </p>
                    <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cashConfirmed}
                        onChange={(e) => setCashConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded border-amber-300 text-[#00D96B] focus:ring-[#00D96B] cursor-pointer"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        I have received ₹{totalPayable.toLocaleString()} Cash from customer
                      </span>
                    </label>
                  </div>
                )}

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">Optional Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Preferred hub: Rajpur Road, student booking..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              {/* ACTION CONFIRMATION BUTTONS: PAYMENT DONE / CANCEL */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#667085] hover:bg-[#F2F4F7] transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#00D96B] hover:bg-[#00A854] text-[#070D18] font-black text-xs uppercase tracking-wider px-7 py-3 rounded-xl shadow-[0_4px_16px_rgba(0,217,107,0.4)] transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  <span>{submitting ? 'PROCESSING...' : `PAYMENT DONE (₹${totalPayable.toLocaleString()})`}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUPER ADMIN QR CODE & ID SERIES CONFIGURATION MODAL */}
      {/* ========================================================================= */}
      {showQrSettingsModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-t-[28px] sm:rounded-[32px] border-t sm:border border-[#E5E7EB] w-full max-w-lg p-5 sm:p-8 shadow-2xl space-y-5 relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Native Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-1 sm:hidden shrink-0" />
            
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/40 flex items-center justify-center text-[#00A854]">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[#111827] uppercase tracking-tight">
                    QR &amp; Receipt ID Settings
                  </h3>
                  <p className="text-[11px] text-[#667085]">
                    Super Admin master configuration for payment QR &amp; dynamic ID series
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQrSettingsModal(false)}
                className="p-1.5 text-[#98A2B3] hover:text-[#111827] rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQrSettings} className="space-y-4">
              
              {/* SECTION A: DYNAMIC RECEIPT ID SERIES */}
              <div className="p-4 bg-[#F7F9FA] rounded-2xl border border-[#E5E7EB] space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00A854] flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Receipt ID Series Configuration</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#111827] mb-1">ID Prefix</label>
                    <input
                      type="text"
                      placeholder="e.g. DR-PB-"
                      value={tempBookingPrefix}
                      onChange={(e) => setTempBookingPrefix(e.target.value)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#111827] mb-1">Starting Number Series</label>
                    <input
                      type="number"
                      min={1}
                      placeholder="1001"
                      value={tempStartingNumber}
                      onChange={(e) => setTempStartingNumber(parseInt(e.target.value) || 1001)}
                      className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#667085]">
                  Next generated booking ID will start at: <strong className="text-[#00A854] font-mono font-bold">{tempBookingPrefix}{tempStartingNumber}</strong>, then increment automatically (+1, +2...).
                </p>
              </div>

              {/* SECTION B: UPI RECEIVER SETTINGS */}
              <div className="p-4 bg-[#F7F9FA] rounded-2xl border border-[#E5E7EB] space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00A854] flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>UPI Payment Details</span>
                </span>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Receiver UPI ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. doonriders@icici"
                    value={tempUpiId}
                    onChange={(e) => setTempUpiId(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#111827] focus:outline-none focus:border-[#00D96B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Merchant Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="DOON RIDERS EV MOBILITY"
                    value={tempMerchantName}
                    onChange={(e) => setTempMerchantName(e.target.value)}
                    className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:border-[#00D96B]"
                  />
                </div>
              </div>

              {/* SECTION C: CUSTOM QR CODE IMAGE */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#111827]">
                  Custom QR Code Image (Optional Image Upload)
                </label>
                <div
                  onClick={() => qrFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#00D96B]/50 bg-[#EAFBF2]/30 hover:bg-[#EAFBF2]/60 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
                >
                  {tempQrImageUrl ? (
                    <div className="space-y-2">
                      <img src={tempQrImageUrl} alt="QR Preview" className="w-28 h-28 object-contain rounded-lg border mx-auto" />
                      <p className="text-[11px] font-bold text-[#00A854]">Click to change image</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#00A854]" />
                      <p className="text-xs font-bold text-[#111827]">Upload Custom QR Code Image</p>
                      <p className="text-[10px] text-[#667085]">Supports PNG, JPG, WebP up to 5MB</p>
                    </>
                  )}
                  <input
                    type="file"
                    ref={qrFileInputRef}
                    onChange={handleQrFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {tempQrImageUrl && (
                  <button
                    type="button"
                    onClick={() => setTempQrImageUrl('')}
                    className="text-[11px] font-bold text-red-600 hover:underline"
                  >
                    Remove custom QR image (Use auto dynamic QR)
                  </button>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setShowQrSettingsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#667085]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQr}
                  className="bg-[#00D96B] hover:bg-[#00A854] text-[#070D18] font-black text-xs uppercase px-6 py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  {savingQr ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICIAL PRE-BOOKING VOUCHER / RECEIPT MODAL (WITH WHATSAPP IMAGE & SHARE) */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-t-[28px] sm:rounded-[24px] border-t sm:border border-[#E5E7EB] w-full max-w-sm sm:max-w-md p-4 sm:p-5 shadow-2xl space-y-3 relative max-h-[94vh] sm:max-h-[92vh] overflow-y-auto">
            {/* Native Mobile Swipe Drag Indicator */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-1 sm:hidden shrink-0" />

            {/* Close Button */}
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-3.5 right-3.5 p-1 text-[#98A2B3] hover:text-[#111827] rounded-full hover:bg-[#F2F4F7] transition cursor-pointer print:hidden z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Printable Card (DOM Target for HTML2Canvas & Print) */}
            <div
              ref={receiptCardRef}
              className="bg-white rounded-[18px] border border-[#E5E7EB] shadow-sm text-left"
              id="printable-receipt"
              style={{
                width: '100%',
                maxWidth: '380px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                padding: '16px 16px',
                boxSizing: 'border-box',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              
              {/* Receipt Header */}
              <div style={{ textAlign: 'center', paddingBottom: '10px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#EAFBF2', border: '1.5px solid #00D96B', marginBottom: '6px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#00A854" style={{ display: 'block' }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#111827', letterSpacing: '1px', textTransform: 'uppercase', lineHeight: '1.1', margin: 0 }}>
                    DOON <span style={{ color: '#00A854' }}>RIDERS</span>
                  </h3>
                  <p style={{ fontSize: '9px', fontWeight: 800, color: '#64748B', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: '3px', marginBottom: 0 }}>
                    OFFICIAL PRE-BOOKING RECEIPT
                  </p>
                </div>

                <div style={{ marginTop: '6px' }}>
                  <span style={{ display: 'inline-block', backgroundColor: '#EAFBF2', color: '#00A854', fontSize: '11px', fontWeight: 900, fontFamily: 'monospace', padding: '3px 12px', borderRadius: '9999px', border: '1.5px solid #00D96B', letterSpacing: '1px' }}>
                    {selectedReceipt.booking_code}
                  </span>
                </div>
              </div>

              {/* Receipt Info Table */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '8px 12px', margin: '10px 0', boxSizing: 'border-box' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '5.5px 0', color: '#64748B', fontSize: '11.5px', fontWeight: 500, width: '45%', textAlign: 'left', verticalAlign: 'middle' }}>
                        Customer Name:
                      </td>
                      <td style={{ padding: '5.5px 0', color: '#0F172A', fontSize: '12px', fontWeight: 700, width: '55%', textAlign: 'right', verticalAlign: 'middle', wordBreak: 'break-word' }}>
                        {selectedReceipt.customer_name}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '5.5px 0', color: '#64748B', fontSize: '11.5px', fontWeight: 500, width: '45%', textAlign: 'left', verticalAlign: 'middle' }}>
                        Mobile Number:
                      </td>
                      <td style={{ padding: '5.5px 0', color: '#0F172A', fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', width: '55%', textAlign: 'right', verticalAlign: 'middle' }}>
                        {selectedReceipt.mobile_number}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '5.5px 0', color: '#64748B', fontSize: '11.5px', fontWeight: 500, width: '45%', textAlign: 'left', verticalAlign: 'middle' }}>
                        Booking Date:
                      </td>
                      <td style={{ padding: '5.5px 0', color: '#0F172A', fontSize: '11.5px', fontWeight: 600, width: '55%', textAlign: 'right', verticalAlign: 'middle' }}>
                        {formatIndianDateTime(selectedReceipt.created_at, selectedReceipt.booking_date)}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '5.5px 0', color: '#64748B', fontSize: '11.5px', fontWeight: 500, width: '45%', textAlign: 'left', verticalAlign: 'middle' }}>
                        Quantity:
                      </td>
                      <td style={{ padding: '5.5px 0', color: '#0F172A', fontSize: '12px', fontWeight: 700, width: '55%', textAlign: 'right', verticalAlign: 'middle' }}>
                        {selectedReceipt.quantity} Unit{selectedReceipt.quantity > 1 ? 's' : ''} (₹499/unit)
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: '5.5px 0', color: '#64748B', fontSize: '11.5px', fontWeight: 500, width: '45%', textAlign: 'left', verticalAlign: 'middle' }}>
                        Payment Mode:
                      </td>
                      <td style={{ padding: '5.5px 0', color: '#0F172A', fontSize: '12px', fontWeight: 700, width: '55%', textAlign: 'right', verticalAlign: 'middle' }}>
                        {selectedReceipt.payment_mode === 'UPI' ? 'UPI (Scan & Pay)' : 'Cash (Counter)'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '5.5px 0 2px 0', color: '#64748B', fontSize: '11.5px', fontWeight: 500, width: '45%', textAlign: 'left', verticalAlign: 'middle' }}>
                        Status:
                      </td>
                      <td style={{ padding: '5.5px 0 2px 0', width: '55%', textAlign: 'right', verticalAlign: 'middle' }}>
                        <span style={{ display: 'inline-block', backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: '5px', padding: '2px 8px', fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.5px' }}>
                          PAID &amp; CONFIRMED
                        </span>
                      </td>
                    </tr>
                    {selectedReceipt.notes && (
                      <tr style={{ borderTop: '1px solid #E2E8F0' }}>
                        <td colSpan={2} style={{ padding: '6px 0 2px 0', textAlign: 'left' }}>
                          <span style={{ color: '#64748B', fontSize: '9.5px', fontWeight: 600, display: 'block' }}>Notes:</span>
                          <span style={{ color: '#0F172A', fontSize: '10.5px', fontStyle: 'italic', display: 'block', marginTop: '1px' }}>{selectedReceipt.notes}</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Paid Badge (AMOUNT) */}
              <div style={{ backgroundColor: '#070D18', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #1E293B', margin: '10px 0', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1px' }}>
                    AMOUNT PAID
                  </div>
                  <div style={{ fontSize: '11px', color: '#00D96B', fontWeight: 700 }}>
                    100% Confirmed Pre-Booking
                  </div>
                </div>
                <div style={{ fontSize: '22px', color: '#00D96B', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  ₹{Number(selectedReceipt.total_amount).toLocaleString()}
                </div>
              </div>

              {/* Receipt Footer */}
              <div style={{ textAlign: 'center', paddingTop: '8px', borderTop: '1px solid #E5E7EB', color: '#64748B', fontSize: '9.5px', lineHeight: '1.35' }}>
                <p style={{ fontWeight: 700, color: '#334155', margin: '0 0 2px 0' }}>
                  📍 Pickup Hub: Sahastradhara Rd, Kulhan, Dehradun
                </p>
                <p style={{ color: '#64748B', margin: '0 0 2px 0', fontSize: '9px' }}>
                  (Opposite Shiv Mandir, Kirsali, Dehradun, Uttarakhand 248013)
                </p>
                <p style={{ margin: '0 0 2px 0', fontSize: '9px', fontWeight: 600, color: '#475569' }}>
                  Helpline: +91 84394 31999 &nbsp;|&nbsp; doonriders.in
                </p>
                <p style={{ margin: '0', fontSize: '8.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                  Please present this receipt voucher at the hub during vehicle handover.
                </p>
              </div>
            </div>

            {/* WHATSAPP SHARE & IMAGE ACTIONS */}
            <div className="space-y-2 pt-1 print:hidden">
              
              {/* PRIMARY WHATSAPP SHARE BUTTON WITH OFFICIAL WHATSAPP ICON */}
              <button
                type="button"
                onClick={() => handleShareWhatsApp(selectedReceipt)}
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl shadow-[0_4px_14px_rgba(37,211,102,0.35)] transition transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>SEND RECEIPT ON WHATSAPP ({selectedReceipt.mobile_number})</span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                {/* Download Receipt Image */}
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptImage(selectedReceipt)}
                  disabled={generatingImage}
                  className="bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#111827] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/40 py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#00A854]" />
                  <span>{generatingImage ? 'Generating...' : 'Save Image'}</span>
                </button>

                {/* Copy Text Button */}
                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppText(selectedReceipt)}
                  className="bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#111827] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/40 py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-[#00A854]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWhatsApp ? 'Copied!' : 'Copy Text'}</span>
                </button>

                {/* Print Button */}
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="bg-[#111827] hover:bg-[#070D18] text-white py-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-[#00D96B]" />
                  <span>Print</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </AdminLayout>
  );
}
