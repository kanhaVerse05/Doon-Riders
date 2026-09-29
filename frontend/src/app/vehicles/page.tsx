'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { BookTestDriveModal } from '../../components/BookTestDriveModal';
import { GalleryImage, fetchGalleryImages } from '../../lib/api';
import {
  Camera,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  ArrowRight,
  Image as ImageIcon,
  ShieldCheck
} from 'lucide-react';
import Image from 'next/image';

const CATEGORIES = [
  'All',
  'Electric Scooters',
  'Battery Swap Hubs',
  'Hill Climbs & Roads',
  'Delivery Fleet',
  'Fleet Showcase'
];

export default function VehiclesGalleryPage() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | undefined>(undefined);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  useEffect(() => {
    loadGallery(selectedCategory);
  }, [selectedCategory]);

  const loadGallery = async (category: string) => {
    setLoading(true);
    try {
      const data = await fetchGalleryImages(category);
      setImages(data);
    } catch (err) {
      console.error('Failed to load gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeImageIndex === null) return;
      if (e.key === 'Escape') setActiveImageIndex(null);
      if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : images.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev !== null && prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeImageIndex, images.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeImageIndex === null) return;
    setActiveImageIndex(activeImageIndex > 0 ? activeImageIndex - 1 : images.length - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeImageIndex === null) return;
    setActiveImageIndex(activeImageIndex < images.length - 1 ? activeImageIndex + 1 : 0);
  };

  const handleBook = (name?: string) => {
    setSelectedVehicle(name);
    setBookingOpen(true);
  };

  const activeImage = activeImageIndex !== null ? images[activeImageIndex] : null;

  return (
    <div className="min-h-screen bg-white text-[#101828] font-sans flex flex-col justify-between overflow-x-hidden">
      <Navbar onOpenBooking={() => handleBook(undefined)} />

      <main className="flex-1 pt-28 sm:pt-36 pb-16 sm:pb-20">
        {/* Header Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8 text-center space-y-3 sm:space-y-4 mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-[#EAFBF2] border border-[#00D96B]/30 px-3.5 py-1.5 rounded-full shadow-sm">
            <Camera className="w-3.5 h-3.5 text-[#00A854]" />
            <span className="text-[10px] sm:text-[11px] font-bold text-[#00A854] tracking-widest uppercase">
              OFFICIAL FLEET &amp; VEHICLE GALLERY
            </span>
          </div>

          <h1 className="font-heading font-black text-3xl sm:text-5xl lg:text-6xl text-[#101828] tracking-tight leading-tight">
            Real Roads. <span className="text-[#00D96B]">Pure Electric.</span> Real Riders.
          </h1>

          <p className="text-xs sm:text-base text-[#475467] max-w-2xl mx-auto leading-relaxed px-2">
            Explore high-resolution photography of our smart electric scooter fleet across Dehradun, high-speed 2-minute battery swap hubs, and everyday commercial delivery partners in action.
          </p>

          {/* Category Filter Pills (Mobile Scrollable) */}
          <div className="flex items-center justify-start sm:justify-center gap-2 pt-3 overflow-x-auto pb-2 scrollbar-none px-2">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#00D96B] text-[#101828] shadow-[0_4px_12px_rgba(0,217,107,0.3)] scale-105'
                      : 'bg-[#F7F9FA] text-[#667085] hover:text-[#101828] border border-[#E5E7EB] hover:border-[#00D96B]/50'
                  }`}
                >
                  <span>{cat === 'All' ? 'All Visuals' : cat}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Clean Gallery Grid Section: Image on Top, Title & Small Description Below */}
        <section className="max-w-7xl mx-auto px-4 sm:px-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="rounded-3xl bg-[#F8FAFC] border border-[#E5E7EB] animate-pulse p-4 space-y-3"
                >
                  <div className="h-52 sm:h-60 bg-[#EEF2F6] rounded-2xl w-full"></div>
                  <div className="h-4 bg-[#E5E7EB] rounded w-2/3"></div>
                  <div className="h-3 bg-[#E5E7EB] rounded w-4/5"></div>
                </div>
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-16 sm:py-20 bg-[#F8FAFC] rounded-3xl border border-[#E5E7EB] p-6 sm:p-8 space-y-3">
              <ImageIcon className="w-12 h-12 text-[#98A2B3] mx-auto stroke-1" />
              <h3 className="text-base font-bold text-[#101828]">No photos found in this category</h3>
              <p className="text-xs text-[#667085]">Please select another category or check back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {images.map((img, idx) => (
                <div
                  key={img.id || idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className="group bg-white rounded-3xl border border-[#E5E7EB] hover:border-[#00D96B] p-3.5 sm:p-4 shadow-sm hover:shadow-[0_12px_30px_rgba(0,217,107,0.12)] transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3"
                >
                  {/* 1. Image Container (Clean View, Zero Dark Gradients Blocking Image) */}
                  <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-[#F8FAFC] flex items-center justify-center">
                    <Image
                      src={img.image_url}
                      alt={img.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-contain group-hover:scale-105 transition-transform duration-500 ease-out p-2"
                      unoptimized={img.image_url.startsWith('/uploads') || img.image_url.startsWith('http')}
                    />

                    {/* Top Category Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/95 backdrop-blur-md text-[#00A854] border border-[#00D96B]/30 px-2.5 py-1 rounded-full shadow-sm">
                        {img.category}
                      </span>
                    </div>

                    {/* Expand Icon Button */}
                    <div className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-[#101828] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <Maximize2 className="w-4 h-4 text-[#00A854]" />
                    </div>
                  </div>

                  {/* 2. Text Content: Title & Small Description Below */}
                  <div className="px-1.5 pb-1 space-y-1.5">
                    <h3 className="font-bold text-base sm:text-lg text-[#101828] leading-snug group-hover:text-[#00A854] transition-colors line-clamp-1">
                      {img.title}
                    </h3>
                    {img.description && (
                      <p className="text-xs text-[#667085] leading-relaxed line-clamp-2 font-normal">
                        {img.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Fullscreen Lightbox Modal (Mobile Touch Friendly) */}
      {activeImage && activeImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-[#071B12]/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-fadeIn overflow-y-auto"
          onClick={() => setActiveImageIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#00D96B] bg-[#071B12] border border-[#00D96B]/40 px-3 py-1 rounded-full uppercase tracking-wider">
                {activeImage.category}
              </span>
              <span className="text-xs text-white/70 font-mono">
                {activeImageIndex + 1} / {images.length}
              </span>
            </div>

            <button
              onClick={() => setActiveImageIndex(null)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Image with Navigation Buttons */}
          <div
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden min-h-[40vh] sm:min-h-[55vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            <button
              onClick={handlePrev}
              className="absolute left-1 sm:left-6 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-[#00D96B] text-white hover:text-[#101828] flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg"
              title="Previous (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Main Image */}
            <div className="relative max-w-5xl w-full h-[50vh] sm:h-[65vh] flex items-center justify-center">
              <Image
                src={activeImage.image_url}
                alt={activeImage.title}
                fill
                className="object-contain drop-shadow-2xl"
                priority
                unoptimized={activeImage.image_url.startsWith('/uploads') || activeImage.image_url.startsWith('http')}
              />
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="absolute right-1 sm:right-6 z-20 w-12 h-12 rounded-full bg-black/60 hover:bg-[#00D96B] text-white hover:text-[#101828] flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg"
              title="Next (Right Arrow)"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Bottom Caption & Action Bar */}
          <div
            className="max-w-3xl mx-auto w-full bg-black/60 backdrop-blur-md border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 z-20 text-center sm:text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h4 className="text-white font-bold text-base sm:text-lg">
                {activeImage.title}
              </h4>
              {activeImage.description && (
                <p className="text-xs text-white/70 mt-0.5">
                  {activeImage.description}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                const title = activeImage.title;
                setActiveImageIndex(null);
                handleBook(title);
              }}
              className="w-full sm:w-auto bg-[#00D96B] hover:bg-[#85e600] text-[#101828] font-bold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_14px_rgba(0,217,107,0.4)] transition flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
            >
              <span>BOOK / RENT THIS EV</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Footer />

      <BookTestDriveModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        selectedVehicle={selectedVehicle}
      />
    </div>
  );
}
