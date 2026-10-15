import { Router } from 'express';
import { authenticateJwt } from '../../middleware/authMiddleware';
import { requirePermission } from '../../middleware/rbacMiddleware';
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

router.get('/', requirePermission('inventory.view'), getAllInventory);
router.post('/bulk-upload', requirePermission('inventory.manage'), bulkUploadInventory);
router.get('/:id', requirePermission('inventory.view'), getInventoryById);
router.post('/', requirePermission('inventory.manage'), createInventoryItem);
router.put('/:id', requirePermission('inventory.manage'), updateInventoryItem);
router.patch('/:id/adjust-stock', requirePermission('inventory.manage'), adjustStock);
router.delete('/:id', requirePermission('inventory.manage'), deleteInventoryItem);

export default router;
