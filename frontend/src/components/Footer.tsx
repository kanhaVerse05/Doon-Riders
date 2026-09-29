'use client';

import Image from 'next/image';


import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, MapPin, Phone, Mail, Facebook, Instagram, Linkedin } from 'lucide-react';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="bg-[#F1F5F9] border-t border-[#EEF2F0] pt-16 pb-8 text-[#101828]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-12 h-8 flex items-center justify-center">
                <Image
                  src="/images/doon-riders-logo.png"
                  alt="DOON RIDERS"
                  width={52}
                  height={36}
                  className="object-contain"
                />
              </div>
              <span className="font-heading font-black text-xl uppercase tracking-wider text-[#101828]">
                DOON <span className="text-[#00D96B]">RIDERS</span>
              </span>
            </Link>
            <p className="text-[#475467] text-xs sm:text-sm leading-relaxed max-w-sm">
              Leading the green mobility transition across Uttarakhand. Experience intelligent electric two-wheelers engineered for silence, power, and zero emissions.
            </p>

            {/* Social Media Links */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://www.facebook.com/doonriders.in/"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow Doon Riders on Facebook"
                className="w-10 h-10 rounded-xl bg-white border border-[#EEF2F0] hover:border-[#00D96B] text-[#475467] hover:text-[#00A854] hover:bg-[#EAFBF2] flex items-center justify-center transition-all shadow-sm hover:scale-105 cursor-pointer"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/doonriders.in/"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow Doon Riders on Instagram"
                className="w-10 h-10 rounded-xl bg-white border border-[#EEF2F0] hover:border-[#00D96B] text-[#475467] hover:text-[#00A854] hover:bg-[#EAFBF2] flex items-center justify-center transition-all shadow-sm hover:scale-105 cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/doonriders/"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow Doon Riders on LinkedIn"
                className="w-10 h-10 rounded-xl bg-white border border-[#EEF2F0] hover:border-[#00D96B] text-[#475467] hover:text-[#00A854] hover:bg-[#EAFBF2] flex items-center justify-center transition-all shadow-sm hover:scale-105 cursor-pointer"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-[#101828] text-sm uppercase tracking-wider">Explore</h4>
            <ul className="space-y-2 text-xs font-semibold text-[#475467]">
              <li><Link href="/" className="hover:text-[#00D96B] transition">Home</Link></li>
              <li><Link href="/about" className="hover:text-[#00D96B] transition">About Us</Link></li>
              <li><Link href="/vehicles" className="hover:text-[#00D96B] transition">Electric Fleet</Link></li>
              <li><Link href="/pricing" className="hover:text-[#00D96B] transition">Rental Pricing</Link></li>
              <li><Link href="/contact" className="hover:text-[#00D96B] transition">Contact &amp; Hubs</Link></li>
            </ul>
          </div>

          {/* Operations & Hubs */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-[#101828] text-sm uppercase tracking-wider">Our Main Hub</h4>
            <div className="space-y-2.5 text-xs text-[#475467]">
              <p className="flex items-start gap-2 leading-relaxed">
                <MapPin className="w-4 h-4 text-[#00D96B] flex-shrink-0 mt-0.5" />
                <span>Sahastradhara Rd, opposite Shiv Mandir, Kulhan, Kirsali, Dehradun, Uttarakhand 248013</span>
              </p>
              <p className="flex items-center gap-2 font-mono font-bold text-[#101828]">
                <Phone className="w-4 h-4 text-[#00D96B] flex-shrink-0" />
                <a href="tel:08439431999" className="hover:text-[#00D96B]">08439431999</a>
                <span>,</span>
                <a href="tel:8439441999" className="hover:text-[#00D96B]">8439441999</a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#00D96B] flex-shrink-0" />
                <a href="mailto:support@doonriders.com" className="hover:text-[#00D96B]">support@doonriders.com</a>
              </p>
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-bold text-[#101828] text-sm uppercase tracking-wider">Stay Connected</h4>
            <p className="text-xs text-[#475467]">Subscribe for exclusive weekend rental offers and battery swap hub updates.</p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter your email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#EEF2F0] rounded-xl px-3.5 py-2 text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B]"
                />
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 bg-[#00D96B] text-[#101828] px-3 rounded-lg text-xs font-bold hover:bg-[#00A854] transition cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {subscribed && (
                <p className="text-[11px] text-[#00A854] font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Thank you for subscribing!</span>
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-[#EEF2F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#667085]">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#00D96B] inline-block animate-pulse"></span>
            <span>DOON RIDERS • Electric Two Wheeler Mobility</span>
          </div>
          <div className="flex items-center gap-4 font-semibold">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};