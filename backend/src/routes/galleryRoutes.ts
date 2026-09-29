import { Router } from 'express';
import {
  getGalleryImages,
  uploadGalleryImage,
  deleteGalleryImage,
  upload,
} from '../controllers/galleryController';

const router = Router();

// GET all images or filter by category: ?category=...
router.get('/', getGalleryImages);

// POST upload an image
router.post('/upload', upload.single('image'), uploadGalleryImage);

// DELETE an image
router.delete('/:id', deleteGalleryImage);

export default router;
