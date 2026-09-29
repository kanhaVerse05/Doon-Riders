import { Router } from 'express';
import { login, switchRoleDemo, getMe } from '../../controllers/admin/adminAuthController';
import { authenticateJwt } from '../../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.post('/switch-role-demo', switchRoleDemo);
router.get('/me', authenticateJwt, getMe);

export default router;
