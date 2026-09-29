import { Response } from 'express';
import { pool } from '../../config/db';
import { AuthRequest } from '../../types/auth';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { module, action, limit = 100 } = req.query;

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (module && module !== 'All') {
      params.push(module);
      query += ` AND module = $${params.length}`;
    }

    if (action && action !== 'All') {
      params.push(action);
      query += ` AND action = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(Number(limit));

    const result = await pool.query(query, params);
    return res.json({ success: true, data: result.rows });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
