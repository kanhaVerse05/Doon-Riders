import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool, getDbStatus } from '../config/db';
import { AuthRequest, AuthenticatedUser } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'doon_riders_rbac_super_secret_jwt_key_2026';

export const authenticateJwt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    }

    // Fetch live user with role and permissions from DB
    if (getDbStatus()) {
      const userRes = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url,
               r.id as role_id, r.name as role_name, r.display_name as role_display_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
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

      const permissions = permRes.rows.map(row => ({
        code: row.code,
        scope: row.scope
      }));

      req.user = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        roleId: u.role_id,
        roleName: u.role_name,
        roleDisplayName: u.role_display_name,
        avatarUrl: u.avatar_url,
        permissions
      };
    } else {
      // In-memory fallback
      req.user = {
        id: decoded.id,
        name: decoded.name || 'Admin User',
        email: decoded.email || 'admin@doonriders.com',
        roleId: decoded.roleId || 1,
        roleName: decoded.roleName || 'SUPER_ADMIN',
        roleDisplayName: decoded.roleDisplayName || 'Super Admin',
        avatarUrl: decoded.avatarUrl || '/images/avt-1-70x70.jpg',
        permissions: decoded.permissions || []
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
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};
