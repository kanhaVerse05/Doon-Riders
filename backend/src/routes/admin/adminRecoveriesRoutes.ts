import { Router } from 'express';
import {
  getAllRecoveries,
  getRecoveryById,
  createRecovery,
  acceptRecovery,
  pickupScooty,
  agentReachedHub,
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
router.post('/:id/accept', acceptRecovery);
router.post('/:id/pickup', pickupScooty);
router.post('/:id/reached-hub', agentReachedHub);
router.post('/:id/assign', assignTechnicianForRecovery);
router.patch('/:id/assign', assignTechnicianForRecovery);
router.post('/:id/inspection', submitTechnicianRecoveryInspection);
router.patch('/:id/inspection', submitTechnicianRecoveryInspection);
router.post('/:id/settle', settleRecovery);
router.patch('/:id/settle', settleRecovery);
router.patch('/:id/status', updateRecoveryStatus);
router.post('/:id/status', updateRecoveryStatus);

export default router;
