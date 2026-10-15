'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminLoginPage() {
  const { login, verifyMfaLogin, startInitialMfaSetup, confirmInitialMfaSetup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaSetupStep, setMfaSetupStep] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupInfo, setSetupInfo] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaCode, setMfaCode] = useState('');
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('session_expired') === '1' || searchParams.get('session_expired') === 'true') {
        setSessionNotice('Your session has expired. Please enter your credentials to log in again.');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (setupComplete) return;

      let success = false;
      let loginMessage = '';
      if (mfaSetupStep) {
        const result = await confirmInitialMfaSetup(mfaCode);
        if (result.success) {
          setBackupCodes(result.backupCodes || []);
          setMfaSetupStep(false);
          setSetupComplete(true);
          setMfaCode('');
          return;
        }
        loginMessage = result.message || 'Authenticator setup failed.';
      } else if (mfaStep) {
        const result = await verifyMfaLogin(mfaCode);
        success = result.success;
        loginMessage = result.message || '';
      } else {
        const result = await login(email, password);
        if (result.mfaSetupRequired) {
          setMfaSetupStep(true);
          setPassword('');
          const setup = await startInitialMfaSetup();
          if (!setup.success || !setup.secret || !setup.otpauthUrl) {
            setError(setup.message || 'Could not start authenticator setup. Please sign in again.');
            return;
          }
          setSetupInfo({ secret: setup.secret, otpauthUrl: setup.otpauthUrl });
          return;
        }
        if (result.mfaRequired) {
          setMfaStep(true);
          setPassword('');
          return;
        }
        success = result.success;
        loginMessage = result.message || '';
      }

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

        const isSuper = parsed?.roleName === 'SUPER_ADMIN';
        const userPerms: Array<{ code: string }> = Array.isArray(parsed?.permissions) ? parsed.permissions : [];
        const hasPerm = (code: string) => isSuper || userPerms.some((p: any) => p.code === code || p.code?.toLowerCase() === code.toLowerCase());
        if (isSuper || hasPerm('dashboard.view')) {
          router.push('/admin/dashboard');
        } else if (hasPerm('recoveries.view')) {
          router.push('/admin/recoveries');
        } else if (hasPerm('pre_bookings.view')) {
          router.push('/admin/pre-bookings');
        } else if (hasPerm('leads.view')) {
          router.push('/admin/leads');
        } else if (hasPerm('complaints.view')) {
          router.push('/admin/complaints');
        } else if (hasPerm('repairs.view')) {
          router.push('/admin/repair-jobs');
        } else if (hasPerm('inventory.view')) {
          router.push('/admin/inventory');
        } else if (hasPerm('returns.view')) {
          router.push('/admin/returns');
        } else if (hasPerm('customers.view')) {
          router.push('/admin/customers');
        } else if (hasPerm('users.view')) {
          router.push('/admin/users');
        } else if (hasPerm('reports.view')) {
          router.push('/admin/reports');
        } else if (hasPerm('settings.view')) {
          router.push('/admin/settings');
        } else {
          router.push('/admin/no-access');
        }
      } else {
        setError(loginMessage || (mfaStep ? 'Authenticator code verification failed.' : 'Invalid credentials. Please check your email and password.'));
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#EBF7F0] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none selection:bg-[#00D96B] selection:text-black">
      {/* High-Resolution Reference Background Image */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/images/admin-login-bg.png"
          alt="Doon Riders Admin Login Background"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* =========================================================================
          STACKED GLASSMORPHIC CARDS CONTAINER
          ========================================================================= */}
      <div className="relative w-full max-w-[390px] sm:max-w-[440px] z-10">
        {/* Layer 3: Deepest Translucent Glass Sheet (Offset Left & Tilted) */}
        <div
          aria-hidden="true"
          className="absolute -left-3 sm:-left-6 -top-2 sm:-top-3.5 -bottom-2 sm:-bottom-3.5 w-full rounded-[36px] sm:rounded-[44px] bg-white/30 backdrop-blur-md border border-white/60 shadow-[0_20px_50px_rgba(0,180,90,0.06)] -rotate-[2.4deg] sm:-rotate-[3.6deg] pointer-events-none transition-transform"
        />

        {/* Layer 2: Middle Translucent Glass Sheet (Slight Offset & Tilted) */}
        <div
          aria-hidden="true"
          className="absolute -left-1.5 sm:-left-3 -top-1 sm:-top-1.5 -bottom-1 sm:-bottom-1.5 w-full rounded-[34px] sm:rounded-[42px] bg-white/50 backdrop-blur-md border border-white/75 shadow-[0_22px_60px_rgba(0,180,90,0.09)] -rotate-[1.2deg] sm:-rotate-[1.8deg] pointer-events-none transition-transform"
        />

        {/* Layer 1: Foreground Main Card */}
        <div className="relative bg-white rounded-[32px] sm:rounded-[40px] px-6 sm:px-9 pt-8 sm:pt-9 pb-8 sm:pb-10 shadow-[0_30px_90px_rgba(0,180,90,0.16),0_15px_35px_rgba(15,23,42,0.04)] border border-white/95 overflow-hidden">
          
          {/* =====================================================================
              DECORATIVE GREEN CURVED WAVES (CLIPPED INSIDE CARD)
              ===================================================================== */}
          {/* Top-Right Curved Green Swoop */}
          <div className="absolute top-0 right-0 w-[140px] sm:w-[165px] h-[85px] sm:h-[105px] pointer-events-none overflow-hidden">
            <svg
              viewBox="0 0 165 105"
              fill="none"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                d="M 0 0 C 40 40, 90 75, 165 65 L 165 0 Z"
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
          <div className="absolute bottom-0 left-0 w-[140px] sm:w-[165px] h-[85px] sm:h-[105px] pointer-events-none overflow-hidden">
            <svg
              viewBox="0 0 165 105"
              fill="none"
              className="w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                d="M 0 40 C 75 25, 125 65, 165 105 L 0 105 Z"
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

          {/* Session Expired Notice */}
          {sessionNotice && !error && (
            <div className="relative z-10 mt-4 bg-amber-50/95 border border-amber-300 text-amber-800 px-3.5 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm flex items-center gap-2">
              <span className="text-base leading-none">⚠️</span>
              <span>{sessionNotice}</span>
            </div>
          )}

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
            {setupComplete ? <div className="space-y-4">
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left">
                <h3 className="text-sm font-extrabold text-amber-900">Save these one-time backup codes</h3>
                <p className="mt-1 text-xs text-amber-800">Authenticator phone kho jaaye toh har code ek baar login ke liye use ho sakta hai. Is screen ke baad dobara nahi dikhayenge.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {backupCodes.map((code) => <code key={code} className="rounded-lg bg-white px-2 py-1.5 text-center text-xs font-bold">{code}</code>)}
                </div>
                <button type="button" onClick={() => navigator.clipboard?.writeText(backupCodes.join('\n'))} className="mt-3 text-xs font-bold text-amber-900 underline">Copy backup codes</button>
              </div>
              <button type="button" onClick={() => router.push('/admin/dashboard')} className="w-full rounded-full bg-[#00C968] py-3 text-sm font-extrabold text-white">I saved them — continue</button>
            </div> : mfaSetupStep && setupInfo ? <div className="space-y-4 text-left">
              <div className="flex flex-col items-center gap-2 rounded-2xl border bg-white p-4">
                <QRCodeSVG value={setupInfo.otpauthUrl} size={190} level="M" />
                <span className="text-xs font-semibold text-slate-500">Google Authenticator se QR scan karo</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Scan nahi ho raha? App mein setup key manually enter karo:</p>
                <code className="block break-all rounded-xl bg-slate-100 p-3 text-center text-sm font-bold tracking-wider">{setupInfo.secret}</code>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#64748B]">App ka 6-digit code</label>
                <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="w-full rounded-[20px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3.5 text-center text-lg tracking-[0.35em] font-bold focus:border-[#00D96B] focus:outline-none" />
              </div>
            </div> : !mfaStep ? <>
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
            </> : <div className="space-y-2">
              <label className="block text-[12px] sm:text-[12.5px] font-medium text-[#94A3B8]">
                Authenticator code or one-time backup code
              </label>
              <input
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                maxLength={20}
                required
                autoFocus
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value.replace(/[^a-fA-F0-9]/g, '').slice(0, 20).toUpperCase())}
                placeholder="6-digit code or backup code"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] px-4 py-3.5 text-[16px] tracking-[0.2em] text-center text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#00D96B] focus:bg-white focus:ring-2 focus:ring-[#00D96B]/20 transition-all font-bold"
              />
                <button type="button" onClick={() => { setMfaStep(false); setMfaCode(''); setError(null); }} className="text-xs font-semibold text-[#008F46] hover:underline">
                Back to email and password
              </button>
            </div>}

            {/* Login Button with Centered Label and Right Circular Arrow */}
            {!setupComplete && <div className="pt-2 sm:pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[52px] sm:h-[54px] rounded-full bg-gradient-to-r from-[#00D96B] via-[#00CC64] to-[#00B859] hover:brightness-105 active:scale-[0.99] text-white font-extrabold text-[15px] sm:text-[16px] shadow-[0_12px_28px_rgba(0,217,107,0.42)] transition-all relative flex items-center justify-center cursor-pointer disabled:opacity-70 group"
              >
                <span className="font-bold tracking-wide">
                  {loading ? 'Please wait...' : mfaStep ? 'Verify code' : 'Login'}
                </span>
                <div className="absolute right-2 w-[38px] h-[38px] rounded-full bg-[#008F46] flex items-center justify-center text-white shadow-inner transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="w-[18px] h-[18px] stroke-[2.5]" />
                </div>
              </button>
            </div>}
          </form>
        </div>
      </div>
    </div>
  );
}
