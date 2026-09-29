'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useAuth, AdminUser } from '../../context/AuthContext';
import { LogOut, ExternalLink, Camera, User, X, Check, Upload, Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

const getInitials = (nameStr?: string) => {
  if (!nameStr) return 'DR';
  const parts = nameStr.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [name, setName] = useState(user?.name || 'Staff User');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const isTechnician = user?.roleName === 'TECHNICIAN' || user?.roleName?.includes('TECH');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleOpenProfile = () => setProfileModalOpen(true);
    window.addEventListener('open-technician-profile', handleOpenProfile);
    return () => window.removeEventListener('open-technician-profile', handleOpenProfile);
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || 'Staff User');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  useEffect(() => {
    if (mounted && !isLoading && !user && !pathname?.includes('/admin/login')) {
      router.replace('/admin/login');
    } else if (mounted && !isLoading && user) {
      const isTech = user.roleName === 'TECHNICIAN' || user.roleName?.includes('TECH');
      if (isTech && !pathname?.startsWith('/admin/technician')) {
        router.replace('/admin/technician/jobs');
      }
    }
  }, [mounted, isLoading, user, pathname, router]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    if (user) {
      const updatedUser: AdminUser = {
        ...user,
        name: name.trim() || user.name,
        avatarUrl: avatarUrl || user.avatarUrl
      };
      localStorage.setItem('dr_admin_user', JSON.stringify(updatedUser));
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setProfileModalOpen(false);
        window.location.reload();
      }, 700);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FA] flex items-center justify-center text-[#111827]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00D96B] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-[#667085] font-mono">Loading Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#111827] antialiased flex flex-col md:flex-row pb-16 md:pb-0 font-sans">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F7F9FA] h-screen overflow-hidden">
        {/* TopBar */}
        <header className="h-14 sm:h-16 border-b border-[#E5E7EB] bg-white px-3.5 sm:px-8 flex items-center justify-between z-20 flex-shrink-0 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Left Brand / Context */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Mobile Brand */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#00D96B] flex items-center justify-center font-black text-black text-xs shadow-xs">
                DR
              </div>
              <span className="font-black text-[#111827] text-xs sm:text-sm tracking-wider">DOON RIDERS</span>
            </div>

            {!isTechnician && (
              <div className="hidden md:flex items-center gap-2 ml-2">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wide">
                  LEAD CRM &amp; OPERATIONS
                </span>
                <span className="text-[#E5E7EB]">/</span>
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isTechnician && (
              <>
                <Link
                  href="/"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#EAFBF2] hover:text-[#00A854] hover:border-[#00D96B]/50 transition shadow-xs"
                >
                  <span>Live Website</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#00A854]" />
                </Link>

                {/* Clickable User Profile Widget (Avatar with green status dot) */}
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="relative p-0.5 rounded-full hover:opacity-90 transition cursor-pointer"
                  title="Click to edit profile"
                >
                  <div className="relative w-8 h-8 rounded-full bg-[#EAFBF2] border border-[#00D96B]/30 flex items-center justify-center text-[#00A854] font-black text-xs overflow-hidden shadow-xs">
                    {user?.avatarUrl && !user.avatarUrl.includes('doon-riders-logo') ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(user?.name)}</span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00D96B] border-2 border-white rounded-full" />
                </button>
              </>
            )}

            {/* Bell Notification Icon (Shown for all, including Technician) */}
            <div className="relative p-1 text-[#667085] hover:text-[#111827] cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </div>

            {!isTechnician && (
              <button
                onClick={logout}
                title="Logout Session"
                className="hidden md:inline-flex p-2 rounded-xl text-[#98A2B3] hover:text-red-600 hover:bg-red-50 transition cursor-pointer border border-transparent hover:border-red-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className={`flex-1 overflow-y-auto ${
          isTechnician
            ? 'p-2 sm:p-4 bg-[#F7F8FA] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]'
            : 'p-4 sm:p-8 bg-[#F7F9FA]'
        }`}>
          <div className={isTechnician ? 'max-w-xl mx-auto' : 'max-w-7xl mx-auto'}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* ========================================================= */}
      {/* EDIT PROFILE & PHOTO MODAL */}
      {/* ========================================================= */}
      {profileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#E5E7EB] w-full max-w-md p-6 sm:p-8 shadow-2xl space-y-6 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAFBF2] text-[#00A854] flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111827]">
                    Edit {user?.roleDisplayName || 'My'} Profile
                  </h3>
                  <p className="text-xs text-[#667085]">Update profile name and avatar picture</p>
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#111827] hover:bg-[#F7F9FA] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Photo Uploader */}
            <div className="flex flex-col items-center justify-center space-y-3 pt-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-3xl bg-[#EAFBF2] border-2 border-dashed border-[#00D96B] flex items-center justify-center overflow-hidden cursor-pointer group shadow-sm hover:scale-105 transition-transform"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-2xl text-[#00A854]">{getInitials(name || user?.name)}</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                  <Camera className="w-6 h-6" />
                  <span className="text-[9px] font-bold uppercase mt-1">Change</span>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A854] hover:text-[#00D96B] bg-[#EAFBF2] px-3 py-1.5 rounded-full border border-[#00D96B]/30 transition cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Upload New Photo</span>
              </button>
            </div>

            {/* Name Input & Account Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  {user?.roleDisplayName ? `${user.roleDisplayName} Name` : 'Full Name'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={user?.name || 'Enter your name'}
                  className="w-full bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#111827] focus:outline-none focus:border-[#00D96B] focus:bg-white transition font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Account Role &amp; Access
                </label>
                <div className="w-full bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-xs font-bold text-[#111827] flex items-center justify-between">
                  <span>{user?.roleDisplayName || user?.roleName || 'Team Member'}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    Active Account
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || 'user@doonriders.com'}
                  className="w-full bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-4 py-2.5 text-sm text-[#667085] cursor-not-allowed font-mono"
                />
              </div>
            </div>

            {/* Save & Logout Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleSaveProfile}
                className="w-full bg-[#00D96B] hover:bg-[#00A854] text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(0,217,107,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Profile Saved!</span>
                  </>
                ) : (
                  <span>SAVE CHANGES</span>
                )}
              </button>

              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition border border-red-200 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Session</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
