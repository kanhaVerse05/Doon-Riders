import { Router } from 'express';
import {
  getRolesAndPermissions,
  updateRolePermission,
  createRole,
  deleteRole
} from '../../controllers/admin/adminRolesController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission, requireSuperAdmin } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('roles.view'), getRolesAndPermissions);
router.post('/', requireSuperAdmin, createRole);
router.delete('/:id', requireSuperAdmin, deleteRole);
router.post('/permission', requireSuperAdmin, updateRolePermission);

export default router;
