import { Router } from 'express';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middleware/rbacMiddleware';
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

router.use(authenticateJwt);

// Scooty Recoveries API Endpoints with granular RBAC protections
router.get('/', requirePermission('recoveries.view'), getAllRecoveries);
router.get('/:id', requirePermission('recoveries.view'), getRecoveryById);
router.post('/', requirePermission('recoveries.create'), createRecovery);
router.post('/:id/accept', requirePermission('recoveries.accept'), acceptRecovery);
router.post('/:id/pickup', requirePermission('recoveries.pickup'), pickupScooty);
router.post('/:id/reached-hub', requirePermission('recoveries.reached_hub'), agentReachedHub);
router.post('/:id/assign', requirePermission('recoveries.assign_tech'), assignTechnicianForRecovery);
router.patch('/:id/assign', requirePermission('recoveries.assign_tech'), assignTechnicianForRecovery);
router.post('/:id/inspection', requirePermission('recoveries.inspect'), submitTechnicianRecoveryInspection);
router.patch('/:id/inspection', requirePermission('recoveries.inspect'), submitTechnicianRecoveryInspection);
router.post('/:id/settle', requirePermission('recoveries.settle'), settleRecovery);
router.patch('/:id/settle', requirePermission('recoveries.settle'), settleRecovery);
router.patch('/:id/status', requireAnyPermission('recoveries.settle', 'recoveries.create', 'recoveries.reached_hub'), updateRecoveryStatus);
router.post('/:id/status', requireAnyPermission('recoveries.settle', 'recoveries.create', 'recoveries.reached_hub'), updateRecoveryStatus);

export default router;
