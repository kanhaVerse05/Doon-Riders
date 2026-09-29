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
  Infinity
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

  // Smooth lerp state
  const [heroSlideProgress, setHeroSlideProgress] = useState(0);
  const [aboutChapterProgress, setAboutChapterProgress] = useState(0);
  const [swapSlideProgress, setSwapSlideProgress] = useState(0);

  // Target times
  const heroTargetTimeRef = useRef(0);
  const aboutTargetTimeRef = useRef(0);
  const swapTargetTimeRef = useRef(0);

  // Refs for event handlers
  const sceneRef = useRef<0 | 1 | 2>(0);
  const heroSlideRef = useRef(0);
  const aboutChapterRef = useRef(0);
  const swapSlideRef = useRef(0);
  const lastWheelTimeRef = useRef(0);

  useEffect(() => {
    sceneRef.current = scene;
    if (scene === 0 && heroVideoRef.current) {
      heroVideoRef.current.muted = true;
      heroVideoRef.current.play().catch(() => {});
    } else if (scene === 1 && aboutVideoRef.current) {
      aboutVideoRef.current.muted = true;
      aboutVideoRef.current.play().catch(() => {});
    } else if (scene === 2 && swapVideoRef.current) {
      swapVideoRef.current.muted = true;
      swapVideoRef.current.play().catch(() => {});
    }
  }, [scene]);

  useEffect(() => {
    heroSlideRef.current = heroSlide;
    heroTargetTimeRef.current = (heroSlide / 2) * 5.0;
  }, [heroSlide]);

  useEffect(() => {
    aboutChapterRef.current = aboutChapter;
    aboutTargetTimeRef.current = (aboutChapter / 2) * 9.9;
  }, [aboutChapter]);

  useEffect(() => {
    swapSlideRef.current = swapSlide;
    if (swapVideoRef.current) {
      swapVideoRef.current.muted = true;
      const dur = swapVideoRef.current.duration || 6.0;
      const targetT = (swapSlide / 2) * Math.min(dur * 0.85, 8.0);
      swapTargetTimeRef.current = targetT;
      if (Math.abs(swapVideoRef.current.currentTime - targetT) > 1.2) {
        swapVideoRef.current.currentTime = targetT;
      }
      swapVideoRef.current.play().catch(() => {});
    }
  }, [swapSlide]);

  // Jump to specific slide/scene
  const changeHeroSlide = useCallback((s: number) => {
    if (s < 0 || s > 2) return;
    setHeroSlide(s);
  }, []);

  const changeAboutChapter = useCallback((c: number) => {
    if (c < 0 || c > 2) return;
    setAboutChapter(c);
  }, []);

  const changeSwapSlide = useCallback((s: number) => {
    if (s < 0 || s > 2) return;
    setSwapSlide(s);
  }, []);

  const goToHeroScene = useCallback(() => {
    setScene(0);
    setHeroSlide(2);
  }, []);

  const goToAboutScene = useCallback((from: 'hero' | 'swap' = 'hero') => {
    setScene(1);
    if (from === 'hero') {
      setAboutChapter(0);
    } else {
      setAboutChapter(2);
    }
  }, []);

  const goToSwapScene = useCallback(() => {
    setScene(2);
    setSwapSlide(0);
  }, []);

  // Sync Loop for video playback and smooth horizontal transform
  useEffect(() => {
    let animId: number;
    let smoothHero = 0;
    let smoothAbout = 0;
    let smoothSwap = 0;

    const loop = () => {
      // 1. Hero Slide Lerp
      const targetH = heroSlideRef.current;
      const diffH = targetH - smoothHero;
      if (Math.abs(diffH) > 0.001) {
        smoothHero += diffH * 0.14;
        setHeroSlideProgress(smoothHero);
      } else {
        smoothHero = targetH;
        setHeroSlideProgress(smoothHero);
      }

      // 2. About Chapter Lerp
      const targetA = aboutChapterRef.current;
      const diffA = targetA - smoothAbout;
      if (Math.abs(diffA) > 0.001) {
        smoothAbout += diffA * 0.14;
        setAboutChapterProgress(smoothAbout);
      } else {
        smoothAbout = targetA;
        setAboutChapterProgress(smoothAbout);
      }

      // 3. Swap Slide Lerp
      const targetS = swapSlideRef.current;
      const diffS = targetS - smoothSwap;
      if (Math.abs(diffS) > 0.001) {
        smoothSwap += diffS * 0.14;
        setSwapSlideProgress(smoothSwap);
      } else {
        smoothSwap = targetS;
        setSwapSlideProgress(smoothSwap);
      }

      // 4. Hero Video Scrubbing
      const heroVideo = heroVideoRef.current;
      if (heroVideo && heroVideo.duration && !isNaN(heroVideo.duration)) {
        const targetT = heroTargetTimeRef.current;
        const timeDiff = targetT - heroVideo.currentTime;
        if (timeDiff > 0.04 && timeDiff < 1.4) {
          heroVideo.playbackRate = Math.min(3.0, Math.max(0.6, timeDiff * 3.0));
          if (heroVideo.paused) heroVideo.play().catch(() => {});
        } else if (Math.abs(timeDiff) > 0.02) {
          if (!heroVideo.paused) heroVideo.pause();
          heroVideo.currentTime += timeDiff * 0.35;
        } else {
          if (!heroVideo.paused) heroVideo.pause();
        }
      }

      // 5. About Video Scrubbing
      const aboutVideo = aboutVideoRef.current;
      if (aboutVideo && aboutVideo.duration && !isNaN(aboutVideo.duration)) {
        const targetT = aboutTargetTimeRef.current;
        const timeDiff = targetT - aboutVideo.currentTime;
        if (timeDiff > 0.04 && timeDiff < 1.5) {
          aboutVideo.playbackRate = Math.min(3.0, Math.max(0.6, timeDiff * 3.0));
          if (aboutVideo.paused) aboutVideo.play().catch(() => {});
        } else if (Math.abs(timeDiff) > 0.02) {
          if (!aboutVideo.paused) aboutVideo.pause();
          aboutVideo.currentTime += timeDiff * 0.35;
        } else {
          if (!aboutVideo.paused) aboutVideo.pause();
        }
      }

      // 6. Swap Video Scrubbing & Playback
      const swapVideo = swapVideoRef.current;
      if (swapVideo && swapVideo.duration && !isNaN(swapVideo.duration)) {
        if (sceneRef.current === 2) {
          if (swapVideo.paused) {
            swapVideo.play().catch(() => {});
          }
        } else {
          if (!swapVideo.paused) {
            swapVideo.pause();
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    // Pre-warm initial frames so zero black frames appear
    if (heroVideoRef.current) {
      heroVideoRef.current.currentTime = 0.01;
      heroVideoRef.current.play().then(() => heroVideoRef.current?.pause()).catch(() => {});
    }
    if (aboutVideoRef.current) {
      aboutVideoRef.current.currentTime = 0.01;
      aboutVideoRef.current.play().then(() => aboutVideoRef.current?.pause()).catch(() => {});
    }
    if (swapVideoRef.current) {
      swapVideoRef.current.currentTime = 0.01;
      swapVideoRef.current.play().then(() => swapVideoRef.current?.pause()).catch(() => {});
    }

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // Global Wheel and Gesture Controller: 100% Intercepted to eliminate any erratic native scroll
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Always prevent native window scroll
      e.preventDefault();

      const now = Date.now();
      if (now - lastWheelTimeRef.current < 420) {
        return;
      }

      // Scrolling Down
      if (e.deltaY > 15) {
        lastWheelTimeRef.current = now;
        if (sceneRef.current === 0) {
          // In Hero Scene
          if (heroSlideRef.current === 0) {
            changeHeroSlide(1); // 1st Right Scroll -> Slide 2
          } else if (heroSlideRef.current === 1) {
            changeHeroSlide(2); // 2nd Right Scroll -> Slide 3
          } else if (heroSlideRef.current === 2) {
            goToAboutScene('hero'); // 3rd Scroll Down -> Enter About Scene!
          }
        } else if (sceneRef.current === 1) {
          // In About Scene
          if (aboutChapterRef.current === 0) {
            changeAboutChapter(1); // 1st Right Scroll -> Chapter 2
          } else if (aboutChapterRef.current === 1) {
            changeAboutChapter(2); // 2nd Right Scroll -> Chapter 3
          } else if (aboutChapterRef.current === 2) {
            goToSwapScene(); // 3rd Scroll Down -> Enter Battery Swap Scene!
          }
        } else if (sceneRef.current === 2) {
          // In Battery Swap Scene
          if (swapSlideRef.current === 0) {
            changeSwapSlide(1); // 1st Right Scroll -> Process Slide
          } else if (swapSlideRef.current === 1) {
            changeSwapSlide(2); // 2nd Right Scroll -> Locations Slide
          }
        }
      } 
      // Scrolling Up
      else if (e.deltaY < -15) {
        lastWheelTimeRef.current = now;
        if (sceneRef.current === 2) {
          // In Battery Swap Scene
          if (swapSlideRef.current === 2) {
            changeSwapSlide(1);
          } else if (swapSlideRef.current === 1) {
            changeSwapSlide(0);
          } else if (swapSlideRef.current === 0) {
            goToAboutScene('swap'); // Scroll Up returns to About Scene!
          }
        } else if (sceneRef.current === 1) {
          // In About Scene
          if (aboutChapterRef.current === 2) {
            changeAboutChapter(1);
          } else if (aboutChapterRef.current === 1) {
            changeAboutChapter(0);
          } else if (aboutChapterRef.current === 0) {
            goToHeroScene(); // Scroll Up returns to Hero Scene!
          }
        } else if (sceneRef.current === 0) {
          // In Hero Scene
          if (heroSlideRef.current === 2) {
            changeHeroSlide(1);
          } else if (heroSlideRef.current === 1) {
            changeHeroSlide(0);
          }
        }
      }
    };

    // Keyboard Arrow navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (sceneRef.current === 0) {
          if (heroSlideRef.current < 2) changeHeroSlide(heroSlideRef.current + 1);
          else goToAboutScene('hero');
        } else if (sceneRef.current === 1) {
          if (aboutChapterRef.current < 2) changeAboutChapter(aboutChapterRef.current + 1);
          else goToSwapScene();
        } else if (sceneRef.current === 2) {
          if (swapSlideRef.current < 2) changeSwapSlide(swapSlideRef.current + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (sceneRef.current === 2) {
          if (swapSlideRef.current > 0) changeSwapSlide(swapSlideRef.current - 1);
          else goToAboutScene('swap');
        } else if (sceneRef.current === 1) {
          if (aboutChapterRef.current > 0) changeAboutChapter(aboutChapterRef.current - 1);
          else goToHeroScene();
        } else if (sceneRef.current === 0) {
          if (heroSlideRef.current > 0) changeHeroSlide(heroSlideRef.current - 1);
        }
      }
    };

    // Mobile touch gestures
    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const diffX = touchStartX - e.changedTouches[0].clientX;
      const diffY = touchStartY - e.changedTouches[0].clientY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0) {
          // Swipe Left -> Next
          if (sceneRef.current === 0) {
            if (heroSlideRef.current < 2) changeHeroSlide(heroSlideRef.current + 1);
            else goToAboutScene('hero');
          } else if (sceneRef.current === 1) {
            if (aboutChapterRef.current < 2) changeAboutChapter(aboutChapterRef.current + 1);
            else goToSwapScene();
          } else if (sceneRef.current === 2) {
            if (swapSlideRef.current < 2) changeSwapSlide(swapSlideRef.current + 1);
          }
        } else {
          // Swipe Right -> Previous
          if (sceneRef.current === 2) {
            if (swapSlideRef.current > 0) changeSwapSlide(swapSlideRef.current - 1);
            else goToAboutScene('swap');
          } else if (sceneRef.current === 1) {
            if (aboutChapterRef.current > 0) changeAboutChapter(aboutChapterRef.current - 1);
            else goToHeroScene();
          } else {
            if (heroSlideRef.current > 0) changeHeroSlide(heroSlideRef.current - 1);
          }
        }
      } else if (Math.abs(diffY) > 50) {
        if (diffY > 0) {
          // Swipe Up -> Next scene
          if (sceneRef.current === 0) goToAboutScene('hero');
          else if (sceneRef.current === 1) goToSwapScene();
        } else {
          // Swipe Down -> Previous scene
          if (sceneRef.current === 2) goToAboutScene('swap');
          else if (sceneRef.current === 1) goToHeroScene();
        }
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
  }, [changeHeroSlide, changeAboutChapter, changeSwapSlide, goToAboutScene, goToHeroScene, goToSwapScene]);

  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#070D18] text-white font-sans select-none antialiased">
      {/* Floating Global Navbar */}
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* ========================================================================= */}
      {/* MASTER VERTICAL SCENE CURTAIN (0vh, -100vh, -200vh) */}
      {/* ========================================================================= */}
      <div
        className="w-full h-full flex flex-col will-change-transform transition-transform duration-700 ease-in-out"
        style={{
          transform: `translate3d(0, -${scene * 100}vh, 0)`
        }}
      >
        
        {/* ======================================================================= */}
        {/* SCENE 1: HERO SCENE (scooter-ride.mp4, 0s - 5s) */}
        {/* ======================================================================= */}
        <section className="relative w-full h-screen shrink-0 overflow-hidden bg-[#070D18]">
          {/* Fullscreen Video Canvas */}
          <div className="absolute inset-0 w-full h-full bg-[#070D18] overflow-hidden">
            <video
              ref={heroVideoRef}
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

          {/* 300vw Horizontal Track for Hero */}
          <div
            className="absolute top-0 left-0 h-full w-[300vw] flex items-center z-20 pointer-events-none will-change-transform transition-transform duration-700 ease-out"
            style={{
              transform: `translate3d(-${heroSlideProgress * 100}vw, 0, 0)`
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

                <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
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
                className="mt-5 bg-[#00D96B] hover:bg-[#00c25e] text-[#070D18] font-black text-xs sm:text-sm tracking-wider uppercase px-8 py-4 rounded-full shadow-[0_6px_25px_rgba(0,217,107,0.45)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 pointer-events-auto"
              >
                <Zap className="w-4 h-4 fill-current stroke-current" />
                <span>Contact Us</span>
              </button>
            </div>

            {/* SLIDE 2 (100vw to 200vw): BEST EV RENTAL SCOOTY IN DEHRADUN, UTTARAKHAND */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                  <Star className="w-3.5 h-3.5 text-[#00D96B]" />
                  <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                    100% SMART SILENT MOBILITY
                  </h2>
                </div>

                <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                  BEST EV RENTAL SCOOTY <br />
                  <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                    IN DEHRADUN, UTTARAKHAND
                  </span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                  No Driving License Required • 5-Minute KYC • ₹0 Petrol Expense & Instant 2-Min Battery Swapping.
                </p>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="bg-[#0A0F1D]/60 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-[#00D96B] block leading-none">₹0</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Petrol Expense</span>
                  </div>
                  <div className="bg-[#0A0F1D]/60 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-white block leading-none">5 MIN</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">KYC</span>
                  </div>
                  <div className="bg-[#0A0F1D]/60 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-[#38BDF8] block leading-none">100%</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Eco Friendly</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SLIDE 3 (200vw to 300vw): 2ND RIGHT SCROLL */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                  <BatteryCharging className="w-3.5 h-3.5 text-[#00D96B]" />
                  <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                    5+ SWAP STATIONS IN DEHRADUN
                  </h2>
                </div>

                <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
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
        {/* SCENE 2: ABOUT VIDEO SECTION (about-scroll.mp4, 0s - 10s) */}
        {/* ======================================================================= */}
        <section className="relative w-full h-screen shrink-0 overflow-hidden bg-[#070D18]">
          {/* Fullscreen Video Canvas for About Section */}
          <div className="absolute inset-0 w-full h-full bg-[#070D18] overflow-hidden">
            <video
              ref={aboutVideoRef}
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

          {/* 300vw Horizontal Track for About */}
          <div
            className="absolute top-0 left-0 h-full w-[300vw] flex items-center z-20 pointer-events-none will-change-transform transition-transform duration-700 ease-out"
            style={{
              transform: `translate3d(-${aboutChapterProgress * 100}vw, 0, 0)`
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

                <h2 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl text-white tracking-tight uppercase leading-[1.08] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
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
            <div className="w-[100vw] h-full flex flex-col justify-center items-end px-6 sm:px-10 lg:px-16 text-right shrink-0">
              <div className="space-y-4 w-full max-w-[720px]">
                <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                  <BatteryCharging className="w-3.5 h-3.5 text-[#00D96B]" />
                  <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                    THE DOON RIDERS ADVANTAGE
                  </h2>
                </div>
                
                <h2 className="font-heading font-black text-3xl sm:text-5xl md:text-6xl lg:text-[50px] text-white tracking-tight uppercase leading-[1.05] text-left drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                  Why Choose {" "}
                   <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                    DOON RIDERS?
                  </span>
                </h2>

                <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl ml-auto drop-shadow-md">
                  Everything you need to ride, earn, and save with maximum uptime, zero fuel expenses, and dedicated roadside support across Uttarakhand.
                </p>

                <div className="grid grid-cols-3 gap-3 pt-3">
                  {/* CARD 01 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left">
                    <span className="text-[10px] font-black text-[#00D96B]">01</span>
                    <h3 className="text-sm font-black text-white uppercase mt-2">No License Required</h3>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Ride and earn without a driving license hassle.</p>
                  </div>

                  {/* CARD 02 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left">
                    <span className="text-[10px] font-black text-[#00D96B]">02</span>
                    <h3 className="text-sm font-black text-white uppercase mt-2">Free Maintenance</h3>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Service and brake checks are covered by us.</p>
                  </div>

                  {/* CARD 03 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left">
                    <span className="text-[10px] font-black text-[#00D96B]">03</span>
                    <h3 className="text-sm font-black text-white uppercase mt-2">Swap, Don't Wait</h3>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Don't need to wait, instant battery swaps.</p>
                  </div>

                  {/* CARD 04 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left">
                    <span className="text-[10px] font-black text-[#00D96B]">04</span>
                    <h3 className="text-sm font-black text-white uppercase mt-2">24×7 Support</h3>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Our support team is always available.</p>
                  </div>

                  {/* CARD 05 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left">
                    <span className="text-[10px] font-black text-[#00D96B]">05</span>
                    <h3 className="text-sm font-black text-white uppercase mt-2">19×7 RSA</h3>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Roadside assistance whenever you need help.</p>
                  </div>

                  {/* CARD 06 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-left">
                    <span className="text-[10px] font-black text-[#00D96B]">06</span>
                    <h3 className="text-sm font-black text-white uppercase mt-2">Unlimited KM</h3>
                    <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">Drive unlimited kilometers with zero range anxiety.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CHAPTER 3 (200vw to 300vw): ALL-INCLUSIVE RENTAL PLAN */}
            <div className="w-[100vw] h-full shrink-0 relative flex items-center justify-center px-6 lg:px-10 overflow-hidden">
              <div className="relative w-full max-w-[1550px] h-full flex items-center justify-center">

                {/* CENTER PRICE HUD */}
                <div className="relative z-20 flex items-center justify-center">
                  <div className="absolute w-[390px] h-[390px] rounded-full bg-[#00D96B]/15 blur-[90px]" />
                  <div className="absolute w-[380px] h-[380px] rounded-full border border-[#00D96B]/30" />
                  <div className="relative w-[330px] h-[330px] sm:w-[350px] sm:h-[350px] rounded-full bg-[#06111B]/80 backdrop-blur-xl border-[3px] border-[#00D96B] shadow-[0_0_50px_rgba(0,217,107,0.35)] flex flex-col items-center justify-center">
                    <div className="absolute inset-[12px] rounded-full border border-[#00D96B]/40" />
                    <div className="absolute -inset-[7px] rounded-full border-[5px] border-transparent border-t-[#00D96B] border-r-[#00D96B]/70 rotate-[25deg]" />
                    <div className="relative z-10 border border-[#00D96B] bg-[#00D96B]/10 px-4 py-1.5 rounded-full">
                      <span className="text-[#00D96B] text-[10px] sm:text-xs font-black tracking-[0.08em] uppercase">
                        ALL-INCLUSIVE PLAN
                      </span>
                    </div>
                    <div className="relative z-10 mt-4 flex items-baseline justify-center tracking-tight">
                      <span className="text-5xl sm:text-6xl md:text-7xl font-black text-[#00D96B]">₹</span>
                      <span className="text-5xl sm:text-6xl md:text-7xl font-black text-white">1,699</span>
                    </div>
                    <div className="relative z-10 text-xl sm:text-2xl font-black text-white tracking-[0.05em] uppercase">
                      / WEEK
                    </div>
                  </div>
                </div>

                {/* CONNECTOR LINES */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox="0 0 1550 900"
                  preserveAspectRatio="none"
                >
                  <path d="M 390 270 C 500 270, 525 270, 650 350" fill="none" stroke="#00D96B" strokeWidth="2" strokeOpacity="0.8" />
                  <path d="M 390 450 C 500 450, 540 450, 620 450" fill="none" stroke="#00D96B" strokeWidth="2" strokeOpacity="0.8" />
                  <path d="M 390 630 C 500 630, 525 630, 650 550" fill="none" stroke="#00D96B" strokeWidth="2" strokeOpacity="0.8" />
                  <path d="M 1160 270 C 1050 270, 1025 270, 900 350" fill="none" stroke="#00D96B" strokeWidth="2" strokeOpacity="0.8" />
                  <path d="M 1160 450 C 1050 450, 1010 450, 930 450" fill="none" stroke="#00D96B" strokeWidth="2" strokeOpacity="0.8" />
                  <path d="M 1160 630 C 1050 630, 1025 630, 900 550" fill="none" stroke="#00D96B" strokeWidth="2" strokeOpacity="0.8" />
                  <circle cx="390" cy="270" r="5" fill="#00D96B" />
                  <circle cx="390" cy="450" r="5" fill="#00D96B" />
                  <circle cx="390" cy="630" r="5" fill="#00D96B" />
                  <circle cx="1160" cy="270" r="5" fill="#00D96B" />
                  <circle cx="1160" cy="450" r="5" fill="#00D96B" />
                  <circle cx="1160" cy="630" r="5" fill="#00D96B" />
                </svg>

                {/* LEFT FEATURES */}
                <div className="absolute left-0 lg:left-2 xl:left-4 top-1/2 -translate-y-1/2 w-[31%] max-w-[450px] space-y-5 z-20">
                  <div className="relative h-[108px] rounded-[24px] border border-[#00D96B]/50 bg-[#07131D]/70 backdrop-blur-xl shadow-[0_0_25px_rgba(0,217,107,0.08)] flex items-center px-4 gap-4">
                    <span className="absolute -left-5 top-1/2 -translate-y-1/2 text-[#00D96B] text-sm font-black">01</span>
                    <div className="w-[64px] h-[64px] shrink-0 rounded-full border-2 border-[#00D96B] bg-[#00D96B]/10 flex items-center justify-center shadow-[0_0_25px_rgba(0,217,107,0.25)]">
                      <FileCheck className="w-8 h-8 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase">No License Required</h3>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">Ride and earn without a driving license or RC transfer hassle.</p>
                    </div>
                  </div>

                  <div className="relative h-[108px] rounded-[24px] border border-[#00D96B]/50 bg-[#07131D]/70 backdrop-blur-xl shadow-[0_0_25px_rgba(0,217,107,0.08)] flex items-center px-4 gap-4">
                    <span className="absolute -left-5 top-1/2 -translate-y-1/2 text-[#00D96B] text-sm font-black">02</span>
                    <div className="w-[64px] h-[64px] shrink-0 rounded-full border-2 border-[#00D96B] bg-[#00D96B]/10 flex items-center justify-center shadow-[0_0_25px_rgba(0,217,107,0.25)]">
                      <BatteryCharging className="w-8 h-8 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase">Swap, Don't Wait</h3>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">Swap battery in under 2 minutes at 5+ Dehradun hubs.</p>
                    </div>
                  </div>

                  <div className="relative h-[108px] rounded-[24px] border border-[#00D96B]/50 bg-[#07131D]/70 backdrop-blur-xl shadow-[0_0_25px_rgba(0,217,107,0.08)] flex items-center px-4 gap-4">
                    <span className="absolute -left-5 top-1/2 -translate-y-1/2 text-[#00D96B] text-sm font-black">03</span>
                    <div className="w-[64px] h-[64px] shrink-0 rounded-full border-2 border-[#00D96B] bg-[#00D96B]/10 flex items-center justify-center shadow-[0_0_25px_rgba(0,217,107,0.25)]">
                      <Headphones className="w-8 h-8 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase">24×7 Customer Support</h3>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">Our dedicated support team is always available for you.</p>
                    </div>
                  </div>
                </div>

                {/* RIGHT FEATURES */}
                <div className="absolute right-0 lg:right-2 xl:right-4 top-1/2 -translate-y-1/2 w-[31%] max-w-[450px] space-y-5 z-20">
                  <div className="relative h-[108px] rounded-[24px] border border-[#00D96B]/50 bg-[#07131D]/70 backdrop-blur-xl shadow-[0_0_25px_rgba(0,217,107,0.08)] flex items-center px-4 gap-4">
                    <div className="w-[64px] h-[64px] shrink-0 rounded-full border-2 border-[#00D96B] bg-[#00D96B]/10 flex items-center justify-center shadow-[0_0_25px_rgba(0,217,107,0.25)]">
                      <Wrench className="w-8 h-8 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase">Free Maintenance</h3>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">Every service and brake check is covered by us.</p>
                    </div>
                    <span className="absolute -right-5 top-1/2 -translate-y-1/2 text-[#00D96B] text-sm font-black">04</span>
                  </div>

                  <div className="relative h-[108px] rounded-[24px] border border-[#00D96B]/50 bg-[#07131D]/70 backdrop-blur-xl shadow-[0_0_25px_rgba(0,217,107,0.08)] flex items-center px-4 gap-4">
                    <div className="w-[64px] h-[64px] shrink-0 rounded-full border-2 border-[#00D96B] bg-[#00D96B]/10 flex items-center justify-center shadow-[0_0_25px_rgba(0,217,107,0.25)]">
                      <ShieldCheck className="w-8 h-8 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase">19×7 RSA</h3>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">Roadside assistance whenever technical help is needed.</p>
                    </div>
                    <span className="absolute -right-5 top-1/2 -translate-y-1/2 text-[#00D96B] text-sm font-black">05</span>
                  </div>

                  <div className="relative h-[108px] rounded-[24px] border border-[#00D96B]/50 bg-[#07131D]/70 backdrop-blur-xl shadow-[0_0_25px_rgba(0,217,107,0.08)] flex items-center px-4 gap-4">
                    <div className="w-[64px] h-[64px] shrink-0 rounded-full border-2 border-[#00D96B] bg-[#00D96B]/10 flex items-center justify-center shadow-[0_0_25px_rgba(0,217,107,0.25)]">
                      <Infinity className="w-8 h-8 text-[#00D96B]" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-white uppercase">Unlimited Daily KM</h3>
                      <p className="text-xs text-gray-300 mt-2 leading-relaxed">Ride without any daily distance or mileage limits.</p>
                    </div>
                    <span className="absolute -right-5 top-1/2 -translate-y-1/2 text-[#00D96B] text-sm font-black">06</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>


        {/* ======================================================================= */}
        {/* SCENE 3: OUR BATTERY SWAP SYSTEM SECTION (battery-swap.mp4, 0926.mp4) */}
        {/* ======================================================================= */}
        <section className="relative w-full h-screen shrink-0 overflow-hidden bg-[#070D18]">
          {/* Fullscreen Video Canvas for Battery Swap Section */}
          <div className="absolute inset-0 w-full h-full bg-[#070D18] overflow-hidden">
            <video
              ref={swapVideoRef}
              autoPlay
              playsInline
              muted
              loop
              preload="auto"
              className="absolute inset-0 w-full h-full !w-full !h-full !max-w-none !max-h-none object-cover"
            >
              <source src="/videos/battery-swap.mp4" type="video/mp4" />
              <source src="/videos/0926.mp4" type="video/mp4" />
            </video>
            {/* Cinematic Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070D18]/90 via-black/20 to-[#070D18]/60 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070D18]/50 via-transparent to-[#070D18]/60 pointer-events-none" />
          </div>

          {/* 300vw Horizontal Track for Battery Swap */}
          <div
            className="absolute top-0 left-0 h-full w-[300vw] flex items-center z-20 pointer-events-none will-change-transform transition-transform duration-700 ease-out"
            style={{
              transform: `translate3d(-${swapSlideProgress * 100}vw, 0, 0)`
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

                <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-7xl lg:text-[76px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                  OUR BATTERY <br />
                  <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                    SWAP SYSTEM
                  </span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                  Zero charging downtime. Swap drained batteries in under 2 minutes for 100% charged smart lithium packs across Dehradun.
                </p>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <div className="bg-[#0A0F1D]/60 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-[#00D96B] block leading-none">&lt; 2 MINS</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Instant Swap</span>
                  </div>
                  <div className="bg-[#0A0F1D]/60 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-white block leading-none">100%</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Smart Li-Ion</span>
                  </div>
                  <div className="bg-[#0A0F1D]/60 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-2.5 shadow-lg">
                    <span className="text-base sm:text-lg font-black font-mono text-[#38BDF8] block leading-none">₹0</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-300 uppercase font-bold mt-0.5 block">Fuel Cost</span>
                  </div>
                </div>
              </div>

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

            {/* SLIDE 2 (100vw to 200vw): PROCESS (HOW IT WORKS) */}
            <div className="w-[100vw] h-full flex flex-col justify-center items-center px-6 text-center shrink-0">
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-[#0A0F1D]/80 border border-white/20 px-5 py-2 rounded-full backdrop-blur-md shadow-2xl">
                  <Sparkles className="w-3.5 h-3.5 text-[#00D96B]" />
                  <h2 className="text-[#00D96B] font-extrabold text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
                    3-STEP EFFORTLESS PROCESS
                  </h2>
                </div>

                <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-6xl lg:text-[70px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                  HOW IT WORKS <br />
                  <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                    2-MINUTE SWAP PROCESS
                  </span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                  Quick, automated, and seamless. Never wait hours for charging again.
                </p>

                {/* 3 Step Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 max-w-4xl mx-auto w-full">
                  {/* STEP 01 */}
                  <div className="bg-white/[0.07] backdrop-blur-xl border border-white/15 rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black font-mono text-[#00D96B] bg-[#00D96B]/15 px-2.5 py-1 rounded-full border border-[#00D96B]/30">STEP 01</span>
                      <Navigation className="w-4 h-4 text-[#00D96B]" />
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-wide">
                      Arrive at Station
                    </h3>
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      Pull up at any nearby DOON Riders swap station across Dehradun.
                    </p>
                  </div>

                  {/* STEP 02 */}
                  <div className="bg-white/[0.07] backdrop-blur-xl border border-[#00D96B]/40 rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] shadow-[0_0_30px_rgba(0,217,107,0.15)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black font-mono text-[#00D96B] bg-[#00D96B]/20 px-2.5 py-1 rounded-full border border-[#00D96B]/50">STEP 02</span>
                      <RefreshCw className="w-4 h-4 text-[#00D96B]" />
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-wide">
                      Swap in 90 Sec
                    </h3>
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      Insert your drained pack into the dock and release a 100% charged battery.
                    </p>
                  </div>

                  {/* STEP 03 */}
                  <div className="bg-white/[0.07] backdrop-blur-xl border border-white/15 rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black font-mono text-[#00D96B] bg-[#00D96B]/15 px-2.5 py-1 rounded-full border border-[#00D96B]/30">STEP 03</span>
                      <Zap className="w-4 h-4 text-[#00D96B]" />
                    </div>
                    <h3 className="text-base font-black text-white uppercase tracking-wide">
                      Lock & Ride
                    </h3>
                    <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                      Snap the fresh battery in, turn on the ignition, and resume your ride instantly!
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

                <h1 className="font-heading font-black text-3xl sm:text-5xl md:text-6xl lg:text-[70px] text-white tracking-tight uppercase leading-[1.05] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                  BATTERY STATION <br />
                  <span className="bg-gradient-to-r from-[#00D96B] via-[#75FFAE] to-[#38BDF8] bg-clip-text text-transparent">
                    LOCATIONS
                  </span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-gray-200 font-normal leading-relaxed max-w-2xl mx-auto drop-shadow-md">
                  Strategically located across Dehradun’s busiest hubs for fast & seamless battery swapping on the go.
                </p>

                {/* Location Grid Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 max-w-5xl mx-auto w-full">
                  {/* HUB 1 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-center hover:border-[#00D96B]/50 transition-all">
                    <MapPin className="w-5 h-5 text-[#00D96B] mx-auto mb-2" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Canal Road</h4>
                    <p className="text-[10px] text-gray-300 mt-1">Kishanpur corridor</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-2">Active 19x7</span>
                  </div>

                  {/* HUB 2 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-center hover:border-[#00D96B]/50 transition-all">
                    <MapPin className="w-5 h-5 text-[#00D96B] mx-auto mb-2" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Sewla Kalan</h4>
                    <p className="text-[10px] text-gray-300 mt-1">Saharanpur Road</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-2">Active 19x7</span>
                  </div>

                  {/* HUB 3 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-center hover:border-[#00D96B]/50 transition-all">
                    <MapPin className="w-5 h-5 text-[#00D96B] mx-auto mb-2" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Balliwala</h4>
                    <p className="text-[10px] text-gray-300 mt-1">GMS Road Junction</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-2">Active 19x7</span>
                  </div>

                  {/* HUB 4 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-center hover:border-[#00D96B]/50 transition-all">
                    <MapPin className="w-5 h-5 text-[#00D96B] mx-auto mb-2" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Premnagar</h4>
                    <p className="text-[10px] text-gray-300 mt-1">University Zone</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-2">Active 19x7</span>
                  </div>

                  {/* HUB 5 */}
                  <div className="bg-white/[0.06] backdrop-blur-xl border border-white/15 rounded-2xl p-4 text-center hover:border-[#00D96B]/50 transition-all col-span-2 sm:col-span-1">
                    <MapPin className="w-5 h-5 text-[#00D96B] mx-auto mb-2" />
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase">Ajabpur Kalan</h4>
                    <p className="text-[10px] text-gray-300 mt-1">Bypass Connectivity</p>
                    <span className="inline-block text-[9px] font-mono font-bold text-[#00D96B] bg-[#00D96B]/15 px-2 py-0.5 rounded-full mt-2">Active 19x7</span>
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

      {/* Booking Test Drive Modal */}
      <BookTestDriveModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </main>
  );
}
