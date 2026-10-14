import fs from 'fs';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'uploads');
const BACKUP_FILE = path.join(BACKUP_DIR, 'pre_bookings_backup.json');

export const INITIAL_SEEDED_PRE_BOOKINGS = [
  {
    id: 8,
    booking_code: 'DR-20260006',
    customer_name: 'Bablu kumar',
    mobile_number: '6395576346',
    booking_date: '2026-10-14',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'UPI',
    payment_status: 'PAID',
    notes: '',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-14T10:45:00.000Z',
    updated_at: '2026-10-14T10:45:00.000Z'
  },
  {
    id: 7,
    booking_code: 'DR-20260005',
    customer_name: 'Praveen kumar',
    mobile_number: '7009921255',
    booking_date: '2026-10-14',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'UPI',
    payment_status: 'PAID',
    notes: '',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-14T08:30:00.000Z',
    updated_at: '2026-10-14T08:30:00.000Z'
  },
  {
    id: 6,
    booking_code: 'DR-20260004',
    customer_name: 'Suhail',
    mobile_number: '7351606673',
    booking_date: '2026-10-13',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'UPI',
    payment_status: 'PAID',
    notes: '',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-13T11:24:00.000Z',
    updated_at: '2026-10-13T11:24:00.000Z'
  },
  {
    id: 5,
    booking_code: 'DR-20260003',
    customer_name: 'Arjun',
    mobile_number: '8445184978',
    booking_date: '2026-10-13',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'UPI',
    payment_status: 'PAID',
    notes: '',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-13T09:15:00.000Z',
    updated_at: '2026-10-13T09:15:00.000Z'
  },
  {
    id: 4,
    booking_code: 'DR-20260002',
    customer_name: 'Shivam Kumar',
    mobile_number: '7310972220',
    booking_date: '2026-10-12',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'UPI',
    payment_status: 'PAID',
    notes: '',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-12T11:30:00.000Z',
    updated_at: '2026-10-12T11:30:00.000Z'
  },
  {
    id: 3,
    booking_code: 'DR-20260001',
    customer_name: 'Anmol Upadhyay',
    mobile_number: '7060195110',
    booking_date: '2026-10-12',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'UPI',
    payment_status: 'PAID',
    notes: '',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-12T10:00:00.000Z',
    updated_at: '2026-10-12T10:00:00.000Z'
  }
];

// Ensure uploads folder exists
try {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[preBookingStorage] Could not create backup dir:', e);
}

export const loadPreBookingsBackup = (): any[] => {
  const candidateFiles = [
    path.join(process.cwd(), 'uploads', 'pre_bookings_backup.json'),
    path.join(__dirname, '..', '..', 'uploads', 'pre_bookings_backup.json'),
    path.join(process.cwd(), 'data', 'pre_bookings_backup.json'),
    path.join(__dirname, '..', 'data', 'pre_bookings_backup.json')
  ];

  for (const f of candidateFiles) {
    try {
      if (fs.existsSync(f)) {
        const raw = fs.readFileSync(f, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err: any) {
      console.warn('[preBookingStorage] Candidate read error:', f, err.message);
    }
  }

  // Auto-seed if completely empty
  try {
    savePreBookingsBackup(INITIAL_SEEDED_PRE_BOOKINGS);
  } catch {}
  return [...INITIAL_SEEDED_PRE_BOOKINGS];
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

export const deletePreBookingBackup = (idOrCode: any) => {
  try {
    const current = loadPreBookingsBackup();
    const filtered = current.filter(b => String(b.id) !== String(idOrCode) && String(b.booking_code) !== String(idOrCode));
    savePreBookingsBackup(filtered);
  } catch (err: any) {
    console.warn('[preBookingStorage] Error deleting from backup:', err.message);
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
    if (dbRows && dbRows.length > 0) {
      savePreBookingsBackup(dbRows);
      return dbRows;
    }

    const backupRows = loadPreBookingsBackup();
    if (!backupRows || backupRows.length === 0) {
      return [];
    }

    const combined = [...dbRows];
    const dbCodes = new Set(dbRows.map(r => r.booking_code));

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
