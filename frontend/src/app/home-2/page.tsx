'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '../../components/Navbar';
import { BookTestDriveModal } from '../../components/BookTestDriveModal';
import {
  Sparkles,
  BatteryCharging,
  ShieldCheck,
  Zap,
  MapPin,
  RefreshCw,
  Navigation,
  Star,
  FileCheck,
  Wrench,
  Headphones,
  Infinity,
  ChevronDown,
  ArrowRight,
  Phone,
  Mail,
  Instagram,
  Facebook
} from 'lucide-react';

export default function HomeV2Page() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<0 | 1 | 2>(0);

  // Section container refs
  const sec1Ref = useRef<HTMLDivElement>(null);
  const sec2Ref = useRef<HTMLDivElement>(null);
  const sec3Ref = useRef<HTMLDivElement>(null);

  // Video element refs
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const video3Ref = useRef<HTMLVideoElement>(null);

  // Section progress state (0 to 1) for content fade/slide
  const [p1, setP1] = useState(0);
  const [p2, setP2] = useState(0);
  const [p3, setP3] = useState(0);

  // High-performance scroll listener with non-blocking video frame seeking
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const windowH = window.innerHeight;

          // Helper to calculate 0..1 progress inside a section
          const calcProgress = (el: HTMLDivElement | null) => {
            if (!el) return 0;
            const rect = el.getBoundingClientRect();
            const totalScrollable = el.offsetHeight - windowH;
            if (totalScrollable <= 0) return 0;
            const current = -rect.top;
            return Math.min(1, Math.max(0, current / totalScrollable));
          };

          const prog1 = calcProgress(sec1Ref.current);
          const prog2 = calcProgress(sec2Ref.current);
          const prog3 = calcProgress(sec3Ref.current);

          setP1(prog1);
          setP2(prog2);
          setP3(prog3);

          // Update Active Section for HUD
          if (prog3 > 0.05) {
            setActiveSection(2);
          } else if (prog2 > 0.05) {
            setActiveSection(1);
          } else {
            setActiveSection(0);
          }

          // Safe Video Scrubbing without decoder bottleneck
          const scrubVideo = (video: HTMLVideoElement | null, progress: number, maxDuration?: number) => {
            if (!video || !video.duration || isNaN(video.duration)) return;
            const totalDur = maxDuration ? Math.min(video.duration, maxDuration) : video.duration;
            const targetTime = progress * totalDur;
            const diff = targetTime - video.currentTime;
            
            // Only update currentTime if change is meaningful and video is NOT currently seeking
            if (Math.abs(diff) > 0.04 && !video.seeking) {
              video.currentTime = targetTime;
            }
          };

          // Scrub video only if section is in or near viewport
          if (sec1Ref.current && sec1Ref.current.getBoundingClientRect().bottom > 0) {
            scrubVideo(video1Ref.current, prog1, 5.0);
          }
          if (sec2Ref.current && sec2Ref.current.getBoundingClientRect().top < windowH && sec2Ref.current.getBoundingClientRect().bottom > 0) {
            scrubVideo(video2Ref.current, prog2, 9.5);
          }
          if (sec3Ref.current && sec3Ref.current.getBoundingClientRect().top < windowH) {
            scrubVideo(video3Ref.current, prog3, 6.5);
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial call
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const scrollToSection = (secIdx: number) => {
    const refs = [sec1Ref, sec2Ref, sec3Ref];
    const targetEl = refs[secIdx]?.current;
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#070D18] text-white font-sans selection:bg-[#00D96B] selection:text-black antialiased relative min-h-screen">
      {/* Floating Global Navbar */}
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* ========================================================================= */}
      {/* FLOATING RIGHT SIDEBAR HUD (SECTION JUMPER) */}
      {/* ========================================================================= */}
      <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4 bg-[#0A0F1D]/80 backdrop-blur-md p-2.5 rounded-full border border-white/10 shadow-2xl">
        <button
          onClick={() => scrollToSection(0)}
          title="Section 1: Experience"
          className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
            activeSection === 0 ? 'bg-[#00D96B] ring-4 ring-[#00D96B]/30 scale-125' : 'bg-white/40 hover:bg-white/80'
          }`}
        />
        <button
          onClick={() => scrollToSection(1)}
          title="Section 2: About Us"
          className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
            activeSection === 1 ? 'bg-[#00D96B] ring-4 ring-[#00D96B]/30 scale-125' : 'bg-white/40 hover:bg-white/80'
          }`}
        />
        <button
          onClick={() => scrollToSection(2)}
          title="Section 3: Battery Swapping"
          className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
            activeSection === 2 ? 'bg-[#00D96B] ring-4 ring-[#00D96B]/30 scale-125' : 'bg-white/40 hover:bg-white/80'
          }`}
        />
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: HERO SCENE (scooter-ride.mp4, 0s - 5s on scroll) */}
      {/* ========================================================================= */}
      <div ref={sec1Ref} className="relative h-[280vh] w-full bg-[#070D18]">
        {/* Sticky Viewport Container */}
        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
          {/* Background Video */}
          <video
            ref={video1Ref}
            src="/videos/scooter-ride.mp4"
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient Dark Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070D18]/95 via-black/35 to-[#070D18]/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/70 via-transparent to-[#070D18]/70 pointer-events-none" />

          {/* SLIDE 1 (p1: 0.0 - 0.33): WELCOME TO DOON RIDERS */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center transition-all duration-500 pointer-events-none"
            style={{
              opacity: p1 < 0.33 ? 1 : Math.max(0, 1 - (p1 - 0.33) * 6),
              transform: `translateY(${p1 < 0.33 ? 0 : -(p1 - 0.33) * 60}px)`,
              pointerEvents: p1 < 0.33 ? 'auto' : 'none'
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00D96B] animate-pulse" />
                <h2 className="text-white font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                  DEHRADUN, UTTARAKHAND
                </h2>
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                WELCOME TO <br />
                <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                  DOON RIDERS
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                Your EV journey in Dehradun starts here. 100% Electric Smart Mobility with Instant Battery Swapping.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current stroke-current" />
                  <span>Book a Test Drive</span>
                </button>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-gray-400 text-xs font-mono tracking-widest uppercase animate-bounce">
              <span>Scroll to Explore</span>
              <ChevronDown className="w-4 h-4 text-[#00D96B]" />
            </div>
          </div>

          {/* SLIDE 2 (p1: 0.33 - 0.66): BEST EV RENTAL SCOOTY */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center transition-all duration-500"
            style={{
              opacity: p1 >= 0.33 && p1 <= 0.66 ? 1 : p1 < 0.33 ? Math.max(0, (p1 - 0.22) * 9) : Math.max(0, 1 - (p1 - 0.66) * 9),
              transform: `translateY(${p1 >= 0.33 && p1 <= 0.66 ? 0 : p1 < 0.33 ? 40 : -40}px)`,
              pointerEvents: p1 >= 0.33 && p1 <= 0.66 ? 'auto' : 'none'
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                <Star className="w-3.5 h-3.5 text-[#00D96B]" />
                <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                  100% SMART SILENT MOBILITY
                </h2>
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                BEST EV RENTAL SCOOTY <br />
                <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                  IN DEHRADUN, UTTARAKHAND
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                No Driving License Required • 5-Minute KYC • ₹0 Petrol Expense &amp; Instant 2-Min Battery Swapping.
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="bg-[#0A0F1D]/75 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                  <span className="text-base sm:text-lg font-black font-mono text-[#00D96B] block leading-none">₹0</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Petrol Expense</span>
                </div>
                <div className="bg-[#0A0F1D]/75 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                  <span className="text-base sm:text-lg font-black font-mono text-white block leading-none">5 MIN</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">KYC Verification</span>
                </div>
                <div className="bg-[#0A0F1D]/75 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                  <span className="text-base sm:text-lg font-black font-mono text-[#38BDF8] block leading-none">100%</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Eco Friendly</span>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 3 (p1: 0.66 - 1.0): 5+ SWAP STATIONS & BOOK */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center transition-all duration-500"
            style={{
              opacity: p1 > 0.66 ? 1 : Math.max(0, (p1 - 0.55) * 9),
              transform: `translateY(${p1 > 0.66 ? 0 : 40}px)`,
              pointerEvents: p1 > 0.66 ? 'auto' : 'none'
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                <BatteryCharging className="w-3.5 h-3.5 text-[#00D96B]" />
                <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                  5+ SWAP STATIONS IN DEHRADUN
                </h2>
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                RIDE MORE. SPEND LESS. <br />
                <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                  Rent Your EV Scooty Today
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                Swap drained batteries in &lt;2 minutes across Canal Road, Sewla Kalan, Balliwala, Premnagar &amp; Ajabpur Kalan. Unlimited range, 19×7 roadside support.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current stroke-current" />
                  <span>BOOK A TEST DRIVE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* SECTION 2: ABOUT & ADVANTAGE (about-scroll.mp4, 0s - 10s on scroll) */}
      {/* ========================================================================= */}
      <div ref={sec2Ref} className="relative h-[280vh] w-full bg-[#070D18]">
        {/* Sticky Viewport Container */}
        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
          {/* Background Video */}
          <video
            ref={video2Ref}
            src="/videos/about-scroll.mp4"
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient Dark Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070D18]/95 via-black/35 to-[#070D18]/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/70 via-transparent to-[#070D18]/70 pointer-events-none" />

          {/* CHAPTER 1 (p2: 0.0 - 0.33): WHO WE ARE */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center transition-all duration-500"
            style={{
              opacity: p2 < 0.33 ? 1 : Math.max(0, 1 - (p2 - 0.33) * 6),
              transform: `translateY(${p2 < 0.33 ? 0 : -(p2 - 0.33) * 60}px)`,
              pointerEvents: p2 < 0.33 ? 'auto' : 'none'
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-[#00D96B]/20 border border-[#00D96B]/40 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                <Star className="w-3.5 h-3.5 text-[#00D96B]" />
                <span className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                  About us
                </span>
              </div>

              <h2 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl text-white tracking-tight uppercase leading-[1.08] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                WHO <br />
                <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                  WE ARE?
                </span>
              </h2>

              <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                DOON Riders is a smart electric scooter rental and battery-swapping company based in Dehradun, Uttarakhand. We make daily travel and delivery work easier with affordable EV scooters, zero fuel costs, and quick battery swapping.
              </p>
            </div>
          </div>

          {/* CHAPTER 2 (p2: 0.33 - 0.66): WHY CHOOSE DOON RIDERS */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center sm:items-end px-6 sm:px-10 lg:px-16 text-center sm:text-right transition-all duration-500"
            style={{
              opacity: p2 >= 0.33 && p2 <= 0.66 ? 1 : p2 < 0.33 ? Math.max(0, (p2 - 0.22) * 9) : Math.max(0, 1 - (p2 - 0.66) * 9),
              transform: `translateY(${p2 >= 0.33 && p2 <= 0.66 ? 0 : p2 < 0.33 ? 40 : -40}px)`,
              pointerEvents: p2 >= 0.33 && p2 <= 0.66 ? 'auto' : 'none'
            }}
          >
            <div className="space-y-4 w-full max-w-[740px]">
              <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                <BatteryCharging className="w-3.5 h-3.5 text-[#00D96B]" />
                <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                  THE DOON RIDERS ADVANTAGE
                </h2>
              </div>
              
              <h2 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                Why Choose <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                  DOON RIDERS?
                </span>
              </h2>

              <p className="text-xs sm:text-sm md:text-base text-gray-200 font-normal leading-relaxed max-w-2xl sm:ml-auto drop-shadow-md">
                Everything you need to ride, earn, and save with maximum uptime, zero fuel expenses, and dedicated roadside support across Uttarakhand.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2 text-left">
                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-lg">
                  <span className="text-[10px] font-black text-[#00D96B] font-mono">01</span>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">No License Required</h3>
                  <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Ride and earn without a driving license hassle.</p>
                </div>
                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-lg">
                  <span className="text-[10px] font-black text-[#00D96B] font-mono">02</span>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">Free Maintenance</h3>
                  <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Service &amp; brake checks are covered by us.</p>
                </div>
                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-lg">
                  <span className="text-[10px] font-black text-[#00D96B] font-mono">03</span>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">Swap, Don't Wait</h3>
                  <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Instant 2-minute battery swap packs.</p>
                </div>
                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-lg">
                  <span className="text-[10px] font-black text-[#00D96B] font-mono">04</span>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">24×7 Support</h3>
                  <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Our support team is always available.</p>
                </div>
                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-lg">
                  <span className="text-[10px] font-black text-[#00D96B] font-mono">05</span>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">19×7 RSA</h3>
                  <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Roadside technical help whenever needed.</p>
                </div>
                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-lg">
                  <span className="text-[10px] font-black text-[#00D96B] font-mono">06</span>
                  <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">Unlimited KM</h3>
                  <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Ride unlimited kilometers with zero range anxiety.</p>
                </div>
              </div>
            </div>
          </div>

          {/* CHAPTER 3 (p2: 0.66 - 1.0): ₹1,699 ALL-INCLUSIVE PLAN */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center px-6 lg:px-10 transition-all duration-500"
            style={{
              opacity: p2 > 0.66 ? 1 : Math.max(0, (p2 - 0.55) * 9),
              transform: `translateY(${p2 > 0.66 ? 0 : 40}px)`,
              pointerEvents: p2 > 0.66 ? 'auto' : 'none'
            }}
          >
            <div className="w-full max-w-[1400px] flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">
              {/* Left Column */}
              <div className="w-full lg:w-[32%] space-y-3 z-20">
                <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/85 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                  <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-[#00D96B]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase">No License Required</h3>
                    <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Ride and earn without driving license hassle.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/85 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                  <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                    <BatteryCharging className="w-6 h-6 text-[#00D96B]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase">Swap, Don't Wait</h3>
                    <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Swap battery in under 2 minutes at 5+ hubs.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/85 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                  <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                    <Headphones className="w-6 h-6 text-[#00D96B]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase">24×7 Support</h3>
                    <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Dedicated customer care assistance.</p>
                  </div>
                </div>
              </div>

              {/* Center Price HUD */}
              <div className="relative z-20 flex items-center justify-center shrink-0">
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-[#06111B]/95 backdrop-blur-xl border-2 border-[#00D96B] shadow-[0_0_50px_rgba(0,217,107,0.35)] flex flex-col items-center justify-center">
                  <div className="relative z-10 border border-[#00D96B] bg-[#00D96B]/15 px-3.5 py-1 rounded-full">
                    <span className="text-[#00D96B] text-[10px] sm:text-xs font-black tracking-[0.1em] uppercase">
                      ALL-INCLUSIVE PLAN
                    </span>
                  </div>
                  <div className="relative z-10 mt-3 flex items-baseline justify-center tracking-tight font-['Play']">
                    <span className="text-4xl sm:text-5xl font-black text-[#00D96B]">₹</span>
                    <span className="text-5xl sm:text-6xl font-black text-white">1,699</span>
                  </div>
                  <div className="relative z-10 text-sm sm:text-base font-black text-gray-300 tracking-[0.1em] uppercase">
                    / WEEK
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="w-full lg:w-[32%] space-y-3 z-20">
                <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/85 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                  <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-[#00D96B]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase">Free Maintenance</h3>
                    <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Every service &amp; brake check is covered.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/85 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                  <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-[#00D96B]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase">19×7 RSA Support</h3>
                    <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Roadside technical help whenever needed.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/85 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                  <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                    <Infinity className="w-6 h-6 text-[#00D96B]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase">Unlimited Daily KM</h3>
                    <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Zero distance or mileage restrictions.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* SECTION 3: BATTERY SWAP SYSTEM (battery-swap.mp4, 0s - 7s on scroll) */}
      {/* ========================================================================= */}
      <div ref={sec3Ref} className="relative h-[280vh] w-full bg-[#070D18]">
        {/* Sticky Viewport Container */}
        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
          {/* Background Video */}
          <video
            ref={video3Ref}
            src="/videos/battery-swap.mp4"
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient Dark Vignettes */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070D18]/95 via-black/35 to-[#070D18]/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/70 via-transparent to-[#070D18]/70 pointer-events-none" />

          {/* SLIDE 1 (p3: 0.0 - 0.33): OUR BATTERY SWAP SYSTEM */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center transition-all duration-500"
            style={{
              opacity: p3 < 0.33 ? 1 : Math.max(0, 1 - (p3 - 0.33) * 6),
              transform: `translateY(${p3 < 0.33 ? 0 : -(p3 - 0.33) * 60}px)`,
              pointerEvents: p3 < 0.33 ? 'auto' : 'none'
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                <RefreshCw className="w-3.5 h-3.5 text-[#00D96B] animate-spin" style={{ animationDuration: '8s' }} />
                <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                  100% SMART ENERGY ECOSYSTEM
                </h2>
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                OUR BATTERY <br />
                <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                  SWAP SYSTEM
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                Zero charging downtime. Swap drained batteries in under 2 minutes for 100% charged smart lithium packs across Dehradun.
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="bg-[#0A0F1D]/75 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                  <span className="text-base sm:text-lg font-black font-mono text-[#00D96B] block leading-none">&lt; 2 MINS</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Instant Swap</span>
                </div>
                <div className="bg-[#0A0F1D]/75 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                  <span className="text-base sm:text-lg font-black font-mono text-white block leading-none">100%</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Smart Li-Ion</span>
                </div>
                <div className="bg-[#0A0F1D]/75 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                  <span className="text-base sm:text-lg font-black font-mono text-[#38BDF8] block leading-none">₹0</span>
                  <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Fuel Cost</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current stroke-current" />
                  <span>BOOK A TEST DRIVE</span>
                </button>
              </div>
            </div>
          </div>

          {/* SLIDE 2 (p3: 0.33 - 0.66): HOW IT WORKS 3 STEPS */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center transition-all duration-500"
            style={{
              opacity: p3 >= 0.33 && p3 <= 0.66 ? 1 : p3 < 0.33 ? Math.max(0, (p3 - 0.22) * 9) : Math.max(0, 1 - (p3 - 0.66) * 9),
              transform: `translateY(${p3 >= 0.33 && p3 <= 0.66 ? 0 : p3 < 0.33 ? 40 : -40}px)`,
              pointerEvents: p3 >= 0.33 && p3 <= 0.66 ? 'auto' : 'none'
            }}
          >
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                <Sparkles className="w-3.5 h-3.5 text-[#00D96B]" />
                <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                  3-STEP EFFORTLESS PROCESS
                </h2>
              </div>

              <h1 className="font-heading font-black text-2xl sm:text-4xl md:text-6xl text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                HOW IT WORKS <br />
                <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                  2-MINUTE SWAP PROCESS
                </span>
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                Quick, automated, and seamless. Never wait hours for charging again.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 max-w-4xl mx-auto w-full">
                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-left shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black font-mono text-[#00D96B] bg-[#00D96B]/15 px-2.5 py-0.5 rounded-full border border-[#00D96B]/30">STEP 01</span>
                    <Navigation className="w-4 h-4 text-[#00D96B]" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Arrive at Station
                  </h3>
                  <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                    Pull up at any nearby DOON Riders swap station across Dehradun.
                  </p>
                </div>

                <div className="bg-white/[0.08] backdrop-blur-xl border border-[#00D96B]/50 rounded-2xl p-4 text-left shadow-[0_0_30px_rgba(0,217,107,0.15)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black font-mono text-[#00D96B] bg-[#00D96B]/25 px-2.5 py-0.5 rounded-full border border-[#00D96B]/50">STEP 02</span>
                    <RefreshCw className="w-4 h-4 text-[#00D96B]" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Swap in 90 Sec
                  </h3>
                  <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                    Insert your drained pack and release a 100% charged smart battery.
                  </p>
                </div>

                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-left shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black font-mono text-[#00D96B] bg-[#00D96B]/15 px-2.5 py-0.5 rounded-full border border-[#00D96B]/30">STEP 03</span>
                    <Zap className="w-4 h-4 text-[#00D96B]" />
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wide">
                    Lock &amp; Ride
                  </h3>
                  <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                    Snap the fresh battery in, turn on ignition, and resume your ride!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 3 (p3: 0.66 - 1.0): 5+ DEHRADUN STATION HUBS */}
          <div
            className="absolute inset-0 flex flex-col justify-center items-center px-6 text-center transition-all duration-500"
            style={{
              opacity: p3 > 0.66 ? 1 : Math.max(0, (p3 - 0.55) * 9),
              transform: `translateY(${p3 > 0.66 ? 0 : 40}px)`,
              pointerEvents: p3 > 0.66 ? 'auto' : 'none'
            }}
          >
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                <MapPin className="w-3.5 h-3.5 text-[#00D96B]" />
                <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                  5+ STATIONS ACROSS DEHRADUN
                </h2>
              </div>

              <h1 className="font-heading font-black text-2xl sm:text-4xl md:text-6xl text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                BATTERY STATION <br />
                <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                  LOCATIONS
                </span>
              </h1>

              <p className="text-xs sm:text-sm md:text-base text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                Strategically located across Dehradun’s busiest hubs for fast &amp; seamless battery swapping on the go.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 max-w-5xl mx-auto w-full">
                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all">
                  <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase">Canal Road</h4>
                  <p className="text-[10px] text-gray-300">Kishanpur corridor</p>
                  <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                </div>

                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all">
                  <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase">Sewla Kalan</h4>
                  <p className="text-[10px] text-gray-300">Saharanpur Road</p>
                  <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                </div>

                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all">
                  <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase">Balliwala</h4>
                  <p className="text-[10px] text-gray-300">GMS Road Junction</p>
                  <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                </div>

                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all">
                  <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase">Premnagar</h4>
                  <p className="text-[10px] text-gray-300">University Zone</p>
                  <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                </div>

                <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all col-span-2 sm:col-span-1">
                  <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                  <h4 className="text-xs sm:text-sm font-black text-white uppercase">Ajabpur Kalan</h4>
                  <p className="text-[10px] text-gray-300">Bypass Connectivity</p>
                  <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current stroke-current" />
                  <span>BOOK A TEST DRIVE TODAY</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINAL CALL TO ACTION FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-[#040810] border-t border-white/10 pt-16 pb-12 text-white relative z-30">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-12">
            <div className="lg:col-span-5 space-y-4">
              <Link href="/" className="flex items-center gap-3">
                <div className="relative w-12 h-8 flex items-center justify-center">
                  <Image
                    src="/images/doon-riders-logo.png"
                    alt="DOON RIDERS"
                    width={52}
                    height={36}
                    className="object-contain"
                  />
                </div>
                <span className="font-heading font-black text-xl uppercase tracking-wider text-white">
                  DOON <span className="text-[#00D96B]">RIDERS</span>
                </span>
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                Empowering green, zero-fuel mobility across Dehradun, Uttarakhand with instant battery swapping and smart EV rentals.
              </p>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#00D96B] font-mono">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-300 font-medium">
                <li><Link href="/" className="hover:text-[#00D96B] transition">Home</Link></li>
                <li><Link href="/about" className="hover:text-[#00D96B] transition">About Us</Link></li>
                <li><Link href="/pricing" className="hover:text-[#00D96B] transition">Rental Pricing</Link></li>
                <li><Link href="/contact" className="hover:text-[#00D96B] transition">Contact &amp; Hubs</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#00D96B] font-mono">Contact Support</h4>
              <p className="text-sm text-gray-300 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#00D96B]" />
                <span>+91 8439431999</span>
              </p>
              <p className="text-sm text-gray-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#00D96B]" />
                <span>doonridersmain@gmail.com</span>
              </p>
              <p className="text-sm text-gray-300 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#00D96B]" />
                <span>Canal Road, Kishanpur, Dehradun, UK</span>
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 font-mono">
            <p>© {new Date().getFullYear()} DOON Riders. All rights reserved.</p>
            <p className="mt-2 sm:mt-0">Dehradun, Uttarakhand • 100% Electric Mobility</p>
          </div>
        </div>
      </footer>

      {/* Booking Test Drive Modal */}
      <BookTestDriveModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </div>
  );
}
