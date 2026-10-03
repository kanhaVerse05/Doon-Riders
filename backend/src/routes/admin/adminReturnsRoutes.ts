import { Router } from 'express';
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

// Scooty Returns API Endpoints
router.get('/', getAllReturns);
router.get('/:id', getReturnById);
router.post('/', createReturn);
router.post('/:id/assign', assignTechnicianForReturn);
router.patch('/:id/assign', assignTechnicianForReturn);
router.post('/:id/inspection', submitTechnicianInspection);
router.patch('/:id/inspection', submitTechnicianInspection);
router.post('/:id/settle', settleReturn);
router.patch('/:id/settle', settleReturn);
router.patch('/:id/status', updateReturnStatus);
router.post('/:id/status', updateReturnStatus);

export default router;
