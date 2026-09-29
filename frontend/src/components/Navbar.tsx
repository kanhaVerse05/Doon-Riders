'use client';

import Image from 'next/image';


import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Zap } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: (vehicleName?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBooking }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Home 2 ⚡', href: '/home-2' },
    { label: 'About', href: '/about' },
    { label: 'Vehicles', href: '/vehicles' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300 px-4 sm:px-8 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto">
        {/* Floating Navbar Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-[22px] border border-[#EEF2F0] px-5 sm:px-7 py-3 flex items-center justify-between shadow-[0_8px_30px_rgba(16,24,40,0.06)]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-7 flex items-center justify-center">
              <Image
                src="/images/doon-riders-logo.png"
                alt="DOON RIDERS"
                width={48}
                height={34}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-heading font-black text-lg sm:text-xl tracking-wider uppercase text-[#101828]">
              DOON <span className="text-[#00D96B]">RIDERS</span>
            </span>
          </Link>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold tracking-wide transition-all relative py-1 flex flex-col items-center ${
                    isActive
                      ? 'text-[#00D96B] font-bold'
                      : 'text-[#475467] hover:text-[#00A854]'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && (
                    <span className="w-full h-[2.5px] bg-[#00D96B] rounded-full mt-0.5 animate-in fade-in duration-200"></span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right CTA Button */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => onOpenBooking()}
              className="flex items-center gap-2 bg-[#00D96B] hover:bg-[#85e600] text-[#101828] font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-[0_4px_16px_rgba(0,217,107,0.3)] transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white stroke-white" />
              <span>BOOK A TEST DRIVE</span>
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#475467] hover:text-[#101828] hover:bg-[#F8FAFC]"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 max-w-7xl mx-auto bg-white rounded-3xl border border-[#EEF2F0] p-6 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-base font-semibold transition-colors ${
                  pathname === link.href ? 'text-[#00D96B] font-bold' : 'text-[#475467]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenBooking();
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#00D96B] hover:bg-[#85e600] text-[#101828] font-bold text-xs uppercase tracking-wider py-3.5 rounded-full shadow-[0_4px_16px_rgba(0,217,107,0.3)] transition cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>BOOK A TEST DRIVE</span>
          </button>
        </div>
      )}
    </header>
  );
};