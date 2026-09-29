'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, BatteryCharging, ChevronRight, ChevronDown } from 'lucide-react';

interface ScrollVideoHeroProps {
  onOpenBooking?: () => void;
}

export const ScrollVideoHero: React.FC<ScrollVideoHeroProps> = ({ onOpenBooking }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [activeSlide, setActiveSlide] = useState(0); // 0, 1, 2
  const [slideProgress, setSlideProgress] = useState(0); // 0.0 to 2.0 smooth
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Maximum video time to cover in Hero section (5.0 seconds)
  const SCENE_MAX_TIME = 5.0;

  // Video time target based on slide
  const targetTimeRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const lastWheelTimeRef = useRef(0);
  const activeSlideRef = useRef(0);

  // Keep ref in sync with state
  useEffect(() => {
    activeSlideRef.current = activeSlide;
  }, [activeSlide]);

  // Smooth slide change function
  const goToSlide = useCallback((newSlide: number) => {
    if (newSlide < 0 || newSlide > 2) return;
    setActiveSlide(newSlide);
    targetTimeRef.current = (newSlide / 2) * SCENE_MAX_TIME;
  }, []);

  // Scroll down to Scene 2 (About Section)
  const scrollToNextScene = useCallback(() => {
    const nextSection = document.getElementById('about-section');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({
        top: window.innerHeight * 1.5,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animId: number;
    let smoothProgress = 0;

    // Dual-Engine smooth playback and horizontal interpolation loop
    const syncLoop = () => {
      // 1. Smoothly interpolate slide progress (0.0 to 2.0)
      const targetSlideProgress = activeSlideRef.current;
      const pDiff = targetSlideProgress - smoothProgress;
      if (Math.abs(pDiff) > 0.001) {
        smoothProgress += pDiff * 0.12;
        setSlideProgress(smoothProgress);
      } else {
        smoothProgress = targetSlideProgress;
        setSlideProgress(smoothProgress);
      }

      // 2. Smoothly scrub video to target time
      if (video && video.duration && !isNaN(video.duration)) {
        const targetTime = targetTimeRef.current;
        const timeDiff = targetTime - video.currentTime;

        if (timeDiff > 0.05 && timeDiff < 1.4) {
          const rate = Math.min(3.0, Math.max(0.6, timeDiff * 3.0));
          video.playbackRate = rate;
          if (video.paused) {
            video.play().catch(() => {});
          }
        } else if (Math.abs(timeDiff) > 0.02) {
          if (!video.paused) {
            video.pause();
          }
          video.currentTime += timeDiff * 0.35;
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      }

      animId = requestAnimationFrame(syncLoop);
    };

    const handleMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setIsVideoReady(true);
        if (video.currentTime === 0) {
          video.currentTime = 0.01;
        }
      }
    };

    // Wheel event interceptor for 2 horizontal right scrolls before 3rd scroll down
    const handleWheel = (e: WheelEvent) => {
      const isAtHero = window.scrollY < window.innerHeight * 0.25;
      if (!isAtHero) return;

      const now = Date.now();
      // Debounce fast wheel notches
      if (now - lastWheelTimeRef.current < 450) {
        if (activeSlideRef.current < 2 || (activeSlideRef.current === 2 && e.deltaY < 0)) {
          e.preventDefault();
        }
        return;
      }

      // Scroll Down Gesture
      if (e.deltaY > 25) {
        if (activeSlideRef.current === 0) {
          e.preventDefault();
          lastWheelTimeRef.current = now;
          goToSlide(1); // 1st Right Scroll -> Slide 2
        } else if (activeSlideRef.current === 1) {
          e.preventDefault();
          lastWheelTimeRef.current = now;
          goToSlide(2); // 2nd Right Scroll -> Slide 3
        } else if (activeSlideRef.current === 2) {
          // 3rd Scroll Down -> Transition smoothly to About Section
          lastWheelTimeRef.current = now;
          scrollToNextScene();
        }
      } 
      // Scroll Up Gesture
      else if (e.deltaY < -25) {
        if (activeSlideRef.current === 2) {
          e.preventDefault();
          lastWheelTimeRef.current = now;
          goToSlide(1);
        } else if (activeSlideRef.current === 1) {
          e.preventDefault();
          lastWheelTimeRef.current = now;
          goToSlide(0);
        }
      }
    };

    // Keyboard navigation (ArrowRight / ArrowLeft / ArrowDown / ArrowUp)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAtHero = window.scrollY < window.innerHeight * 0.25;
      if (!isAtHero) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (activeSlideRef.current < 2) {
          e.preventDefault();
          goToSlide(activeSlideRef.current + 1);
        } else if (e.key === 'ArrowDown') {
          scrollToNextScene();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (activeSlideRef.current > 0) {
          e.preventDefault();
          goToSlide(activeSlideRef.current - 1);
        }
      }
    };

    // Touch swipe support for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const isAtHero = window.scrollY < window.innerHeight * 0.25;
      if (!isAtHero) return;

      const diffX = touchStartX - e.changedTouches[0].clientX;
      const diffY = touchStartY - e.changedTouches[0].clientY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0 && activeSlideRef.current < 2) {
          goToSlide(activeSlideRef.current + 1);
        } else if (diffX < 0 && activeSlideRef.current > 0) {
          goToSlide(activeSlideRef.current - 1);
        }
      } else if (diffY > 50 && activeSlideRef.current === 2) {
        scrollToNextScene();
      }
    };

    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('loadeddata', handleMetadata);
    video.addEventListener('canplay', handleMetadata);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    if (video.readyState >= 1) {
      handleMetadata();
    }

    video.play().then(() => {
      video.pause();
    }).catch(() => {});

    animId = requestAnimationFrame(syncLoop);

    return () => {
      cancelAnimationFrame(animId);
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('loadeddata', handleMetadata);
      video.removeEventListener('canplay', handleMetadata);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [goToSlide, scrollToNextScene]);

  // Translate calculation: slide 0 -> 0vw, slide 1 -> -100vw, slide 2 -> -200vw
  const horizontalTranslate = slideProgress * 100;
  const currentStep = activeSlide + 1;

  return (
    <section ref={containerRef} className="relative w-full h-screen h-[100dvh] overflow-hidden bg-[#070D18]">
      
      {/* Fullscreen Video Canvas */}
      <div className="absolute inset-0 w-full h-full bg-[#070D18] overflow-hidden">
        <video
          ref={videoRef}
          src="/videos/scooter-ride.mp4"
          autoPlay
          playsInline
          muted
          preload="auto"
          className="absolute inset-0 w-full h-full !w-full !h-full !max-w-none !max-h-none object-cover"
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070D18]/90 via-black/20 to-[#070D18]/60 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/50 via-transparent to-[#070D18]/60 pointer-events-none" />
      </div>

      {/* ========================================================================= */}
      {/* TRUE HORIZONTAL MOVING TRACK (3 DISTINCT SLIDES ACROSS 300vw) */}
      {/* ========================================================================= */}
      <div
        className="absolute top-0 left-0 h-full w-[300vw] flex items-center z-20 pointer-events-none select-none will-change-transform transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(-${horizontalTranslate}vw, 0, 0)`
        }}
      >
        
        {/* ----------------------------------------------------------------------- */}
        {/* SLIDE 1 (0vw to 100vw): OPENING TITLE (0.0s - 1.8s) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D96B] animate-pulse" />
              <h2 className="text-white font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                DEHRADUN, UTTARAKHAND
              </h2>
            </div>

            <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
              BEST EV RENTAL SCOOTY <br />
              <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                IN UTTARAKHAND
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
              100% Electric Smart Mobility with Instant Battery Swapping & Free Routine Maintenance.
            </p>

            {/* Clickable / Animated Scroll Right Guide */}
            <div className="pt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={() => goToSlide(1)}
                className="pointer-events-auto inline-flex items-center gap-2 bg-white/10 hover:bg-[#00D96B]/20 border border-white/20 hover:border-[#00D96B]/50 px-6 py-2.5 rounded-full text-xs uppercase tracking-widest text-[#00D96B] font-mono font-bold transition-all shadow-lg cursor-pointer transform hover:scale-105"
              >
                <span>Scroll / Click to Explore</span>
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* SLIDE 2 (100vw to 200vw): 1ST RIGHT SCROLL (1.8s - 3.5s) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
          <div className="bg-[#0A0F1D]/85 backdrop-blur-2xl border border-white/20 p-8 sm:p-12 rounded-[36px] max-w-3xl mx-auto space-y-6 shadow-[0_25px_70px_rgba(0,0,0,0.85)] pointer-events-auto">
            <div className="inline-flex items-center gap-2 bg-[#00D96B]/20 border border-[#00D96B]/40 px-4 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-[#00D96B]" />
              <span className="text-[#00D96B] font-extrabold text-[11px] sm:text-xs uppercase tracking-widest">
                100% SMART SILENT MOBILITY
              </span>
            </div>

            <h2 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase leading-tight">
              EXPERIENCE PURE FREEDOM <br />
              <span className="text-[#00D96B]">THROUGH THE HILLS</span>
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed font-normal max-w-xl mx-auto">
              No Driving License Required • 3-Minute Digital KYC • ₹0 Petrol Expense & Instant 2-Min Battery Swapping.
            </p>

            {/* 3 Quick Highlight Badges */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-lg sm:text-xl font-black font-mono text-[#00D96B] block">₹0</span>
                <span className="text-[10px] text-gray-300 uppercase font-bold">Petrol Expense</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-lg sm:text-xl font-black font-mono text-white block">3 MIN</span>
                <span className="text-[10px] text-gray-300 uppercase font-bold">Digital KYC</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <span className="text-lg sm:text-xl font-black font-mono text-[#38BDF8] block">100%</span>
                <span className="text-[10px] text-gray-300 uppercase font-bold">Hill Torque</span>
              </div>
            </div>

            {/* Step 2 Buttons */}
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goToSlide(0)}
                className="text-xs uppercase tracking-widest text-gray-400 hover:text-white px-4 py-2 transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => goToSlide(2)}
                className="inline-flex items-center gap-2 bg-[#00D96B]/20 hover:bg-[#00D96B]/30 border border-[#00D96B]/40 px-6 py-2.5 rounded-full text-xs uppercase tracking-widest text-[#00D96B] font-mono font-bold transition-all cursor-pointer"
              >
                <span>Scroll / Click Next</span>
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* SLIDE 3 (200vw to 300vw): 2ND RIGHT SCROLL (3.5s - 5.0s) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
          <div className="bg-[#0A0F1D]/85 backdrop-blur-2xl border border-[#00D96B]/30 p-8 sm:p-12 rounded-[36px] max-w-3xl mx-auto space-y-6 shadow-[0_25px_70px_rgba(0,217,107,0.18)] pointer-events-auto">
            <div className="inline-flex items-center gap-2 bg-[#00D96B]/20 border border-[#00D96B]/40 px-4 py-1.5 rounded-full">
              <BatteryCharging className="w-3.5 h-3.5 text-[#00D96B]" />
              <span className="text-[#00D96B] font-extrabold text-[11px] sm:text-xs uppercase tracking-widest">
                15+ SWAP STATIONS IN DEHRADUN
              </span>
            </div>

            <h2 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase leading-tight">
              UNSTOPPABLE RIDES <br />
              <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                READY FOR UTTARAKHAND
              </span>
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed font-normal max-w-xl mx-auto">
              Swap drained batteries in &lt;2 minutes across Clock Tower, ISBT, Jakhan, Ballupur & Prem Nagar. Unlimited range, 19×7 roadside support.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => (onOpenBooking ? onOpenBooking() : null)}
                className="w-full sm:w-auto bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_20px_rgba(0,217,107,0.4)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current stroke-current" />
                <span>BOOK A TEST DRIVE</span>
              </button>
            </div>

            {/* 3rd Scroll Down Indicator */}
            <div className="pt-3 flex items-center justify-center">
              <button
                type="button"
                onClick={scrollToNextScene}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#00D96B] font-mono font-bold animate-bounce bg-black/40 px-5 py-2 rounded-full border border-[#00D96B]/30 hover:bg-[#00D96B]/20 transition-all cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
                <span>Scroll Down / Click For About Scene</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Bottom Step Indicator Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/15 pointer-events-auto">
        <button
          type="button"
          onClick={() => goToSlide(0)}
          aria-label="Slide 1"
          className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeSlide === 0 ? 'w-8 bg-[#00D96B]' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
        />
        <button
          type="button"
          onClick={() => goToSlide(1)}
          aria-label="Slide 2"
          className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeSlide === 1 ? 'w-8 bg-[#00D96B]' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
        />
        <button
          type="button"
          onClick={() => goToSlide(2)}
          aria-label="Slide 3"
          className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeSlide === 2 ? 'w-8 bg-[#00D96B]' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
        />
        <span className="text-[11px] font-mono font-bold text-gray-300 ml-1.5 select-none">
          0{currentStep} / 03
        </span>
      </div>

    </section>
  );
};


