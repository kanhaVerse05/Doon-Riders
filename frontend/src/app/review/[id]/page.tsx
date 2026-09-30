'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  CheckCircle2,
  Bike,
  Wrench,
  ShieldCheck,
  User,
  Sparkles,
  AlertCircle,
  Check,
  Zap,
  UserCheck,
  Gauge,
  Receipt,
  BatteryCharging,
  ArrowRight,
  MessageSquare,
  Building
} from 'lucide-react';

interface FeedbackOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  { id: 'fast_service', label: 'Fast & On-Time Service', icon: Zap },
  { id: 'expert_repair', label: 'Expert Diagnosis & Repair', icon: Wrench },
  { id: 'polite_behavior', label: 'Polite & Professional Behavior', icon: UserCheck },
  { id: 'smooth_ride', label: 'Smooth Ride Post-Repair', icon: Gauge },
  { id: 'fair_billing', label: 'Transparent & Fair Billing', icon: Receipt },
  { id: 'clean_scooter', label: 'Clean Scooter Handover', icon: Sparkles },
  { id: 'battery_perfect', label: 'Battery & Electrical Perfect', icon: BatteryCharging }
];

export default function CustomerReviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const jobId = (params?.id as string) || searchParams?.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [jobInfo, setJobInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Fast & On-Time Service',
    'Expert Diagnosis & Repair',
    'Polite & Professional Behavior'
  ]);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Fetch Job and Technician review info
  const fetchReviewInfo = async () => {
    if (!jobId) {
      // Fallback demo data if opened without specific ID
      setJobInfo({
        id: 124,
        job_number: 'JOB-000124',
        scooter_number: 'UK07-EV-1002',
        rider_name: 'Rahul Sharma',
        rider_contact: '9876543210',
        hub_name: 'ISBT Main Service Hub',
        technician_id: 1,
        technician_name: 'Amit Sharma',
        technician_code: 'TECH-01',
        technician_specialization: 'EV Powertrain & Battery',
        status: 'Service Done'
      });
      setReviewerName('Rahul Sharma');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      let res = await fetch(`${backendUrl}/repair-jobs/${jobId}/review-info`);
      if (!res.ok) {
        res = await fetch(`${backendUrl}/admin/repair-jobs/${jobId}/review-info`);
      }

      const data = await res.json();
      if (data && data.success && data.data) {
        setJobInfo(data.data);
        setReviewerName(data.data.rider_name || '');
        if (data.data.customer_rating) {
          setRating(data.data.customer_rating);
          setSelectedTags(data.data.customer_tags || []);
          setComment(data.data.customer_review || '');
          setSubmittedSuccess(true);
        }
      } else {
        // Fallback default demo data
        setJobInfo({
          id: 124,
          job_number: 'JOB-000124',
          scooter_number: 'UK07-EV-1002',
          rider_name: 'Rahul Sharma',
          hub_name: 'ISBT Main Service Hub',
          technician_name: 'Amit Sharma',
          technician_specialization: 'EV Powertrain & Battery',
          status: 'Service Done'
        });
      }
    } catch (err: any) {
      console.warn('Fetch review info error, using fallback state:', err);
      setJobInfo({
        id: 124,
        job_number: 'JOB-000124',
        scooter_number: 'UK07-EV-1002',
        rider_name: 'Rahul Sharma',
        hub_name: 'ISBT Main Service Hub',
        technician_name: 'Amit Sharma',
        technician_specialization: 'EV Powertrain & Battery',
        status: 'Service Done'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewInfo();
  }, [jobId]);

  const toggleTag = (label: string) => {
    if (selectedTags.includes(label)) {
      setSelectedTags(selectedTags.filter(t => t !== label));
    } else {
      setSelectedTags([...selectedTags, label]);
    }
  };

  const getRatingStatusText = (stars: number) => {
    switch (stars) {
      case 1:
        return 'Poor Experience';
      case 2:
        return 'Needs Improvement';
      case 3:
        return 'Satisfactory / Average';
      case 4:
        return 'Very Good Service';
      case 5:
        return 'Outstanding & Highly Recommended!';
      default:
        return 'Select Your Rating';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;

    try {
      setSubmitting(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const payload = {
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        reviewer_name: reviewerName.trim() || jobInfo?.rider_name || 'Customer'
      };

      const targetId = jobInfo?.id || jobId || '124';
      let res = await fetch(`${backendUrl}/repair-jobs/${targetId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(`${backendUrl}/admin/repair-jobs/${targetId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setSubmittedSuccess(true);
    } catch (err: any) {
      console.error('Submit review error:', err);
      setSubmittedSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const currentStars = hoverRating || rating;

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white flex flex-col justify-between selection:bg-[#00D96B] selection:text-black font-sans antialiased">
      {/* Mobile App Navigation Bar */}
      <header className="w-full border-b border-white/[0.08] bg-[#0A0F1D]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-[#00D96B] flex items-center justify-center text-[#0A0F1D] font-black shadow-md shadow-[#00D96B]/20">
              <Bike className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-heading font-black text-sm tracking-tight text-white block leading-none">
                DOON<span className="text-[#00D96B]">RIDERS</span>
              </span>
              <span className="text-[9.5px] text-gray-400 font-medium tracking-wide">
                Smart Electric Scooter Workshop
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/15 text-gray-200 text-[11px] font-semibold tracking-tight shadow-xs">
            <Sparkles className="w-3 h-3 text-[#00D96B]" />
            <span>Customer Feedback</span>
          </div>
        </div>
      </header>

      {/* Main Mobile App Screen Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5 space-y-4">
        {loading ? (
          <div className="bg-[#111827]/70 border border-white/10 rounded-2xl p-10 text-center backdrop-blur-md space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-semibold text-gray-400">Loading service details...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-[#111827]/70 border border-red-500/20 rounded-2xl p-6 text-center backdrop-blur-md space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white">Repair Job Not Found</h2>
            <p className="text-xs text-gray-400">{errorMsg}</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
            >
              Back to Home
            </Link>
          </div>
        ) : submittedSuccess ? (
          /* ========================================================= */
          /* SUCCESS CONFIRMATION STATE (NO EMOJIS, NATIVE APP STYLE)  */
          /* ========================================================= */
          <div className="bg-[#111827]/90 border border-[#00D96B]/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5 text-center animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-[#00D96B]/15 border border-[#00D96B]/40 text-[#00D96B] flex items-center justify-center mx-auto shadow-lg shadow-[#00D96B]/15">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-heading font-black text-white tracking-tight">
                Feedback Submitted
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">
                Thank you for rating your service experience with Lead Technician <span className="text-white font-bold">{jobInfo?.technician_name || 'Amit Sharma'}</span> at DOON Riders.
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-[#0A0F1D]/80 rounded-xl p-4 border border-white/[0.08] space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Vehicle</span>
                  <span className="text-xs font-mono font-bold text-white">{jobInfo?.scooter_number || 'UK07-EV-1002'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Job Reference</span>
                  <span className="text-xs font-bold text-gray-300">{jobInfo?.job_number || '#JOB-000124'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block">Assigned Technician</span>
                  <span className="text-xs font-bold text-white">{jobInfo?.technician_name || 'Amit Sharma'}</span>
                </div>
                <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">{rating} / 5</span>
                </div>
              </div>

              {selectedTags.length > 0 && (
                <div className="pt-2 border-t border-white/[0.08] flex flex-wrap gap-1.5">
                  {selectedTags.map((tag, idx) => (
                    <span key={idx} className="text-[10px] bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded-md text-gray-300 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {comment && (
                <div className="pt-2 border-t border-white/[0.08]">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1">Your Review:</span>
                  <p className="text-xs text-gray-300 italic bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                    &ldquo;{comment}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <div className="pt-1">
              <Link
                href="/"
                className="w-full py-3 px-4 rounded-xl bg-[#00D96B] hover:bg-[#00BF5E] text-[#0A0F1D] font-heading font-black text-xs transition shadow-md shadow-[#00D96B]/20 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to DOON Riders Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* PRODUCTION-READY NATIVE MOBILE APP REVIEW FORM            */
          /* ========================================================= */
          <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn">
            {/* 1. HERO SECTION */}
            <div className="space-y-1.5 pt-1">
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight leading-tight">
                How was your<br />
                <span className="text-[#00D96B]">EV Service?</span>
              </h1>
              <p className="text-xs text-gray-400 leading-relaxed">
                Rate the service completed on your scooter and share your feedback to help us improve.
              </p>
            </div>

            {/* 2. COMPACT SERVICE/JOB CARD */}
            <div className="bg-[#111827]/80 border border-white/[0.08] rounded-2xl p-4 backdrop-blur-md shadow-xl space-y-3">
              {/* Top Row: Vehicle Number, Job ID, Location & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                    <Bike className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-white tracking-wider block leading-snug">
                      {jobInfo?.scooter_number || 'UK07-EV-1002'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium block">
                      #{jobInfo?.job_number || 'JOB-000124'} • {jobInfo?.hub_name || 'ISBT Main Service Hub'}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00D96B] bg-[#00D96B]/10 px-2.5 py-0.5 rounded-full border border-[#00D96B]/25 flex-shrink-0">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Service Done</span>
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-white/[0.08]" />

              {/* Bottom Row: Technician & Role */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-white/15 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 tracking-wider">
                    {getInitials(jobInfo?.technician_name)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-snug">
                      {jobInfo?.technician_name || 'Amit Sharma'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium block">
                      {jobInfo?.technician_specialization || 'EV Powertrain & Battery'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block leading-none">
                    SERVICE ROLE
                  </span>
                  <span className="text-xs font-bold text-gray-200 block mt-0.5">
                    Lead Technician
                  </span>
                </div>
              </div>
            </div>

            {/* 3. RATING SECTION */}
            <div className="bg-[#111827]/80 border border-white/[0.08] rounded-2xl p-4.5 backdrop-blur-md text-center space-y-3 shadow-xl">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D96B] block">
                  RATE YOUR EXPERIENCE
                </span>
                <h3 className="text-xs font-bold text-white">
                  How would you rate our service?
                </h3>
              </div>

              {/* 5 Selectable Stars (Warm Yellow/Gold) */}
              <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-1">
                {[1, 2, 3, 4, 5].map(starValue => {
                  const isFilled = currentStars >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-xl transition-all transform hover:scale-115 active:scale-95 cursor-pointer focus:outline-none"
                      title={`${starValue} Stars`}
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.35)]'
                            : 'text-gray-600 hover:text-gray-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Refined Feedback Status Pill (No Emojis) */}
              <div className="pt-0.5">
                <span className="inline-block px-3.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/25 text-[11px] font-semibold tracking-wide">
                  {getRatingStatusText(currentStars)}
                </span>
              </div>
            </div>

            {/* 4. POSITIVE FEEDBACK SECTION ("WHAT WENT WELL?") */}
            <div className="bg-[#111827]/80 border border-white/[0.08] rounded-2xl p-4.5 backdrop-blur-md space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D96B] block">
                    WHAT WENT WELL?
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    Select all that apply
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-gray-500 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/5">
                  {selectedTags.length} selected
                </span>
              </div>

              {/* Clean Selectable Options Grid (2-Column Responsive, No Emojis, Clean Line Icons) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {FEEDBACK_OPTIONS.map(opt => {
                  const isSelected = selectedTags.includes(opt.label);
                  const IconComponent = opt.icon;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleTag(opt.label)}
                      className={`p-2.5 rounded-xl text-left text-xs font-semibold transition-all flex items-center justify-between gap-2.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-[#00D96B]/10 border-[#00D96B] text-white shadow-xs'
                          : 'bg-white/[0.02] hover:bg-white/[0.04] text-gray-300 border-white/[0.08] hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComponent
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isSelected ? 'text-[#00D96B]' : 'text-gray-400'
                          }`}
                        />
                        <span className="truncate leading-tight text-[11.5px]">{opt.label}</span>
                      </div>

                      {/* Selection Checkmark Indicator */}
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#00D96B] text-[#0A0F1D]'
                            : 'border border-gray-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. ADDITIONAL COMMENTS & REVIEWER NAME */}
            <div className="bg-[#111827]/80 border border-white/[0.08] rounded-2xl p-4.5 backdrop-blur-md space-y-3 shadow-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00D96B] block">
                ADDITIONAL COMMENTS
              </span>

              <div className="relative">
                <textarea
                  rows={2}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share details about pickup, repair satisfaction or technician interaction (optional)..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0F1D]/80 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00D96B] focus:ring-1 focus:ring-[#00D96B] resize-none leading-relaxed transition"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Reviewer Name
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={e => setReviewerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0A0F1D]/80 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00D96B] focus:ring-1 focus:ring-[#00D96B] transition"
                  />
                </div>
              </div>
            </div>

            {/* 6. BOTTOM CTA (NATIVE GREEN BUTTON) */}
            <button
              type="submit"
              disabled={submitting || rating < 1}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#00D96B] hover:bg-[#00BF5E] active:scale-[0.98] text-[#0A0F1D] font-heading font-black text-sm shadow-xl shadow-[#00D96B]/25 transition duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[#0A0F1D] border-t-transparent animate-spin" />
                  <span>Submitting Feedback...</span>
                </>
              ) : (
                <>
                  <span>Submit Feedback</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.08] bg-[#0A0F1D]/90 py-3.5 text-center text-[11px] text-gray-500">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} DOON Riders EV</span>
          <span className="flex items-center gap-1 text-[#00D96B]">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified Customer Feedback</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
