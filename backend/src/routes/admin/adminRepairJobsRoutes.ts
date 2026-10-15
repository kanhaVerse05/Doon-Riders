import { Router } from 'express';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middleware/rbacMiddleware';
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
  clearAllRepairJobs,
  getJobReviewInfo,
  submitJobReview
} from '../../controllers/admin/adminRepairJobsController';

const router = Router();

// Review & Rating Routes (Public / Customer & Admin)
router.get('/:id/review-info', getJobReviewInfo);
router.post('/:id/review', submitJobReview);

// Meta and Notifications
router.get('/meta/hubs-and-technicians', authenticateJwt, requirePermission('repairs.view'), getRepairMeta);
router.get('/notifications/list', authenticateJwt, requirePermission('repairs.view'), getRepairNotifications);
router.patch('/notifications/:id/read', authenticateJwt, requirePermission('repairs.update'), markNotificationRead);
router.delete('/clear-all', authenticateJwt, requirePermission('repairs.delete'), clearAllRepairJobs);

// CRUD & Core Workflow Operations
router.get('/', authenticateJwt, requireAnyPermission('repairs.view', 'technician_tasks.workshop.view'), getAllRepairJobs);
router.get('/:id', authenticateJwt, requireAnyPermission('repairs.view', 'technician_tasks.workshop.view'), getRepairJobById);
router.post('/', authenticateJwt, requirePermission('repairs.create'), createRepairJob);
router.patch('/:id/assign-technician', authenticateJwt, requirePermission('repairs.update'), assignTechnician);
router.post('/:id/inspection', authenticateJwt, requireAnyPermission('repairs.update', 'technician_tasks.workshop.inspect'), submitInspection);
router.post('/:id/approve-parts', authenticateJwt, requirePermission('repairs.update'), approveParts);
router.post('/:id/start-repair', authenticateJwt, requireAnyPermission('repairs.update', 'technician_tasks.workshop.start'), startRepair);
router.post('/:id/add-part', authenticateJwt, requireAnyPermission('repairs.update', 'technician_tasks.workshop.request_parts'), addAdditionalPart);
router.post('/:id/complete-repair', authenticateJwt, requireAnyPermission('repairs.update', 'technician_tasks.workshop.complete'), completeRepair);
router.post('/:id/generate-bill', authenticateJwt, requirePermission('repairs.update'), generateFinalBill);
router.post('/:id/record-payment', authenticateJwt, requirePermission('repairs.update'), recordPayment);
router.post('/:id/close-job', authenticateJwt, requirePermission('repairs.update'), closeRepairJob);

export default router;
