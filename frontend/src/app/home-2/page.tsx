'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function HomeV2Page() {
  const [bookingOpen, setBookingOpen] = useState(false);
  
  // Master Scene: 0 = Hero Scene, 1 = About Scene, 2 = Battery Swap System Scene
  const [scene, setScene] = useState<0 | 1 | 2>(0);
  
  // Horizontal slides for each scene (0, 1, 2)
  const [heroSlide, setHeroSlide] = useState(0);
  const [aboutChapter, setAboutChapter] = useState(0);
  const [swapSlide, setSwapSlide] = useState(0);

  // Video Refs
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const aboutVideoRef = useRef<HTMLVideoElement>(null);
  const swapVideoRef = useRef<HTMLVideoElement>(null);

  // Refs for tracking current state inside event listeners without re-binding
  const sceneRef = useRef<0 | 1 | 2>(0);
  const heroSlideRef = useRef(0);
  const aboutChapterRef = useRef(0);
  const swapSlideRef = useRef(0);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    sceneRef.current = scene;
    heroSlideRef.current = heroSlide;
    aboutChapterRef.current = aboutChapter;
    swapSlideRef.current = swapSlide;
  }, [scene, heroSlide, aboutChapter, swapSlide]);

  // Video Playback Management - Play ONLY the active scene video to ensure silky 60FPS
  useEffect(() => {
    if (scene === 0) {
      if (heroVideoRef.current) {
        heroVideoRef.current.muted = true;
        heroVideoRef.current.play().catch(() => {});
      }
      aboutVideoRef.current?.pause();
      swapVideoRef.current?.pause();
    } else if (scene === 1) {
      if (aboutVideoRef.current) {
        aboutVideoRef.current.muted = true;
        aboutVideoRef.current.play().catch(() => {});
      }
      heroVideoRef.current?.pause();
      swapVideoRef.current?.pause();
    } else if (scene === 2) {
      if (swapVideoRef.current) {
        swapVideoRef.current.muted = true;
        swapVideoRef.current.play().catch(() => {});
      }
      heroVideoRef.current?.pause();
      aboutVideoRef.current?.pause();
    }
  }, [scene]);

  // Navigation handlers with lock
  const handleNext = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (sceneRef.current === 0) {
      if (heroSlideRef.current < 2) {
        setHeroSlide((prev) => prev + 1);
      } else {
        setScene(1);
        setAboutChapter(0);
      }
    } else if (sceneRef.current === 1) {
      if (aboutChapterRef.current < 2) {
        setAboutChapter((prev) => prev + 1);
      } else {
        setScene(2);
        setSwapSlide(0);
      }
    } else if (sceneRef.current === 2) {
      if (swapSlideRef.current < 2) {
        setSwapSlide((prev) => prev + 1);
      }
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 600);
  }, []);

  const handlePrev = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (sceneRef.current === 2) {
      if (swapSlideRef.current > 0) {
        setSwapSlide((prev) => prev - 1);
      } else {
        setScene(1);
        setAboutChapter(2);
      }
    } else if (sceneRef.current === 1) {
      if (aboutChapterRef.current > 0) {
        setAboutChapter((prev) => prev - 1);
      } else {
        setScene(0);
        setHeroSlide(2);
      }
    } else if (sceneRef.current === 0) {
      if (heroSlideRef.current > 0) {
        setHeroSlide((prev) => prev - 1);
      }
    }

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 600);
  }, []);

  // Keyboard, MouseWheel & Touch Event Listeners
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 18 && Math.abs(e.deltaX) < 18) return;
      e.preventDefault();

      if (e.deltaY > 18 || e.deltaX > 18) {
        handleNext();
      } else if (e.deltaY < -18 || e.deltaX < -18) {
        handlePrev();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      }
    };

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const diffX = touchStartX - e.changedTouches[0].clientX;
      const diffY = touchStartY - e.changedTouches[0].clientY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
        if (diffX > 0) handleNext();
        else handlePrev();
      } else if (Math.abs(diffY) > 45) {
        if (diffY > 0) handleNext();
        else handlePrev();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleNext, handlePrev]);

  // Determine current active sub-slide for dots
  const currentSubSlide = scene === 0 ? heroSlide : scene === 1 ? aboutChapter : swapSlide;

  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#070D18] text-white font-sans select-none antialiased">
      {/* Floating Global Navbar */}
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* ========================================================================= */}
      {/* MASTER VERTICAL SCENE CURTAIN (0vh, -100vh, -200vh) */}
      {/* ========================================================================= */}
      <div
        className="w-full h-full flex flex-col will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          transform: `translate3d(0, -${scene * 100}vh, 0)`
        }}
      >
        
        {/* ======================================================================= */}
        {/* SCENE 1: HERO SCENE (scooter-ride.mp4) */}
        {/* ======================================================================= */}
        <section className="relative w-full h-screen shrink-0 overflow-hidden bg-[#070D18]">
          {/* Background Video */}
          <div className="absolute inset-0 w-full h-full bg-[#070D18] overflow-hidden">
            <video
              ref={heroVideoRef}
              src="/videos/scooter-ride.mp4"
              autoPlay
              loop
              playsInline
              muted
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070D18]/90 via-black/25 to-[#070D18]/60 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/60 via-transparent to-[#070D18]/60 pointer-events-none" />
          </div>

          {/* 300vw Horizontal Track for Hero */}
          <div
            className="absolute top-0 left-0 h-full w-[300vw] flex items-center z-20 will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translate3d(-${heroSlide * 100}vw, 0, 0)`
            }}
          >
            {/* SLIDE 1 (0vw to 100vw): WELCOME TO DOON RIDERS */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
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
              </div>
              <button
                type="button"
                onClick={() => setBookingOpen(true)}
                className="mt-6 bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 pointer-events-auto"
              >
                <Zap className="w-4 h-4 fill-current stroke-current" />
                <span>Book a Test Drive</span>
              </button>
            </div>

            {/* SLIDE 2 (100vw to 200vw): BEST EV RENTAL SCOOTY */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
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
                  No Driving License Required • 5-Minute KYC • ₹0 Petrol Expense & Instant 2-Min Battery Swapping.
                </p>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="bg-[#0A0F1D]/70 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-[#00D96B] block leading-none">₹0</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Petrol Expense</span>
                  </div>
                  <div className="bg-[#0A0F1D]/70 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-white block leading-none">5 MIN</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">KYC</span>
                  </div>
                  <div className="bg-[#0A0F1D]/70 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-[#38BDF8] block leading-none">100%</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Eco Friendly</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 3 (200vw to 300vw): 5+ SWAP STATIONS */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
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
                  Swap drained batteries in &lt;2 minutes across Canal Road, Sewla Kalan, Balliwala, Premnagar & Ajabpur Kalan. Unlimited range, 19×7 roadside support.
                </p>

                <div className="pt-3 flex justify-center pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setBookingOpen(true)}
                    className="bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-current stroke-current" />
                    <span>BOOK A TEST DRIVE</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* ======================================================================= */}
        {/* SCENE 2: ABOUT VIDEO SECTION (about-scroll.mp4) */}
        {/* ======================================================================= */}
        <section className="relative w-full h-screen shrink-0 overflow-hidden bg-[#070D18]">
          {/* Background Video */}
          <div className="absolute inset-0 w-full h-full bg-[#070D18] overflow-hidden">
            <video
              ref={aboutVideoRef}
              src="/videos/about-scroll.mp4"
              loop
              playsInline
              muted
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070D18]/90 via-black/25 to-[#070D18]/60 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/60 via-transparent to-[#070D18]/60 pointer-events-none" />
          </div>

          {/* 300vw Horizontal Track for About */}
          <div
            className="absolute top-0 left-0 h-full w-[300vw] flex items-center z-20 will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translate3d(-${aboutChapter * 100}vw, 0, 0)`
            }}
          >
            {/* CHAPTER 1 (0vw to 100vw): About Us */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
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

            {/* CHAPTER 2 (100vw to 200vw): The DOON Riders Advantage */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center sm:items-end px-6 sm:px-10 lg:px-16 text-center sm:text-right shrink-0">
              <div className="space-y-4 w-full max-w-[720px]">
                <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                  <BatteryCharging className="w-3.5 h-3.5 text-[#00D96B]" />
                  <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                    THE DOON RIDERS ADVANTAGE
                  </h2>
                </div>
                
                <h2 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase leading-[1.05] text-center sm:text-right drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)] font-['Play']">
                  Why Choose <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                    DOON RIDERS?
                  </span>
                </h2>

                <p className="text-xs sm:text-sm md:text-base text-gray-200 font-normal leading-relaxed max-w-2xl sm:ml-auto drop-shadow-md">
                  Everything you need to ride, earn, and save with maximum uptime, zero fuel expenses, and dedicated roadside support across Uttarakhand.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-2 text-left">
                  {/* CARD 01 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[10px] font-black text-[#00D96B] font-mono">01</span>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">No License Required</h3>
                    <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Ride and earn without a driving license hassle.</p>
                  </div>

                  {/* CARD 02 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[10px] font-black text-[#00D96B] font-mono">02</span>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">Free Maintenance</h3>
                    <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Service and brake checks are covered by us.</p>
                  </div>

                  {/* CARD 03 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[10px] font-black text-[#00D96B] font-mono">03</span>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">Swap, Don't Wait</h3>
                    <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Don't need to wait, instant battery swaps.</p>
                  </div>

                  {/* CARD 04 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[10px] font-black text-[#00D96B] font-mono">04</span>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">24×7 Support</h3>
                    <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Our support team is always available.</p>
                  </div>

                  {/* CARD 05 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[10px] font-black text-[#00D96B] font-mono">05</span>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">19×7 RSA</h3>
                    <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Roadside assistance whenever you need help.</p>
                  </div>

                  {/* CARD 06 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
                    <span className="text-[10px] font-black text-[#00D96B] font-mono">06</span>
                    <h3 className="text-xs sm:text-sm font-black text-white uppercase mt-1">Unlimited KM</h3>
                    <p className="text-[10px] text-gray-300 mt-1 leading-relaxed">Drive unlimited kilometers with zero range anxiety.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CHAPTER 3 (200vw to 300vw): ALL-INCLUSIVE RENTAL PLAN */}
            <div className="w-[100vw] h-full shrink-0 relative flex items-center justify-center px-6 lg:px-10 overflow-hidden">
              <div className="relative w-full max-w-[1400px] h-full flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-10">

                {/* LEFT FEATURES */}
                <div className="w-full lg:w-[32%] space-y-3 z-20">
                  <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/80 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                    <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                      <FileCheck className="w-6 h-6 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase">No License Required</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Ride and earn without driving license hassle.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/80 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                    <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                      <BatteryCharging className="w-6 h-6 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase">Swap, Don't Wait</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Swap battery in under 2 minutes at 5+ hubs.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/80 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                    <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                      <Headphones className="w-6 h-6 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase">24×7 Support</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Dedicated customer care assistance.</p>
                    </div>
                  </div>
                </div>

                {/* CENTER PRICE HUD */}
                <div className="relative z-20 flex items-center justify-center shrink-0">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-[#06111B]/90 backdrop-blur-xl border-2 border-[#00D96B] shadow-[0_0_40px_rgba(0,217,107,0.3)] flex flex-col items-center justify-center">
                    <div className="relative z-10 border border-[#00D96B] bg-[#00D96B]/10 px-3.5 py-1 rounded-full">
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

                {/* RIGHT FEATURES */}
                <div className="w-full lg:w-[32%] space-y-3 z-20">
                  <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/80 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                    <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase">Free Maintenance</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Every service & brake check is covered.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/80 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
                    <div className="w-11 h-11 shrink-0 rounded-xl border border-[#00D96B] bg-[#00D96B]/15 flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-white uppercase">19×7 RSA Support</h3>
                      <p className="text-[10px] text-gray-300 mt-0.5 leading-relaxed">Roadside technical help whenever needed.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#00D96B]/40 bg-[#07131D]/80 backdrop-blur-xl p-3.5 flex items-center gap-3.5 shadow-lg">
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
        </section>


        {/* ======================================================================= */}
        {/* SCENE 3: OUR BATTERY SWAP SYSTEM SECTION (battery-swap.mp4) */}
        {/* ======================================================================= */}
        <section className="relative w-full h-screen shrink-0 overflow-hidden bg-[#070D18]">
          {/* Background Video */}
          <div className="absolute inset-0 w-full h-full bg-[#070D18] overflow-hidden">
            <video
              ref={swapVideoRef}
              src="/videos/battery-swap.mp4"
              loop
              playsInline
              muted
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070D18]/90 via-black/25 to-[#070D18]/60 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/60 via-transparent to-[#070D18]/60 pointer-events-none" />
          </div>

          {/* 300vw Horizontal Track for Battery Swap */}
          <div
            className="absolute top-0 left-0 h-full w-[300vw] flex items-center z-20 will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translate3d(-${swapSlide * 100}vw, 0, 0)`
            }}
          >
            {/* SLIDE 1 (0vw to 100vw): OUR BATTERY SWAP SYSTEM */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
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
                  <div className="bg-[#0A0F1D]/70 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-[#00D96B] block leading-none">&lt; 2 MINS</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Instant Swap</span>
                  </div>
                  <div className="bg-[#0A0F1D]/70 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-white block leading-none">100%</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Smart Li-Ion</span>
                  </div>
                  <div className="bg-[#0A0F1D]/70 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-[#38BDF8] block leading-none">₹0</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Fuel Cost</span>
                  </div>
                </div>
              </div>

              <div className="pt-5 flex justify-center pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current stroke-current" />
                  <span>BOOK A TEST DRIVE</span>
                </button>
              </div>
            </div>

            {/* SLIDE 2 (100vw to 200vw): HOW IT WORKS */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
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

                {/* 3 Step Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 max-w-4xl mx-auto w-full">
                  {/* STEP 01 */}
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

                  {/* STEP 02 */}
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

                  {/* STEP 03 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-left shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black font-mono text-[#00D96B] bg-[#00D96B]/15 px-2.5 py-0.5 rounded-full border border-[#00D96B]/30">STEP 03</span>
                      <Zap className="w-4 h-4 text-[#00D96B]" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wide">
                      Lock & Ride
                    </h3>
                    <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                      Snap the fresh battery in, turn on ignition, and resume your ride!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 3 (200vw to 300vw): BATTERY STATION LOCATIONS */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
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
                  Strategically located across Dehradun’s busiest hubs for fast & seamless battery swapping on the go.
                </p>

                {/* Location Grid Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 max-w-5xl mx-auto w-full">
                  {/* HUB 1 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all">
                    <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Canal Road</h4>
                    <p className="text-[10px] text-gray-300">Kishanpur corridor</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                  </div>

                  {/* HUB 2 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all">
                    <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Sewla Kalan</h4>
                    <p className="text-[10px] text-gray-300">Saharanpur Road</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                  </div>

                  {/* HUB 3 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all">
                    <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Balliwala</h4>
                    <p className="text-[10px] text-gray-300">GMS Road Junction</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                  </div>

                  {/* HUB 4 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all">
                    <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Premnagar</h4>
                    <p className="text-[10px] text-gray-300">University Zone</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                  </div>

                  {/* HUB 5 */}
                  <div className="bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-2xl p-3 text-center hover:border-[#00D96B]/50 transition-all col-span-2 sm:col-span-1">
                    <MapPin className="w-4 h-4 text-[#00D96B] mx-auto mb-1.5" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Ajabpur Kalan</h4>
                    <p className="text-[10px] text-gray-300">Bypass Connectivity</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-1.5">Active 19x7</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-center pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setBookingOpen(true)}
                  className="bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current stroke-current" />
                  <span>BOOK A TEST DRIVE TODAY</span>
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ========================================================================= */}
      {/* FLOATING NAVIGATION HUD CONTROLS (RIGHT VERTICAL & BOTTOM HORIZONTAL) */}
      {/* ========================================================================= */}
      
      {/* Right Vertical Scene Switcher */}
      <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4 bg-[#0A0F1D]/80 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-2xl">
        <button
          onClick={() => { setScene(0); setHeroSlide(0); }}
          title="Scene 1: Experience"
          className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
            scene === 0 ? 'bg-[#00D96B] ring-4 ring-[#00D96B]/30 scale-125' : 'bg-white/40 hover:bg-white/80'
          }`}
        />
        <button
          onClick={() => { setScene(1); setAboutChapter(0); }}
          title="Scene 2: About Us"
          className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
            scene === 1 ? 'bg-[#00D96B] ring-4 ring-[#00D96B]/30 scale-125' : 'bg-white/40 hover:bg-white/80'
          }`}
        />
        <button
          onClick={() => { setScene(2); setSwapSlide(0); }}
          title="Scene 3: Battery Swapping"
          className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer ${
            scene === 2 ? 'bg-[#00D96B] ring-4 ring-[#00D96B]/30 scale-125' : 'bg-white/40 hover:bg-white/80'
          }`}
        />
      </div>

      {/* Bottom Horizontal Sub-Slide Indicators & Arrows */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-[#0A0F1D]/85 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-2xl">
        <button
          onClick={handlePrev}
          title="Previous slide"
          className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-[#00D96B] transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 px-1">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => {
                if (scene === 0) setHeroSlide(idx);
                else if (scene === 1) setAboutChapter(idx);
                else setSwapSlide(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                currentSubSlide === idx ? 'w-6 bg-[#00D96B]' : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          title="Next slide"
          className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-[#00D96B] transition cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Booking Test Drive Modal */}
      <BookTestDriveModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </main>
  );
}
