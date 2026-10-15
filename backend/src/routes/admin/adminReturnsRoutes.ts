import { Router } from 'express';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';
import {
  getAllReturns,
  getReturnById,
  createReturn,
  assignTechnicianForReturn,
  submitTechnicianInspection,
  settleReturn,
  updateReturnStatus
} from '../../controllers/admin/adminReturnsController';

const router = Router();

router.use(authenticateJwt);

router.get('/', requirePermission('returns.view'), getAllReturns);
router.get('/:id', requirePermission('returns.view'), getReturnById);
router.post('/', requirePermission('returns.create'), createReturn);
router.post('/:id/assign', requirePermission('returns.assign_tech'), assignTechnicianForReturn);
router.patch('/:id/assign', requirePermission('returns.assign_tech'), assignTechnicianForReturn);
router.post('/:id/inspection', requirePermission('returns.inspect'), submitTechnicianInspection);
router.patch('/:id/inspection', requirePermission('returns.inspect'), submitTechnicianInspection);
router.post('/:id/settle', requirePermission('returns.settle'), settleReturn);
router.patch('/:id/settle', requirePermission('returns.settle'), settleReturn);
router.patch('/:id/status', requirePermission('returns.update'), updateReturnStatus);
router.post('/:id/status', requirePermission('returns.update'), updateReturnStatus);

export default router;
