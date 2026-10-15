import { Router } from 'express';
import {
  beginMfaSetup,
  confirmMfaSetup,
  disableMfa,
  getMe,
  getMfaStatus,
  login,
  switchRoleDemo,
  verifyMfaLogin,
} from '../../controllers/admin/adminAuthController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requireSuperAdmin } from '../../middleware/rbacMiddleware';

const router = Router();

router.post('/login', login);
router.post('/login/mfa', verifyMfaLogin);
router.get('/mfa/status', authenticateJwt, requireSuperAdmin, getMfaStatus);
router.post('/mfa/setup', authenticateJwt, requireSuperAdmin, beginMfaSetup);
router.post('/mfa/confirm', authenticateJwt, requireSuperAdmin, confirmMfaSetup);
router.post('/mfa/disable', authenticateJwt, requireSuperAdmin, disableMfa);
router.post('/switch-role-demo', authenticateJwt, requireSuperAdmin, switchRoleDemo);
router.get('/me', authenticateJwt, getMe);

export default router;
