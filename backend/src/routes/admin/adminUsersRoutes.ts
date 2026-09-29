import { Router } from 'express';
import { getUsers, createUser, updateUserStatus } from '../../controllers/admin/adminUsersController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('users.view'), getUsers);
router.post('/', requirePermission('users.create'), createUser);
router.patch('/:id/status', requirePermission('users.edit'), updateUserStatus);

export default router;
