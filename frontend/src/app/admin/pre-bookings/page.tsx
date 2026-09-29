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
  Hash
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

export default function PreBookingsAdminPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roleName === 'SUPER_ADMIN';

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

  // QR & Series Settings
  const [qrSettings, setQrSettings] = useState<QrSettings>({
    upi_id: 'doonriders@icici',
    merchant_name: 'DOON RIDERS EV MOBILITY',
    qr_image_url: '',
    booking_id_prefix: 'DR-PB-',
    starting_booking_number: 1001,
    next_booking_number: 1003
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
      } else {
        const saved = localStorage.getItem('dr_custom_qr_settings');
        if (saved) setQrSettings(JSON.parse(saved));
      }
    } catch (e) {
      const saved = localStorage.getItem('dr_custom_qr_settings');
      if (saved) setQrSettings(JSON.parse(saved));
    }
  };

  // 2. Fetch Pre-Bookings (Scoped by Role)
  const fetchPreBookings = async () => {
    setLoading(true);
    try {
      const roleParam = user?.roleName || 'SALES_EXECUTIVE';
      const userIdParam = user?.id || 1;

      let query = `/admin/pre-bookings?role=${encodeURIComponent(roleParam)}&user_id=${userIdParam}&status=${statusFilter}&paymentMode=${paymentModeFilter}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (dateFilter) query += `&date=${encodeURIComponent(dateFilter)}`;

      const res = await adminApi.get(query);
      if (res && res.success && res.data) {
        setBookings(res.data);
        if (res.stats) setStats(res.stats);
      } else {
        // Fallback local dataset
        let list: PreBooking[] = [
          {
            id: 1,
            booking_code: 'DR-PB-1001',
            customer_name: 'Aarav Sharma',
            mobile_number: '+91 98970 12345',
            booking_date: new Date().toISOString().split('T')[0],
            unit_price: 499,
            quantity: 1,
            total_amount: 499,
            payment_mode: 'UPI',
            payment_status: 'PAID',
            notes: 'Pickup from Rajpur Road Hub',
            created_by_id: 1,
            created_by_name: 'Ankit Kumar (Super Admin)',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            booking_code: 'DR-PB-1002',
            customer_name: 'Sneha Rawat',
            mobile_number: '+91 98123 45678',
            booking_date: new Date().toISOString().split('T')[0],
            unit_price: 499,
            quantity: 2,
            total_amount: 998,
            payment_mode: 'Cash',
            payment_status: 'PAID',
            notes: '2 EV Scooty units booked for college commute',
            created_by_id: 4,
            created_by_name: 'Rahul Verma',
            created_at: new Date().toISOString()
          }
        ];

        if (!isSuperAdmin && user?.id) {
          list = list.filter(b => b.created_by_id === user.id);
        }

        setBookings(list);
        setStats({
          totalCount: list.length,
          totalRevenue: list.reduce((s, b) => s + b.total_amount, 0),
          totalQty: list.reduce((s, b) => s + b.quantity, 0),
          upiCount: list.filter(b => b.payment_mode === 'UPI').length,
          upiAmount: list.filter(b => b.payment_mode === 'UPI').reduce((s, b) => s + b.total_amount, 0),
          cashCount: list.filter(b => b.payment_mode === 'Cash').length,
          cashAmount: list.filter(b => b.payment_mode === 'Cash').reduce((s, b) => s + b.total_amount, 0)
        });
      }
    } catch (err) {
      console.warn('Pre-bookings fetch notice:', err);
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

  // Open QR & Series Settings Modal (Super Admin only)
  const handleOpenQrSettings = () => {
    setTempUpiId(qrSettings.upi_id);
    setTempMerchantName(qrSettings.merchant_name);
    setTempQrImageUrl(qrSettings.qr_image_url);
    setTempBookingPrefix(qrSettings.booking_id_prefix || 'DR-PB-');
    setTempStartingNumber(qrSettings.starting_booking_number || 1001);
    setShowQrSettingsModal(true);
  };

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setTempQrImageUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQrSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingQr(true);
    try {
      const payload = {
        upi_id: tempUpiId.trim() || 'doonriders@icici',
        merchant_name: tempMerchantName.trim() || 'DOON RIDERS EV MOBILITY',
        qr_image_url: tempQrImageUrl,
        booking_id_prefix: tempBookingPrefix.trim() || 'DR-PB-',
        starting_booking_number: Number(tempStartingNumber) || 1001
      };

      await adminApi.post('/admin/pre-bookings/settings/qr', payload);
      setQrSettings(payload);
      localStorage.setItem('dr_custom_qr_settings', JSON.stringify(payload));
      setShowQrSettingsModal(false);
      setToastMessage('Payment QR & Receipt Series settings updated successfully!');
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
      } else {
        // Local add
        const prefix = qrSettings.booking_id_prefix || 'DR-PB-';
        const start = qrSettings.starting_booking_number || 1001;
        const codeNum = start + bookings.length;
        const localNew: PreBooking = {
          id: Date.now(),
          booking_code: `${prefix}${codeNum}`,
          customer_name: payload.customer_name,
          mobile_number: payload.mobile_number,
          booking_date: payload.booking_date,
          unit_price: FIXED_UNIT_PRICE,
          quantity: payload.quantity,
          total_amount: payload.total_amount,
          payment_mode: payload.payment_mode,
          payment_status: 'PAID',
          notes: payload.notes,
          created_by_id: user?.id || 1,
          created_by_name: user?.name || 'Staff',
          created_at: new Date().toISOString()
        };
        setBookings(prev => [localNew, ...prev]);
        setShowCreateModal(false);
        setSelectedReceipt(localNew);
        resetForm();
        setToastMessage(`Pre-Booking ${localNew.booking_code} confirmed!`);
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
    return (
`🛵 *DOON RIDERS - OFFICIAL PRE-BOOKING CONFIRMATION* ⚡

Hello *${b.customer_name}*, thank you for pre-booking your EV Scooty with DOON Riders!

📄 *Booking Reference:* ${b.booking_code}
📅 *Booking Date:* ${b.booking_date}
🛵 *EV Scooty Units:* ${b.quantity} Unit(s)
💰 *Amount Paid:* ₹${b.total_amount} (PAID via ${b.payment_mode})
✅ *Payment Status:* PAID & CONFIRMED

📍 *Pickup Hubs across Dehradun:*
• Clock Tower Hub
• Rajpur Road Station
• Canal Road Hub (Premnagar / ISBT / Sewla Kalan)

📞 *Customer Helpline:* +91 98970 11111 / +91 84394 31999
🌐 *Website:* https://doonriders.com

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
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
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
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
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
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* ========================================================================= */}
        {/* PAGE HEADER */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D96B] animate-pulse" />
              <h1 className="text-2xl font-black text-[#111827] tracking-tight uppercase">
                DOON RIDERS PRE-BOOKING
              </h1>
              
              {isSuperAdmin ? (
                <span className="bg-[#EAFBF2] text-[#00A854] text-[11px] font-black px-3 py-1 rounded-full border border-[#00D96B]/30 flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>SUPER ADMIN (COMPANY OVERVIEW)</span>
                </span>
              ) : (
                <span className="bg-blue-50 text-blue-700 text-[11px] font-black px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1.5 shadow-xs">
                  <User className="w-3.5 h-3.5" />
                  <span>MY PRE-BOOKINGS ({user?.name})</span>
                </span>
              )}

              <span className="bg-[#070D18] text-[#00D96B] text-[11px] font-black px-2.5 py-1 rounded-full border border-white/10 font-mono">
                ₹499 FIX
              </span>
            </div>

            <p className="text-xs text-[#667085] mt-1">
              {isSuperAdmin
                ? 'Full company dashboard, QR image upload, dynamic ID series & WhatsApp receipt dispatch.'
                : 'Create customer pre-bookings, collect UPI / Cash & instant WhatsApp receipt share.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Super Admin Settings Button */}
            {isSuperAdmin && (
              <button
                onClick={handleOpenQrSettings}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FA] transition shadow-sm cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#00A854]" />
                <span>QR &amp; ID SETTINGS</span>
              </button>
            )}

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FA] transition shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#00A854]" />
              <span>EXPORT CSV</span>
            </button>

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
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-[#EAFBF2] border border-[#00D96B] text-[#00A854] p-3.5 rounded-2xl flex items-center gap-2 font-bold text-xs shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Regular User Notice */}
        {!isSuperAdmin && (
          <div className="bg-blue-50/70 border border-blue-200 text-blue-900 px-4 py-3 rounded-2xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Agent Privacy Active:</strong> You are viewing only your personal customer pre-bookings. Full company analytics are reserved for Super Admin.
              </span>
            </div>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              Logged in: {user?.name}
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATS SUMMARY METRIC CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* TOTAL PRE-BOOKINGS */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">
                {isSuperAdmin ? 'Total Pre-Bookings' : 'My Pre-Bookings'}
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
              {isSuperAdmin ? 'Company-wide bookings' : 'Created by you'}
            </p>
          </div>

          {/* TOTAL REVENUE */}
          <div className="bg-gradient-to-br from-[#0B1528] to-[#070D18] text-white border border-white/10 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                {isSuperAdmin ? 'Total Collected' : 'My Revenue'}
              </span>
              <div className="w-8 h-8 rounded-xl bg-[#00D96B]/20 border border-[#00D96B]/40 flex items-center justify-center text-[#00D96B]">
                <Zap className="w-4 h-4 fill-current" />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#00D96B]">₹{stats.totalRevenue.toLocaleString()}</span>
              <span className="text-[11px] text-gray-400">INR</span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono">₹499 × {stats.totalQty} Units</p>
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
        {/* TOOLBAR & FILTERS */}
        {/* ========================================================================= */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
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
        {/* PRE-BOOKINGS TABLE */}
        {/* ========================================================================= */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
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
                  {isSuperAdmin && <th className="p-3.5 px-4">Created By</th>}
                  <th className="p-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] font-medium bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 10 : 9} className="p-8 text-center text-[#98A2B3]">
                      Loading pre-bookings...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 10 : 9} className="p-10 text-center text-[#98A2B3]">
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
                          <span>{booking.booking_date}</span>
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

                      {/* CREATED BY (Super Admin Only) */}
                      {isSuperAdmin && (
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

                          {/* Toggle Status */}
                          {booking.payment_status === 'PAID' ? (
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
                          )}

                          {/* Delete (Super Admin or Owner) */}
                          {(isSuperAdmin || booking.created_by_id === user?.id) && (
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
      {/* PRE-BOOKING MODAL (MAIN USER FLOW) */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[32px] border border-[#E5E7EB] w-full max-w-xl p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
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

              {/* SECTION 2: QUANTITY & DYNAMIC 499 MULTIPLIER */}
              <div className="bg-[#0A0F1D] text-white p-5 rounded-2xl border border-white/10 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#00D96B]">
                    2. Pre-Booking Amount &amp; Qty
                  </span>
                  <span className="bg-[#00D96B]/20 text-[#00D96B] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#00D96B]/40">
                    FIXED ₹499 / BOOKING
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-300 font-bold">Select Pre-Booking Quantity:</p>
                    <p className="text-[11px] text-gray-400">Number of EV Scooties to pre-book</p>
                  </div>

                  {/* Quantity Selector [-] [Number] [+] */}
                  <div className="inline-flex items-center bg-white/10 border border-white/20 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#00D96B] hover:text-[#070D18] text-white font-black text-lg flex items-center justify-center transition cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 text-center font-black text-lg bg-transparent text-white focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => prev + 1)}
                      className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#00D96B] hover:text-[#070D18] text-white font-black text-lg flex items-center justify-center transition cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Live Dynamic Total Calculation Box */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between bg-white/5 p-3.5 rounded-xl">
                  <div>
                    <span className="text-[11px] text-gray-400 block">Calculation Breakdown:</span>
                    <span className="text-xs font-mono text-gray-200">
                      {quantity} {quantity > 1 ? 'Units' : 'Unit'} × ₹499
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Amount</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#00D96B] tracking-tight">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[32px] border border-[#E5E7EB] w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[32px] border border-[#E5E7EB] w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-5 relative">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-5 right-5 p-1.5 text-[#98A2B3] hover:text-[#111827] rounded-full hover:bg-[#F2F4F7] transition cursor-pointer print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Receipt Printable Card (DOM Target for HTML2Canvas & Print) */}
            <div
              ref={receiptCardRef}
              className="bg-white p-5 rounded-[24px] border border-[#E5E7EB] shadow-sm space-y-4 text-left"
              id="printable-receipt"
              style={{ minWidth: '380px', maxWidth: '440px', margin: '0 auto', backgroundColor: '#ffffff' }}
            >
              
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-[#E5E7EB] space-y-1.5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#EAFBF2] border border-[#00D96B]/50 text-[#00A854] shadow-sm mb-1">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00A854" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                    <path d="M13 5v2" />
                    <path d="M13 17v2" />
                    <path d="M13 11v2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading font-black text-2xl text-[#111827] tracking-wider uppercase leading-none">
                    DOON <span className="text-[#00A854]">RIDERS</span>
                  </h3>
                  <p className="text-[10px] font-extrabold text-[#667085] uppercase tracking-[0.2em] mt-1">
                    OFFICIAL PRE-BOOKING RECEIPT
                  </p>
                </div>

                <div className="pt-1">
                  <span className="inline-block bg-[#EAFBF2] text-[#00A854] text-xs font-black font-mono px-4 py-1.5 rounded-full border border-[#00D96B] shadow-xs tracking-wider">
                    {selectedReceipt.booking_code}
                  </span>
                </div>
              </div>

              {/* Receipt Info Rows */}
              <div className="space-y-2 text-xs bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
                <div className="flex justify-between items-center py-1 border-b border-[#E2E8F0]/70">
                  <span className="text-[#64748B] font-medium">Customer Name:</span>
                  <span className="font-bold text-[#0F172A] text-right">{selectedReceipt.customer_name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#E2E8F0]/70">
                  <span className="text-[#64748B] font-medium">Mobile Number:</span>
                  <span className="font-mono font-bold text-[#0F172A] text-right">{selectedReceipt.mobile_number}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#E2E8F0]/70">
                  <span className="text-[#64748B] font-medium">Booking Date:</span>
                  <span className="font-medium text-[#0F172A] text-right">{selectedReceipt.booking_date}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#E2E8F0]/70">
                  <span className="text-[#64748B] font-medium">EV Scooty Quantity:</span>
                  <span className="font-bold text-[#0F172A] text-right">
                    {selectedReceipt.quantity} Unit{selectedReceipt.quantity > 1 ? 's' : ''} (₹499/unit)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#E2E8F0]/70">
                  <span className="text-[#64748B] font-medium">Payment Mode:</span>
                  <span className="font-bold text-[#0F172A] text-right">
                    {selectedReceipt.payment_mode === 'UPI' ? 'UPI (Scan & Pay)' : 'Cash (Counter)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#64748B] font-medium">Payment Status:</span>
                  <span className="font-black text-[#15803D] bg-[#DCFCE7] px-3 py-1 rounded-md border border-[#86EFAC] text-[11px] leading-normal inline-block text-right">
                    PAID &amp; CONFIRMED
                  </span>
                </div>
                {selectedReceipt.notes && (
                  <div className="pt-2 border-t border-[#E2E8F0]">
                    <span className="text-[#64748B] block text-[10px] font-medium">Booking Notes:</span>
                    <span className="text-[#0F172A] text-[11px] font-medium italic block mt-0.5">{selectedReceipt.notes}</span>
                  </div>
                )}
              </div>

              {/* Total Paid Badge (AMOUNT) */}
              <div className="bg-gradient-to-br from-[#0B1528] to-[#070D18] text-white p-4 rounded-2xl flex items-center justify-between border border-white/10 shadow-md">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider block">AMOUNT</span>
                  <span className="text-xs text-[#00D96B] font-bold">100% Confirmed Pre-Booking</span>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-[#00D96B] tracking-tight font-mono">
                  ₹{Number(selectedReceipt.total_amount).toLocaleString()}
                </span>
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-2 border-t border-[#E5E7EB] space-y-1 text-[#64748B] text-[10px] leading-tight">
                <p className="font-bold text-[#334155]">📍 Pickup Hubs: Clock Tower • Rajpur Road • Canal Road</p>
                <p>Helpline: +91 98970 11111 | Website: https://doonriders.com</p>
                <p className="text-[9px] text-[#94A3B8] italic pt-0.5">Please present this receipt voucher at the hub during vehicle handover.</p>
              </div>
            </div>

            {/* WHATSAPP SHARE & IMAGE ACTIONS */}
            <div className="space-y-2.5 pt-2 print:hidden">
              
              {/* PRIMARY WHATSAPP SHARE BUTTON WITH OFFICIAL WHATSAPP ICON */}
              <button
                type="button"
                onClick={() => handleShareWhatsApp(selectedReceipt)}
                className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-2xl shadow-[0_4px_18px_rgba(37,211,102,0.4)] transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <WhatsAppIcon className="w-5 h-5 fill-white" />
                <span>SEND RECEIPT ON WHATSAPP ({selectedReceipt.mobile_number})</span>
              </button>

              <div className="grid grid-cols-3 gap-2">
                {/* Download Receipt Image */}
                <button
                  type="button"
                  onClick={() => handleDownloadReceiptImage(selectedReceipt)}
                  disabled={generatingImage}
                  className="bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#111827] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/40 py-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#00A854]" />
                  <span>{generatingImage ? 'Generating...' : 'Save Image'}</span>
                </button>

                {/* Copy Text Button */}
                <button
                  type="button"
                  onClick={() => handleCopyWhatsAppText(selectedReceipt)}
                  className="bg-[#F7F9FA] hover:bg-[#EAFBF2] text-[#111827] hover:text-[#00A854] border border-[#E5E7EB] hover:border-[#00D96B]/40 py-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-[#00A854]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWhatsApp ? 'Copied!' : 'Copy Text'}</span>
                </button>

                {/* Print Button */}
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="bg-[#111827] hover:bg-[#070D18] text-white py-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer shadow-sm"
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
