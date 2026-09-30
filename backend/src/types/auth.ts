import { Request } from 'express';

export type DataScope = 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN';

export interface UserPermission {
  code: string;
  scope: DataScope;
}

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  roleId: number;
  roleName: string;
  roleDisplayName: string;
  permissions: UserPermission[];
  avatarUrl?: string;
  hub_id?: number;
  hubId?: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  permissionScope?: DataScope;
}
