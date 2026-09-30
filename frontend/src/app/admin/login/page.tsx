'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          // Block technician login on /admin/login
          localStorage.removeItem('dr_admin_token');
          localStorage.removeItem('dr_admin_user');
          setError('Technicians must log in through the Technician App (/technician/login).');
          setLoading(false);
          return;
        }

        if (isHub) {
          router.push('/admin/complaints');
        } else {
          router.push('/admin/dashboard');
        }
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
    <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center p-4 relative overflow-hidden text-[#111827] font-sans selection:bg-[#00D96B] selection:text-black">
      {/* Soft Ambient Green Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00D96B]/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-14 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_8px_24px_rgba(16,24,40,0.06)] p-2">
            <Image
              src="/images/doon-riders-logo.png"
              alt="DOON RIDERS"
              width={56}
              height={38}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider text-[#111827] uppercase font-['Play'] flex items-center justify-center gap-2">
              DOON RIDERS
              <span className="w-2 h-2 rounded-full bg-[#00D96B]"></span>
            </h1>
            <p className="text-xs text-[#00A854] font-bold tracking-widest uppercase mt-0.5">
              CRM
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-3xl p-7 sm:p-8 shadow-[0_8px_30px_rgba(16,24,40,0.06)] space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="doonridersmain@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-3 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-3 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:bg-white transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#00D96B] hover:bg-[#00A854] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition-all duration-150 transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <p className="text-[11px] text-[#98A2B3] text-center font-mono">
          DOON RIDERS CRM • Confidential &amp; Secure
        </p>
      </div>
    </div>
  );
}
