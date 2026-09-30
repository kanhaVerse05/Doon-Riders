import { Router } from 'express';
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

// Complaints API Endpoints
router.get('/', getAllComplaints);
router.post('/parse-location', parseLocationUrlHandler);
router.get('/:id', getComplaintById);
router.post('/', createComplaint);
router.post('/:id/assign', assignTechnician);
router.patch('/:id/assign', assignTechnician);
router.post('/:id/location', updateTechnicianLocation);
router.patch('/:id/location', updateTechnicianLocation);
router.patch('/:id/status', updateComplaintStatus);
router.post('/:id/status', updateComplaintStatus);

export default router;

