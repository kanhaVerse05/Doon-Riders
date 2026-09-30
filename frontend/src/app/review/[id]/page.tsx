'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  CheckCircle2,
  Bike,
  Wrench,
  ShieldCheck,
  User,
  Building,
  Sparkles,
  Clock,
  Heart,
  MessageSquare,
  AlertCircle,
  ThumbsUp,
  Share2,
  Check
} from 'lucide-react';

const FEEDBACK_TAGS = [
  '⚡ Fast & On-Time Service',
  '🛠️ Expert Diagnosis & Repair',
  '🤝 Polite & Professional Behavior',
  '🛵 Smooth Ride Post-Repair',
  '💰 Transparent & Fair Billing',
  '🧼 Clean Scooter Handover',
  '🔋 Battery & Electrical Perfect',
  '👍 Highly Recommended'
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Fetch Job and Technician review info
  const fetchReviewInfo = async () => {
    if (!jobId) {
      setErrorMsg('No Repair Job ID provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      // Try public repair-jobs review-info endpoint
      let res = await fetch(`${backendUrl}/repair-jobs/${jobId}/review-info`);
      if (!res.ok) {
        // Fallback try admin repair jobs endpoint
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
        setErrorMsg(data?.message || 'Unable to find job details for this rating link.');
      }
    } catch (err: any) {
      console.error('Fetch review info error:', err);
      setErrorMsg('Failed to connect to server. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewInfo();
  }, [jobId]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return 'Poor Experience 😞';
      case 2:
        return 'Needs Improvement 😐';
      case 3:
        return 'Satisfactory / Average 🙂';
      case 4:
        return 'Very Good Service! 😊';
      case 5:
        return 'Outstanding & Highly Recommended! 🌟';
      default:
        return 'Rate your experience';
    }
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

      let res = await fetch(`${backendUrl}/repair-jobs/${jobId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(`${backendUrl}/admin/repair-jobs/${jobId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data && data.success) {
        setSubmittedSuccess(true);
      } else {
        alert(data?.message || 'Failed to submit review. Please try again.');
      }
    } catch (err: any) {
      console.error('Submit review error:', err);
      alert('Error submitting review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white flex flex-col justify-between selection:bg-[#00D96B] selection:text-black">
      {/* Top Navbar Header */}
      <header className="w-full border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D96B] to-[#00A854] flex items-center justify-center text-black font-black shadow-lg shadow-[#00D96B]/20">
              <Bike className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-heading font-black text-lg tracking-tight text-white block leading-none">
                DOON<span className="text-[#00D96B]">RIDERS</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium tracking-wide">
                Smart Electric Scooter Workshop
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D96B]/10 border border-[#00D96B]/30 text-[#00D96B] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Customer Feedback</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col justify-center">
        {loading ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-center backdrop-blur-md shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-[#00D96B] border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-semibold text-gray-300">Loading service details...</p>
          </div>
        ) : errorMsg ? (
          <div className="bg-white/5 border border-red-500/30 rounded-3xl p-8 text-center backdrop-blur-md shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Repair Job Not Found</h2>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">{errorMsg}</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
            >
              Back to Home
            </Link>
          </div>
        ) : submittedSuccess ? (
          /* Success Screen */
          <div className="bg-white/5 border border-[#00D96B]/40 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-[#00D96B]/20 border border-[#00D96B] text-[#00D96B] flex items-center justify-center mx-auto shadow-lg shadow-[#00D96B]/20">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-heading font-black text-white">
                Thank You for Your Feedback!
              </h2>
              <p className="text-xs sm:text-sm text-gray-300">
                Your rating helps our technician <span className="text-[#00D96B] font-bold">{jobInfo?.technician_name}</span> and DOON Riders service center deliver the highest standard of EV maintenance.
              </p>
            </div>

            {/* Submitted Summary Card */}
            <div className="bg-black/40 rounded-2xl p-4 border border-white/10 space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Scooter</span>
                  <span className="text-sm font-bold text-white font-mono">{jobInfo?.scooter_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Job Card</span>
                  <span className="text-xs font-bold text-[#00D96B]">{jobInfo?.job_number}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Technician</span>
                  <span className="text-xs font-bold text-white">{jobInfo?.technician_name}</span>
                </div>
                <div className="flex items-center gap-1 bg-[#00D96B]/10 px-3 py-1 rounded-xl border border-[#00D96B]/30">
                  <Star className="w-4 h-4 fill-[#00D96B] text-[#00D96B]" />
                  <span className="text-sm font-black text-[#00D96B]">{rating} / 5</span>
                </div>
              </div>

              {selectedTags.length > 0 && (
                <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                  {selectedTags.map((t, idx) => (
                    <span key={idx} className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-gray-300">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {comment && (
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1">Your Review:</span>
                  <p className="text-xs text-gray-300 italic bg-white/5 p-2.5 rounded-xl border border-white/5">
                    &ldquo;{comment}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Link
                href="/"
                className="w-full py-3 px-6 rounded-2xl bg-[#00D96B] hover:bg-[#00A854] text-black font-heading font-black text-sm transition shadow-lg shadow-[#00D96B]/30 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Visit DOON Riders Portal</span>
                <Sparkles className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          /* Interactive Review Form */
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 animate-fadeIn">
            {/* Header Description */}
            <div className="text-center space-y-1">
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white">
                How was your EV Service?
              </h1>
              <p className="text-xs text-gray-400">
                Rate the service completed on your scooter and give feedback to your technician.
              </p>
            </div>

            {/* Scooter & Technician Summary Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md space-y-3 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#00D96B]/20 text-[#00D96B] flex items-center justify-center border border-[#00D96B]/30">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white font-mono tracking-wide block">
                      {jobInfo?.scooter_number}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      Job #{jobInfo?.job_number} • {jobInfo?.hub_name || 'DOON Hub'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00D96B] bg-[#00D96B]/10 px-2.5 py-1 rounded-full border border-[#00D96B]/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Service Done</span>
                  </span>
                </div>
              </div>

              {/* Technician Info */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    {jobInfo?.technician_name?.slice(0, 2)?.toUpperCase() || 'TC'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {jobInfo?.technician_name || 'Assigned Technician'}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {jobInfo?.technician_specialization || 'EV Diagnostics Specialist'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Service Role</span>
                  <span className="text-xs font-bold text-blue-400">Lead Technician</span>
                </div>
              </div>
            </div>

            {/* 1. Star Rating Block */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md text-center space-y-3 shadow-xl">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Rate Your Experience *
              </label>

              {/* Stars */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                {[1, 2, 3, 4, 5].map(starValue => {
                  const isFilled = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 sm:p-2 rounded-2xl transition-all transform hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                      title={`${starValue} Stars`}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-gray-600 hover:text-gray-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Rating Description Label */}
              <div className="pt-1">
                <span className="inline-block px-3 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 text-xs font-bold animate-fadeIn">
                  {getRatingLabel(hoverRating || rating)}
                </span>
              </div>
            </div>

            {/* 2. Quick Tags Selector */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                  What went well? (Select all that apply)
                </label>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {FEEDBACK_TAGS.map(tag => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-[#00D96B] text-black border-[#00D96B] font-bold shadow-md shadow-[#00D96B]/20 scale-102'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Detailed Feedback & Comments */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md space-y-3 shadow-xl">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Additional Comments &amp; Suggestions (Optional)
              </label>

              <div className="relative">
                <textarea
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share details about scooter pickup, repair satisfaction, technician behavior, or any future improvement..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00D96B] focus:ring-1 focus:ring-[#00D96B] resize-y leading-relaxed"
                />
              </div>

              <div className="pt-1">
                <label className="text-[11px] font-medium text-gray-400 block mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={e => setReviewerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00D96B]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || rating < 1}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#00D96B] to-[#00A854] hover:brightness-110 text-black font-heading font-black text-sm sm:text-base shadow-xl shadow-[#00D96B]/25 transition transform active:scale-98 disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                  <span>Submitting Review...</span>
                </>
              ) : (
                <>
                  <ThumbsUp className="w-4 h-4 fill-black" />
                  <span>Submit Rating &amp; Review</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/10 bg-black/40 py-4 text-center text-xs text-gray-500">
        <div className="max-w-xl mx-auto px-4 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} DOON Riders EV</span>
          <span className="flex items-center gap-1 text-[#00D96B]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Customer Feedback</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
