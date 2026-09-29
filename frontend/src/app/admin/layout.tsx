import React from 'react';
import { AuthProvider } from '../../context/AuthContext';

export const metadata = {
  title: 'DOON Riders - EV Scooty Rental Admin & RBAC Portal',
  description: 'Enterprise Lead CRM, Fleet & Rental Management with Role-Based Access Control'
};

export default function RootAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
