import { Router } from 'express';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission, requireAnyPermission } from '../../middleware/rbacMiddleware';
import {
  getAllInventory,
  getInventoryById,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  deleteInventoryItem,
  bulkUploadInventory
} from '../../controllers/admin/adminInventoryController';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireAnyPermission('inventory.view', 'technician_tasks.workshop.inspect', 'technician_tasks.workshop.request_parts', 'technician_tasks.returns.inspect', 'technician_tasks.recoveries.inspect'), getAllInventory);
router.post('/bulk-upload', requirePermission('inventory.manage'), bulkUploadInventory);
router.get('/:id', requirePermission('inventory.view'), getInventoryById);
router.post('/', requirePermission('inventory.manage'), createInventoryItem);
router.put('/:id', requirePermission('inventory.manage'), updateInventoryItem);
router.patch('/:id/adjust-stock', requirePermission('inventory.manage'), adjustStock);
router.delete('/:id', requirePermission('inventory.manage'), deleteInventoryItem);

export default router;
