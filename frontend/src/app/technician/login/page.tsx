'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { Lock, Mail, ArrowRight, Wrench, ShieldCheck, CheckCircle2, Sparkles, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TechnicianLoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // If already logged in as technician, forward immediately
  useEffect(() => {
    if (user && user.roleName === 'TECHNICIAN') {
      router.replace('/admin/technician/jobs');
    }
  }, [user, router]);

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

        if (!isTech) {
          // Clear credentials and reject
          localStorage.removeItem('dr_admin_token');
          localStorage.removeItem('dr_admin_user');
          setError('This portal is reserved for Technicians only. Please use the Admin CRM portal.');
          setLoading(false);
          return;
        }

        router.push('/admin/technician/jobs');
      } else {
        setError('Invalid technician credentials. Please check your email and password.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] bg-[url('/images/technician-login-bg.png')] bg-cover bg-center bg-no-repeat flex flex-col justify-between items-center p-4 selection:bg-[#00D96B] selection:text-black font-sans relative">
      <div className="w-full max-w-sm my-auto space-y-6 relative z-10">
        
        {/* App Logo & Header */}
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center justify-center w-24 h-16 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_24px_rgba(16,24,40,0.08)] p-2">
            <Image
              src="/images/doon-riders-logo.png"
              alt="DOON RIDERS"
              width={70}
              height={44}
              className="object-contain"
              priority
            />
          </div>

          <div>
            <h1 className="text-xl font-black tracking-tight text-[#111827] uppercase flex items-center justify-center gap-1.5 font-['Play']">
              <span>DOON RIDERS</span>
              <span className="w-2 h-2 rounded-full bg-[#00D96B]" />
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 bg-white/90 backdrop-blur-sm border border-[#00D96B]/30 rounded-full shadow-xs">
              <Wrench className="w-3.5 h-3.5 text-[#00A854]" />
              <span className="text-[11px] font-bold text-[#00A854] tracking-wider uppercase">
                Technician App Portal
              </span>
            </div>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 shadow-[0_10px_35px_rgba(0,0,0,0.06)] border border-white/80 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-900 mb-1.5">
                Technician ID / Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="amit.tech@doonriders.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D96B] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-900 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00D96B] focus:bg-white transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00A854] hover:bg-[#008744] text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(0,168,84,0.3)] transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Signing In...' : 'LOG IN AS TECHNICIAN'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>

        {/* Security Badge */}
        <div className="text-center flex items-center justify-center gap-1.5 text-[11px] text-gray-600 font-semibold bg-white/70 backdrop-blur-xs py-1.5 px-3 rounded-full mx-auto w-fit border border-white/60 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00A854]" />
          <span>DOON Riders EV Mobility System</span>
        </div>
      </div>

      {/* Bottom iOS home indicator */}
      <div className="w-32 h-1 bg-gray-400/60 rounded-full mx-auto my-2 relative z-10" />
    </div>
  );
}
