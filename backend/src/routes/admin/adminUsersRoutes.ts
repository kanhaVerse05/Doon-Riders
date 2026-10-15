import { Router } from 'express';
import { getUsers, createUser, updateUserStatus, deleteUser } from '../../controllers/admin/adminUsersController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('users.view'), getUsers);
router.post('/', requirePermission('users.create'), createUser);
router.patch('/:id/status', requirePermission('users.edit'), updateUserStatus);
router.put('/:id/status', requirePermission('users.edit'), updateUserStatus);
router.patch('/:id', requirePermission('users.edit'), updateUserStatus);
router.put('/:id', requirePermission('users.edit'), updateUserStatus);
router.delete('/:id', requirePermission('users.delete'), deleteUser);

export default router;
