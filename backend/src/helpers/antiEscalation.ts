import { AuthenticatedUser } from '../types/auth';

export const canModifyUser = (currentUser: AuthenticatedUser, targetUserRoleId: number, targetUserRoleName: string): boolean => {
  // 1. Super Admin can modify anyone
  if (currentUser.roleName === 'SUPER_ADMIN') {
    return true;
  }

  // 2. No other role can modify or delete Super Admin
  if (targetUserRoleName === 'SUPER_ADMIN') {
    return false;
  }

  // 3. Admin can modify Managers and Sales Executives
  if (currentUser.roleName === 'ADMIN') {
    return targetUserRoleName !== 'SUPER_ADMIN';
  }

  // 4. Managers & Sales Executives cannot manage users
  return false;
};
