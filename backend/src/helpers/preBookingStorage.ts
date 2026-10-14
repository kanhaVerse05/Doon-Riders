import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'uploads');
const BACKUP_FILE = path.join(BACKUP_DIR, 'pre_bookings_backup.json');

// Ensure uploads folder exists
try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[preBookingStorage] Could not create backup dir:', e);
}

export const loadPreBookingsBackup = (): any[] => {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err: any) {
    console.warn('[preBookingStorage] Error loading backup:', err.message);
  }
  return [];
};

export const savePreBookingsBackup = (bookings: any[]) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(bookings, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[preBookingStorage] Error writing backup:', err.message);
  }
};

export const appendPreBookingBackup = (booking: any) => {
  try {
    const current = loadPreBookingsBackup();
    const idx = current.findIndex(b => b.booking_code === booking.booking_code);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...booking };
    } else {
      current.unshift(booking);
    }
    savePreBookingsBackup(current);
  } catch (err: any) {
    console.warn('[preBookingStorage] Error appending to backup:', err.message);
  }
};

/**
 * Bi-directional self-healing sync:
 * 1. Takes all rows from PostgreSQL.
 * 2. Checks backup on disk for any vouchers not present in DB.
 * 3. Inserts any missing vouchers from disk into PostgreSQL.
 * 4. Saves complete combined list back to disk.
 */
export const syncPreBookingsWithDb = async (dbRows: any[], pool: any): Promise<any[]> => {
  try {
    const backupRows = loadPreBookingsBackup();
    if (!backupRows || backupRows.length === 0) {
      if (dbRows && dbRows.length > 0) {
        savePreBookingsBackup(dbRows);
      }
      return dbRows;
    }

    const dbCodes = new Set(dbRows.map(r => r.booking_code));
    const combined = [...dbRows];

    for (const b of backupRows) {
      if (b.booking_code && !dbCodes.has(b.booking_code)) {
        try {
          const insertSql = `
            INSERT INTO pre_bookings (
              booking_code, customer_name, mobile_number, booking_date, unit_price,
              quantity, total_amount, payment_mode, payment_status, notes,
              created_by_id, created_by_name, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, NOW()), COALESCE($14, NOW()))
            ON CONFLICT DO NOTHING
            RETURNING *
          `;
          const res = await pool.query(insertSql, [
            b.booking_code,
            b.customer_name,
            b.mobile_number,
            b.booking_date || new Date().toISOString().split('T')[0],
            b.unit_price || 499,
            b.quantity || 1,
            b.total_amount || 499,
            b.payment_mode || 'UPI',
            b.payment_status || 'PAID',
            b.notes || '',
            b.created_by_id || null,
            b.created_by_name || 'Staff',
            b.created_at || new Date().toISOString(),
            b.updated_at || new Date().toISOString()
          ]);
          if (res.rows.length > 0) {
            combined.unshift(res.rows[0]);
          } else {
            combined.unshift(b);
          }
        } catch (insertErr: any) {
          console.warn('[syncPreBookingsWithDb] Insertion fallback for', b.booking_code, insertErr.message);
          combined.unshift(b);
        }
      }
    }

    combined.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    savePreBookingsBackup(combined);
    return combined;
  } catch (err: any) {
    console.warn('[syncPreBookingsWithDb] General sync warning:', err.message);
    return dbRows;
  }
};
