import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool, getDbStatus, memoryStore } from '../config/db';
import { AuthRequest, AuthenticatedUser } from '../types/auth';
import { resolveRolePermissions } from '../helpers/rbacHelper';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  }
  return secret;
};

export const authenticateJwt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, getJwtSecret()) as any;

    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    }

    // Fetch live user with role and permissions from DB
    if (getDbStatus()) {
      const userRes = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url, u.custom_permissions,
               r.id as role_id, r.name as role_name, r.display_name as role_display_name,
               r.permissions_configured as role_permissions_configured
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `, [decoded.id]);

      if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active') {
        return res.status(401).json({ success: false, message: 'User account is inactive, suspended, or not found.' });
      }

      const u = userRes.rows[0];

      // Fetch user's permissions and data scopes
      const permRes = await pool.query(`
        SELECT p.code, rp.scope
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1
      `, [u.role_id]);

      const storedPermissions = permRes.rows.map(row => ({
        code: row.code,
        scope: row.scope
      }));
      const permissions = resolveRolePermissions(
        u.role_name,
        storedPermissions,
        Boolean(u.role_permissions_configured),
        u.custom_permissions
      );

      req.user = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        roleId: u.role_id,
        roleName: u.role_name,
        roleDisplayName: u.role_display_name,
        avatarUrl: u.avatar_url,
        customPermissions: u.custom_permissions,
        permissions
      };
    } else {
      const memoryUser = memoryStore.users.find(candidate => Number(candidate.id) === Number(decoded.id));
      if (!memoryUser || memoryUser.status !== 'active') {
        return res.status(401).json({ success: false, message: 'User account is inactive, suspended, or not found.' });
      }
      const memoryRole = memoryStore.roles.find(role => role.id === memoryUser.role_id);
      const roleName = memoryRole?.name || memoryUser.role_name || 'UNASSIGNED';
      const storedPermissions = (memoryStore.rolePermissions || [])
        .filter((permission: any) => Number(permission.role_id) === Number(memoryUser.role_id))
        .map((permission: any) => ({ code: permission.code, scope: permission.scope }));
      const permissions = resolveRolePermissions(
        roleName,
        storedPermissions,
        Boolean(memoryRole?.permissions_configured),
        memoryUser.custom_permissions
      );
      // In-memory fallback
      req.user = {
        id: memoryUser.id,
        name: memoryUser.name,
        email: memoryUser.email,
        phone: memoryUser.phone,
        roleId: memoryUser.role_id || 0,
        roleName,
        roleDisplayName: memoryRole?.display_name || memoryUser.role_display_name || 'Team Member',
        avatarUrl: memoryUser.avatar_url || '',
        permissions
      };
    }

    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'Authentication failed: ' + err.message });
  }
};

export const generateToken = (user: AuthenticatedUser): string => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.roleName,
      roleDisplayName: user.roleDisplayName,
      avatarUrl: user.avatarUrl
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};
