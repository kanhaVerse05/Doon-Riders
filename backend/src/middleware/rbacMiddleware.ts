import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth';

export const requirePermission = (permissionCode: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User context missing.' });
    }

    // 1. Super Admin has unrestricted access to everything
    if (req.user.roleName === 'SUPER_ADMIN') {
      req.permissionScope = 'ALL';
      return next();
    }

    // 2. Find permission mapping for the user's role
    const perm = req.user.permissions.find(p => p.code === permissionCode);
    if (!perm) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You lack the required permission [${permissionCode}] to perform this action.`
      });
    }

    // Attach permission scope (ALL, TEAM, ASSIGNED, OWN)
    req.permissionScope = perm.scope;
    next();
  };
};

export const requireAnyPermission = (...permissionCodes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized: User context missing.' });
    }

    // Super Admin has unrestricted access to everything
    if (req.user.roleName === 'SUPER_ADMIN') {
      req.permissionScope = 'ALL';
      return next();
    }

    // Check if user has ANY of the requested permission codes
    const perm = req.user.permissions?.find(p => permissionCodes.includes(p.code));
    if (!perm) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You lack the required permission [${permissionCodes.join(' or ')}] to perform this action.`
      });
    }

    req.permissionScope = perm.scope;
    next();
  };
};
