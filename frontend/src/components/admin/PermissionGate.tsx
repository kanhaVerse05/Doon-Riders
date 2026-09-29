'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface PermissionGateProps {
  permission: string;
  scope?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  scope,
  fallback = null,
  children
}) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission, scope)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
