'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Are the batteries chargeable at home or swappable?',
      a: 'All DOON Riders electric scooters use our high-efficiency swappable battery ecosystem. You do not need to wait hours for home charging—simply drive into any DOON Battery Swapping Station and get a 100% fully charged battery in under 2 minutes with zero downtime.',
    },
    {
      q: 'What is the Weekly Rental Plan and how is it cheaper than petrol?',
      a: 'Our Standard Weekly Plan is just ₹1,699/week (~₹242/day), which includes unlimited daily kilometres and unlimited battery swaps with no licence required. It eliminates all petrol expenses, engine oil changes, and routine maintenance costs completely, helping riders and delivery partners maximize their daily earnings.',
    },
    {
      q: 'Is maintenance and insurance included in the rental plan?',
      a: 'Yes, 100% included! Every routine service, tyre inspection, and brake check is on us. All technical faults, mechanical issues, and roadside breakdowns are covered by DOON Riders with zero out-of-pocket repair costs.',
    },
    {
      q: 'What documents are required to rent a DOON Riders EV?',
      a: 'You only need basic KYC documentation (Aadhaar Card). No driving licence is required for our legally approved speed EV mobility models, and onboarding is completed in under 3 minutes.',
    },
    {
      q: 'Where can I swap batteries in Dehradun?',
      a: 'We have 15+ convenient battery swapping hubs placed across key transit routes in Dehradun, including Clock Tower, Rajpur Road, ISBT, Jakhan, Ballupur, and Prem Nagar, backed by 24/7 support.',
    },
  ];

  return (
    <section id="questions" className="py-24 bg-[#EEF2F6] border-y border-[#EEF2F0] relative">
      <div className="max-w-4xl mx-auto px-6 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <span className="text-[#00A854] font-bold text-xs uppercase tracking-widest bg-[#EAFBF2] border border-[#D9FCA8] px-4 py-1.5 rounded-full inline-block">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="font-heading font-black text-3xl sm:text-4xl text-[#101828]">
            Got Questions? <span className="text-[#00D96B]">We Have Answers</span>
          </h2>
          <p className="text-sm sm:text-base text-[#475467]">
            Everything you need to know about EV rental plans, battery swaps, and zero-cost maintenance.
          </p>
        </div>

        {/* Accordions */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`bg-white border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isOpen ? 'border-[#00D96B] shadow-[0_4px_16px_rgba(0,217,107,0.1)]' : 'border-[#EEF2F0] hover:border-[#00D96B]/40'
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="font-bold text-sm sm:text-base text-[#101828]">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#00A854] transition-transform duration-300 flex-shrink-0 ml-4 ${
                      isOpen ? 'rotate-180 text-[#00D96B]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#475467] leading-relaxed border-t border-[#EEF2F0]/80">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
