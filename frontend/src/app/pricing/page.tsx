'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { BookTestDriveModal } from '../../components/BookTestDriveModal';
import { Check, Zap, Sparkles, ShieldCheck, ArrowRight, HelpCircle, Star, BatteryCharging, Shield, Clock } from 'lucide-react';

interface PricingPlan {
  id: number;
  name: string;
  slug?: string;
  tagline: string;
  price: number;
  period: string;
  badge?: string;
  features: string[] | string;
  security_deposit?: number;
  is_popular: boolean;
  is_active: boolean;
  display_order: number;
}

export default function PricingPage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Default fallback plan (₹1,699 / week)
  const defaultPlans: PricingPlan[] = [
    {
      id: 1,
      name: 'Weekly Pro Rider',
      slug: 'weekly-pro-rider',
      tagline: 'Our most popular high-performance electric scooty subscription for Dehradun students, daily commuters & delivery riders.',
      price: 1699,
      period: 'week',
      badge: 'MOST POPULAR PLAN',
      security_deposit: 2000,
      is_popular: true,
      is_active: true,
      display_order: 1,
      features: [
        'No Driving License Required (Zero Hassle)',
        'Free Doorstep Maintenance & Technical Fault Coverage',
        'Swap, Don’t Wait — 2-Min Instant Battery Swapping at 15+ Hubs',
        '19×7 Dehradun Roadside Emergency Assistance (RSA)',
        '24×7 Dedicated Customer Support Helpline',
        'Zero Fuel Expense (Save ₹3,500+ every month)',
        'Complimentary DOT-Certified Safety Helmet Included',
        'Standard Comprehensive Insurance Coverage Included'
      ]
    }
  ];

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://doon-riders-backend.onrender.com/api';
        const res = await fetch(`${apiUrl}/pricing-plans`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setPlans(data.data);
        } else {
          setPlans(defaultPlans);
        }
      } catch (e) {
        setPlans(defaultPlans);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, []);

  const activePlans = plans.filter(p => p.is_active !== false);
  const displayedPlans = activePlans.length > 0 ? activePlans : defaultPlans;

  const parseFeatures = (features: string[] | string): string[] => {
    if (Array.isArray(features)) return features;
    if (typeof features === 'string') {
      try {
        return JSON.parse(features);
      } catch {
        return [features];
      }
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-white text-[#101828] font-sans">
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* Hero Header */}
      <section className="pt-36 pb-8 bg-gradient-to-b from-[#EAFBF2]/60 via-white to-white text-center space-y-4">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <span className="inline-block text-xs font-bold text-[#00A854] bg-[#EAFBF2] border border-[#D9FCA8] px-4 py-1.5 rounded-full uppercase tracking-wider">
            TRANSPARENT EV RENTAL SUBSCRIPTIONS
          </span>
          <h1 className="font-heading font-black text-3xl sm:text-5xl text-[#101828] tracking-tight mt-3">
            Zero Fuel. Zero Maintenance. <span className="text-[#00D96B]">Zero Hidden Fees.</span>
          </h1>
          <p className="text-sm sm:text-base text-[#475467] max-w-2xl mx-auto mt-2">
            Affordable electric scooty rentals in Dehradun. Get instant battery swapping, roadside assistance, and full maintenance included.
          </p>
        </div>
      </section>

      {/* Single Plan Spotlight View (when 1 plan exists - ₹1699) OR Multi-Grid View */}
      <section className="py-8 max-w-7xl mx-auto px-6 sm:px-8">
        {displayedPlans.length === 1 ? (
          // ================= SINGLE FEATURED SPOTLIGHT CARD (₹1,699 PLAN) =================
          <div className="max-w-3xl mx-auto">
            {displayedPlans.map(p => {
              const features = parseFeatures(p.features);
              const perDay = Math.round(Number(p.price) / 7);

              return (
                <div
                  key={p.id}
                  className="rounded-3xl p-6 sm:p-10 bg-white border-2 border-[#00D96B] shadow-[0_16px_50px_rgba(0,217,107,0.18)] ring-4 ring-[#00D96B]/15 relative overflow-hidden space-y-8"
                >
                  {/* Neon Top Badge */}
                  <div className="absolute top-0 right-0 bg-[#00D96B] text-[#101828] text-[11px] font-black uppercase tracking-wider px-6 py-1.5 rounded-bl-2xl shadow-sm flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{p.badge || 'MOST POPULAR PLAN'}</span>
                  </div>

                  {/* Plan Headline & Pricing */}
                  <div className="space-y-4 pt-2">
                    <div>
                      <span className="text-xs font-bold text-[#00A854] uppercase tracking-widest block">
                        ALL-INCLUSIVE EV SUBSCRIPTION
                      </span>
                      <h2 className="text-2xl sm:text-4xl font-black text-[#101828] font-heading mt-1">
                        {p.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#667085] mt-1.5 max-w-xl">
                        {p.tagline || 'High-performance electric scooty with unlimited battery swaps and zero fuel expense.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2 pt-2">
                      <span className="text-4xl sm:text-6xl font-black text-[#101828] font-mono tracking-tight">
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-sm sm:text-base font-bold text-[#667085]">
                        / {p.period || 'week'}
                      </span>
                      <span className="text-xs font-bold text-[#00A854] bg-[#EAFBF2] px-3 py-1 rounded-full ml-2">
                        (~₹{perDay}/day only)
                      </span>
                    </div>

                    {/* Quick Highlights Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#EEF2F6] flex items-center gap-2.5">
                        <BatteryCharging className="w-4 h-4 text-[#00D96B]" />
                        <div>
                          <p className="text-[10px] text-[#98A2B3] uppercase font-bold">Battery Swapping</p>
                          <p className="text-xs font-bold text-[#101828]">100% Free & Unlimited</p>
                        </div>
                      </div>
                      <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#EEF2F6] flex items-center gap-2.5">
                        <Shield className="w-4 h-4 text-[#00D96B]" />
                        <div>
                          <p className="text-[10px] text-[#98A2B3] uppercase font-bold">Security Deposit</p>
                          <p className="text-xs font-bold text-[#101828]">₹{p.security_deposit || 2000} (Refundable)</p>
                        </div>
                      </div>
                      <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#EEF2F6] flex items-center gap-2.5 col-span-2 sm:col-span-1">
                        <Clock className="w-4 h-4 text-[#00D96B]" />
                        <div>
                          <p className="text-[10px] text-[#98A2B3] uppercase font-bold">Maintenance</p>
                          <p className="text-xs font-bold text-[#101828]">Doorstep Servicing</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Included Features List */}
                  <div className="border-t border-[#EEF2F0] pt-6 space-y-4">
                    <p className="text-xs font-bold text-[#101828] uppercase tracking-wider flex items-center gap-2">
                      <Check className="w-4 h-4 text-[#00A854]" />
                      <span>EVERYTHING INCLUDED IN THIS PLAN:</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-[#EAFBF2] text-[#00A854] flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className="text-xs text-[#344054] font-medium leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Call to Action Button */}
                  <div className="pt-4">
                    <button
                      onClick={() => setBookingOpen(true)}
                      className="w-full py-4 rounded-2xl bg-[#00D96B] hover:bg-[#85e600] text-[#101828] font-black text-sm uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(0,217,107,0.35)] active:scale-[0.99]"
                    >
                      <span>BOOK THIS PLAN (₹{Number(p.price).toLocaleString('en-IN')}/{p.period || 'week'})</span>
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    </button>
                    <p className="text-center text-[11px] text-[#98A2B3] mt-2">
                      Instant verification • Pick up today from nearest Dehradun Hub
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ================= MULTI-PLAN GRID VIEW =================
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {displayedPlans.map(p => {
              const features = parseFeatures(p.features);

              return (
                <div
                  key={p.id}
                  className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                    p.is_popular
                      ? 'bg-white border-2 border-[#00D96B] shadow-[0_12px_40px_rgba(0,217,107,0.15)] ring-4 ring-[#00D96B]/10 lg:-translate-y-2'
                      : 'bg-[#F1F5F9] border border-[#EEF2F0] shadow-sm hover:border-[#00D96B]/40'
                  }`}
                >
                  {p.is_popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00D96B] text-[#101828] text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-sm">
                      {p.badge || 'MOST POPULAR PLAN'}
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-[#101828]">{p.name}</h3>
                      <p className="text-xs text-[#667085] mt-1">{p.tagline}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-[#101828] font-mono">
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-[#667085] font-bold">/ {p.period || 'week'}</span>
                    </div>

                    <div className="border-t border-[#EEF2F0] pt-6 space-y-3">
                      <p className="text-xs font-bold text-[#101828] uppercase tracking-wider">What's Included:</p>
                      <ul className="space-y-2 text-xs text-[#475467]">
                        {features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2.5">
                            <div className="w-4 h-4 rounded-full bg-[#EAFBF2] text-[#00A854] flex items-center justify-center flex-shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={() => setBookingOpen(true)}
                      className={`w-full py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
                        p.is_popular
                          ? 'bg-[#00D96B] hover:bg-[#85e600] text-[#101828] shadow-[0_4px_16px_rgba(0,217,107,0.35)]'
                          : 'bg-[#101828] hover:bg-[#00D96B] text-white hover:text-[#101828]'
                      }`}
                    >
                      <span>SELECT {p.name.toUpperCase()}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Included in All Plans Section */}
      <section className="py-16 bg-[#F1F5F9] border-y border-[#EEF2F0]">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
          <h2 className="font-heading font-black text-2xl sm:text-3xl text-[#101828]">
            Included with every DOON Riders rental
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
            <div className="bg-white p-5 rounded-2xl border border-[#EEF2F0] space-y-2">
              <ShieldCheck className="w-6 h-6 text-[#00D96B]" />
              <h4 className="text-xs font-bold text-[#101828]">Zero Fuel Expense</h4>
              <p className="text-[11px] text-[#667085]">Save up to ₹4,500/mo compared to petrol vehicles.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#EEF2F0] space-y-2">
              <Zap className="w-6 h-6 text-[#00D96B]" />
              <h4 className="text-xs font-bold text-[#101828]">Free Battery Swaps</h4>
              <p className="text-[11px] text-[#667085]">Instant 90-second battery swaps across 15+ hubs.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#EEF2F0] space-y-2">
              <Sparkles className="w-6 h-6 text-[#00D96B]" />
              <h4 className="text-xs font-bold text-[#101828]">Doorstep Delivery</h4>
              <p className="text-[11px] text-[#667085]">Scooter delivered to your hotel, college, or home.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#EEF2F0] space-y-2">
              <HelpCircle className="w-6 h-6 text-[#00D96B]" />
              <h4 className="text-xs font-bold text-[#101828]">19×7 RSA & 24×7 Support</h4>
              <p className="text-[11px] text-[#667085]">Instant roadside technician dispatch across Dehradun.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <BookTestDriveModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}
