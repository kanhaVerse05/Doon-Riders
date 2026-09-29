import { Router } from 'express';
import { getAuditLogs } from '../../controllers/admin/adminAuditController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('audit.view'), getAuditLogs);

export default router;
