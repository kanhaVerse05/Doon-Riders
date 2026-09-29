import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { canModifyUser } from '../../helpers/antiEscalation';
import { logAuditEvent } from '../../helpers/auditLogger';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (getDbStatus()) {
      const query = `
        SELECT u.id, u.name, u.email, u.phone, u.status, u.avatar_url, u.last_login, u.created_at,
               r.id as role_id, r.name as role_name, r.display_name as role_display_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.deleted_at IS NULL
          AND u.email NOT IN ('admin@doonriders.com', 'manager@doonriders.com', 'rahul.sales@doonriders.com', 'priya.sales@doonriders.com', 'amit.sales@doonriders.com')
        ORDER BY u.id ASC
      `;
      const result = await pool.query(query);
      return res.json({ success: true, data: result.rows });
    }

    // Memory store fallback
    const usersWithRoles = memoryStore.users.map(u => {
      const role = memoryStore.roles.find(r => r.id === u.role_id) || {
        id: u.role_id,
        name: 'CUSTOM_ROLE',
        display_name: 'Custom Role'
      };
      return {
        ...u,
        role_id: role.id,
        role_name: role.name,
        role_display_name: role.display_name
      };
    });

    return res.json({ success: true, data: usersWithRoles });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, roleId, custom_role_name, password, avatar_url } = req.body;
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
            'INSERT INTO roles (name, display_name, description, is_system) VALUES ($1, $2, $3, FALSE)',
            [cleanCode, cleanCustomName, `Custom role: ${cleanCustomName}`]
          );
          finalRoleId = createRoleRes.insertId || 1;
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
    } else if (finalRoleId) {
      if (getDbStatus()) {
        const roleRes = await pool.query('SELECT name, display_name FROM roles WHERE id = $1', [finalRoleId]);
        if (roleRes.rows.length > 0) {
          finalRoleName = roleRes.rows[0].name;
          finalRoleDisplayName = roleRes.rows[0].display_name;
        }
      } else {
        const memoryRole = memoryStore.roles.find(r => r.id === finalRoleId);
        if (memoryRole) {
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
      `;

      const result = await pool.query(query, [name, cleanEmail, hashedPassword, phone || null, finalRoleId, avatar_url || null]);

      const createdUser = {
        id: result.insertId,
        name,
        email: cleanEmail,
        phone: phone || null,
        role_id: finalRoleId,
        role_name: finalRoleName,
        role_display_name: finalRoleDisplayName,
        avatar_url: avatar_url || null,
        status: 'active',
        created_at: new Date().toISOString()
      };

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'CREATE',
        module: 'USERS',
        recordId: result.insertId,
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
      avatar_url: avatar_url || null,
      status: 'active',
      created_at: new Date().toISOString()
    };
    memoryStore.users.push(createdUser);

    return res.status(201).json({ success: true, data: createdUser, message: 'User created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = Number(id);

    if (getDbStatus()) {
      const userRes = await pool.query('SELECT u.id, u.name, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [userId]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      if (userRes.rows[0].role_name === 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Super Admin cannot be deleted.' });
      }

      await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = $1', [userId]);

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'DELETE',
        module: 'USERS',
        recordId: userId,
        notes: `Deleted user ${userRes.rows[0].name}`
      });

      return res.json({ success: true, message: 'User deleted successfully.' });
    }

    // Memory Store
    const uIdx = memoryStore.users.findIndex(u => u.id === userId);
    if (uIdx !== -1) {
      if (memoryStore.users[uIdx].role_id === 1) {
        return res.status(403).json({ success: false, message: 'Super Admin cannot be deleted.' });
      }
      const deletedUser = memoryStore.users.splice(uIdx, 1)[0];
      return res.json({ success: true, message: `User ${deletedUser.name} deleted successfully.` });
    }

    return res.status(404).json({ success: false, message: 'User not found.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, roleId } = req.body;

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

      await pool.query(`
        UPDATE users 
        SET status = COALESCE($1, status),
            role_id = COALESCE($2, role_id),
            updated_at = NOW()
        WHERE id = $3
      `, [status, roleId, id]);

      return res.json({ success: true, message: 'User updated successfully.' });
    }

    // Memory Store
    const user = memoryStore.users.find(u => u.id === Number(id));
    if (user) {
      if (status) user.status = status;
      if (roleId) user.role_id = Number(roleId);
      return res.json({ success: true, message: 'User updated successfully.' });
    }

    return res.status(404).json({ success: false, message: 'User not found.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
