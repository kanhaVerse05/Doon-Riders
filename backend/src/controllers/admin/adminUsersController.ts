import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { canModifyUser } from '../../helpers/antiEscalation';
import { logAuditEvent } from '../../helpers/auditLogger';
import {
  loadUsersBackup,
  appendOrUpdateUserBackup,
  deleteUserBackup,
  syncUsersWithDb
} from '../../helpers/userStorage';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (getDbStatus()) {
      const query = `
        SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url, u.last_login, u.created_at, u.custom_permissions,
               r.id as role_id, r.name as role_name, r.display_name as role_display_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.deleted_at IS NULL
          AND u.email NOT IN ('admin@doonriders.com', 'manager@doonriders.com', 'rahul.sales@doonriders.com', 'priya.sales@doonriders.com', 'amit.sales@doonriders.com', 'amit.tech@doonriders.com', 'hub.isbt@doonriders.com')
        ORDER BY u.id ASC
      `;
      const result = await pool.query(query);
      await syncUsersWithDb(result.rows, pool);
      return res.json({ success: true, data: result.rows });
    }

    // Disk backup & memory store fallback
    const backupUsers = loadUsersBackup();
    const usersWithRoles = backupUsers.map(u => {
      const role = memoryStore.roles.find(r => r.id === u.role_id) || {
        id: u.role_id,
        name: u.role_name || 'CUSTOM_ROLE',
        display_name: u.role_display_name || 'Custom Role'
      };
      return {
        ...u,
        role_id: role.id,
        role_name: u.role_name || role.name,
        role_display_name: u.role_display_name || role.display_name
      };
    });

    return res.json({ success: true, data: usersWithRoles });
  } catch (err: any) {
    const backupUsers = loadUsersBackup();
    return res.json({ success: true, data: backupUsers });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, roleId, role_name, roleName, custom_role_name, password } = req.body;
    const finalAvatar = req.body.avatar_url || req.body.avatarUrl || req.body.avatar || null;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    let finalRoleId = roleId ? Number(roleId) : 4;
    let finalRoleDisplayName = 'Sales Executive';
    let finalRoleName = 'SALES_EXECUTIVE';

    // If a custom role name was typed (e.g., "Technician", "Hub Incharge", "XYZ")
    if (custom_role_name && custom_role_name.trim().length > 0) {
      const cleanCustomName = custom_role_name.trim();
      const cleanCode = cleanCustomName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

      if (getDbStatus()) {
        const existingRoleRes = await pool.query(
          'SELECT * FROM roles WHERE LOWER(display_name) = LOWER($1) OR name = $2',
          [cleanCustomName, cleanCode]
        );

        if (existingRoleRes.rows.length > 0) {
          finalRoleId = existingRoleRes.rows[0].id;
          finalRoleDisplayName = existingRoleRes.rows[0].display_name;
          finalRoleName = existingRoleRes.rows[0].name;
        } else {
          const createRoleRes = await pool.query(
            'INSERT INTO roles (name, display_name, description, is_system) VALUES ($1, $2, $3, FALSE) RETURNING id',
            [cleanCode, cleanCustomName, `Custom role: ${cleanCustomName}`]
          );
          finalRoleId = createRoleRes.rows[0]?.id || 4;
          finalRoleDisplayName = cleanCustomName;
          finalRoleName = cleanCode;
        }
      } else {
        const existingMemoryRole = memoryStore.roles.find(
          r => r.display_name.toLowerCase() === cleanCustomName.toLowerCase() || r.name === cleanCode
        );
        if (existingMemoryRole) {
          finalRoleId = existingMemoryRole.id;
          finalRoleDisplayName = existingMemoryRole.display_name;
          finalRoleName = existingMemoryRole.name;
        } else {
          const nextRoleId = memoryStore.roles.length > 0 ? Math.max(...memoryStore.roles.map(r => r.id)) + 1 : 1;
          const newRoleObj = {
            id: nextRoleId,
            name: cleanCode,
            display_name: cleanCustomName,
            description: `Custom role: ${cleanCustomName}`,
            is_system: false
          };
          memoryStore.roles.push(newRoleObj);
          finalRoleId = nextRoleId;
          finalRoleDisplayName = cleanCustomName;
          finalRoleName = cleanCode;
        }
      }
    } else if (finalRoleId || role_name || roleName) {
      const roleNameHint = (role_name || roleName || '').trim().toUpperCase();
      if (getDbStatus()) {
        let roleRes = await pool.query('SELECT id, name, display_name FROM roles WHERE id = $1', [finalRoleId]);
        if (roleRes.rows.length === 0 && roleNameHint) {
          roleRes = await pool.query(
            'SELECT id, name, display_name FROM roles WHERE UPPER(name) = $1 OR UPPER(display_name) = $1 LIMIT 1',
            [roleNameHint]
          );
        }
        // Match standard role aliases
        if (roleRes.rows.length === 0 && (finalRoleId === 9 || finalRoleId === 17 || roleNameHint.includes('RECOVERY'))) {
          roleRes = await pool.query("SELECT id, name, display_name FROM roles WHERE name = 'RECOVERY_AGENT' LIMIT 1");
        }
        if (roleRes.rows.length === 0 && (finalRoleId === 8 || finalRoleId === 16 || roleNameHint.includes('ACCOUNTANT'))) {
          roleRes = await pool.query("SELECT id, name, display_name FROM roles WHERE name = 'ACCOUNTANT' LIMIT 1");
        }
        if (roleRes.rows.length === 0 && (finalRoleId === 7 || finalRoleId === 8 || roleNameHint.includes('PRE_BOOK') || roleNameHint.includes('PRE-BOOK'))) {
          roleRes = await pool.query("SELECT id, name, display_name FROM roles WHERE name = 'PRE_BOOKING' LIMIT 1");
        }

        if (roleRes.rows.length > 0) {
          finalRoleId = roleRes.rows[0].id;
          finalRoleName = roleRes.rows[0].name;
          finalRoleDisplayName = roleRes.rows[0].display_name;
        } else {
          // If the passed role ID does not exist in roles table, check for standard SALES_EXECUTIVE role
          const fallbackRes = await pool.query("SELECT id, name, display_name FROM roles WHERE name = 'SALES_EXECUTIVE' LIMIT 1");
          if (fallbackRes.rows.length > 0) {
            finalRoleId = fallbackRes.rows[0].id;
            finalRoleName = fallbackRes.rows[0].name;
            finalRoleDisplayName = fallbackRes.rows[0].display_name;
          } else {
            const anyRoleRes = await pool.query("SELECT id, name, display_name FROM roles ORDER BY id ASC LIMIT 1");
            if (anyRoleRes.rows.length > 0) {
              finalRoleId = anyRoleRes.rows[0].id;
              finalRoleName = anyRoleRes.rows[0].name;
              finalRoleDisplayName = anyRoleRes.rows[0].display_name;
            }
          }
        }
      } else {
        const memoryRole = memoryStore.roles.find(r => r.id === finalRoleId || (roleNameHint && (r.name === roleNameHint || r.display_name.toUpperCase() === roleNameHint)));
        if (memoryRole) {
          finalRoleId = memoryRole.id;
          finalRoleName = memoryRole.name;
          finalRoleDisplayName = memoryRole.display_name;
        }
      }
    }

    // Anti-privilege Escalation
    if (finalRoleName === 'SUPER_ADMIN' && req.user?.roleName !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Only Super Admin can create Super Admin accounts.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanEmail = email.toLowerCase().trim();

    if (getDbStatus()) {
      const query = `
        INSERT INTO users (name, email, password_hash, phone, role_id, status, avatar_url)
        VALUES ($1, $2, $3, $4, $5, 'active', $6)
        RETURNING id
      `;

      const result = await pool.query(query, [name, cleanEmail, hashedPassword, phone || null, finalRoleId, finalAvatar]);
      const newUserId = result.rows[0]?.id;

      const createdUser = {
        id: newUserId,
        name,
        email: cleanEmail,
        phone: phone || null,
        role_id: finalRoleId,
        role_name: finalRoleName,
        role_display_name: finalRoleDisplayName,
        avatar_url: finalAvatar,
        status: 'active',
        created_at: new Date().toISOString()
      };

      appendOrUpdateUserBackup(createdUser);

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'CREATE',
        module: 'USERS',
        recordId: newUserId,
        notes: `Created new user ${name} with role ${finalRoleDisplayName}`
      });

      return res.status(201).json({ success: true, data: createdUser, message: 'User created successfully.' });
    }

    // Memory Store
    const nextUserId = memoryStore.users.length > 0 ? Math.max(...memoryStore.users.map(u => u.id)) + 1 : 1;
    const createdUser = {
      id: nextUserId,
      name,
      email: cleanEmail,
      password_hash: hashedPassword,
      phone: phone || null,
      role_id: finalRoleId,
      role_name: finalRoleName,
      role_display_name: finalRoleDisplayName,
      avatar_url: finalAvatar,
      status: 'active',
      created_at: new Date().toISOString()
    };
    memoryStore.users.push(createdUser);
    appendOrUpdateUserBackup(createdUser);

    return res.status(201).json({ success: true, data: createdUser, message: 'User created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }

    if (getDbStatus()) {
      const userRes = await pool.query(`
        SELECT u.id, u.name, u.email, r.name as role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.id = $1
      `, [userId]);

      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found in database.' });
      }

      const target = userRes.rows[0];

      if (target.id === 1 || target.email === 'doonridersmain@gmail.com' || target.role_name === 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Super Admin cannot be deleted.' });
      }

      // 1. Unassign any leads assigned to this user to avoid FK constraint errors
      await pool.query('UPDATE leads SET assigned_to = NULL WHERE assigned_to = $1', [userId]).catch(() => {});

      // 2. Unassign repair jobs if any
      await pool.query('UPDATE repair_jobs SET technician_id = NULL WHERE technician_id = $1', [userId]).catch(() => {});

      // 3. Delete permanently from users table
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);

      // 4. Also clean up any technician entry matching email or name
      await pool.query('DELETE FROM technicians WHERE email = $1 OR name = $2', [target.email, target.name]).catch(() => {});

      deleteUserBackup(userId);

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'DELETE',
        module: 'USERS',
        recordId: userId,
        notes: `Permanently deleted user ${target.name} (${target.email})`
      });

      return res.json({ success: true, message: `User ${target.name} permanently deleted from database.` });
    }

    // Memory Store Fallback
    const uIdx = memoryStore.users.findIndex(u => u.id === userId);
    if (uIdx !== -1) {
      if (memoryStore.users[uIdx].role_id === 1 || memoryStore.users[uIdx].email === 'doonridersmain@gmail.com') {
        return res.status(403).json({ success: false, message: 'Super Admin cannot be deleted.' });
      }
      const deletedUser = memoryStore.users.splice(uIdx, 1)[0];
      deleteUserBackup(userId);
      return res.json({ success: true, message: `User ${deletedUser.name} deleted successfully.` });
    }

    return res.status(404).json({ success: false, message: 'User not found.' });
  } catch (err: any) {
    console.error('[deleteUser error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    let { status, roleId, role_name, roleName, custom_permissions, permissions } = req.body;
    let targetRoleId = roleId ? Number(roleId) : null;
    const roleNameHint = (role_name || roleName || '').trim().toUpperCase();
    const customPermsPayload = custom_permissions || permissions ? JSON.stringify(custom_permissions || permissions) : null;

    if (getDbStatus()) {
      const userRes = await pool.query(`
        SELECT u.id, u.name, r.id as role_id, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
      `, [id]);

      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const targetUser = userRes.rows[0];

      if (!canModifyUser(req.user!, targetUser.role_id, targetUser.role_name)) {
        return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify a Super Admin user.' });
      }

      if (targetRoleId || roleNameHint) {
        let rCheck = targetRoleId ? await pool.query('SELECT id FROM roles WHERE id = $1', [targetRoleId]) : { rows: [] };
        if (rCheck.rows.length === 0 && roleNameHint) {
          rCheck = await pool.query('SELECT id FROM roles WHERE UPPER(name) = $1 OR UPPER(display_name) = $1 LIMIT 1', [roleNameHint]);
        }
        if (rCheck.rows.length === 0 && (targetRoleId === 9 || targetRoleId === 17 || roleNameHint.includes('RECOVERY'))) {
          rCheck = await pool.query("SELECT id FROM roles WHERE name = 'RECOVERY_AGENT' LIMIT 1");
        }
        if (rCheck.rows.length === 0 && (targetRoleId === 8 || targetRoleId === 16 || roleNameHint.includes('ACCOUNTANT'))) {
          rCheck = await pool.query("SELECT id FROM roles WHERE name = 'ACCOUNTANT' LIMIT 1");
        }
        if (rCheck.rows.length === 0 && (targetRoleId === 7 || targetRoleId === 8 || roleNameHint.includes('PRE_BOOK') || roleNameHint.includes('PRE-BOOK'))) {
          rCheck = await pool.query("SELECT id FROM roles WHERE name = 'PRE_BOOKING' LIMIT 1");
        }
        if (rCheck.rows.length === 0 && (targetRoleId === 6 || roleNameHint.includes('TECH'))) {
          rCheck = await pool.query("SELECT id FROM roles WHERE name = 'TECHNICIAN' LIMIT 1");
        }
        if (rCheck.rows.length === 0 && (targetRoleId === 5 || roleNameHint.includes('HUB'))) {
          rCheck = await pool.query("SELECT id FROM roles WHERE name = 'HUB_INCHARGE' LIMIT 1");
        }
        if (rCheck.rows.length > 0) {
          targetRoleId = rCheck.rows[0].id;
        }
      }

      await pool.query(`
        UPDATE users 
        SET status = COALESCE($1, status),
            role_id = COALESCE($2, role_id),
            custom_permissions = COALESCE($3::jsonb, custom_permissions),
            updated_at = NOW()
        WHERE id = $4
      `, [status, targetRoleId, customPermsPayload, id]);

      appendOrUpdateUserBackup({ id: Number(id), status, role_id: targetRoleId ? Number(targetRoleId) : undefined });

      return res.json({ success: true, message: 'User updated successfully.' });
    }

    // Memory Store
    const user = memoryStore.users.find(u => u.id === Number(id));
    if (user) {
      if (status) user.status = status;
      if (targetRoleId) user.role_id = Number(targetRoleId);
      if (customPermsPayload) user.custom_permissions = JSON.parse(customPermsPayload);
      appendOrUpdateUserBackup({ id: Number(id), status: user.status, role_id: user.role_id });
      return res.json({ success: true, message: 'User updated successfully.' });
    }

    return res.status(404).json({ success: false, message: 'User not found.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
