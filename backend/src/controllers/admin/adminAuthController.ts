import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { generateToken, getJwtSecret } from '../../middleware/authMiddleware';
import { logAuditEvent } from '../../helpers/auditLogger';
import { AuthRequest } from '../../types/auth';
import { loadUsersBackup } from '../../helpers/userStorage';
import {
  createBackupCodes,
  createTotpSecret,
  createTotpUri,
  decryptTotpSecret,
  encryptTotpSecret,
  hashBackupCode,
  verifyTotp,
} from '../../helpers/totp';

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
               u.totp_enabled, u.mfa_exempt,
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

      const devMfaExemptEmails = (process.env.DEV_MFA_EXEMPT_EMAILS || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      const isDevMfaExempt = process.env.APP_ENV === 'development'
        && process.env.NODE_ENV !== 'production'
        && devMfaExemptEmails.includes(cleanEmail);
      const mfaExempt = u.role_name === 'SUPER_ADMIN' && Boolean(u.mfa_exempt);

      if (u.role_name === 'SUPER_ADMIN' && !u.totp_enabled && !mfaExempt && !isDevMfaExempt) {
        const setupToken = jwt.sign(
          { id: u.id, purpose: 'totp_initial_setup' },
          getJwtSecret(),
          { expiresIn: '10m' }
        );
        return res.json({
          success: true,
          mfaSetupRequired: true,
          challengeToken: setupToken,
          message: 'Set up your authenticator to finish signing in.',
        });
      }

      if (u.totp_enabled && !mfaExempt) {
        const challengeToken = jwt.sign(
          { id: u.id, purpose: 'totp_login' },
          getJwtSecret(),
          { expiresIn: '5m' }
        );
        return res.json({
          success: true,
          mfaRequired: true,
          challengeToken,
          message: 'Enter the 6-digit code from your authenticator app.',
        });
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

const readSetupChallenge = (challengeToken: string) => {
  const decoded: any = jwt.verify(challengeToken, getJwtSecret());
  if (decoded?.purpose !== 'totp_initial_setup' || !decoded.id) {
    throw new Error('Invalid authenticator setup session. Sign in again.');
  }
  return decoded;
};

export const beginInitialMfaSetup = async (req: Request, res: Response) => {
  try {
    if (!getDbStatus()) return res.status(503).json({ success: false, message: 'Authenticator setup requires the database.' });
    const challenge = readSetupChallenge(String(req.body?.challengeToken || ''));
    const userRes = await pool.query(`
      SELECT u.email, u.status, u.totp_enabled, r.name AS role_name
      FROM users u LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `, [challenge.id]);
    const user = userRes.rows[0];
    if (!user || user.status !== 'active' || user.role_name !== 'SUPER_ADMIN' || user.totp_enabled) {
      return res.status(403).json({ success: false, message: 'Initial setup is only available to an active Super Admin without authenticator enabled.' });
    }

    const secret = createTotpSecret();
    await pool.query(
      'UPDATE users SET totp_pending_secret_encrypted = $1 WHERE id = $2',
      [encryptTotpSecret(secret), challenge.id]
    );
    return res.json({ success: true, secret, otpauthUrl: createTotpUri(user.email, secret) });
  } catch (err: any) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(expired ? 401 : 400).json({
      success: false,
      message: expired ? 'Setup session expired. Sign in again to restart.' : err.message,
    });
  }
};

export const confirmInitialMfaSetup = async (req: Request, res: Response) => {
  try {
    if (!getDbStatus()) return res.status(503).json({ success: false, message: 'Authenticator setup requires the database.' });
    const challenge = readSetupChallenge(String(req.body?.challengeToken || ''));
    const userRes = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url, u.custom_permissions,
             u.totp_pending_secret_encrypted, u.totp_failed_attempts, u.totp_locked_until,
             r.id AS role_id, r.name AS role_name, r.display_name AS role_display_name,
             r.permissions_configured AS role_permissions_configured
      FROM users u LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
    `, [challenge.id]);
    const user = userRes.rows[0];
    if (!user || user.status !== 'active' || user.role_name !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Initial setup is only available to an active Super Admin.' });
    }
    if (user.totp_locked_until && new Date(user.totp_locked_until).getTime() > Date.now()) {
      return res.status(429).json({ success: false, message: 'Too many incorrect codes. Try again in 15 minutes.' });
    }
    if (!user.totp_pending_secret_encrypted) {
      return res.status(400).json({ success: false, message: 'Authenticator setup expired. Sign in again to restart.' });
    }

    const secret = decryptTotpSecret(user.totp_pending_secret_encrypted);
    if (!verifyTotp(secret, String(req.body?.code || ''))) {
      const failedAttempts = Number(user.totp_failed_attempts || 0) + 1;
      const lockAccount = failedAttempts >= 5;
      await pool.query(`
        UPDATE users
        SET totp_failed_attempts = CASE WHEN $1 THEN 0 ELSE $2 END,
            totp_locked_until = CASE WHEN $1 THEN NOW() + INTERVAL '15 minutes' ELSE totp_locked_until END
        WHERE id = $3
      `, [lockAccount, failedAttempts, user.id]);
      return res.status(lockAccount ? 429 : 401).json({
        success: false,
        message: lockAccount ? 'Too many incorrect codes. Try again in 15 minutes.' : 'Code did not match. Enter the current code shown in Google Authenticator.',
      });
    }

    const backupCodes = createBackupCodes();
    await pool.query(`
      UPDATE users
      SET totp_secret_encrypted = totp_pending_secret_encrypted,
          totp_pending_secret_encrypted = NULL,
          totp_backup_codes = $1::jsonb,
          totp_enabled = TRUE,
          totp_failed_attempts = 0,
          totp_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(backupCodes.map(hashBackupCode)), user.id]);

    const permissions = await computeUserPermissions(user);
    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.role_id,
      roleName: user.role_name,
      roleDisplayName: user.role_display_name,
      avatarUrl: user.avatar_url,
      customPermissions: user.custom_permissions,
      permissions,
    };
    const token = generateToken(authUser);
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    await logAuditEvent({
      userId: user.id,
      userName: user.name,
      userRole: user.role_name,
      action: 'MFA_ENABLED',
      module: 'AUTH',
      notes: `Authenticator enabled during first sign-in for ${user.email}`,
      ipAddress: req.ip,
    });
    return res.json({ success: true, token, user: authUser, backupCodes, message: 'Authenticator enabled successfully.' });
  } catch (err: any) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(expired ? 401 : 400).json({
      success: false,
      message: expired ? 'Setup session expired. Sign in again to restart.' : err.message,
    });
  }
};

