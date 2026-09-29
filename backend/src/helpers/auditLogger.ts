import { pool, getDbStatus, memoryStore } from '../config/db';

export interface LogEventParams {
  userId?: number;
  userName?: string;
  userRole?: string;
  action: string;
  module: string;
  recordId?: string | number;
  oldValues?: any;
  newValues?: any;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

export const logAuditEvent = async (params: LogEventParams) => {
  try {
    const {
      userId,
      userName,
      userRole,
      action,
      module,
      recordId,
      oldValues,
      newValues,
      notes,
      ipAddress,
      userAgent
    } = params;

    if (getDbStatus()) {
      const query = `
        INSERT INTO audit_logs 
        (user_id, user_name, user_role, action, module, record_id, old_values, new_values, notes, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      await pool.query(query, [
        userId || null,
        userName || 'System',
        userRole || 'SYSTEM',
        action,
        module,
        recordId ? String(recordId) : null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        notes || null,
        ipAddress || '127.0.0.1',
        userAgent || 'Backend Service'
      ]);
    } else {
      console.log(`[AUDIT LOG] ${action} on ${module} by ${userName || 'System'}:`, notes || '');
    }
  } catch (err: any) {
    console.error('Audit Log Error:', err.message);
  }
};
