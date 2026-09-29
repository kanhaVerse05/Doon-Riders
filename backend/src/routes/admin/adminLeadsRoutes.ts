import { Router } from 'express';
import { getLeads, getLeadById, createLead, updateLeadStatus, bulkAssignLeads, bulkImportLeads } from '../../controllers/admin/adminLeadsController';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('leads.view'), getLeads);
router.get('/:id', requirePermission('leads.view'), getLeadById);
router.post('/', requirePermission('leads.create'), createLead);
router.post('/bulk-import', requirePermission('leads.create'), bulkImportLeads);
router.patch('/:id/status', requirePermission('leads.status_update'), updateLeadStatus);
router.post('/bulk-assign', requirePermission('leads.assign'), bulkAssignLeads);

export default router;
