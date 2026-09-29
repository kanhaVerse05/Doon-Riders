import { Router } from 'express';
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

router.get('/', getAllInventory);
router.post('/bulk-upload', bulkUploadInventory);
router.get('/:id', getInventoryById);
router.post('/', createInventoryItem);
router.put('/:id', updateInventoryItem);
router.patch('/:id/adjust-stock', adjustStock);
router.delete('/:id', deleteInventoryItem);

export default router;
