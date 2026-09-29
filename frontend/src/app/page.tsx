'use client';
import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { Features } from '../components/Features';
import { DriveSection } from '../components/DriveSection';
import { VehicleShowcase } from '../components/VehicleShowcase';
import { Testimonials } from '../components/Testimonials';
import { FAQSection } from '../components/FAQSection';
import { ContactMapSection } from '../components/ContactMapSection';
import { Footer } from '../components/Footer';
import { BookTestDriveModal } from '../components/BookTestDriveModal';
import { VideoModal } from '../components/VideoModal';
import { fetchVehicles, Vehicle } from '../lib/api';

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | undefined>(undefined);
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    fetchVehicles().then((data) => {
      if (data && data.length > 0) {
        setVehicles(data);
      }
    });
  }, []);

  const handleOpenBooking = (vehicleName?: string) => {
    setSelectedVehicle(vehicleName);
    setBookingOpen(true);
  };

  return (
    <main className="min-h-screen bg-white text-[#101828] font-sans antialiased selection:bg-[#00D96B] selection:text-black">
      <Navbar onOpenBooking={handleOpenBooking} />
      <Hero onOpenBooking={handleOpenBooking} onOpenVideo={() => setVideoOpen(true)} />
      <Features onOpenBooking={handleOpenBooking} />
      <DriveSection onOpenBooking={() => handleOpenBooking()} />
      <VehicleShowcase vehicles={vehicles} onOpenBooking={handleOpenBooking} />
      <Testimonials />
      <FAQSection />
      <ContactMapSection />
      <Footer />

      {/* Modals */}
      <BookTestDriveModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        selectedVehicle={selectedVehicle}
      />
      <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
    </main>
  );
}
