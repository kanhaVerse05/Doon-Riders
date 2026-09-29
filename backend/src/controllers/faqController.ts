import { Request, Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../config/db';

export const getFaqs = async (req: Request, res: Response) => {
  try {
    if (getDbStatus()) {
      const result = await pool.query('SELECT * FROM faqs WHERE is_active = true ORDER BY display_order ASC');
      return res.json({ success: true, data: result.rows });
    }
    return res.json({ success: true, data: memoryStore.faqs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTestimonials = async (req: Request, res: Response) => {
  try {
    if (getDbStatus()) {
      const result = await pool.query('SELECT * FROM testimonials WHERE is_approved = true ORDER BY id ASC');
      return res.json({ success: true, data: result.rows });
    }
    return res.json({ success: true, data: memoryStore.testimonials });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
