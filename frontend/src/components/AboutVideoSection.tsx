'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BatteryCharging, ShieldCheck, CheckCircle2, Sparkles, MapPin, Zap, ArrowRight, ChevronRight, ChevronUp } from 'lucide-react';

interface AboutVideoSectionProps {
  onOpenBooking?: () => void;
}

export const AboutVideoSection: React.FC<AboutVideoSectionProps> = ({ onOpenBooking }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [activeChapter, setActiveChapter] = useState(0); // 0, 1, 2
  const [chapterProgress, setChapterProgress] = useState(0); // 0.0 to 2.0 smooth
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Video time target based on chapter (full duration: 10.0s)
  const targetTimeRef = useRef(0);
  const lastWheelTimeRef = useRef(0);
  const activeChapterRef = useRef(0);

  // Keep ref in sync
  useEffect(() => {
    activeChapterRef.current = activeChapter;
  }, [activeChapter]);

  // Smooth chapter change function
  const goToChapter = useCallback((newChapter: number) => {
    if (newChapter < 0 || newChapter > 2) return;
    setActiveChapter(newChapter);
    targetTimeRef.current = (newChapter / 2) * 9.9;
  }, []);

  // Scroll back to Hero section
  const scrollToHero = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animId: number;
    let smoothProgress = 0;

    // Dual-Engine smooth playback and chapter interpolation loop
    const syncLoop = () => {
      // 1. Smoothly interpolate chapter progress (0.0 to 2.0)
      const targetChapterProgress = activeChapterRef.current;
      const pDiff = targetChapterProgress - smoothProgress;
      if (Math.abs(pDiff) > 0.001) {
        smoothProgress += pDiff * 0.12;
        setChapterProgress(smoothProgress);
      } else {
        smoothProgress = targetChapterProgress;
        setChapterProgress(smoothProgress);
      }

      // 2. Smoothly scrub video to target time
      if (video && video.duration && !isNaN(video.duration)) {
        const targetTime = targetTimeRef.current;
        const timeDiff = targetTime - video.currentTime;

        if (timeDiff > 0.05 && timeDiff < 1.5) {
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

    // Wheel event interceptor for About section chapters
    const handleWheel = (e: WheelEvent) => {
      const isAtAbout = window.scrollY >= window.innerHeight * 0.5;
      if (!isAtAbout) return;

      const now = Date.now();
      if (now - lastWheelTimeRef.current < 450) {
        e.preventDefault();
        return;
      }

      // Scroll Down Gesture
      if (e.deltaY > 25) {
        if (activeChapterRef.current < 2) {
          e.preventDefault();
          lastWheelTimeRef.current = now;
          goToChapter(activeChapterRef.current + 1);
        }
      } 
      // Scroll Up Gesture
      else if (e.deltaY < -25) {
        if (activeChapterRef.current > 0) {
          e.preventDefault();
          lastWheelTimeRef.current = now;
          goToChapter(activeChapterRef.current - 1);
        } else if (activeChapterRef.current === 0) {
          // At Chapter 1, scroll up returns to Hero
          lastWheelTimeRef.current = now;
          scrollToHero();
        }
      }
    };

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      const isAtAbout = window.scrollY >= window.innerHeight * 0.5;
      if (!isAtAbout) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (activeChapterRef.current < 2) {
          e.preventDefault();
          goToChapter(activeChapterRef.current + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (activeChapterRef.current > 0) {
          e.preventDefault();
          goToChapter(activeChapterRef.current - 1);
        } else {
          scrollToHero();
        }
      }
    };

    // Touch swipe support for mobile
    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const isAtAbout = window.scrollY >= window.innerHeight * 0.5;
      if (!isAtAbout) return;

      const diffX = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diffX) > 40) {
        if (diffX > 0 && activeChapterRef.current < 2) {
          goToChapter(activeChapterRef.current + 1);
        } else if (diffX < 0 && activeChapterRef.current > 0) {
          goToChapter(activeChapterRef.current - 1);
        }
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
  }, [goToChapter, scrollToHero]);

  // Translate calculation: 0vw -> -100vw -> -200vw
  const horizontalTranslate = chapterProgress * 100;
  const currentStep = activeChapter + 1;

  return (
    <section id="about-section" ref={containerRef} className="relative w-full h-screen h-[100dvh] overflow-hidden bg-[#070D18]">
      
      {/* Fullscreen Video Canvas for About Section */}
      <div className="absolute inset-0 w-full h-full bg-[#070D18] overflow-hidden">
        <video
          ref={videoRef}
          src="/videos/about-scroll.mp4"
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
      {/* HORIZONTAL PANORAMIC CHAPTERS (ABOUT SCENE) */}
      {/* ========================================================================= */}
      <div
        className="absolute top-0 left-0 h-full w-[300vw] flex items-center z-20 pointer-events-none select-none will-change-transform transition-transform duration-700 ease-out"
        style={{
          transform: `translate3d(-${horizontalTranslate}vw, 0, 0)`
        }}
      >
        
        {/* ----------------------------------------------------------------------- */}
        {/* CHAPTER 1 (0vw to 100vw): ENGINEERED FOR UTTARAKHAND */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#00D96B]/20 border border-[#00D96B]/40 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
              <Sparkles className="w-3.5 h-3.5 text-[#00D96B]" />
              <span className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                THE DOON RIDERS JOURNEY
              </span>
            </div>

            <h2 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl text-white tracking-tight uppercase leading-[1.08] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
              ENGINEERED FOR <br />
              <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                UTTARAKHAND’S HILLS
              </span>
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
              From Rajpur Road to the Mussoorie foothills, experience high-torque electric climbing power with ₹0 petrol expense.
            </p>

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={scrollToHero}
                className="pointer-events-auto text-xs uppercase tracking-widest text-gray-400 hover:text-white px-4 py-2 transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Back to Hero</span>
              </button>
              <button
                type="button"
                onClick={() => goToChapter(1)}
                className="pointer-events-auto inline-flex items-center gap-2 bg-[#00D96B]/20 hover:bg-[#00D96B]/30 border border-[#00D96B]/40 px-6 py-2.5 rounded-full text-xs uppercase tracking-widest text-[#00D96B] font-mono font-bold transition-all cursor-pointer transform hover:scale-105"
              >
                <span>Explore Hubs</span>
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* CHAPTER 2 (100vw to 200vw): 15+ BATTERY SWAP HUBS */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 sm:px-16 lg:px-24 shrink-0">
          <div className="bg-[#0A0F1D]/85 backdrop-blur-2xl border border-[#00D96B]/30 p-8 sm:p-11 rounded-[36px] max-w-2xl space-y-4 shadow-[0_20px_60px_rgba(0,217,107,0.15)] text-center sm:text-left pointer-events-auto mx-auto">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#00D96B] bg-[#00D96B]/15 border border-[#00D96B]/30 px-3.5 py-1 rounded-full flex items-center gap-1.5">
                <BatteryCharging className="w-3.5 h-3.5" />
                <span>15+ DEHRADUN HUBS</span>
              </span>
              <span className="font-heading font-black text-3xl text-white/30">02</span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black text-white font-heading tracking-tight leading-snug">
              Never Stop. Never Wait.
            </h3>

            <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed font-normal">
              Swap a drained battery for a 100% charged pack in under 2 minutes at Clock Tower, ISBT, Jakhan, Ballupur & Prem Nagar.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#00D96B]/15 border border-[#00D96B]/35 rounded-2xl p-3.5 text-center">
                <span className="text-xl font-black font-mono text-[#00D96B] block leading-none">&lt; 2 MINS</span>
                <span className="text-[10px] text-gray-300 font-bold uppercase mt-1 block">Swap Duration</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center">
                <span className="text-xl font-black font-mono text-white block leading-none">15+ HUBS</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 block">Across City</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={() => goToChapter(0)}
                className="text-xs uppercase tracking-widest text-gray-400 hover:text-white px-3 py-2 transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => goToChapter(2)}
                className="inline-flex items-center gap-2 bg-[#00D96B]/20 hover:bg-[#00D96B]/30 border border-[#00D96B]/40 px-5 py-2 rounded-full text-xs uppercase tracking-widest text-[#00D96B] font-mono font-bold transition-all cursor-pointer"
              >
                <span>View Roadside Support</span>
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </button>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* CHAPTER 3 (200vw to 300vw): 19x7 RSA & PEACE OF MIND */}
        {/* ----------------------------------------------------------------------- */}
        <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
          <div className="bg-[#0A0F1D]/85 backdrop-blur-2xl border border-white/20 p-8 sm:p-12 rounded-[36px] max-w-3xl mx-auto space-y-5 shadow-[0_25px_70px_rgba(0,0,0,0.85)] pointer-events-auto">
            <div className="inline-flex items-center gap-2 bg-[#00D96B]/20 border border-[#00D96B]/40 px-4 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00D96B]" />
              <span className="text-[#00D96B] font-extrabold text-[11px] sm:text-xs uppercase tracking-widest">
                19×7 RSA & FREE MAINTENANCE
              </span>
            </div>

            <h2 className="font-heading font-black text-2xl sm:text-4xl md:text-5xl text-white tracking-tight uppercase leading-tight">
              RIDE WITH 100% <br />
              <span className="text-[#00D96B]">PEACE OF MIND</span>
            </h2>

            <p className="text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed font-normal max-w-xl mx-auto">
              Every service, tyre check, and technical fault is covered by us. Anytime, any day — our 19×7 roadside assistance team is on call across Dehradun.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => goToChapter(1)}
                className="text-xs uppercase tracking-widest text-gray-400 hover:text-white px-4 py-2 transition-colors cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => (onOpenBooking ? onOpenBooking() : null)}
                className="bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_20px_rgba(0,217,107,0.4)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current stroke-current" />
                <span>BOOK A TEST DRIVE</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Bottom Chapter Indicator Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/15 pointer-events-auto">
        <button
          type="button"
          onClick={() => goToChapter(0)}
          aria-label="Chapter 1"
          className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeChapter === 0 ? 'w-8 bg-[#00D96B]' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
        />
        <button
          type="button"
          onClick={() => goToChapter(1)}
          aria-label="Chapter 2"
          className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeChapter === 1 ? 'w-8 bg-[#00D96B]' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
        />
        <button
          type="button"
          onClick={() => goToChapter(2)}
          aria-label="Chapter 3"
          className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeChapter === 2 ? 'w-8 bg-[#00D96B]' : 'w-2.5 bg-white/30 hover:bg-white/60'}`}
        />
        <span className="text-[11px] font-mono font-bold text-gray-300 ml-1.5 select-none">
          0{currentStep} / 03
        </span>
      </div>

    </section>
  );
};


