import { Router } from 'express';
import {
  getGalleryImages,
  uploadGalleryImage,
  deleteGalleryImage,
  upload,
} from '../controllers/galleryController';
import { authenticateJwt } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/rbacMiddleware';

const router = Router();

// GET all images or filter by category: ?category=...
router.get('/', getGalleryImages);

// POST upload an image
router.post('/upload', authenticateJwt, requirePermission('fleet.manage'), upload.single('image'), uploadGalleryImage);

// DELETE an image
router.delete('/:id', authenticateJwt, requirePermission('fleet.manage'), deleteGalleryImage);

export default router;
