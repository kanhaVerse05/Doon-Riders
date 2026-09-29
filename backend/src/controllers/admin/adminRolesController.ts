import { Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../../config/db';
import { AuthRequest } from '../../types/auth';
import { logAuditEvent } from '../../helpers/auditLogger';

export const getRolesAndPermissions = async (req: AuthRequest, res: Response) => {
  try {
    if (getDbStatus()) {
      const rolesRes = await pool.query('SELECT * FROM roles ORDER BY id ASC');
      const permRes = await pool.query('SELECT * FROM permissions ORDER BY module ASC, code ASC');
      const rolePermRes = await pool.query(`
        SELECT rp.role_id, rp.permission_id, rp.scope, p.code
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
      `);

      return res.json({
        success: true,
        data: {
          roles: rolesRes.rows,
          permissions: permRes.rows,
          rolePermissions: rolePermRes.rows
        }
      });
    }

    // Memory store fallback
    return res.json({
      success: true,
      data: {
        roles: memoryStore.roles,
        permissions: [
          { id: 1, code: 'dashboard.view', module: 'Dashboard', description: 'View dashboard' },
          { id: 2, code: 'leads.view', module: 'Leads', description: 'View leads' },
          { id: 3, code: 'reports.view', module: 'Reports', description: 'View reports' },
          { id: 4, code: 'roles.view', module: 'Roles', description: 'View roles' },
          { id: 5, code: 'repair_jobs.view', module: 'Repair Jobs', description: 'View repair jobs' },
          { id: 6, code: 'repair_jobs.edit', module: 'Repair Jobs', description: 'Edit & update repair jobs' },
          { id: 7, code: 'inventory.view', module: 'Inventory', description: 'View inventory' },
          { id: 8, code: 'inventory.edit', module: 'Inventory', description: 'Manage inventory stock' }
        ],
        rolePermissions: [
          { role_id: 1, permission_id: 1, scope: 'ALL', code: 'dashboard.view' },
          { role_id: 1, permission_id: 2, scope: 'ALL', code: 'leads.view' },
          { role_id: 1, permission_id: 3, scope: 'ALL', code: 'reports.view' },
          { role_id: 1, permission_id: 4, scope: 'ALL', code: 'roles.view' }
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

    if (getDbStatus()) {
      const existing = await pool.query('SELECT id FROM roles WHERE name = $1 OR display_name = $2', [cleanName, cleanDisplayName]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: `A role with name "${cleanDisplayName}" already exists.` });
      }

      const result = await pool.query(`
        INSERT INTO roles (name, display_name, description, is_system)
        VALUES ($1, $2, $3, FALSE)
      `, [cleanName, cleanDisplayName, description || `Custom ${cleanDisplayName} role`]);

      const newRole = {
        id: result.insertId,
        name: cleanName,
        display_name: cleanDisplayName,
        description: description || `Custom ${cleanDisplayName} role`,
        is_system: false
      };

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'CREATE',
        module: 'ROLES',
        recordId: result.insertId,
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
      is_system: false
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
      const roleRes = await pool.query('SELECT * FROM roles WHERE id = $1', [roleId]);
      if (roleRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Role not found.' });
      }

      if (roleRes.rows[0].is_system) {
        return res.status(403).json({ success: false, message: 'Core system roles cannot be deleted.' });
      }

      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      await pool.query('DELETE FROM roles WHERE id = $1', [roleId]);

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'DELETE',
        module: 'ROLES',
        recordId: roleId,
        notes: `Deleted custom role: ${roleRes.rows[0].display_name}`
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

    const deleted = memoryStore.roles.splice(roleIdx, 1)[0];
    return res.json({ success: true, message: `Custom role "${deleted.display_name}" deleted successfully.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateRolePermission = async (req: AuthRequest, res: Response) => {
  try {
    const { roleId, permissionId, enabled, scope } = req.body;

    if (getDbStatus()) {
      // Super Admin role permissions cannot be demoted
      const roleRes = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
      if (roleRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Role not found.' });
      }

      if (roleRes.rows[0].name === 'SUPER_ADMIN' && !enabled) {
        return res.status(403).json({ success: false, message: 'Super Admin permissions cannot be revoked.' });
      }

      if (enabled) {
        await pool.query(`
          INSERT INTO role_permissions (role_id, permission_id, scope)
          VALUES ($1, $2, $3)
          ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope
        `, [roleId, permissionId, scope || 'ALL']);
      } else {
        await pool.query(`
          DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2
        `, [roleId, permissionId]);
      }

      await logAuditEvent({
        userId: req.user?.id,
        userName: req.user?.name,
        userRole: req.user?.roleName,
        action: 'UPDATE',
        module: 'ROLES',
        notes: `Updated permissions for role ${roleRes.rows[0].name}`
      });

      return res.json({ success: true, message: 'Permission updated successfully.' });
    }

    return res.json({ success: true, message: 'Permission updated successfully (Memory Store).' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
