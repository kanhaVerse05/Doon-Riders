'use client';

import React from 'react';
import Image from 'next/image';
import { Award, Play, Zap, ArrowRight, MapPin, Gauge, BatteryCharging, Sparkles, ShieldCheck, Leaf, Flame, Phone } from 'lucide-react';

interface HeroProps {
  onOpenBooking: (vehicleName?: string) => void;
  onOpenVideo: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking, onOpenVideo }) => {
  const tickerItems = [
    { text: '₹1,699 / Week', icon: <Flame className="w-4 h-4 text-[#00D96B] stroke-[2.5]" /> },
    { text: 'Unlimited KM', icon: <Gauge className="w-4 h-4 text-[#00D96B] stroke-[2.5]" /> },
    { text: 'Unlimited Battery Swaps', icon: <BatteryCharging className="w-4 h-4 text-[#00D96B] stroke-[2.5]" /> },
    { text: 'High Savings', icon: <Sparkles className="w-4 h-4 text-[#00D96B] stroke-[2.5]" /> },
    { text: 'ZERO FUEL COST', icon: <Zap className="w-4 h-4 text-[#00D96B] stroke-[2.5]" /> },
    { text: 'RELIABLE & SAFE', icon: <ShieldCheck className="w-4 h-4 text-[#00D96B] stroke-[2.5]" /> },
    { text: 'ECO-FRIENDLY CHOICE', icon: <Leaf className="w-4 h-4 text-[#00D96B] stroke-[2.5]" /> },
    { text: '19×7 ROADSIDE ASSISTANCE', icon: <Phone className="w-4 h-4 text-[#00D96B] stroke-[2.5]" /> },
  ];

  return (
    <section
      id="home"
      className="relative pt-24 sm:pt-32 lg:pt-36 flex flex-col justify-between overflow-hidden text-[#101828]"
    >
      {/* Background Mountain Panoramic Photograph Overlay (User Image) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <img
          src="/images/hero-mountains-overlay.png"
          alt="Doon Riders Himalayan Mountain Valley Landscape"
          className="w-full h-full object-cover object-top opacity-90"
        />
        {/* Soft Ambient Fade to ensure crystal clear readability & seamless section transition */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/90 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-44 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none" />
      </div>

      {/* Background Soft Green Glow & Ambient Light Gradient */}
      <div className="absolute top-1/4 right-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-[#EAFBF2]/60 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-10 right-10 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] bg-[#00D96B]/10 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none z-0" />

      {/* Main Foreground Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full relative z-10">
        {/* Two-Column Hero Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-8 items-center pb-4 sm:pb-10">
          
          {/* LEFT COLUMN: AWARD BADGE, HEADLINE, DESCRIPTION & CTA */}
          <div className="lg:col-span-6 text-left space-y-4 sm:space-y-6">
            
            {/* Award Badge */}
            <div className="inline-flex items-center gap-2 bg-[#EAFBF2]/90 backdrop-blur-sm border border-[#D9FCA8] px-3.5 sm:px-4 py-1.5 rounded-full text-[#00A854] font-bold text-[11px] sm:text-xs uppercase tracking-wider shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00A854]"
              >
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="18" r="3" />
                <path d="M6 18h12" />
                <path d="M18 15l-3-9h-3" />
                <path d="M15 6h-4" />
                <path d="M10 14l2-3" />
              </svg>
              <span>EV CHALAO PAISA KAMAO</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-[62px] text-[#101828] leading-[1.12] sm:leading-[1.08] tracking-tight">
              Best EV Rental <br />
              <span className="text-[#00D96B]">Scooty in</span> <br />
              <span className="text-[#00D96B]">Uttarakhand.</span>
            </h1>

            {/* Description */}
            <p className="text-[#475467] text-sm sm:text-lg leading-relaxed max-w-xl font-normal">
              Rent an electric scooter in Dehradun from just ₹1,699 per week with Doon Riders. Whether you&apos;re heading to work, handling daily deliveries, or simply need a reliable ride, our EV scooters give you an affordable and hassle-free way to get around the city.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-5 pt-1 sm:pt-2">
              <button
                onClick={() => onOpenBooking()}
                className="flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs sm:text-sm uppercase tracking-wider px-6 sm:px-8 py-3.5 sm:py-4 rounded-full shadow-[0_8px_24px_rgba(0,217,107,0.25)] transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <span>BOOK A TEST RIDE</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="tel:+918439431999"
                className="flex items-center gap-2 bg-white/90 backdrop-blur-sm hover:bg-white text-[#101828] border border-[#E5E7EB] font-bold text-xs sm:text-sm px-5 sm:px-6 py-3.5 sm:py-4 rounded-full transition-all duration-200 shadow-sm hover:border-[#00D96B]/50 hover:shadow-md cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-[#00D96B] animate-pulse"></div>
                <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00A854]" />
                <span>Call Now</span>
              </a>
            </div>

          </div>

          {/* RIGHT COLUMN: HERO SCOOTER SHOWCASE WITH GLOW RING */}
          <div className="lg:col-span-6 relative flex items-center justify-center mt-2 sm:mt-0">
            
            {/* Soft Ambient Circular Halo Glow */}
            <div className="absolute w-[260px] h-[260px] sm:w-[380px] sm:h-[380px] lg:w-[460px] lg:h-[460px] rounded-full bg-gradient-to-tr from-[#EAFBF2]/90 to-[#00D96B]/20 border border-[#00D96B]/30 shadow-inner opacity-50 sm:opacity-85 lg:opacity-100 -z-10" />

            {/* Floating Tag: EV Chalao / Paisa Kamao (2-Line Broken Text, Shifted Far Right of Scooter) */}
            <div className="absolute top-1 sm:top-4 right-2 sm:-right-4 lg:-right-14 z-20 pointer-events-none select-none">
              <div className="transform rotate-[3deg] hover:rotate-0 transition-transform duration-300 flex flex-col items-start">
                <span className="font-[family-name:var(--font-kalam)] font-extrabold text-xl sm:text-3xl lg:text-[36px] tracking-wide leading-[1.05] drop-shadow-[0_2px_10px_rgba(255,255,255,0.95)]">
                  <span className="block text-[#00A854]">EV Chalao,</span>
                  <span className="block text-[#101828] mt-0.5">Paisa Kamao</span>
                </span>
                <div className="h-1 sm:h-1.5 w-20 sm:w-36 bg-gradient-to-r from-[#00D96B] via-[#00A854] to-[#00D96B] rounded-full mt-1 sm:mt-1.5 shadow-sm"></div>
              </div>
            </div>

            {/* High Definition EV Scooter Cutout (Mobile Opacity 60% for clean blend, Desktop 100% full opacity) */}
            <div className="relative w-full max-w-[280px] sm:max-w-[420px] lg:max-w-[500px] h-[260px] sm:h-[360px] lg:h-[440px] flex items-center justify-center transform hover:scale-[1.03] transition-transform duration-500 opacity-60 sm:opacity-85 lg:opacity-100">
              <Image
                src="/images/doon-scooter-blue.png"
                alt="DOON Riders Electric Scooter"
                fill
                priority
                className="object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.14)]"
              />
            </div>

            {/* Floating Specification Card: No Licence Required */}
            <div className="absolute -bottom-2 sm:-bottom-4 right-2 sm:right-6 bg-white/95 backdrop-blur-md border border-[#E5E7EB] p-2.5 sm:p-4 rounded-2xl sm:rounded-[20px] shadow-[0_12px_35px_rgba(16,24,40,0.08)] flex items-center gap-2.5 sm:gap-3.5 z-20">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#00D96B] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2.5" />
                  <circle cx="7" cy="11.5" r="1.8" />
                  <path d="M13 10h5" />
                  <path d="M13 13.5h3.5" />
                </svg>
              </div>
              <div>
                <h5 className="font-bold text-xs sm:text-sm text-[#101828]">No Licence Required</h5>
                <p className="text-[10px] sm:text-xs text-[#667085]">Drive Freely • Hassle-Free</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. BLACK INFINITE TICKER MARQUEE SLIDER (RIGHT TO LEFT) */}
      {/* ========================================================= */}
      <div className="w-full bg-[#090b0e] text-white py-4 border-y border-[#181d24] overflow-hidden relative shadow-md select-none mt-8 z-10">
        {/* Neon Green Ambient Line Accent */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00D96B] to-transparent opacity-75"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#00D96B]/50 to-transparent opacity-50"></div>

        {/* Marquee Ticker Track (Moving Right to Left smoothly with slower, readable speed) */}
        <div className="animate-ticker-rtl flex items-center space-x-10 font-mono text-[13px] sm:text-sm font-black uppercase tracking-wider">
          {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} className="flex items-center space-x-3.5 whitespace-nowrap">
              <span className="flex items-center justify-center">
                {item.icon}
              </span>
              <span className="text-white tracking-widest font-black drop-shadow-sm">{item.text}</span>
              <span className="text-[#00D96B] font-black px-2 text-base">•</span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};
