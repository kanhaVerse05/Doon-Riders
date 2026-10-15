import { Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { logAuditEvent } from '../../helpers/auditLogger';
import { normalizeScope } from '../../helpers/rbacHelper';
import { PERMISSION_CATALOG, PERMISSION_BY_CODE } from '../../helpers/permissionCatalog';

export const getRolesAndPermissions = async (req: AuthRequest, res: Response) => {
  try {
    if (getDbStatus()) {
      const rolesRes = await pool.query('SELECT * FROM roles ORDER BY id ASC');
      const rolePermRes = await pool.query(`
        SELECT rp.role_id, rp.permission_id, rp.scope, p.code
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
      `);

      return res.json({
        success: true,
        data: {
          roles: rolesRes.rows,
          permissions: PERMISSION_CATALOG,
          rolePermissions: rolePermRes.rows
        }
      });
    }

    // Memory store fallback
    return res.json({
      success: true,
      data: {
        roles: memoryStore.roles,
        permissions: PERMISSION_CATALOG,
        rolePermissions: [
          { role_id: 1, permission_id: 1, scope: 'ALL', code: 'dashboard.view' },
          { role_id: 1, permission_id: 2, scope: 'ALL', code: 'leads.view' },
          { role_id: 1, permission_id: 3, scope: 'ALL', code: 'reports.view' },
          { role_id: 1, permission_id: 4, scope: 'ALL', code: 'roles.view' },
          { role_id: 8, permission_id: 9, scope: 'ASSIGNED', code: 'recoveries.view' },
          { role_id: 8, permission_id: 10, scope: 'ASSIGNED', code: 'recoveries.accept' },
          { role_id: 8, permission_id: 11, scope: 'ASSIGNED', code: 'recoveries.pickup' },
          { role_id: 8, permission_id: 12, scope: 'ASSIGNED', code: 'recoveries.reached_hub' }
        ]
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createRole = async (req: AuthRequest, res: Response) => {
  try {
    const { display_name, name, description } = req.body;

    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ success: false, message: 'Role Display Name is required (e.g. Technician, Hub Incharge, etc.)' });
    }

    const cleanDisplayName = display_name.trim();
    const cleanName = (name || cleanDisplayName)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Role name must contain at least one letter or number.' });
    }

    if (getDbStatus()) {
      const existing = await pool.query('SELECT id FROM roles WHERE name = $1 OR display_name = $2', [cleanName, cleanDisplayName]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: `A role with name "${cleanDisplayName}" already exists.` });
      }

      const result = await pool.query(`
        INSERT INTO roles (name, display_name, description, is_system, permissions_configured)
        VALUES ($1, $2, $3, FALSE, TRUE)
        RETURNING id
      `, [cleanName, cleanDisplayName, description || `Custom ${cleanDisplayName} role`]);

      const createdRoleId = result.rows[0]?.id || result.insertId;

      const newRole = {
        id: createdRoleId,
        name: cleanName,
        display_name: cleanDisplayName,
        description: description || `Custom ${cleanDisplayName} role`,
        is_system: false,
        permissions_configured: true
      };

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'CREATE',
        module: 'ROLES',
        recordId: createdRoleId,
        notes: `Created new custom role: ${cleanDisplayName} (${cleanName})`
      });

      return res.status(201).json({
        success: true,
        data: newRole,
        message: `Custom role "${cleanDisplayName}" created successfully!`
      });
    }

    // Memory Store Fallback
    const existing = memoryStore.roles.find(
      r => r.name.toLowerCase() === cleanName.toLowerCase() || r.display_name.toLowerCase() === cleanDisplayName.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ success: false, message: `A role with name "${cleanDisplayName}" already exists.` });
    }

    const nextId = memoryStore.roles.length > 0 ? Math.max(...memoryStore.roles.map(r => r.id)) + 1 : 1;
    const newRole = {
      id: nextId,
      name: cleanName,
      display_name: cleanDisplayName,
      description: description || `Custom ${cleanDisplayName} role`,
      is_system: false,
      permissions_configured: true
    };

    memoryStore.roles.push(newRole);

    return res.status(201).json({
      success: true,
      data: newRole,
      message: `Custom role "${cleanDisplayName}" created successfully!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const roleId = Number(id);

    if (getDbStatus()) {
      const client = await pool.connect();
      let deletedRole: any;
      try {
        await client.query('BEGIN');
        const roleRes = await client.query('SELECT * FROM roles WHERE id = $1 FOR UPDATE', [roleId]);
        if (roleRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ success: false, message: 'Role not found.' });
        }
        deletedRole = roleRes.rows[0];
        if (deletedRole.is_system) {
          await client.query('ROLLBACK');
          return res.status(403).json({ success: false, message: 'Core system roles cannot be deleted.' });
        }
        const assignedUsers = await client.query(
          'SELECT COUNT(*)::int AS count FROM users WHERE role_id = $1',
          [roleId]
        );
        if (Number(assignedUsers.rows[0]?.count || 0) > 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            message: 'This role is assigned to staff. Reassign those staff members before deleting the role.'
          });
        }
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        await client.query('DELETE FROM roles WHERE id = $1', [roleId]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'DELETE',
        module: 'ROLES',
        recordId: roleId,
        notes: `Deleted custom role: ${deletedRole.display_name}`
      });

      return res.json({ success: true, message: 'Custom role deleted successfully.' });
    }

    // Memory Store
    const roleIdx = memoryStore.roles.findIndex(r => r.id === roleId);
    if (roleIdx === -1) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    if (memoryStore.roles[roleIdx].is_system) {
      return res.status(403).json({ success: false, message: 'Core system roles cannot be deleted.' });
    }

    if (memoryStore.users.some(user => Number(user.role_id) === roleId)) {
      return res.status(409).json({
        success: false,
        message: 'This role is assigned to staff. Reassign those staff members before deleting the role.'
      });
    }

    const deleted = memoryStore.roles.splice(roleIdx, 1)[0];
    memoryStore.rolePermissions = (memoryStore.rolePermissions || []).filter((permission: any) => Number(permission.role_id) !== roleId);
    return res.json({ success: true, message: `Custom role "${deleted.display_name}" deleted successfully.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateRolePermission = async (req: AuthRequest, res: Response) => {
  try {
    const { roleId, roleName, userId, permissionId, enabled, scope, permissions } = req.body;

    if (getDbStatus()) {
      const client = await pool.connect();
      let auditNote = '';
      try {
        await client.query('BEGIN');

        if (permissions !== undefined) {
          if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Permissions must be a permission-code map.' });
          }

          const unknownCode = Object.keys(permissions as Record<string, unknown>)
            .find(code => !PERMISSION_BY_CODE.has(code));
          if (unknownCode) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Unknown permission code: ${unknownCode}` });
          }

          const targetUserId = userId ? Number(userId) : null;
          let targetRoleId = roleId ? Number(roleId) : null;
          if (targetUserId) {
            const userRes = await client.query(`
              SELECT u.role_id, r.name AS role_name
              FROM users u LEFT JOIN roles r ON r.id = u.role_id
              WHERE u.id = $1 AND u.deleted_at IS NULL FOR UPDATE OF u
            `, [targetUserId]);
            if (!userRes.rows.length) {
              await client.query('ROLLBACK');
              return res.status(404).json({ success: false, message: 'User not found.' });
            }
            if (userRes.rows[0].role_name === 'SUPER_ADMIN') {
              await client.query('ROLLBACK');
              return res.status(403).json({ success: false, message: 'Super Admin accounts cannot be changed here.' });
            }
            targetRoleId = targetRoleId || userRes.rows[0].role_id;
          }

          const roleRes = targetRoleId
            ? await client.query('SELECT id, name FROM roles WHERE id = $1 FOR UPDATE', [targetRoleId])
            : { rows: [] };
          if (!roleRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Role not found.' });
          }
          const role = roleRes.rows[0];
          if (role.name === 'SUPER_ADMIN') {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Super Admin permissions cannot be changed.' });
          }

          const enabledEntries = Object.entries(permissions as Record<string, any>)
            .filter(([, value]) => value && value.enabled === true);
          const enabledCodes = enabledEntries.map(([code]) => code);
          const knownPermissions: Array<{ id: number; code: string }> = [];
          for (const code of enabledCodes) {
            const permissionRes = await client.query(`
              INSERT INTO permissions (code, module, description)
              VALUES ($1, $2, $3)
              ON CONFLICT (code) DO UPDATE
              SET module = EXCLUDED.module, description = EXCLUDED.description
              RETURNING id, code
            `, [code, PERMISSION_BY_CODE.get(code)!.module, PERMISSION_BY_CODE.get(code)!.description]);
            knownPermissions.push(permissionRes.rows[0]);
          }

          if (targetUserId) {
            const updateUser = await client.query(`
              UPDATE users
              SET role_id = COALESCE($1, role_id), custom_permissions = $2::jsonb, updated_at = NOW()
              WHERE id = $3 AND deleted_at IS NULL
              RETURNING id
            `, [role.id, JSON.stringify(permissions), targetUserId]);
            if (!updateUser.rows.length) {
              await client.query('ROLLBACK');
              return res.status(404).json({ success: false, message: 'User not found.' });
            }
          }

          await client.query('DELETE FROM role_permissions WHERE role_id = $1', [role.id]);
          for (const [code, value] of enabledEntries) {
            const permission = knownPermissions.find(row => row.code === code)!;
            await client.query(`
              INSERT INTO role_permissions (role_id, permission_id, scope)
              VALUES ($1, $2, $3)
              RETURNING role_id, permission_id
            `, [role.id, permission.id, normalizeScope(value.scope)]);
          }
          await client.query('UPDATE roles SET permissions_configured = TRUE, updated_at = NOW() WHERE id = $1', [role.id]);
          auditNote = targetUserId
            ? `Updated role and custom permissions for user ID ${targetUserId}`
            : `Updated permissions for role ${role.name}`;
        } else {
          const roleRes = await client.query('SELECT id, name FROM roles WHERE id = $1 FOR UPDATE', [roleId]);
          if (!roleRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Role not found.' });
          }
          const role = roleRes.rows[0];
          if (role.name === 'SUPER_ADMIN' && !enabled) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Super Admin permissions cannot be revoked.' });
          }
          if (enabled) {
            await client.query(`
              INSERT INTO role_permissions (role_id, permission_id, scope)
              VALUES ($1, $2, $3)
              ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope
              RETURNING role_id, permission_id
            `, [role.id, permissionId, normalizeScope(scope)]);
          } else {
            await client.query('DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [role.id, permissionId]);
          }
          await client.query('UPDATE roles SET permissions_configured = TRUE, updated_at = NOW() WHERE id = $1', [role.id]);
          auditNote = `Updated permissions for role ${role.name}`;
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      } finally {
        client.release();
      }

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'UPDATE',
        module: 'ROLES',
        notes: auditNote
      }).catch(error => console.error('Permission save audit log failed:', error));
      return res.json({ success: true, message: 'Role and permissions saved successfully.' });
    }

    if (permissions && typeof permissions === 'object') {
      const unknownCode = Object.keys(permissions as Record<string, unknown>)
        .find(code => !PERMISSION_BY_CODE.has(code));
      if (unknownCode) {
        return res.status(400).json({ success: false, message: `Unknown permission code: ${unknownCode}` });
      }
      const targetRoleId = Number(roleId) || 1;
      const role = memoryStore.roles.find(r => r.id === targetRoleId);
      if (role?.name === 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Super Admin permissions cannot be changed.' });
      }
      if (!memoryStore.rolePermissions) memoryStore.rolePermissions = [];
      memoryStore.rolePermissions = memoryStore.rolePermissions.filter((rp: any) => rp.role_id !== targetRoleId);
      for (const [code, val] of Object.entries(permissions as Record<string, any>)) {
        if (val && val.enabled) {
          memoryStore.rolePermissions.push({
            role_id: targetRoleId,
            code,
            scope: val.scope || 'ALL'
          });
        }
      }
      if (role) (role as any).permissions_configured = true;
      const targetUserId = userId ? Number(userId) : null;
      const user = targetUserId && memoryStore.users.find(u => u.id === targetUserId);
      if (user) {
        if (targetRoleId) user.role_id = targetRoleId;
        (user as any).custom_permissions = permissions;
      }
    }
    return res.json({ success: true, message: 'Permission updated successfully (Memory Store).' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
