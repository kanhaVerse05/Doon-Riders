import { Router } from 'express';
import {
  getAllRepairJobs,
  getRepairJobById,
  createRepairJob,
  assignTechnician,
  submitInspection,
  approveParts,
  startRepair,
  addAdditionalPart,
  completeRepair,
  generateFinalBill,
  recordPayment,
  closeRepairJob,
  getRepairMeta,
  getRepairNotifications,
  markNotificationRead,
  clearAllRepairJobs
} from '../../controllers/admin/adminRepairJobsController';

const router = Router();

// Meta and Notifications
router.get('/meta/hubs-and-technicians', getRepairMeta);
router.get('/notifications/list', getRepairNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.delete('/clear-all', clearAllRepairJobs);

// CRUD & Core Workflow Operations
router.get('/', getAllRepairJobs);
router.get('/:id', getRepairJobById);
router.post('/', createRepairJob);
router.patch('/:id/assign-technician', assignTechnician);
router.post('/:id/inspection', submitInspection);
router.post('/:id/approve-parts', approveParts);
router.post('/:id/start-repair', startRepair);
router.post('/:id/add-part', addAdditionalPart);
router.post('/:id/complete-repair', completeRepair);
router.post('/:id/generate-bill', generateFinalBill);
router.post('/:id/record-payment', recordPayment);
router.post('/:id/close-job', closeRepairJob);

export default router;
