import { Router } from 'express';
import {
  getRolesAndPermissions,
  updateRolePermission,
  createRole,
  deleteRole
} from '../../controllers/admin/adminRolesController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('roles.view'), getRolesAndPermissions);
router.post('/', createRole);
router.delete('/:id', deleteRole);
router.post('/permission', updateRolePermission);

export default router;
