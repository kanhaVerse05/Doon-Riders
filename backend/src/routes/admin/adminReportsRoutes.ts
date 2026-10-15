import { Router } from 'express';
import { getDashboardStats } from '../../controllers/admin/adminReportsController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requireAnyPermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/dashboard', requireAnyPermission('dashboard.view', 'reports.view'), getDashboardStats);

export default router;
