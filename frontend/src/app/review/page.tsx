'use client';

import React, { Suspense } from 'react';
import CustomerReviewPage from './[id]/page';

export default function ReviewRootPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-[#00D96B] border-t-transparent animate-spin rounded-full" />
      </div>
    }>
      <CustomerReviewPage />
    </Suspense>
  );
}
