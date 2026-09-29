'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { BookTestDriveModal } from '../../components/BookTestDriveModal';
import {
  Award,
  Leaf,
  Zap,
  Shield,
  Target,
  Compass,
  MapPin,
  CheckCircle2,
  BatteryCharging,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Clock,
  HeartHandshake
} from 'lucide-react';
import Image from 'next/image';

export default function AboutPage() {
  const [bookingOpen, setBookingOpen] = useState(false);

  const pillars = [
    {
      icon: <BatteryCharging className="w-6 h-6 text-[#00D96B]" />,
      title: '2-Minute Battery Swaps',
      desc: 'Zero waiting hours for home charging. Simply swap a depleted battery for a 100% charged pack at any DOON Hub in under 2 minutes.'
    },
    {
      icon: <Leaf className="w-6 h-6 text-[#00D96B]" />,
      title: 'Zero Petrol & 100% Green',
      desc: 'Eliminate 100% of fuel costs and engine oil expenses. Every ride contributes to preserving the pristine beauty of Uttarakhand.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#00D96B]" />,
      title: 'All-Inclusive Maintenance',
      desc: 'Every brake check, tyre inspection, routine servicing, and technical fault is completely on us with zero out-of-pocket repair costs.'
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-[#00D96B]" />,
      title: 'Maximizing Rider Earnings',
      desc: 'Designed specifically to help delivery partners, gig riders, and daily commuters double their monthly savings without any license barrier.'
    }
  ];

  return (
    <div className="min-h-screen bg-white text-[#101828] font-sans">
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* ========================================================= */}
      {/* 1. HERO BANNER */}
      {/* ========================================================= */}
      <section className="pt-36 pb-20 bg-gradient-to-b from-[#E8FAF1]/50 via-white to-white relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#00D96B]/8 rounded-full blur-[140px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8 text-center space-y-5">
          <div className="inline-flex items-center gap-2 bg-[#E8FAF1] border border-[#00D96B]/30 px-4 py-1.5 rounded-full text-[#00A854] font-bold text-xs uppercase tracking-widest shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>PIONEERING ELECTRIC MOBILITY IN UTTARAKHAND</span>
          </div>

          <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-[#071426] tracking-tight max-w-4xl mx-auto leading-[1.18]">
            Powering Clean, Affordable &amp; Smart EV Rides for <span className="text-[#00D96B]">Uttarakhand</span>
          </h1>

          <p className="text-base sm:text-lg text-[#53677F] max-w-3xl mx-auto leading-relaxed font-normal">
            DOON Riders is Uttarakhand&apos;s leading smart electric scooter rental and battery swapping company. Starting right from the heart of Dehradun, we are revolutionizing daily commuting and delivery livelihoods with zero fuel expenses and instant battery swap technology.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setBookingOpen(true)}
              className="bg-[#00D96B] hover:bg-[#00A854] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider px-8 py-4 rounded-2xl shadow-[0_8px_25px_rgba(0,217,107,0.35)] hover:shadow-[0_10px_30px_rgba(0,217,107,0.5)] transition-all cursor-pointer flex items-center gap-2"
            >
              <span>BOOK A RENTAL PLAN</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <a
              href="#vision"
              className="bg-[#F8FAFC] hover:bg-[#E8FAF1] text-[#071426] hover:text-[#00A854] font-bold text-xs sm:text-sm uppercase tracking-wider px-8 py-4 rounded-2xl border border-[#E2E8F0] hover:border-[#00D96B]/30 transition"
            >
              OUR MISSION &amp; VISION
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. ABOUT THE COMPANY OVERVIEW */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-20 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Story & Who We Are */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#E8FAF1] border border-[#00D96B]/30 px-3.5 py-1 rounded-full text-[#00A854] font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ABOUT THE COMPANY</span>
              </div>

              <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#071426] tracking-tight leading-tight">
                Born in Dehradun, Built for <span className="text-[#00D96B]">Every Rider</span>
              </h2>

              <p className="text-sm sm:text-base text-[#53677F] leading-relaxed">
                DOON Riders was founded with a clear objective: to eliminate the heavy burden of petrol prices and high maintenance costs for delivery partners, daily office commuters, and students across Uttarakhand.
              </p>

              <p className="text-sm sm:text-base text-[#53677F] leading-relaxed">
                We combine high-performance electric two-wheelers with a fast, automated <strong>Battery Swapping Network</strong>. Instead of buying expensive vehicles or waiting hours for charging, our riders get unlimited daily range, zero downtime, and complete peace of mind with all-inclusive maintenance.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <h4 className="font-heading font-black text-2xl text-[#00A854]">Zero Petrol</h4>
                  <p className="text-xs text-[#667085] mt-1">100% Electric, zero daily fuel expense</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                  <h4 className="font-heading font-black text-2xl text-[#071426]">&lt; 2 Minutes</h4>
                  <p className="text-xs text-[#667085] mt-1">Instant battery swap turnaround</p>
                </div>
              </div>
            </div>

            {/* Right Column: Visual Card */}
            <div className="lg:col-span-6">
              <div className="relative rounded-[32px] overflow-hidden border border-[#E2E8F0] shadow-[0_12px_45px_rgba(7,20,38,0.08)] bg-[#FAFCFD] p-8 sm:p-10 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#00D96B] text-white flex items-center justify-center font-bold shadow-md shadow-[#00D96B]/30">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-[#071426]">
                    The DOON Riders Promise
                  </h3>
                  <p className="text-xs sm:text-sm text-[#53677F] leading-relaxed">
                    We ensure that your ride never stops. From comprehensive insurance and free routine servicing to 19×7 on-demand roadside assistance (RSA) and 24×7 customer support, every technical aspect is fully managed by our dedicated fleet operations team.
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#F1F5F9] space-y-3">
                  <div className="flex items-center gap-2.5 text-xs text-[#071426] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00A854] flex-shrink-0" />
                    <span>No commercial license or RC registration hassle</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#071426] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00A854] flex-shrink-0" />
                    <span>No long-term lock-in contracts — flexible weekly payments</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[#071426] font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#00A854] flex-shrink-0" />
                    <span>Instant same-day vehicle pickup with 3-minute digital KYC</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. MISSION & VISION SECTION (EXPANDING ACROSS UTTARAKHAND) */}
      {/* ========================================================= */}
      <section id="vision" className="py-20 bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-[#00A854] font-bold text-xs uppercase tracking-widest bg-[#E8FAF1] border border-[#00D96B]/30 px-4 py-1.5 rounded-full inline-block">
              OUR PURPOSE &amp; ROADMAP
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#071426] tracking-tight">
              Mission &amp; <span className="text-[#00D96B]">Vision</span>
            </h2>
            <p className="text-sm sm:text-base text-[#53677F]">
              Starting from Dehradun, expanding rapidly across all corners of Devbhoomi Uttarakhand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Mission Card */}
            <div className="bg-white rounded-[32px] border border-[#E2E8F0] p-8 sm:p-10 shadow-sm flex flex-col justify-between hover:border-[#00D96B]/50 transition-all hover:-translate-y-1">
              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-[#E8FAF1] text-[#00D96B] flex items-center justify-center font-bold">
                  <Target className="w-7 h-7" />
                </div>
                <h3 className="font-heading font-black text-2xl sm:text-3xl text-[#071426]">
                  Our Mission
                </h3>
                <p className="text-sm sm:text-base text-[#53677F] leading-relaxed">
                  To democratize electric mobility for every daily commuter, student, and gig economy delivery partner across Uttarakhand. We aim to double our riders&apos; take-home savings by eliminating fuel costs and providing seamless 2-minute battery swapping with 100% uptime and zero maintenance burden.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#F1F5F9] flex items-center gap-2 text-xs font-bold text-[#00A854]">
                <Leaf className="w-4 h-4" />
                <span>Accessible • Eco-Friendly • High Profitability</span>
              </div>
            </div>

            {/* Vision Card */}
            <div className="bg-white rounded-[32px] border-2 border-[#00D96B] p-8 sm:p-10 shadow-[0_12px_40px_rgba(0,217,107,0.12)] flex flex-col justify-between hover:-translate-y-1 transition-all relative overflow-hidden">
              
              {/* Expansion Tag */}
              <div className="absolute top-0 right-0 bg-gradient-to-l from-[#00D96B] to-[#00A854] text-white text-[10px] font-black uppercase tracking-wider px-5 py-1.5 rounded-bl-2xl">
                STATEWIDE ROADMAP
              </div>

              <div className="space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-[#E8FAF1] text-[#00D96B] flex items-center justify-center font-bold">
                  <Compass className="w-7 h-7" />
                </div>
                <h3 className="font-heading font-black text-2xl sm:text-3xl text-[#071426]">
                  Our Vision
                </h3>
                <p className="text-sm sm:text-base text-[#53677F] leading-relaxed">
                  While our journey begins in <strong>Dehradun</strong>, our vision is to establish an interconnected, dense network of <strong>Battery Swapping Hubs and Smart EV Fleets across all major districts of Uttarakhand</strong> — including Rishikesh, Haridwar, Roorkee, Haldwani, Rudrapur, Nainital, and beyond.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-[#F1F5F9] flex items-center gap-2 text-xs font-bold text-[#071426]">
                <MapPin className="w-4 h-4 text-[#00D96B]" />
                <span>Dehradun Hub ➔ Expanding Statewide to all Uttarakhand</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. CORE PILLARS & VALUES */}
      {/* ========================================================= */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-[#00A854] font-bold text-xs uppercase tracking-widest bg-[#E8FAF1] border border-[#00D96B]/30 px-4 py-1.5 rounded-full inline-block">
              WHAT DRIVES US
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#071426] tracking-tight">
              Our Core <span className="text-[#00D96B]">Values</span>
            </h2>
            <p className="text-sm sm:text-base text-[#53677F]">
              The foundations that make DOON Riders the most trusted EV fleet in Uttarakhand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((item, idx) => (
              <div
                key={idx}
                className="p-7 rounded-3xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#00D96B]/50 transition-all hover:-translate-y-1.5 hover:shadow-md space-y-3.5"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#E8FAF1] flex items-center justify-center shadow-sm">
                  {item.icon}
                </div>
                <h3 className="font-heading font-bold text-lg text-[#071426]">{item.title}</h3>
                <p className="text-xs sm:text-sm text-[#53677F] leading-relaxed font-normal">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. CALL TO ACTION SECTION */}
      {/* ========================================================= */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-[#F8FAFC] to-white border-t border-[#E2E8F0]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#00D96B] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#00D96B]/30">
            <HeartHandshake className="w-7 h-7" />
          </div>

          <h2 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl text-[#071426] tracking-tight leading-tight">
            Join the Green Mobility Revolution in <span className="text-[#00D96B]">Uttarakhand</span>
          </h2>

          <p className="text-sm sm:text-base text-[#53677F] max-w-xl mx-auto leading-relaxed">
            Whether you are a delivery rider looking to maximize income or a daily commuter seeking an eco-friendly ride, DOON Riders has the perfect plan for you.
          </p>

          <div className="pt-2">
            <button
              onClick={() => setBookingOpen(true)}
              className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-white font-extrabold text-sm sm:text-base uppercase tracking-wider px-9 py-4 rounded-2xl shadow-[0_8px_25px_rgba(0,217,107,0.35)] hover:shadow-[0_10px_30px_rgba(0,217,107,0.5)] transition-all transform active:scale-98 cursor-pointer"
            >
              <span>BOOK YOUR DOON EV RIDE TODAY</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      <Footer />
      <BookTestDriveModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}