export const verifyMfaLogin = async (req: Request, res: Response) => {
  let client: Awaited<ReturnType<typeof pool.connect>> | null = null;
  try {
    if (!getDbStatus()) {
      return res.status(503).json({ success: false, message: 'Authenticator verification requires the database.' });
    }
    const { challengeToken, code } = req.body || {};
    if (!challengeToken || !code) {
      return res.status(400).json({ success: false, message: 'Verification token and authenticator code are required.' });
    }

    let challenge: any;
    try {
      challenge = jwt.verify(challengeToken, getJwtSecret());
    } catch (_) {
      return res.status(401).json({ success: false, message: 'Verification session expired. Please sign in again.' });
    }
    if (challenge?.purpose !== 'totp_login' || !challenge.id) {
      return res.status(401).json({ success: false, message: 'Invalid verification session.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    const userRes = await client.query(`
      SELECT u.id, u.name, u.email, u.password_hash, u.phone, u.status, u.avatar_url, u.custom_permissions,
             u.totp_enabled, u.totp_secret_encrypted, u.totp_backup_codes,
             u.totp_failed_attempts, u.totp_locked_until,
             r.id AS role_id, r.name AS role_name, r.display_name AS role_display_name,
             r.permissions_configured AS role_permissions_configured
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND u.deleted_at IS NULL
      FOR UPDATE OF u
    `, [challenge.id]);

    if (userRes.rows.length === 0 || userRes.rows[0].status !== 'active' || !userRes.rows[0].totp_enabled) {
      await client.query('ROLLBACK');
      return res.status(401).json({ success: false, message: 'Account or authenticator setup is no longer active.' });
    }

    const u = userRes.rows[0];
    if (u.totp_locked_until && new Date(u.totp_locked_until).getTime() > Date.now()) {
      await client.query('ROLLBACK');
      return res.status(429).json({ success: false, message: 'Too many incorrect codes. Try again in 15 minutes.' });
    }
    let verified = false;
    try {
      verified = Boolean(u.totp_secret_encrypted)
        && verifyTotp(decryptTotpSecret(u.totp_secret_encrypted), String(code));
    } catch (_) {
      verified = false;
    }

    let remainingBackupCodes: string[] | null = null;
    if (!verified) {
      const suppliedHash = hashBackupCode(String(code));
      const savedCodes: string[] = Array.isArray(u.totp_backup_codes) ? u.totp_backup_codes : [];
      const matchedIndex = savedCodes.indexOf(suppliedHash);
      if (matchedIndex >= 0) {
        remainingBackupCodes = savedCodes.filter((_: string, index: number) => index !== matchedIndex);
        verified = true;
      }
    }

    if (!verified) {
      const failedAttempts = Number(u.totp_failed_attempts || 0) + 1;
      const lockAccount = failedAttempts >= 5;
      await client.query(`
        UPDATE users
        SET totp_failed_attempts = CASE WHEN $1 THEN 0 ELSE $2 END,
            totp_locked_until = CASE WHEN $1 THEN NOW() + INTERVAL '15 minutes' ELSE totp_locked_until END
        WHERE id = $3
      `, [lockAccount, failedAttempts, u.id]);
      await client.query('COMMIT');
      return res.status(lockAccount ? 429 : 401).json({
        success: false,
        message: lockAccount ? 'Too many incorrect codes. Try again in 15 minutes.' : 'Authenticator code is incorrect.',
      });
    }

    if (remainingBackupCodes) {
      await client.query('UPDATE users SET totp_backup_codes = $1::jsonb WHERE id = $2', [JSON.stringify(remainingBackupCodes), u.id]);
    }
    await client.query('UPDATE users SET totp_failed_attempts = 0, totp_locked_until = NULL WHERE id = $1', [u.id]);

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
      permissions,
    };
    await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [u.id]);
    await client.query('COMMIT');

    const token = generateToken(authUser);
    await logAuditEvent({
      userId: u.id,
      userName: u.name,
      userRole: u.role_name,
      action: 'LOGIN_MFA',
      module: 'AUTH',
      notes: `User ${u.name} completed authenticator verification`,
      ipAddress: req.ip,
    });
    return res.json({ success: true, message: 'Login successful', token, user: authUser });
  } catch (err: any) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    client?.release();
  }
};

export const getMfaStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!getDbStatus()) return res.status(503).json({ success: false, message: 'Authenticator setup requires the database.' });
    const result = await pool.query('SELECT totp_enabled FROM users WHERE id = $1 AND deleted_at IS NULL', [req.user?.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, enabled: Boolean(result.rows[0].totp_enabled) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const beginMfaSetup = async (req: AuthRequest, res: Response) => {
  try {
    if (!getDbStatus()) return res.status(503).json({ success: false, message: 'Authenticator setup requires the database.' });
    const secret = createTotpSecret();
    await pool.query(
      'UPDATE users SET totp_pending_secret_encrypted = $1 WHERE id = $2 AND deleted_at IS NULL',
      [encryptTotpSecret(secret), req.user?.id]
    );
    return res.json({ success: true, secret, otpauthUrl: createTotpUri(req.user?.email || '', secret) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const confirmMfaSetup = async (req: AuthRequest, res: Response) => {
  try {
    if (!getDbStatus()) return res.status(503).json({ success: false, message: 'Authenticator setup requires the database.' });
    const { code } = req.body || {};
    const result = await pool.query(
      'SELECT totp_pending_secret_encrypted FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.user?.id]
    );
    const encryptedPendingSecret = result.rows[0]?.totp_pending_secret_encrypted;
    if (!encryptedPendingSecret) {
      return res.status(400).json({ success: false, message: 'Start authenticator setup before confirming it.' });
    }

    const secret = decryptTotpSecret(encryptedPendingSecret);
    if (!verifyTotp(secret, String(code || ''))) {
      return res.status(400).json({ success: false, message: 'Code did not match. Check your phone time and try the current code again.' });
    }

    const backupCodes = createBackupCodes();
    await pool.query(`
      UPDATE users
      SET totp_secret_encrypted = totp_pending_secret_encrypted,
          totp_pending_secret_encrypted = NULL,
          totp_backup_codes = $1::jsonb,
          totp_enabled = TRUE,
          totp_failed_attempts = 0,
          totp_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(backupCodes.map(hashBackupCode)), req.user?.id]);
    return res.json({ success: true, backupCodes, message: 'Authenticator enabled. Save these one-time backup codes now.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const disableMfa = async (req: AuthRequest, res: Response) => {
  try {
    if (!getDbStatus()) return res.status(503).json({ success: false, message: 'Authenticator management requires the database.' });
    const { password, code } = req.body || {};
    if (!password || !code) return res.status(400).json({ success: false, message: 'Password and current authenticator code are required.' });
    const result = await pool.query(
      'SELECT password_hash, totp_secret_encrypted FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.user?.id]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(String(password).trim(), user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Password is incorrect.' });
    }
    if (!user.totp_secret_encrypted || !verifyTotp(decryptTotpSecret(user.totp_secret_encrypted), String(code))) {
      return res.status(401).json({ success: false, message: 'Authenticator code is incorrect.' });
    }
    await pool.query(`
      UPDATE users
      SET totp_enabled = FALSE,
          totp_secret_encrypted = NULL,
          totp_pending_secret_encrypted = NULL,
          totp_backup_codes = '[]'::jsonb,
          totp_failed_attempts = 0,
          totp_locked_until = NULL,
          updated_at = NOW()
      WHERE id = $1
    `, [req.user?.id]);
    return res.json({ success: true, message: 'Authenticator disabled.' });
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
