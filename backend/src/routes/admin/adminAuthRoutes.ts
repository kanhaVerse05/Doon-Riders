import { Router } from 'express';
import {
  beginMfaSetup,
  beginInitialMfaSetup,
  confirmMfaSetup,
  confirmInitialMfaSetup,
  disableMfa,
  getMe,
  getMfaStatus,
  login,
  switchRoleDemo,
  verifyMfaLogin,
} from '../../controllers/admin/adminAuthController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requireSuperAdmin } from '../../middleware/rbacMiddleware';
import { loginCredentialRateLimit, loginIpRateLimit } from '../../middleware/loginRateLimit';

const router = Router();

router.post('/login', loginIpRateLimit, loginCredentialRateLimit, login);
router.post('/login/mfa', verifyMfaLogin);
router.post('/mfa/setup/first/start', beginInitialMfaSetup);
router.post('/mfa/setup/first/confirm', confirmInitialMfaSetup);
router.get('/mfa/status', authenticateJwt, requireSuperAdmin, getMfaStatus);
router.post('/mfa/setup', authenticateJwt, requireSuperAdmin, beginMfaSetup);
router.post('/mfa/confirm', authenticateJwt, requireSuperAdmin, confirmMfaSetup);
router.post('/mfa/disable', authenticateJwt, requireSuperAdmin, disableMfa);
router.post('/switch-role-demo', authenticateJwt, requireSuperAdmin, switchRoleDemo);
router.get('/me', authenticateJwt, getMe);

export default router;
