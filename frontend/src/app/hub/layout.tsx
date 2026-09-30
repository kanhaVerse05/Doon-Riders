import React from 'react';
import { AuthProvider } from '../../context/AuthContext';

export const metadata = {
  title: 'DOON Riders - Hub Incharge Portal',
  description: 'Hub Fleet, Field RSA Complaints, Workshop Repairs & Inventory Management'
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
