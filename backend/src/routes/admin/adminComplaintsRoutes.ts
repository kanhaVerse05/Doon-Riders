import { Router } from 'express';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';
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

router.get('/', requirePermission('complaints.view'), getAllComplaints);
router.post('/parse-location', requirePermission('complaints.create'), parseLocationUrlHandler);
router.get('/:id', requirePermission('complaints.view'), getComplaintById);
router.post('/', requirePermission('complaints.create'), createComplaint);
router.post('/:id/assign', requirePermission('complaints.assign'), assignTechnician);
router.patch('/:id/assign', requirePermission('complaints.assign'), assignTechnician);
router.post('/:id/location', requirePermission('complaints.track'), updateTechnicianLocation);
router.patch('/:id/location', requirePermission('complaints.track'), updateTechnicianLocation);
router.patch('/:id/status', requirePermission('complaints.update'), updateComplaintStatus);
router.post('/:id/status', requirePermission('complaints.update'), updateComplaintStatus);

export default router;

