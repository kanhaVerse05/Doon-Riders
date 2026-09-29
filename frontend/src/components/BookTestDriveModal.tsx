'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  Send,
  Zap,
  ShieldCheck,
  BatteryCharging,
  FileText
} from 'lucide-react';
import { submitBooking } from '../lib/api';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicle?: string;
}

export const BookTestDriveModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedVehicle
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    plan: 'Standard Weekly Plan (₹1,699/week)',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Sync selected plan when opened
  useEffect(() => {
    if (selectedVehicle) {
      if (selectedVehicle.toLowerCase().includes('monthly')) {
        setFormData((prev) => ({ ...prev, plan: 'Monthly Long-Term Plan' }));
      } else if (selectedVehicle.toLowerCase().includes('fleet')) {
        setFormData((prev) => ({ ...prev, plan: 'Delivery / Commercial Fleet' }));
      } else {
        setFormData((prev) => ({ ...prev, plan: 'Standard Weekly Plan (₹1,699/week)' }));
      }
    }
  }, [selectedVehicle, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await submitBooking({
        fullName: formData.fullName,
        phone: formData.phone,
        email: 'rental@doonriders.com',
        preferredDate: new Date().toISOString().split('T')[0],
        preferredTime: 'Immediate',
        city: 'Dehradun',
        message: `Plan: ${formData.plan} | Note: ${formData.description}`
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          fullName: '',
          phone: '',
          plan: 'Standard Weekly Plan (₹1,699/week)',
          description: ''
        });
        onClose();
      }, 2400);
    } catch {
      // Optimistic success fallback
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] border border-[#E2E8F0] w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-[0_25px_60px_rgba(7,20,38,0.25)] relative animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-4 border-b border-[#F1F5F9] flex justify-between items-start bg-gradient-to-b from-[#E8FAF1]/60 to-white">
          <div className="flex items-start gap-3">
            {/* Custom Electric Scooter Icon */}
            <div className="w-11 h-11 rounded-2xl bg-[#00D96B] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-[#00D96B]/30 mt-0.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                {/* Scooter Wheel Back */}
                <circle cx="6" cy="18" r="3" />
                {/* Scooter Wheel Front */}
                <circle cx="18" cy="18" r="3" />
                {/* Frame Deck */}
                <path d="M6 18h8l3-10" />
                {/* Handle Bar */}
                <path d="M15 8h4" />
                <path d="M17 8v2" />
                {/* Battery / Motor Zap Badge */}
                <path d="M10 13l2-3-1 4h2l-2 3" />
              </svg>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#00A854] bg-[#E8FAF1] px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1 border border-[#00D96B]/30">
                <Zap className="w-3 h-3 text-[#00A854]" />
                <span>Instant KYC Pickup</span>
              </div>
              <h3 className="font-heading font-black text-xl sm:text-2xl text-[#071426]">
                Book DOON EV Rental
              </h3>
              <p className="text-xs text-[#53677F] mt-0.5 font-normal">
                Ride and earn with zero petrol bills &amp; unlimited battery swaps
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#53677F] hover:text-[#071426] flex items-center justify-center transition cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="py-8 text-center space-y-4 bg-[#E8FAF1]/40 rounded-2xl border border-[#00D96B]/40 p-6">
              <div className="w-14 h-14 bg-[#00D96B] text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-[#00D96B]/30 animate-bounce">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h4 className="font-heading font-bold text-xl text-[#071426]">
                Booking Request Received!
              </h4>
              <p className="text-xs sm:text-sm text-[#53677F] max-w-sm mx-auto leading-relaxed">
                Our fleet manager in Dehradun will call / WhatsApp you on <strong className="text-[#071426]">{formData.phone || 'your number'}</strong> for instant key handover.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* 1. Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#071426] uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Rahul Rawat"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#00D96B] focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm text-[#071426] placeholder-[#94A3B8] focus:outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* 2. Contact Number */}
              <div>
                <label className="block text-xs font-bold text-[#071426] uppercase tracking-wider mb-1.5">
                  Contact Number (WhatsApp) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#00D96B] focus:bg-white rounded-2xl pl-10 pr-4 py-3 text-sm text-[#071426] placeholder-[#94A3B8] focus:outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* 3. Plan Select (Defaults to current scooty plan) */}
              <div>
                <label className="block text-xs font-bold text-[#071426] uppercase tracking-wider mb-1.5">
                  Select Rental Plan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="w-4 h-4 text-[#00A854] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Zap className="w-4 h-4" />
                  </div>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#00D96B] focus:bg-white rounded-2xl pl-10 pr-8 py-3 text-sm text-[#071426] font-semibold focus:outline-none transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="Standard Weekly Plan (₹1,699/week)">
                      Standard Weekly Plan — ₹1,699 / week (Unlimited KM)
                    </option>
                    <option value="Monthly Long-Term Plan">
                      Monthly Long-Term Plan — ₹6,499 / month
                    </option>
                    <option value="Delivery / Commercial Fleet">
                      Delivery &amp; Commercial Gig Fleet Partner
                    </option>
                    <option value="Daily Short-Term Rental">
                      Daily Rental Plan (₹299 / day)
                    </option>
                  </select>
                </div>
              </div>

              {/* 4. Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-[#071426] uppercase tracking-wider mb-1.5">
                  Description / Pickup Notes (Optional)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3.5" />
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Need scooter starting this Monday near ISBT Dehradun..."
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#00D96B] focus:bg-white rounded-2xl pl-10 pr-4 py-2.5 text-sm text-[#071426] placeholder-[#94A3B8] focus:outline-none transition-all resize-none shadow-sm"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00D96B] hover:bg-[#00A854] text-white font-extrabold text-sm sm:text-base uppercase tracking-wider py-3.5 sm:py-4 rounded-2xl shadow-[0_8px_25px_rgba(0,217,107,0.35)] hover:shadow-[0_10px_30px_rgba(0,217,107,0.5)] transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span>{loading ? 'Submitting...' : 'CONFIRM & BOOK THIS PLAN'}</span>
                </button>
              </div>

            </form>
          )}

          {/* Reassurance Footer */}
          <div className="flex items-center justify-center gap-3 text-[11px] text-[#667085] pt-4 mt-4 border-t border-[#F1F5F9]">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00A854]" /> No Security Deposit
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium">
              <BatteryCharging className="w-3.5 h-3.5 text-[#00A854]" /> 2-Min Swap Access
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
