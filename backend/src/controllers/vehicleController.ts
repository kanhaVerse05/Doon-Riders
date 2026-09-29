import { Request, Response } from 'express';
import { pool, getDbStatus, memoryStore } from '../config/db';

export const getVehicles = async (req: Request, res: Response) => {
  try {
    if (getDbStatus()) {
      const result = await pool.query('SELECT * FROM vehicles ORDER BY id ASC');
      return res.json({ success: true, data: result.rows });
    }
    return res.json({ success: true, data: memoryStore.vehicles, source: 'memory' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getVehicleBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    if (getDbStatus()) {
      const result = await pool.query('SELECT * FROM vehicles WHERE slug = $1', [slug]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    }
    const vehicle = memoryStore.vehicles.find(v => v.slug === slug);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    return res.json({ success: true, data: vehicle });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
