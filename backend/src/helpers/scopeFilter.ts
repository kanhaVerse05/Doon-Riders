import { AuthRequest } from '../types/auth';

export interface ScopeCondition {
  whereClause: string;
  params: any[];
}

export const buildLeadScopeCondition = (req: AuthRequest, paramOffset: number = 1): ScopeCondition => {
  const scope = req.permissionScope || 'ASSIGNED';
  const userId = req.user?.id;

  if (scope === 'ALL' || req.user?.roleName === 'SUPER_ADMIN' || req.user?.roleName === 'ADMIN' || req.user?.roleName === 'MANAGER') {
    return { whereClause: '1=1', params: [] };
  }

  if (scope === 'ASSIGNED') {
    return {
      whereClause: `assigned_to = $${paramOffset}`,
      params: [userId]
    };
  }

  if (scope === 'OWN') {
    return {
      whereClause: `(assigned_to = $${paramOffset} OR created_by = $${paramOffset + 1})`,
      params: [userId, userId]
    };
  }

  return {
    whereClause: `assigned_to = $${paramOffset}`,
    params: [userId]
  };
};
