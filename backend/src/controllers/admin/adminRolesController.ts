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
          { id: 8, code: 'inventory.edit', module: 'Inventory', description: 'Manage inventory stock' },
          { id: 9, code: 'recoveries.view', module: 'Scooty Recovery', description: 'View scooty recovery tickets and status' },
          { id: 10, code: 'recoveries.accept', module: 'Scooty Recovery', description: 'Accept assigned recovery request' },
          { id: 11, code: 'recoveries.pickup', module: 'Scooty Recovery', description: 'Record vehicle pickup with GPS & 4 photos' },
          { id: 12, code: 'recoveries.reached_hub', module: 'Scooty Recovery', description: 'Mark scooty reached service hub' },
          { id: 13, code: 'recoveries.assign_tech', module: 'Scooty Recovery', description: 'Assign technician for damage inspection' },
          { id: 14, code: 'recoveries.settle', module: 'Scooty Recovery', description: 'Approve final settlement and generate slip' }
        ],
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

    if (getDbStatus()) {
      const existing = await pool.query('SELECT id FROM roles WHERE name = $1 OR display_name = $2', [cleanName, cleanDisplayName]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: `A role with name "${cleanDisplayName}" already exists.` });
      }

      const result = await pool.query(`
        INSERT INTO roles (name, display_name, description, is_system)
        VALUES ($1, $2, $3, FALSE)
        RETURNING id
      `, [cleanName, cleanDisplayName, description || `Custom ${cleanDisplayName} role`]);

      const createdRoleId = result.rows[0]?.id || result.insertId;

      const newRole = {
        id: createdRoleId,
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
    const { roleId, roleName, userId, permissionId, enabled, scope, permissions } = req.body;

    if (getDbStatus()) {
      // 1. Batch permissions update mode
      if (permissions && typeof permissions === 'object') {
        let targetRoleId = roleId ? Number(roleId) : null;
        let targetRoleName = roleName || '';

        if (!targetRoleId && targetRoleName) {
          const rRes = await pool.query('SELECT id, name FROM roles WHERE name = $1 OR LOWER(display_name) = LOWER($1)', [targetRoleName]);
          if (rRes.rows.length > 0) {
            targetRoleId = rRes.rows[0].id;
            targetRoleName = rRes.rows[0].name;
          }
        }

        if (!targetRoleId && userId) {
          const uRes = await pool.query('SELECT role_id FROM users WHERE id = $1', [userId]);
          if (uRes.rows.length > 0 && uRes.rows[0].role_id) {
            targetRoleId = uRes.rows[0].role_id;
            const rRes = await pool.query('SELECT name FROM roles WHERE id = $1', [targetRoleId]);
            if (rRes.rows.length > 0) targetRoleName = rRes.rows[0].name;
          }
        }

        if (!targetRoleId) {
          return res.status(404).json({ success: false, message: 'Target role not found for permissions update.' });
        }

        if (targetRoleName === 'SUPER_ADMIN') {
          return res.status(403).json({ success: false, message: 'Super Admin permissions cannot be modified.' });
        }

        // Filter for enabled permissions
        const enabledEntries = Object.entries(permissions as Record<string, any>).filter(([_, val]) => val && val.enabled);

        // Protect against accidental wiping of all permissions if an empty or all-disabled map was passed
        if (enabledEntries.length === 0 && !req.body.forceClear) {
          return res.status(400).json({
            success: false,
            message: 'Cannot save empty permissions: At least 1 permission must be enabled, or pass forceClear: true.'
          });
        }

        // Clear existing role permissions
        await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [targetRoleId]);

        // Insert each enabled permission
        for (const [code, val] of enabledEntries) {
          const pRes = await pool.query('SELECT id FROM permissions WHERE code = $1', [code]);
          if (pRes.rows.length > 0) {
            const permId = pRes.rows[0].id;
            const permScope = val.scope || 'ALL';
            await pool.query(`
              INSERT INTO role_permissions (role_id, permission_id, scope)
              VALUES ($1, $2, $3)
              ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope
            `, [targetRoleId, permId, permScope]);
          }
        }

        await logAuditEvent({
          userId: req.user?.id,
          userName: req.user?.name,
          userRole: req.user?.roleName,
          action: 'UPDATE',
          module: 'ROLES',
          notes: `Batch updated permissions for role ID ${targetRoleId}`
        });

        return res.json({ success: true, message: 'Role permissions saved successfully!' });
      }

      // 2. Single permission update mode
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
