import { Response } from 'express';
import { pool } from '../../config/db';
import { AuthRequest } from '../../types/auth';

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings ORDER BY id ASC');
    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateSetting = async (req: AuthRequest, res: Response) => {
  try {
    const { key, value } = req.body;
    await pool.query(`
      UPDATE system_settings 
      SET value = $1, updated_by = $2, updated_at = NOW()
      WHERE key = $3
    `, [JSON.stringify(value), req.user?.id, key]);

    return res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
