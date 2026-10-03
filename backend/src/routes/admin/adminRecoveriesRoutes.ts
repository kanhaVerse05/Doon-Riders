import { Router } from 'express';
import {
  getAllRecoveries,
  getRecoveryById,
  createRecovery,
  assignTechnicianForRecovery,
  submitTechnicianRecoveryInspection,
  settleRecovery,
  updateRecoveryStatus
} from '../../controllers/admin/adminRecoveriesController';

const router = Router();

// Scooty Recoveries API Endpoints
router.get('/', getAllRecoveries);
router.get('/:id', getRecoveryById);
router.post('/', createRecovery);
router.post('/:id/assign', assignTechnicianForRecovery);
router.patch('/:id/assign', assignTechnicianForRecovery);
router.post('/:id/inspection', submitTechnicianRecoveryInspection);
router.patch('/:id/inspection', submitTechnicianRecoveryInspection);
router.post('/:id/settle', settleRecovery);
router.patch('/:id/settle', settleRecovery);
router.patch('/:id/status', updateRecoveryStatus);
router.post('/:id/status', updateRecoveryStatus);

export default router;
