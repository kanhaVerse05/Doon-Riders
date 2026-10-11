'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const success = await login(email, password);
      if (success) {
        const saved = localStorage.getItem('dr_admin_user');
        const parsed = saved ? JSON.parse(saved) : null;
        const isTech = parsed?.roleName === 'TECHNICIAN' || parsed?.roleName?.includes('TECH');
        const isHub = parsed?.roleName === 'HUB_INCHARGE' || parsed?.roleName?.includes('HUB');

        if (isTech) {
          localStorage.removeItem('dr_admin_token');
          localStorage.removeItem('dr_admin_user');
          setError('Technicians must log in through the Technician App (/technician/login).');
          setLoading(false);
          return;
        }

        if (isHub) {
          localStorage.removeItem('dr_admin_token');
          localStorage.removeItem('dr_admin_user');
          setError('Hub Incharges must log in through the Hub Portal (/hub/login).');
          setLoading(false);
          return;
        }

        router.push('/admin/dashboard');
      } else {
        setError('Invalid credentials. Please check your email and password.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#EBF7F0] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none selection:bg-[#00D96B] selection:text-black">
      {/* =========================================================================
          BACKGROUND 3D SCENE & AMBIENT MINT GLOWS
          ========================================================================= */}
      {/* Background Soft Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F5FAF7] via-[#E8F6EE] to-[#DCF2E6] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-[#00D96B]/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[580px] h-[580px] bg-[#00D96B]/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Left: 3D Torus / Ring & Diffuse Sphere */}
      <div className="absolute top-10 left-8 sm:top-16 sm:left-20 w-36 h-36 rounded-full bg-[#00D96B]/25 blur-3xl pointer-events-none" />
      <div className="absolute top-8 left-6 sm:top-14 sm:left-16 pointer-events-none opacity-75 rotate-[-22deg]">
        <svg width="140" height="140" viewBox="0 0 160 160" fill="none">
          <circle
            cx="80"
            cy="80"
            r="52"
            stroke="url(#topRingGrad)"
            strokeWidth="16"
            strokeDasharray="210 110"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="topRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00D96B" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#34D399" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Right: Floating 3D Isometric Cube */}
      <div className="absolute top-10 right-8 sm:top-14 sm:right-28 pointer-events-none opacity-85 rotate-[16deg] drop-shadow-[0_20px_25px_rgba(0,180,90,0.18)]">
        <svg width="96" height="106" viewBox="0 0 100 110" fill="none">
          {/* Top Face */}
          <path d="M 50 8 L 88 30 L 50 52 L 12 30 Z" fill="url(#cubeTopFace)" />
          {/* Left Face */}
          <path d="M 12 30 L 50 52 L 50 96 L 12 74 Z" fill="url(#cubeLeftFace)" />
          {/* Right Face */}
          <path d="M 50 52 L 88 30 L 88 74 L 50 96 Z" fill="url(#cubeRightFace)" />
          <defs>
            <linearGradient id="cubeTopFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C6F6D5" />
              <stop offset="100%" stopColor="#68D391" />
            </linearGradient>
            <linearGradient id="cubeLeftFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38A169" />
              <stop offset="100%" stopColor="#22543D" />
            </linearGradient>
            <linearGradient id="cubeRightFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2F855A" />
              <stop offset="100%" stopColor="#1C4532" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom Left: Large Soft-Focus Gradient Sphere */}
      <div className="absolute -bottom-8 -left-8 sm:bottom-6 sm:left-12 w-64 h-64 rounded-full bg-gradient-to-tr from-[#00D96B]/35 via-[#48BB78]/25 to-[#81E6D9]/20 blur-[54px] pointer-events-none" />

      {/* Bottom Right: Floating 3D Tetrahedron / Prism */}
      <div className="absolute bottom-12 right-6 sm:bottom-16 sm:right-24 pointer-events-none opacity-85 rotate-[-28deg] drop-shadow-[0_25px_30px_rgba(0,180,90,0.2)]">
        <svg width="105" height="105" viewBox="0 0 110 110" fill="none">
          {/* Front Slanted Face */}
          <path d="M 55 10 L 98 86 L 20 74 Z" fill="url(#tetraFrontFace)" />
          {/* Shaded Base Edge Face */}
          <path d="M 20 74 L 98 86 L 66 102 Z" fill="url(#tetraBottomFace)" />
          <defs>
            <linearGradient id="tetraFrontFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#68D391" />
              <stop offset="60%" stopColor="#00D96B" />
              <stop offset="100%" stopColor="#00A854" />
            </linearGradient>
            <linearGradient id="tetraBottomFace" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#008F46" />
              <stop offset="100%" stopColor="#004D24" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* =========================================================================
          STACKED GLASSMORPHIC CARDS CONTAINER
          ========================================================================= */}
      <div className="relative w-full max-w-[430px] sm:max-w-[440px] z-10">
        {/* Layer 3: Deepest Translucent Glass Sheet (Offset Left & Tilted) */}
        <div
          aria-hidden="true"
          className="absolute -left-6 sm:-left-8 -top-3.5 -bottom-3.5 w-full rounded-[44px] bg-white/30 backdrop-blur-md border border-white/60 shadow-[0_20px_50px_rgba(0,180,90,0.06)] -rotate-[3.6deg] pointer-events-none transition-transform"
        />

        {/* Layer 2: Middle Translucent Glass Sheet (Slight Offset & Tilted) */}
        <div
          aria-hidden="true"
          className="absolute -left-3 sm:-left-4 -top-1.5 -bottom-1.5 w-full rounded-[42px] bg-white/50 backdrop-blur-md border border-white/75 shadow-[0_22px_60px_rgba(0,180,90,0.09)] -rotate-[1.8deg] pointer-events-none transition-transform"
        />

        {/* Layer 1: Foreground Main Card */}
        <div className="relative bg-white rounded-[38px] sm:rounded-[40px] px-8 sm:px-9 pt-9 pb-10 shadow-[0_30px_90px_rgba(0,180,90,0.16),0_15px_35px_rgba(15,23,42,0.04)] border border-white/95 overflow-hidden">
          
          {/* =====================================================================
              DECORATIVE GREEN CURVED WAVES (CLIPPED INSIDE CARD)
              ===================================================================== */}
          {/* Top-Right Curved Green Swoop */}
          <div className="absolute top-0 right-0 w-[165px] h-[105px] pointer-events-none overflow-hidden">
            <svg
              viewBox="0 0 165 105"
              fill="none"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                d="M 0 0 C 42 40, 92 78, 165 65 L 165 0 Z"
                fill="url(#topCardSwoop)"
              />
              <defs>
                <linearGradient id="topCardSwoop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00E676" />
                  <stop offset="45%" stopColor="#00D96B" />
                  <stop offset="100%" stopColor="#00A854" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Bottom-Left Curved Green Swoop */}
          <div className="absolute bottom-0 left-0 w-[165px] h-[105px] pointer-events-none overflow-hidden">
            <svg
              viewBox="0 0 165 105"
              fill="none"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                d="M 0 40 C 73 28, 123 65, 165 105 L 0 105 Z"
                fill="url(#bottomCardSwoop)"
              />
              <defs>
                <linearGradient id="bottomCardSwoop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#008F46" />
                  <stop offset="55%" stopColor="#00D96B" />
                  <stop offset="100%" stopColor="#00E676" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* =====================================================================
              CARD HEADER: DOON RIDERS BRANDING & ADMIN LOGIN
              ===================================================================== */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative w-11 h-9 flex items-center justify-center flex-shrink-0">
              <Image
                src="/images/doon-riders-logo.png"
                alt="DOON RIDERS"
                width={44}
                height={34}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[15px] font-black tracking-wider uppercase text-[#0F172A] leading-tight">
                DOON <span className="text-[#00D96B]">RIDERS</span>
              </h2>
              <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#94A3B8] uppercase mt-0.5">
                ADMIN LOGIN
              </span>
            </div>
          </div>

          {/* =====================================================================
              CARD HEADING: WELCOME BACK!
              ===================================================================== */}
          <div className="relative z-10 mt-8 sm:mt-9">
            <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-[#0F172A] leading-tight">
              Welcome <span className="text-[#00D96B]">Back!</span>
            </h1>
            <p className="text-[13px] sm:text-[13.5px] font-medium text-[#94A3B8] mt-1.5">
              Login to your Doon Riders Admin Portal
            </p>
          </div>

          {/* Error Message Toast/Alert */}
          {error && (
            <div className="relative z-10 mt-4 bg-red-50/90 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm">
              {error}
            </div>
          )}

          {/* =====================================================================
              LOGIN FORM
              ===================================================================== */}
          <form onSubmit={handleSubmit} className="relative z-10 mt-6 sm:mt-7 space-y-4 sm:space-y-4.5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-[12px] sm:text-[12.5px] font-medium text-[#94A3B8]">
                Email or Username
              </label>
              <div className="relative flex items-center">
                <Mail className="w-[18px] h-[18px] text-[#94A3B8] absolute left-4 pointer-events-none stroke-[1.75]" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="MasterCreations@gmail.com"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] pl-11 pr-4 py-3.5 text-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D96B] focus:bg-white focus:ring-2 focus:ring-[#00D96B]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-[12px] sm:text-[12.5px] font-medium text-[#94A3B8]">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-[18px] h-[18px] text-[#94A3B8] absolute left-4 pointer-events-none stroke-[1.75]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••••"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] pl-11 pr-12 py-3.5 text-[14px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D96B] focus:bg-white focus:ring-2 focus:ring-[#00D96B]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-[#94A3B8] hover:text-[#0F172A] transition-colors cursor-pointer p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <Eye className="w-[18px] h-[18px] stroke-[1.75]" />
                  ) : (
                    <EyeOff className="w-[18px] h-[18px] stroke-[1.75]" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button with Centered Label and Right Circular Arrow */}
            <div className="pt-2 sm:pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] sm:h-[54px] rounded-full bg-gradient-to-r from-[#00D96B] via-[#00CC64] to-[#00B859] hover:brightness-105 active:scale-[0.99] text-white font-extrabold text-[15px] sm:text-[16px] shadow-[0_12px_28px_rgba(0,217,107,0.42)] transition-all relative flex items-center justify-center cursor-pointer disabled:opacity-70 group"
              >
                <span className="font-bold tracking-wide">
                  {loading ? 'Logging in...' : 'Login'}
                </span>
                <div className="absolute right-2 w-[38px] h-[38px] rounded-full bg-[#008F46] flex items-center justify-center text-white shadow-inner transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="w-[18px] h-[18px] stroke-[2.5]" />
                </div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
