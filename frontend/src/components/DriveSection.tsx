'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowRight, ShieldCheck, Zap, BatteryCharging, Leaf, MapPin, Gauge, Infinity, Headphones, Wrench, Clock, FileCheck } from 'lucide-react';

interface DriveSectionProps {
  onOpenBooking: () => void;
}

export const DriveSection: React.FC<DriveSectionProps> = ({ onOpenBooking }) => {
  const points = [
    {
      num: '01',
      title: 'No License Required',
      description: 'Ride and earn without a driving license or RC transfer hassle.',
      icon: FileCheck,
    },
    {
      num: '02',
      title: 'Free Maintenance',
      description: 'Every service and brake check is on us. That all the technical fault is cover by us.',
      icon: Wrench,
    },
    {
      num: '03',
      title: "Swap, Don't Wait",
      description: 'Skip the charging queue. Swap a drained battery for a full one at your nearest swap point in under two minutes.',
      icon: BatteryCharging,
    },
    {
      num: '04',
      title: '24×7 Customer Support',
      description: 'Our support team is always available for you, 24×7.',
      icon: Headphones,
    },
    {
      num: '05',
      title: '19×7 RSA',
      description: 'Technical fault? Anytime, any day. Our 19×7 roadside assistance team is always on.',
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="drive" className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* TOP SPECIFICATIONS CARD */}
        <div className="max-w-5xl mx-auto mb-20">
          <div className="bg-white rounded-[22px] border border-[#EEF2F0] p-6 sm:p-8 shadow-[0_12px_35px_rgba(16,24,40,0.06)] grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 items-center">
            
            {/* Stat 1: Unlimited KM (Infinity) */}
            <div className="flex items-center gap-4 sm:justify-center sm:border-r sm:border-[#EEF2F0] sm:pr-8">
              <div className="w-14 h-14 rounded-2xl bg-[#EAFBF2] flex items-center justify-center text-[#00D96B] flex-shrink-0 shadow-sm">
                <Infinity className="w-7 h-7 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-heading font-black text-3xl sm:text-4xl text-[#101828] font-mono leading-none">
                  &#8734;
                </h4>
                <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mt-1">
                  UNLIMITED KM METRES
                </p>
              </div>
            </div>

            {/* Stat 2: Swappable Battery Zero Wait */}
            <div className="flex items-center gap-4 sm:justify-center sm:border-r sm:border-[#EEF2F0] sm:pr-8">
              <div className="w-14 h-14 rounded-2xl bg-[#EAFBF2] flex items-center justify-center text-[#00D96B] flex-shrink-0 shadow-sm">
                <BatteryCharging className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-heading font-black text-2xl sm:text-3xl text-[#101828] font-mono leading-none">
                  Zero Wait
                </h4>
                <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mt-1">
                  SWAPPABLE BATTERY
                </p>
              </div>
            </div>

            {/* Stat 3: 19x7 Roadside Assistance */}
            <div className="flex items-center gap-4 sm:justify-center">
              <div className="w-14 h-14 rounded-2xl bg-[#EAFBF2] flex items-center justify-center text-[#00D96B] flex-shrink-0 shadow-sm">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-heading font-black text-2xl sm:text-3xl text-[#101828] font-mono leading-none">
                  19x7
                </h4>
                <p className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mt-1">
                  ROADSIDE ASSISTANCE
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Two-Column Grid: BUILT FOR RIDERS. FOCUSED ON WHAT MATTERS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Image */}
          <div className="lg:col-span-5 relative aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(16,24,40,0.08)] border border-[#EEF2F0]">
            <Image
              src="/images/image-counter.jpg"
              alt="Built for Riders"
              fill
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
            {/* Soft Emerald Gradient Overlay at bottom of image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <span className="text-[10px] font-bold tracking-widest uppercase bg-[#00D96B] px-3 py-1 rounded-full text-[#101828]">
                DELIVERY READY EV
              </span>
              <h4 className="font-heading font-black text-xl text-white mt-2">Doon Riders Fleet</h4>
            </div>
          </div>

          {/* Right Column: Text & 5 Points */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-[#00A854] font-bold text-xs uppercase tracking-widest bg-[#EAFBF2] border border-[#C8F2DA] px-4 py-1.5 rounded-full inline-block">
              INTELLIGENT ELECTRIC MOBILITY
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#101828] leading-tight">
              BUILT FOR RIDERS. <br />
              <span className="text-[#00D96B]">FOCUSED ON WHAT MATTERS.</span>
            </h2>
            <p className="text-sm sm:text-base text-[#475467] leading-relaxed font-normal">
              Smart fleet management and dedicated support – so you can focus on what matters: <strong>DELIVERY</strong>.
            </p>

            {/* 5 Feature Cards */}
            <div className="space-y-3 pt-2">
              {points.map((pt, idx) => {
                const Icon = pt.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-[#F1F5F9] border border-[#EEF2F0] hover:border-[#00D96B]/50 transition-all hover:bg-white hover:shadow-sm group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] text-[#00A854] group-hover:bg-[#00D96B] group-hover:text-white flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors">
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#00A854] font-mono text-xs font-bold">{pt.num} —</span>
                        <h4 className="font-bold text-[#101828] text-sm sm:text-base">{pt.title}</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-[#475467] mt-0.5 leading-relaxed font-normal">
                        {pt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3">
              <button
                onClick={onOpenBooking}
                className="inline-flex items-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-white font-bold text-xs uppercase tracking-wider px-8 py-4 rounded-full shadow-[0_4px_16px_rgba(0,217,107,0.3)] transition cursor-pointer"
              >
                <span>EXPLORE FLEET &amp; BOOK TEST RIDE</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
