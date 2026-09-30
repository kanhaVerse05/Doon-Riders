'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '../../../context/AuthContext';
import { Lock, Mail, ArrowRight, Boxes, Wrench, AlertCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HubInchargeLoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // If already logged in as Hub Incharge, forward immediately
  useEffect(() => {
    if (user) {
      const isHub = user.roleName === 'HUB_INCHARGE' || user.roleName?.includes('HUB');
      if (isHub) {
        router.replace('/admin/complaints');
      }
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
        const isHub = parsed?.roleName === 'HUB_INCHARGE' || parsed?.roleName?.includes('HUB');

        if (!isHub) {
          // Clear credentials and reject if not Hub Incharge
          localStorage.removeItem('dr_admin_token');
          localStorage.removeItem('dr_admin_user');
          setError('This portal is strictly for Hub Incharges only. For Main CRM, please log in at /admin/login.');
          setLoading(false);
          return;
        }

        router.push('/admin/complaints');
      } else {
        setError('Invalid credentials. Please verify your Hub Incharge email and password.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col justify-between items-center p-4 selection:bg-[#00D96B] selection:text-black font-sans relative overflow-hidden">
      {/* Soft Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#00D96B]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md my-auto space-y-6 relative z-10">
        {/* Brand Header */}
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
            <h1 className="text-2xl font-black tracking-tight text-[#111827] uppercase flex items-center justify-center gap-1.5 font-['Play']">
              <span>DOON RIDERS</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D96B]" />
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mt-1.5 bg-[#EAFBF2] border border-[#00D96B]/30 rounded-full shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00A854]" />
              <span className="text-[11px] font-bold text-[#00A854] tracking-wider uppercase">
                Hub Incharge Portal
              </span>
            </div>
            <p className="text-xs text-[#667085] font-medium mt-1">
              Field RSA Complaints &bull; Workshop Repairs &bull; Inventory Stock
            </p>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-[0_10px_35px_rgba(0,0,0,0.06)] border border-[#E5E7EB] space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Hub Incharge Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="hub.isbt@doonriders.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl pl-10 pr-4 py-3 text-xs text-[#111827] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B] focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Password
              </label>
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
              <span>{loading ? 'Authenticating...' : 'Sign In to Hub Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Dedicated Features Pill */}
          <div className="pt-2 border-t border-[#F2F4F7] grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-[#F9FAFB] border border-[#F2F4F7]">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#344054]">Complaints</p>
            </div>
            <div className="p-2 rounded-xl bg-[#F9FAFB] border border-[#F2F4F7]">
              <Wrench className="w-3.5 h-3.5 text-[#00A854] mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#344054]">Repair Jobs</p>
            </div>
            <div className="p-2 rounded-xl bg-[#F9FAFB] border border-[#F2F4F7]">
              <Boxes className="w-3.5 h-3.5 text-blue-600 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-[#344054]">Inventory</p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#98A2B3] text-center font-mono">
          DOON RIDERS &bull; Hub Service Portal &bull; Confidential
        </p>
      </div>
    </div>
  );
}
