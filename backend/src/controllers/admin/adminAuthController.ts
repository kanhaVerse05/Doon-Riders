import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { generateToken } from '../../middleware/authMiddleware';
import { logAuditEvent } from '../../helpers/auditLogger';
import { AuthRequest } from '../../types/auth';
import { loadUsersBackup } from '../../helpers/userStorage';

import { getPermissionsForRole, resolveRolePermissions } from '../../helpers/rbacHelper';
export { getPermissionsForRole };

export async function computeUserPermissions(u: any): Promise<Array<{ code: string; scope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN' }>> {
  const roleName = (u.role_name || '').toUpperCase();

  if (roleName === 'SUPER_ADMIN') {
    return getPermissionsForRole('SUPER_ADMIN');
  }

  let storedPermissions: Array<{ code: string; scope: 'ALL' | 'TEAM' | 'ASSIGNED' | 'OWN' }> = [];
  if (getDbStatus() && u.role_id) {
    try {
      const permRes = await pool.query(`
        SELECT p.code, rp.scope
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1
      `, [u.role_id]);
      storedPermissions = permRes.rows.map((row: any) => ({ code: row.code, scope: row.scope }));
    } catch (_) {}
  }

  const roleIsConfigured = Boolean(u.role_permissions_configured);
  return resolveRolePermissions(roleName, storedPermissions, roleIsConfigured, u.custom_permissions);
}

const computeMemoryPermissions = (role: any, user: any) => {
  const storedPermissions = (memoryStore.rolePermissions || [])
    .filter((permission: any) => Number(permission.role_id) === Number(role.id))
    .map((permission: any) => ({ code: permission.code, scope: permission.scope }));
  return resolveRolePermissions(
    role.name,
    storedPermissions,
    Boolean(role.permissions_configured),
    user?.custom_permissions
  );
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    if (getDbStatus()) {
      const userRes = await pool.query(`
        SELECT u.id, u.name, u.email, u.password_hash, u.phone, u.status, u.avatar_url, u.custom_permissions,
               r.id as role_id, r.name as role_name, r.display_name as role_display_name,
               r.permissions_configured as role_permissions_configured
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE LOWER(u.email) = $1 AND u.deleted_at IS NULL
      `, [cleanEmail]);

      if (userRes.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
      }

      const u = userRes.rows[0];
      if (u.status !== 'active') {
        return res.status(403).json({ success: false, message: `Account is ${u.status}. Please contact Admin.` });
      }

      // Check password
      const isMatch = await bcrypt.compare(cleanPassword, u.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const permissions = await computeUserPermissions(u);

      const authUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        roleId: u.role_id,
        roleName: u.role_name || 'SALES_EXECUTIVE',
        roleDisplayName: u.role_display_name || 'Team Member',
        avatarUrl: u.avatar_url,
        customPermissions: u.custom_permissions,
        permissions
      };

      const token = generateToken(authUser);

      await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [u.id]);

      await logAuditEvent({
        userId: u.id,
        userName: u.name,
        userRole: u.role_name,
        action: 'LOGIN',
        module: 'AUTH',
        notes: `User ${u.name} (${u.role_display_name}) logged in successfully`,
        ipAddress: req.ip
      });

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: authUser
      });
    }

    // Resilient Fallback: Memory Store / Disk Backup
    const candidateUsers = (memoryStore.users && memoryStore.users.length > 0) ? memoryStore.users : loadUsersBackup();
    const u = candidateUsers.find((user: any) => user.email.toLowerCase().trim() === cleanEmail);
    if (!u) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const isMatch = u.password_hash ? await bcrypt.compare(cleanPassword, u.password_hash) : false;
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const roleObj = memoryStore.roles.find(r => r.id === u.role_id) || {
      id: u.role_id,
      name: u.role_name || 'SALES_EXECUTIVE',
      display_name: u.role_display_name || 'Sales Executive'
    };

    const permissions = computeMemoryPermissions(roleObj, u);

    const authUser = {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      roleId: u.role_id,
      roleName: roleObj.name,
      roleDisplayName: roleObj.display_name,
      avatarUrl: u.avatar_url,
      permissions
    };

    const token = generateToken(authUser);
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: authUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const switchRoleDemo = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;

    const emailMap: Record<string, string> = {
      SUPER_ADMIN: 'doonridersmain@gmail.com',
      MANAGER: 'manager@doonriders.com',
      SALES_EXECUTIVE: 'rahul.sales@doonriders.com',
      HUB_INCHARGE: 'hub.isbt@doonriders.com',
      TECHNICIAN: 'amit.tech@doonriders.com',
      RECOVERY_AGENT: 'doonridersmain@gmail.com',
      PRE_BOOKING: 'r8986257@gmail.com',
    };

    const targetEmail = emailMap[role] || 'doonridersmain@gmail.com';

    if (getDbStatus()) {
      const userRes = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url, u.custom_permissions,
               r.id as role_id, r.name as role_name, r.display_name as role_display_name
               ,r.permissions_configured as role_permissions_configured
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE LOWER(u.email) = $1
      `, [targetEmail.toLowerCase()]);

      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Role demo user not found.' });
      }

      const u = userRes.rows[0];
      const permissions = await computeUserPermissions(u);

      const authUser = {
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

      const token = generateToken(authUser);

      return res.json({
        success: true,
        message: `Switched to role: ${u.role_display_name}`,
        token,
        user: authUser
      });
    }

    const targetRole = memoryStore.roles.find(r => r.name === role) || memoryStore.roles[0];
    const demoUser = memoryStore.users.find(u => u.role_id === targetRole.id) || memoryStore.users[0];
    const permissions = computeMemoryPermissions(targetRole, demoUser);

    const authUser = {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
      phone: demoUser.phone,
      roleId: targetRole.id,
      roleName: targetRole.name,
      roleDisplayName: targetRole.display_name,
      avatarUrl: demoUser.avatar_url,
      permissions
    };

    const token = generateToken(authUser);
    return res.json({
      success: true,
      message: `Switched to role: ${targetRole.display_name} (Memory Store)`,
      token,
      user: authUser
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (getDbStatus()) {
      const userRes = await pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url, u.custom_permissions,
               r.id as role_id, r.name as role_name, r.display_name as role_display_name,
               r.permissions_configured as role_permissions_configured
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1 AND u.deleted_at IS NULL
      `, [userId]);

      if (userRes.rows.length > 0) {
        const u = userRes.rows[0];
        const permissions = await computeUserPermissions(u);
        const authUser = {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          roleId: u.role_id,
          roleName: u.role_name || 'SALES_EXECUTIVE',
          roleDisplayName: u.role_display_name || 'Team Member',
          avatarUrl: u.avatar_url,
          customPermissions: u.custom_permissions,
          permissions
        };
        return res.json({ success: true, user: authUser });
      }
    }

    return res.json({
      success: true,
      user: req.user
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
