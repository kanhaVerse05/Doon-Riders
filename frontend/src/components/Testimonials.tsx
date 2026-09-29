'use client';

import React from 'react';
import { Star, Quote } from 'lucide-react';

export const Testimonials: React.FC = () => {
  const reviews = [
    {
      name: 'Amit Sharma',
      role: 'Food Delivery Partner, Dehradun',
      avatar: '/images/avatars/rider-amit.jpg',
      text: 'Pehle petrol me har mahine ₹5,000–₹6,000 lag jate the. DOON Riders ka weekly rental plan lene ke baad meri monthly savings double ho gayi hai. Battery swap bas 2 minute me ho jata hai, zero downtime!',
    },
    {
      name: 'Rahul Rawat',
      role: 'Quick Commerce Rider, Rajpur Road',
      avatar: '/images/avatars/rider-rahul.jpg',
      text: 'Best EV rental service in Uttarakhand! Unlimited daily km and quick battery swaps have made daily delivery work completely hassle-free. Maintenance aur brake checkup sab free rehta hai.',
    },
    {
      name: 'Pooja Negi',
      role: 'Daily Office Commuter, Jakhan',
      avatar: '/images/avatars/rider-pooja.jpg',
      text: 'Switching to DOON Riders has cut my travel expense to almost nothing. Traffic me super smooth and silent ride hai, aur koi heavy security deposit ya licence ka tension nahi hai.',
    },
  ];

  return (
    <section id="testimonial" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <span className="text-[#00A854] font-bold text-xs uppercase tracking-widest bg-[#EAFBF2] border border-[#D9FCA8] px-4 py-1.5 rounded-full inline-block">
            RIDER EXPERIENCES
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#101828]">
            Loved by <span className="text-[#00D96B]">Daily Riders</span>
          </h2>
          <p className="text-sm sm:text-base text-[#475467]">
            Real feedback from delivery partners and daily commuters riding across Uttarakhand.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((r, idx) => (
            <div
              key={idx}
              className="bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#00D96B]/50 rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_rgba(16,24,40,0.06)]"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <Quote className="w-5 h-5 text-[#00D96B]/40" />
                </div>
                <p className="text-[#475467] text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                  &ldquo;{r.text}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-[#EEF2F0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.avatar}
                  alt={r.name}
                  className="w-11 h-11 rounded-xl object-cover ring-2 ring-[#00D96B]/40 shadow-sm"
                />
                <div>
                  <h4 className="font-bold text-sm text-[#101828]">{r.name}</h4>
                  <p className="text-[11px] text-[#00A854] font-medium">{r.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
