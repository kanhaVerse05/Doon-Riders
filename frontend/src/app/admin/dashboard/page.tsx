'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { useAuth } from '../../../context/AuthContext';
import { adminApi } from '../../../lib/adminApi';
import {
  Users,
  Clock,
  Flame,
  Trophy,
  PhoneCall,
  MessageSquare,
  ArrowUpRight,
  Zap,
  CheckCircle2,
  TrendingUp,
  Activity,
  Phone,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminApi.get('/admin/reports/dashboard');
        if (res.success) setStats(res.data);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const totalLeads = Number(stats?.leads?.total_leads) || 0;
  const pendingFollowups = Number(stats?.leads?.followup_leads) || 0;
  const interestedDeals = Number(stats?.leads?.interested_leads) || 0;
  const convertedWins = Number(stats?.leads?.converted_leads) || 0;
  const conversionRate = stats?.leads?.conversion_rate || '0%';

  // Lead Sources breakdown
  const sources = [
    { label: 'Website', color: '#00D96B', count: 0, pct: 0 },
    { label: 'WhatsApp', color: '#2196F3', count: 0, pct: 0 },
    { label: 'Phone Call', color: '#8B5CF6', count: 0, pct: 0 },
    { label: 'Walk-in', color: '#FF9800', count: 0, pct: 0 },
    { label: 'Referral', color: '#14B8A6', count: 0, pct: 0 },
  ];

  if (stats?.leadsBySource && stats.leadsBySource.length > 0) {
    stats.leadsBySource.forEach((s: any) => {
      const match = sources.find(src => src.label.toLowerCase() === s.lead_source?.toLowerCase() || s.lead_source?.toLowerCase().includes(src.label.toLowerCase()));
      if (match) {
        match.count = Number(s.count);
        match.pct = totalLeads > 0 ? Math.round((Number(s.count) / totalLeads) * 100) : 0;
      }
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ========================================================= */}
        {/* 1. WELCOME HERO CARD (MATCHING SCREENSHOT WITH GREEN WAVE) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-[22px] border border-[#E5E7EB] p-6 sm:p-7 shadow-[0_2px_12px_rgba(16,24,40,0.03)] relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          {/* Subtle Decorative Green Abstract Wave in background */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none opacity-40 hidden sm:block">
            <svg viewBox="0 0 500 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
              <path d="M50 160C150 140 200 40 320 60C440 80 480 20 520 10" stroke="#00D96B" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
              <path d="M80 180C180 150 230 70 350 80C470 90 490 50 540 30" stroke="#00D96B" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4"/>
              <path d="M120 195C220 170 270 90 390 110C510 130 520 70 560 50" stroke="#00D96B" strokeWidth="1" opacity="0.3"/>
            </svg>
          </div>

          <div className="relative z-10 space-y-2">
            <span className="inline-block text-[11px] font-bold text-[#00A854] bg-[#EAFBF2] border border-[#00D96B]/30 px-3 py-0.5 rounded-full uppercase tracking-wider font-mono">
              SUPER ADMIN ENGINE
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Welcome back, {user?.name || 'Vikramaditya Rawat'}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-[#667085] font-normal max-w-xl">
              Real-time inbound lead funnel, channel attribution, and sales team velocity.
            </p>
          </div>

          <div className="relative z-10 flex-shrink-0">
            <Link
              href="/admin/leads"
              className="inline-flex items-center justify-center gap-2 bg-[#00D96B] hover:bg-[#00A854] text-[#071B12] hover:text-white font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition-all duration-200 transform active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Users className="w-4 h-4 stroke-[2.2]" />
              <span>VIEW INBOUND LEADS</span>
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. FOUR KPI METRIC CARDS (CLEAN 1-LINE TYPOGRAPHY) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Leads */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-[0_2px_10px_rgba(16,24,40,0.02)] flex items-center justify-between hover:border-[#00D96B]/50 transition-all group overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] flex items-center justify-center text-[#00A854] flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Users className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-normal whitespace-nowrap block truncate">
                  TOTAL INBOUND LEADS
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#111827] font-mono mt-0.5 block leading-none">
                  {totalLeads}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#00A854] bg-[#EAFBF2] px-2 py-0.5 rounded-full border border-[#00D96B]/30 whitespace-nowrap flex-shrink-0 ml-2">
              Conv. {conversionRate}
            </span>
          </div>

          {/* Card 2: Pending Follow-ups */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-[0_2px_10px_rgba(16,24,40,0.02)] flex items-center justify-between hover:border-amber-300 transition-all group overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Clock className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-normal whitespace-nowrap block truncate">
                  PENDING FOLLOW-UPS
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#111827] font-mono mt-0.5 block leading-none">
                  {pendingFollowups}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 whitespace-nowrap flex-shrink-0 ml-2">
              Action Due
            </span>
          </div>

          {/* Card 3: Interested Deals */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-[0_2px_10px_rgba(16,24,40,0.02)] flex items-center justify-between hover:border-blue-300 transition-all group overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Flame className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-normal whitespace-nowrap block truncate">
                  INTERESTED DEALS
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#111827] font-mono mt-0.5 block leading-none">
                  {interestedDeals}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 whitespace-nowrap flex-shrink-0 ml-2">
              Hot Deals
            </span>
          </div>

          {/* Card 4: Converted Wins */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 shadow-[0_2px_10px_rgba(16,24,40,0.02)] flex items-center justify-between hover:border-emerald-300 transition-all group overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] flex items-center justify-center text-[#00A854] flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <Trophy className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-normal whitespace-nowrap block truncate">
                  CONVERTED WINS
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[#111827] font-mono mt-0.5 block leading-none">
                  {convertedWins}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#00A854] bg-[#EAFBF2] px-2 py-0.5 rounded-full border border-[#00D96B]/30 whitespace-nowrap flex-shrink-0 ml-2">
              Won
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. MAIN CONTENT: 2-COLUMN SECTION (PRIORITY LEADS + ATTRIBUTION) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Today's Priority Leads & Calls */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-7 shadow-[0_2px_12px_rgba(16,24,40,0.03)] flex flex-col justify-between space-y-6 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAFBF2] flex items-center justify-center text-[#00A854]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Today's Priority Leads & Calls</h3>
                  <p className="text-xs text-[#667085] mt-0.5">1-tap instant WhatsApp and Phone calling</p>
                </div>
              </div>
              <Link
                href="/admin/leads"
                className="text-xs font-bold text-[#00A854] hover:text-[#00D96B] flex items-center gap-1 transition"
              >
                <span>View Full Pipeline</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* List or Empty State */}
            {(!stats?.todayFollowups || stats.todayFollowups.length === 0) ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#F7F9FA] border border-[#E5E7EB] flex items-center justify-center text-[#98A2B3]">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#111827]">No pending calls today</h4>
                  <p className="text-xs text-[#667085] mt-0.5">All caught up. Great job!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.todayFollowups.slice(0, 4).map((lead: any) => (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-xl bg-[#F7F9FA] border border-[#E5E7EB] hover:border-[#00D96B]/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#111827]">{lead.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-[#EAFBF2] text-[#00A854] px-2 py-0.5 rounded">
                          {lead.lead_code}
                        </span>
                        <span className="text-[10px] font-bold bg-white border border-[#E5E7EB] text-[#667085] px-2 py-0.5 rounded">
                          {lead.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#667085] mt-0.5 font-mono">{lead.phone} • {lead.location}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${lead.phone}`}
                        className="bg-white hover:bg-[#F7F9FA] text-[#111827] border border-[#E5E7EB] px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <PhoneCall className="w-3 h-3 text-[#00A854]" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        className="bg-[#00D96B] hover:bg-[#00A854] text-[#071B12] hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom decorative subtle green wave */}
            <div className="w-full h-8 opacity-30 pointer-events-none">
              <svg viewBox="0 0 400 30" fill="none" className="w-full h-full">
                <path d="M0 20C100 5 200 30 400 10" stroke="#00D96B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Right Column (5 cols): Attribution & Workload */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: Lead Source Attribution */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)] space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#E5E7EB]">
                <div className="w-8 h-8 rounded-lg bg-[#EAFBF2] flex items-center justify-center text-[#00A854]">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  LEAD SOURCE ATTRIBUTION
                </h3>
              </div>

              {/* Donut Chart & Legend */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
                {/* Donut SVG Chart */}
                <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" stroke="#E5E7EB" strokeWidth="12" fill="transparent" />
                    <circle cx="50" cy="50" r="38" stroke="#00D96B" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="180" fill="transparent" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="38" stroke="#2196F3" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="210" fill="transparent" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="38" stroke="#FF9800" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="225" fill="transparent" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-[#111827] font-mono leading-none">{totalLeads}</span>
                    <span className="text-[10px] text-[#98A2B3] font-semibold mt-0.5">Total Leads</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="space-y-2 text-xs flex-1 w-full">
                  {sources.map(src => (
                    <div key={src.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: src.color }}></span>
                        <span className="text-[#667085] font-medium">{src.label}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#111827]">
                        {src.count} ({src.pct}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Sales Rep Workload */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-[0_2px_12px_rgba(16,24,40,0.03)] space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#E5E7EB]">
                <div className="w-8 h-8 rounded-lg bg-[#EAFBF2] flex items-center justify-center text-[#00A854]">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                  SALES REP WORKLOAD
                </h3>
              </div>

              {(!stats?.teamPerformance || stats.teamPerformance.length === 0) ? (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#F7F9FA] flex items-center justify-center text-[#98A2B3]">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-[#111827]">No workload data yet.</h4>
                  <p className="text-[11px] text-[#667085]">Assign leads to see workload.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.teamPerformance.slice(0, 3).map((rep: any) => (
                    <div key={rep.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F9FA]">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rep.avatar_url || '/images/avt-1-70x70.jpg'}
                          alt=""
                          className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#00D96B]"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#111827]">{rep.name}</p>
                          <p className="text-[10px] text-[#667085]">{rep.assigned_leads} active leads</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#00A854] bg-[#EAFBF2] px-2 py-0.5 rounded-md">
                        {rep.converted_leads} Won
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. BOTTOM PERFORMANCE METRICS (WIDE 4-COLUMN BAR WITH SPARKLINE) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Response Time */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_2px_10px_rgba(16,24,40,0.02)] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#EAFBF2] flex items-center justify-center text-[#00A854]">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">RESPONSE TIME</span>
              </div>
              <div className="text-2xl font-bold text-[#111827] font-mono">0m</div>
              <p className="text-[10px] text-[#98A2B3]">Avg. First Response</p>
            </div>
            {/* Sparkline SVG */}
            <svg className="w-16 h-8 text-[#00D96B]" viewBox="0 0 60 30" fill="none">
              <path d="M0 25L10 20L20 22L30 15L40 18L50 8L60 10" stroke="#00D96B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Metric 2: Conversion Rate */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_2px_10px_rgba(16,24,40,0.02)] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#EAFBF2] flex items-center justify-center text-[#00A854]">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">CONVERSION RATE</span>
              </div>
              <div className="text-2xl font-bold text-[#111827] font-mono">{conversionRate}</div>
              <p className="text-[10px] text-[#98A2B3]">Leads to Deals</p>
            </div>
            {/* Sparkline SVG */}
            <svg className="w-16 h-8 text-[#00D96B]" viewBox="0 0 60 30" fill="none">
              <path d="M0 28L15 22L28 25L42 12L52 14L60 6" stroke="#00D96B" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Metric 3: Follow-up Rate */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_2px_10px_rgba(16,24,40,0.02)] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">FOLLOW-UP RATE</span>
              </div>
              <div className="text-2xl font-bold text-[#111827] font-mono">0%</div>
              <p className="text-[10px] text-[#98A2B3]">Follow-ups Done</p>
            </div>
            {/* Sparkline SVG */}
            <svg className="w-16 h-8 text-blue-500" viewBox="0 0 60 30" fill="none">
              <path d="M0 26L12 24L24 18L36 20L48 10L60 14" stroke="#2196F3" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          {/* Metric 4: Deal Velocity */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-[0_2px_10px_rgba(16,24,40,0.02)] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">DEAL VELOCITY</span>
              </div>
              <div className="text-2xl font-bold text-[#111827] font-mono">0</div>
              <p className="text-[10px] text-[#98A2B3]">Deals / Day</p>
            </div>
            {/* Sparkline SVG */}
            <svg className="w-16 h-8 text-purple-500" viewBox="0 0 60 30" fill="none">
              <path d="M0 24L14 26L26 15L38 18L50 8L60 12" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
