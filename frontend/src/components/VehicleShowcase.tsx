'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Check,
  RotateCw,
  ArrowRight,
  MoveHorizontal,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface VehicleShowcaseProps {
  vehicles?: any[];
  onOpenBooking: (vehicleName?: string) => void;
}

const TOTAL_FRAMES = 60;
// 60 non-cropped full-width WebP frames
const FRAME_PATHS = Array.from({ length: TOTAL_FRAMES }, (_, i) => 
  `/images/360/frame_${i.toString().padStart(2, '0')}.webp`
);

export const VehicleShowcase: React.FC<VehicleShowcaseProps> = ({ onOpenBooking }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State: Manual interaction only (No auto-rotation)
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Drag tracking refs
  const currentFrameRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragStartFrameRef = useRef<number>(0);

  // Preload all 60 frames in browser memory for instant 0ms response
  useEffect(() => {
    let count = 0;
    const preloadedImages: HTMLImageElement[] = [];

    FRAME_PATHS.forEach((src) => {
      const img = new window.Image();
      img.src = src;
      img.onload = () => {
        count++;
        if (count >= 10) {
          setIsLoaded(true);
        }
      };
      preloadedImages.push(img);
    });

    return () => {
      preloadedImages.length = 0;
    };
  }, []);

  // Update frame helper with infinite circular wrapping
  const setFrame = useCallback((frameIdx: number) => {
    let wrapped = frameIdx % TOTAL_FRAMES;
    if (wrapped < 0) wrapped += TOTAL_FRAMES;
    currentFrameRef.current = wrapped;
    setCurrentFrame(wrapped);
  }, []);

  // Reset to front view (Frame 0)
  const resetToFront = () => {
    setFrame(0);
  };

  // 1. Mouse Drag Handlers (Natural direction: drag right -> turn right)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartFrameRef.current = currentFrameRef.current;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const deltaX = e.clientX - dragStartXRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Inverted delta so dragging right rotates right naturally
    const frameDelta = Math.round((deltaX / (rect.width * 0.65)) * TOTAL_FRAMES);
    setFrame(dragStartFrameRef.current - frameDelta);
  };

  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  // 2. Touch Drag Handlers (Mobile Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartXRef.current = e.touches[0].clientX;
    dragStartFrameRef.current = currentFrameRef.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !containerRef.current || !e.touches[0]) return;
    const deltaX = e.touches[0].clientX - dragStartXRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    const frameDelta = Math.round((deltaX / (rect.width * 0.65)) * TOTAL_FRAMES);
    setFrame(dragStartFrameRef.current - frameDelta);
  };

  const handleTouchEnd = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
    }
  };

  const currentAngle = Math.round((currentFrame / TOTAL_FRAMES) * 360) % 360;

  const planFeatures = [
    { text: 'No License Required', desc: 'Ride and earn without a driving license or RC transfer hassle' },
    { text: 'Free Maintenance', desc: 'Every service and brake check is covered by us' },
    { text: "Swap, Don't Wait", desc: 'Swap battery in under 2 minutes at 15+ Dehradun hubs' },
    { text: '19×7 RSA', desc: 'Technical fault? Roadside assistance team always on call' },
    { text: '24×7 Customer Support', desc: 'Our dedicated support team is always available 24×7' },
    { text: 'Unlimited Daily KM', desc: 'Ride without any distance limits or mileage penalties' }
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-[#F8FAFC] border-y border-[#E2E8F0] relative overflow-hidden">
      
      {/* Background Ambient Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[850px] h-[400px] bg-[#00D96B]/8 rounded-full blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        
        {/* ========================================================= */}
        {/* SECTION HEADER (EXACT USER REQUIREMENTS) */}
        {/* ========================================================= */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          
          {/* Top Badge */}
          <div className="inline-flex items-center justify-center bg-[#E8FAF1] border border-[#00D96B]/35 px-5 py-1.5 rounded-full shadow-sm mb-3.5">
            <span className="text-[#00D96B] font-extrabold text-[11px] sm:text-xs uppercase tracking-[0.14em]">
              WEEKLY RENTAL PLAN
            </span>
          </div>

          {/* Main Heading */}
          <h2 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl lg:text-[46px] text-[#071426] tracking-tight leading-[1.18]">
            Simple pricing. <span className="text-[#00D96B]">Pay by the week, cancel anytime.</span>
          </h2>

          {/* Subtitle */}
          <p className="text-[#53677F] text-sm sm:text-base leading-relaxed mt-4 max-w-2xl mx-auto font-normal">
            No lock-in contracts. Upgrade, downgrade or pause your plan whenever your route changes.
          </p>
        </div>

        {/* ========================================================= */}
        {/* 50 / 50 SPLIT CONTAINER: 360° VIEWER LEFT | PLAN CARD RIGHT */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-stretch">
          
          {/* ======================================================= */}
          {/* LEFT 50%: ULTRA-SMOOTH 360° INTERACTIVE VIEWER */}
          {/* ======================================================= */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-white rounded-[32px] border border-[#E2E8F0] shadow-[0_8px_30px_rgba(7,20,38,0.05)] p-5 sm:p-7 flex flex-col justify-between h-full relative overflow-hidden group">
              
              {/* Header Info */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E8FAF1] text-[#00D96B] flex items-center justify-center font-bold">
                    <RotateCw className="w-4 h-4 text-[#00D96B]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-bold text-sm sm:text-base text-[#071426] uppercase tracking-wide">
                        360° Interactive View
                      </h4>
                      <span className="bg-[#00D96B]/10 text-[#00A854] text-[10px] font-black px-2 py-0.5 rounded-full border border-[#00D96B]/20">
                        {currentAngle}°
                      </span>
                    </div>
                    <p className="text-[11px] text-[#667085]">
                      Drag mouse left or right to rotate smoothly
                    </p>
                  </div>
                </div>

                {/* Reset to Front Button */}
                <button
                  type="button"
                  onClick={resetToFront}
                  title="Reset to Front View"
                  className="flex items-center gap-1.5 bg-[#F8FAFC] hover:bg-[#E8FAF1] text-[#53677F] hover:text-[#00A854] font-bold text-[10px] sm:text-[11px] px-3 py-1.5 rounded-full border border-[#E2E8F0] hover:border-[#00D96B]/30 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset View</span>
                </button>
              </div>

              {/* 360 Display Box with Interactive Mouse Drag */}
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`relative my-4 w-full h-[330px] sm:h-[380px] md:h-[410px] rounded-2xl overflow-hidden bg-white border border-[#F1F5F9] flex items-center justify-center select-none ${
                  isDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
              >
                {/* 360 Frame Image (Full-width, zero cropping on sides) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={FRAME_PATHS[currentFrame]}
                  alt={`DOON Scooter 360 view at ${currentAngle} degrees`}
                  draggable={false}
                  className="w-full h-full object-contain pointer-events-none select-none p-2"
                />

                {/* Floating Interactive Drag Helper Pill */}
                <div
                  className={`absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#071426]/90 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg border border-white/10 flex items-center gap-2 pointer-events-none transition-all duration-300 ${
                    isDragging ? 'scale-105 bg-[#00D96B] text-white border-[#00D96B]' : ''
                  }`}
                >
                  <MoveHorizontal className={`w-3.5 h-3.5 ${isDragging ? 'text-white' : 'text-[#00D96B]'}`} />
                  <span>
                    {isDragging ? `Angle: ${currentAngle}°` : 'Drag mouse left or right to rotate 360°'}
                  </span>
                </div>
              </div>

              {/* Bottom Quick Specs Badges */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#F1F5F9] text-center">
                <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]/70">
                  <span className="text-[10px] font-bold text-[#667085] uppercase block">Range</span>
                  <span className="font-heading font-black text-xs sm:text-sm text-[#071426]">60-70 km</span>
                </div>
                <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]/70">
                  <span className="text-[10px] font-bold text-[#667085] uppercase block">Battery Swap</span>
                  <span className="font-heading font-black text-xs sm:text-sm text-[#00A854]">2 Minutes</span>
                </div>
                <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]/70">
                  <span className="text-[10px] font-bold text-[#667085] uppercase block">Licence</span>
                  <span className="font-heading font-black text-xs sm:text-sm text-[#071426]">Not Required</span>
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================= */}
          {/* RIGHT 50%: STANDARD WEEKLY PLAN CARD (₹1,699 / WEEK) */}
          {/* ======================================================= */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="bg-white rounded-[32px] border-2 border-[#00D96B] shadow-[0_12px_45px_rgba(0,217,107,0.12)] p-6 sm:p-8 flex flex-col justify-between h-full relative overflow-hidden">
              
              {/* Top Recommended Tag */}
              <div className="absolute top-0 right-0 bg-gradient-to-l from-[#00D96B] to-[#00A854] text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-5 py-1.5 rounded-bl-2xl shadow-sm">
                MOST POPULAR PLAN
              </div>

              <div>
                {/* Plan Header */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-5 border-b border-[#E2E8F0]">
                  <div>
                    <span className="text-[11px] font-bold text-[#00A854] bg-[#E8FAF1] px-3 py-0.5 rounded-full uppercase tracking-wider border border-[#00D96B]/30 inline-block mb-1.5">
                      All-Inclusive Rental
                    </span>
                    <h3 className="font-heading font-black text-2xl sm:text-3xl text-[#071426] uppercase">
                      Standard Plan
                    </h3>
                    <p className="text-xs text-[#53677F] mt-0.5">
                      Ideal for delivery partners, daily office riders, and students.
                    </p>
                  </div>

                  {/* Price Tag */}
                  <div className="text-left sm:text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading font-black text-3xl sm:text-4xl text-[#071426] tracking-tight">
                        ₹1,699
                      </span>
                      <span className="text-sm font-bold text-[#53677F]">
                        / week
                      </span>
                    </div>
                    <p className="text-[11px] text-[#00A854] font-bold mt-0.5">
                      Only ~₹242 / day • Zero Petrol Expense
                    </p>
                  </div>
                </div>

                {/* All 6 Requested Features */}
                <div className="py-5">
                  <h4 className="text-[11px] font-bold text-[#071426] uppercase tracking-wider mb-3">
                    What&apos;s Included In Your Standard Plan:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {planFeatures.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]/70 hover:border-[#00D96B]/50 hover:bg-[#E8FAF1]/20 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-[#00D96B] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-[13px] text-[#071426]">
                            {feat.text}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-[#53677F] mt-0.5 leading-tight">
                            {feat.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA Booking Button */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={() => onOpenBooking('DOON Standard EV')}
                  className="w-full bg-[#00D96B] hover:bg-[#00A854] text-white font-extrabold text-sm sm:text-base uppercase tracking-wider py-3.5 sm:py-4 rounded-2xl shadow-[0_8px_25px_rgba(0,217,107,0.35)] hover:shadow-[0_10px_30px_rgba(0,217,107,0.5)] transition-all transform active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>BOOK THIS PLAN • ₹1,699 / WEEK</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>

                <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-[#667085] font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#00A854] stroke-[3]" /> No Security Deposit Lock
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#00A854] stroke-[3]" /> Instant KYC Onboarding
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#00A854] stroke-[3]" /> Same Day Pickup
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
