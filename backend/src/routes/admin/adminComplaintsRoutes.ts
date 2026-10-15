import { Router } from 'express';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission, requireAnyPermission, requireFieldTaskStatusPermission } from '../../middleware/rbacMiddleware';
import {
  getAllComplaints,
  getComplaintById,
  createComplaint,
  assignTechnician,
  updateTechnicianLocation,
  updateComplaintStatus,
  parseLocationUrlHandler
} from '../../controllers/admin/adminComplaintsController';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireAnyPermission('complaints.view', 'technician_tasks.field.view'), getAllComplaints);
router.post('/parse-location', requirePermission('complaints.create'), parseLocationUrlHandler);
router.get('/:id', requireAnyPermission('complaints.view', 'technician_tasks.field.view'), getComplaintById);
router.post('/', requirePermission('complaints.create'), createComplaint);
router.post('/:id/assign', requirePermission('complaints.assign'), assignTechnician);
router.patch('/:id/assign', requirePermission('complaints.assign'), assignTechnician);
router.post('/:id/location', requireAnyPermission('complaints.track', 'technician_tasks.field.track'), updateTechnicianLocation);
router.patch('/:id/location', requireAnyPermission('complaints.track', 'technician_tasks.field.track'), updateTechnicianLocation);
router.patch('/:id/status', requireFieldTaskStatusPermission, updateComplaintStatus);
router.post('/:id/status', requireFieldTaskStatusPermission, updateComplaintStatus);

export default router;

