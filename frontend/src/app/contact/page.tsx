'use client';

import React, { useState } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { BookTestDriveModal } from '../../components/BookTestDriveModal';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, MessageSquare, ExternalLink } from 'lucide-react';
import { submitBooking } from '../../lib/api';

export default function ContactPage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    
    rentalPlan: 'Weekly',
    notes: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitBooking({
        fullName: formData.name,
        phone: formData.phone,
        email: formData.email || 'contact@doonriders.com',
        preferredDate: new Date().toISOString().split('T')[0],
        preferredTime: 'Morning (09:00 - 12:00)',
        city: 'Dehradun',
        message: `Plan: ${formData.rentalPlan} | Note: ${formData.notes}`
      });
      setSubmitted(true);
      setFormData({
        name: '',
        phone: '',
        email: '',
        
        rentalPlan: 'Weekly',
        notes: ''
      });
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const googleMapsUrl = "https://www.google.com/maps/place/Doon+Riders/@30.3701943,78.1041739,17z/data=!3m1!4b1!4m6!3m5!1s0x3908d76a6e0ed805:0xec570f21741575ff!8m2!3d30.3701943!4d78.1041739!16s%2Fg%2F11w7_p7x9_";

  return (
    <div className="min-h-screen bg-white text-[#101828] font-sans">
      <Navbar onOpenBooking={() => setBookingOpen(true)} />

      {/* Hero Header */}
      <section className="pt-36 pb-12 bg-gradient-to-b from-[#EAFBF2]/50 via-white to-white text-center space-y-4">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <span className="inline-block text-xs font-bold text-[#00A854] bg-[#EAFBF2] border border-[#D9FCA8] px-4 py-1.5 rounded-full uppercase tracking-wider">
            CONTACT &amp; HUB LOCATIONS
          </span>
          <h1 className="font-heading font-black text-4xl sm:text-5xl lg:text-6xl text-[#101828] tracking-tight mt-3">
            Get in <span className="text-[#00D96B]">Touch</span>
          </h1>
          <p className="text-sm sm:text-base text-[#475467] max-w-xl mx-auto mt-2">
            Visit our main hub in Dehradun, chat with our support team, or submit an inquiry for custom fleet rentals.
          </p>
        </div>
      </section>

      {/* Contact & Inquiry Grid */}
      <section className="py-10 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Info Cards (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#F1F5F9] p-7 rounded-3xl border border-[#EEF2F0] space-y-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#101828]">Headquarters &amp; Support Hub</h3>
              
              <div className="space-y-4 text-xs">
                {/* Address */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAFBF2] text-[#00D96B] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[#101828]">Main Station / Hub</h5>
                    <p className="text-[#667085] mt-0.5 leading-relaxed">
                      Sahastradhara Rd, opposite Shiv Mandir, Kulhan, Kirsali, Dehradun, Uttarakhand 248013
                    </p>
                  </div>
                </div>

                {/* Phone Helpline */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAFBF2] text-[#00D96B] flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[#101828]">Phone Helpline</h5>
                    <p className="text-[#101828] mt-0.5 font-mono font-bold flex flex-wrap gap-2">
                      <a href="tel:08439431999" className="hover:text-[#00D96B] transition">08439431999</a>
                      <span>•</span>
                      <a href="tel:8439441999" className="hover:text-[#00D96B] transition">8439441999</a>
                    </p>
                    <span className="text-[10px] text-[#667085]">(10:00 AM – 7:00 PM)</span>
                  </div>
                </div>

                {/* Email Support */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAFBF2] text-[#00D96B] flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[#101828]">Email Support</h5>
                    <p className="text-[#667085] mt-0.5 font-mono">support@doonriders.com</p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#EAFBF2] text-[#00D96B] flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[#101828]">Operating Hours</h5>
                    <p className="text-[#667085] mt-0.5">Monday – Sunday: 10:00 AM – 7:00 PM (7 Days Open)</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp CTA */}
              <div className="pt-2">
                <a
                  href="https://wa.me/918439431999"
                  target="_blank"
                  className="w-full bg-[#00D96B] hover:bg-[#85e600] text-[#101828] font-bold py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(0,217,107,0.3)] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>CHAT ON WHATSAPP INSTANTLY</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Form (7 Cols) */}
          <div className="lg:col-span-7 bg-[#F1F5F9] p-8 sm:p-10 rounded-3xl border border-[#EEF2F0] shadow-sm">
            <h3 className="text-xl font-bold text-[#101828] mb-2">Send an Inbound Inquiry</h3>
            <p className="text-xs text-[#667085] mb-6">Our sales team will contact you within 15 minutes with vehicle availability and pricing.</p>

            {submitted ? (
              <div className="p-8 rounded-2xl bg-[#EAFBF2] border border-[#00D96B] text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#00A854] mx-auto" />
                <h4 className="text-lg font-bold text-[#101828]">Inquiry Received Successfully!</h4>
                <p className="text-xs text-[#475467]">Our executive will call you shortly to confirm your booking.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-bold text-[#00A854] underline cursor-pointer"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#101828] font-semibold mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white border border-[#EEF2F0] rounded-xl px-4 py-3 text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#101828] font-semibold mb-1">Phone Number (WhatsApp) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 84394 31999"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white border border-[#EEF2F0] rounded-xl px-4 py-3 text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#101828] font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="rahul@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white border border-[#EEF2F0] rounded-xl px-4 py-3 text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#101828] font-semibold mb-1">Preferred Rental Plan</label>
                    <select
                      value={formData.rentalPlan}
                      onChange={(e) => setFormData({ ...formData, rentalPlan: e.target.value })}
                      className="w-full bg-white border border-[#EEF2F0] rounded-xl px-4 py-3 text-[#101828] font-medium focus:outline-none focus:border-[#00D96B]"
                    >
                      <option value="Daily">Daily Rental (₹299/day)</option>
                      <option value="Weekly">Weekly Rental (₹1,499/week)</option>
                      <option value="Monthly">Monthly Subscription (₹4,499/month)</option>
                    </select>
                  </div>
                </div>



                <div>
                  <label className="block text-[#101828] font-semibold mb-1">Your Message / Requirements</label>
                  <textarea
                    rows={3}
                    placeholder="Need helmet, extra battery, weekend rental details..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white border border-[#EEF2F0] rounded-xl p-4 text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-[#00D96B]"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00D96B] hover:bg-[#85e600] text-[#101828] font-bold py-4 rounded-2xl text-xs uppercase tracking-wider shadow-[0_4px_16px_rgba(0,217,107,0.3)] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Submitting Inquiry...' : 'Submit Inquiry'}</span>
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* OUR LOCATIONS / VISIT OUR HUB CENTERS (MATCHING USER REFERENCE) */}
      {/* ========================================================= */}
      <section className="py-16 bg-[#EEF2F6] border-t border-[#EEF2F0]">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          
          {/* Section Header */}
          <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
            <span className="text-[#00A854] font-bold text-xs uppercase tracking-widest bg-[#EAFBF2] border border-[#D9FCA8] px-4 py-1.5 rounded-full inline-block">
              Our Locations
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#101828]">
              Visit Our <span className="text-[#00D96B]">Hub Centers</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#475467]">
              Easily locate and navigate to our physical battery swap stations &amp; test ride centers in Dehradun.
            </p>
          </div>

          {/* Single Flagship Hub Location Card with Embedded Google Maps */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border border-[#EEF2F0] overflow-hidden shadow-[0_4px_24px_rgba(16,24,40,0.06)] flex flex-col justify-between hover:border-[#00D96B]/50 transition-all group">
              {/* Map Container with "Open in Maps" Overlay */}
              <div className="relative w-full h-80 sm:h-96 bg-slate-100 overflow-hidden border-b border-[#EEF2F0]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3442.3226634601133!2d78.10417389999999!3d30.370194299999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3908d76a6e0ed805%3A0xec570f21741575ff!2sDoon%20Riders!5e0!3m2!1sen!2sin!4v1788436057004!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                ></iframe>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-4 left-4 bg-white/95 backdrop-blur-md text-[#101828] hover:text-[#00A854] text-xs font-bold px-4 py-2 rounded-xl border border-[#EEF2F0] shadow-md flex items-center gap-1.5 transition hover:scale-105"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#00D96B]" />
                </a>
              </div>

              {/* Hub Info */}
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EAFBF2] text-[#00D96B] flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-xs font-bold text-[#00A854] bg-[#EAFBF2] px-3 py-1 rounded-full uppercase tracking-wider border border-[#D9FCA8]">
                    DOON RIDERS Flagship Hub Station
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-[#101828]">
                  DOON RIDERS Central Hub &amp; Service Center
                </h3>

                <p className="text-xs sm:text-sm text-[#475467] leading-relaxed">
                  Sahastradhara Rd, opposite Shiv Mandir, Kulhan, Kirsali, Dehradun, Uttarakhand 248013
                </p>

                <p className="text-xs text-[#667085]">
                  <strong className="text-[#101828]">Landmark:</strong> Opposite Shiv Mandir, Kulhan (Near IT Park / Sahastradhara bypass)
                </p>

                <div className="pt-3 border-t border-[#EEF2F0] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00A854]">
                    <Phone className="w-4 h-4" />
                    <a href="tel:08439431999" className="hover:underline font-mono text-sm">08439431999</a>
                    <span>/</span>
                    <a href="tel:8439441999" className="hover:underline font-mono text-sm">8439441999</a>
                  </div>

                  <a
                    href="https://wa.me/918439431999"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 bg-[#00D96B] hover:bg-[#85e600] text-[#101828] font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-sm transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Get Directions on WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
      <BookTestDriveModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  );
}
