'use client';

import React from 'react';

interface FeaturesProps {
  onOpenBooking?: (vehicleName?: string) => void;
}

export const Features: React.FC<FeaturesProps> = ({ onOpenBooking }) => {
  const featureList = [
    {
      num: '01',
      title: 'NO LICENSE REQUIRED',
      description: 'Ride and earn without a driving license or RC transfer hassle.',
      cta: 'Start Riding',
      icon: (
        // License / Document Icon
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#00D96B]" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      )
    },
    {
      num: '02',
      title: 'FREE MAINTENANCE',
      description: 'Every service and brake check is on us. That all the technical fault is cover by us.',
      cta: 'Zero Maintenance',
      icon: (
        // Wrench / Maintenance Tool
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#00D96B]" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )
    },
    {
      num: '03',
      title: "SWAP, DON'T WAIT",
      description: 'Skip the charging queue. Swap a drained battery for a full one at your nearest swap point in under two minutes.',
      cta: 'Instant Swap',
      icon: (
        // Battery Swap
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#00D96B]" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="16" height="12" rx="2" />
          <path d="M6 11h8" />
          <path d="M10 7v8" />
          <path d="M22 11v4" />
        </svg>
      )
    },
    {
      num: '04',
      title: '24×7 CUSTOMER SUPPORT',
      description: 'Our support team is always available for you, 24×7.',
      cta: '24×7 Support',
      icon: (
        // Customer Support Headset
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#00D96B]" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      )
    },
    {
      num: '05',
      title: '19×7 RSA',
      description: 'Technical fault? Anytime, any day. Our 19×7 roadside assistance team is always on.',
      cta: '19×7 Roadside Assistance',
      icon: (
        // Shield with check / Roadside assistance
        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-[#00D96B]" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      )
    }
  ];

  return (
    <section id="feature" className="py-20 sm:py-28 bg-[#F1F4F6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* Section Header (Matches Reference Image Exactly) */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          
          {/* Top Badge: THE DOON RIDERS ADVANTAGE */}
          <div className="inline-flex items-center justify-center bg-[#E8FAF1] border border-[#00D96B]/35 px-5 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,217,107,0.08)]">
            <span className="text-[#00D96B] font-extrabold text-[11px] sm:text-xs uppercase tracking-[0.14em]">
              THE DOON RIDERS ADVANTAGE
            </span>
          </div>

          {/* Main Heading: Why Choose DOON RIDERS? */}
          <h2 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl lg:text-[48px] text-[#071426] tracking-tight leading-[1.15] mt-4 sm:mt-5">
            Why Choose <span className="text-[#00D96B]">DOON RIDERS?</span>
          </h2>

          {/* Subtitle */}
          <p className="text-[#53677F] text-sm sm:text-base leading-relaxed mt-3.5 max-w-2xl mx-auto font-normal">
            Everything you need to ride, earn, and save with maximum uptime, zero fuel expenses, and dedicated roadside support across Uttarakhand.
          </p>
        </div>

        {/* 6 Feature Cards Grid (3 Columns Desktop, 2 Columns Tablet, 1 Column Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
          {featureList.map((item, idx) => (
            <div
              key={idx}
              className="group bg-white rounded-[26px] p-7 sm:p-8 shadow-[0_4px_24px_rgba(7,20,38,0.04)] hover:shadow-[0_16px_36px_rgba(7,20,38,0.08)] transition-all duration-300 hover:-translate-y-1.5 relative overflow-hidden flex flex-col justify-between border border-[#E2E8F0]/60 hover:border-[#00D96B]/40"
            >
              {/* Organic Soft Light-Green Bottom-Right Wave Pattern (Exact Match to Reference Image) */}
              <div className="absolute -bottom-1 -right-1 w-36 h-36 sm:w-44 sm:h-44 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
                <svg
                  viewBox="0 0 160 160"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full"
                >
                  <path
                    d="M30 160C30 95 95 30 160 30V160H30Z"
                    fill="#E8FAF1"
                  />
                </svg>
              </div>

              {/* Card Top & Middle Content */}
              <div className="relative z-10">
                {/* Header Row: Icon Left + Number Right */}
                <div className="flex items-center justify-between">
                  {/* Icon Container */}
                  <div className="w-14 h-14 rounded-2xl bg-[#E8FAF1] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-[0_2px_10px_rgba(0,217,107,0.12)]">
                    {item.icon}
                  </div>

                  {/* Number 01 - 06 */}
                  <span className="font-heading font-extrabold text-2xl sm:text-3xl text-[#CBD5E1] tracking-tight group-hover:text-[#94A3B8] transition-colors">
                    {item.num}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-[#071426] tracking-tight uppercase mt-6 leading-snug">
                  {item.title}
                </h3>

                {/* Card Description */}
                <p className="text-xs sm:text-[13.5px] text-[#53677F] leading-relaxed mt-2.5 font-normal">
                  {item.description}
                </p>
              </div>

              {/* Card Bottom: Green Pill CTA Button (NO ARROWS, EXACT MATCH) */}
              <div className="relative z-10 mt-6 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenBooking ? onOpenBooking() : null}
                  className="inline-block bg-[#00D96B] hover:bg-[#00C25E] text-white font-bold text-xs sm:text-[13px] tracking-wide px-6 py-2.5 sm:px-7 sm:py-3 rounded-full shadow-[0_4px_14px_rgba(0,217,107,0.32)] hover:shadow-[0_6px_20px_rgba(0,217,107,0.45)] transition-all duration-200 transform active:scale-95 cursor-pointer"
                >
                  {item.cta}
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
