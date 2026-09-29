import { Router } from 'express';
import { getDashboardStats } from '../../controllers/admin/adminReportsController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/dashboard', requirePermission('dashboard.view'), getDashboardStats);

export default router;
