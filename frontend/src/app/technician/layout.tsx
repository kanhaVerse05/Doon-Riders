import React from 'react';
import { AuthProvider } from '../../context/AuthContext';

export const metadata = {
  title: 'DOON Riders - Technician Mobile App',
  description: 'Technician Job Cards, Diagnostics, Parts Replacement & Repair Workflow'
};

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
