import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { pool, getDbStatus, memoryStore } from '../config/db';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/gallery');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `doon-gallery-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|webp|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, webp, gif) are allowed!'));
};

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter,
});

// GET all gallery images
export const getGalleryImages = async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    if (getDbStatus()) {
      let query = 'SELECT * FROM gallery_images ORDER BY created_at DESC, id DESC';
      let params: any[] = [];

      if (category && category !== 'All') {
        query = 'SELECT * FROM gallery_images WHERE category = $1 ORDER BY created_at DESC, id DESC';
        params = [category as string];
      }

      const result = await pool.query(query, params);
      return res.json({ success: true, data: result.rows });
    }

    // Memory Store Fallback
    let items = (memoryStore as any).gallery || [];
    if (category && category !== 'All') {
      items = items.filter((item: any) => item.category === category);
    }

    return res.json({ success: true, data: items, source: 'memory' });
  } catch (error: any) {
    console.error('Error in getGalleryImages:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST upload new gallery image
export const uploadGalleryImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please provide an image file to upload.' });
    }

    const { title, category, description, vehicle_id } = req.body;

    if (!title || !category) {
      return res.status(400).json({ success: false, message: 'Title and Category are required.' });
    }

    const fileName = req.file.filename;
    const imageUrl = `/uploads/gallery/${fileName}`;

    if (getDbStatus()) {
      const result = await pool.query(
        `INSERT INTO gallery_images (title, category, description, image_url, vehicle_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [title, category, description || '', imageUrl, vehicle_id ? Number(vehicle_id) : null]
      );
      const newImage = {
        id: result.insertId,
        title,
        category,
        description: description || '',
        image_url: imageUrl,
        vehicle_id: vehicle_id ? Number(vehicle_id) : null,
        created_at: new Date().toISOString()
      };
      return res.status(201).json({ success: true, message: 'Image uploaded successfully', data: newImage });
    }

    // Memory Store Fallback
    if (!(memoryStore as any).gallery) {
      (memoryStore as any).gallery = [];
    }

    const newId = (memoryStore as any).gallery.length > 0
      ? Math.max(...(memoryStore as any).gallery.map((g: any) => g.id)) + 1
      : 1;

    const newImage = {
      id: newId,
      title,
      category,
      description: description || '',
      image_url: imageUrl,
      vehicle_id: vehicle_id ? Number(vehicle_id) : null,
      created_at: new Date().toISOString(),
    };

    (memoryStore as any).gallery.unshift(newImage);

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully (memory store)',
      data: newImage,
    });
  } catch (error: any) {
    console.error('Error in uploadGalleryImage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE gallery image
export const deleteGalleryImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, message: 'Invalid gallery image ID.' });
    }

    let deletedImageUrl: string | null = null;

    if (getDbStatus()) {
      const fetchResult = await pool.query('SELECT image_url FROM gallery_images WHERE id = $1', [numericId]);
      if (fetchResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Gallery image not found.' });
      }
      deletedImageUrl = fetchResult.rows[0].image_url;
      await pool.query('DELETE FROM gallery_images WHERE id = $1', [numericId]);
    } else {
      const items = (memoryStore as any).gallery || [];
      const index = items.findIndex((g: any) => g.id === numericId);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'Gallery image not found.' });
      }
      deletedImageUrl = items[index].image_url;
      items.splice(index, 1);
    }

    // Try deleting physical file if it starts with /uploads/gallery/
    if (deletedImageUrl && deletedImageUrl.startsWith('/uploads/gallery/')) {
      const diskFilename = path.basename(deletedImageUrl);
      const filePath = path.join(uploadDir, diskFilename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not remove file from disk:', e);
        }
      }
    }

    return res.json({ success: true, message: 'Gallery image deleted successfully.' });
  } catch (error: any) {
    console.error('Error in deleteGalleryImage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
