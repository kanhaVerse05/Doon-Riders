const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const backupDir = path.join(__dirname, '..', 'uploads');
const backupFile = path.join(backupDir, 'pre_bookings_backup.json');

const bookingsToRestore = [
  {
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
    booking_code: 'DR-20260003',
    customer_name: 'Priya Negi',
    mobile_number: '9812345678',
    booking_date: '2026-10-13',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'UPI',
    payment_status: 'PAID',
    notes: 'Pre-booking reservation',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-13T10:15:00.000Z',
    updated_at: '2026-10-13T10:15:00.000Z'
  },
  {
    booking_code: 'DR-20260002',
    customer_name: 'Amit Sharma',
    mobile_number: '9897123456',
    booking_date: '2026-10-13',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'Cash',
    payment_status: 'PAID',
    notes: 'Walk-in pre-booking',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-13T09:40:00.000Z',
    updated_at: '2026-10-13T09:40:00.000Z'
  },
  {
    booking_code: 'DR-20260001',
    customer_name: 'Rahul Verma',
    mobile_number: '9876543210',
    booking_date: '2026-10-13',
    unit_price: 499.00,
    quantity: 1,
    total_amount: 499.00,
    payment_mode: 'UPI',
    payment_status: 'PAID',
    notes: 'First series pre-booking',
    created_by_id: 7,
    created_by_name: 'Rishab Agnihotri',
    created_at: '2026-10-13T09:05:00.000Z',
    updated_at: '2026-10-13T09:05:00.000Z'
  }
];

async function main() {
  console.log('Restoring pre-bookings to Supabase PostgreSQL...');

  // 1. Update QR Settings to series DR- 20260005
  await pool.query(`
    INSERT INTO upi_qr_settings (id, upi_id, merchant_name, booking_id_prefix, starting_booking_number, next_booking_number, updated_at)
    VALUES (1, 'doonriders@icici', 'DOONRIDERS PVT LTD', 'DR-', 20260001, 20260005, NOW())
    ON CONFLICT (id) DO UPDATE SET
      upi_id = EXCLUDED.upi_id,
      merchant_name = EXCLUDED.merchant_name,
      booking_id_prefix = EXCLUDED.booking_id_prefix,
      starting_booking_number = EXCLUDED.starting_booking_number,
      next_booking_number = 20260005,
      updated_at = NOW();
  `);
  console.log('Updated upi_qr_settings to DR- prefix and next number 20260005');

  // 2. Insert pre-bookings
  for (const b of bookingsToRestore) {
    const check = await pool.query('SELECT id FROM pre_bookings WHERE booking_code = $1', [b.booking_code]);
    if (check.rows.length === 0) {
      await pool.query(`
        INSERT INTO pre_bookings (
          booking_code, customer_name, mobile_number, booking_date, unit_price,
          quantity, total_amount, payment_mode, payment_status, notes,
          created_by_id, created_by_name, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        b.booking_code, b.customer_name, b.mobile_number, b.booking_date, b.unit_price,
        b.quantity, b.total_amount, b.payment_mode, b.payment_status, b.notes,
        b.created_by_id, b.created_by_name, b.created_at, b.updated_at
      ]);
      console.log(`Inserted ${b.booking_code} (${b.customer_name})`);
    } else {
      console.log(`Already exists: ${b.booking_code}`);
    }
  }

  // 3. Query all pre-bookings from DB
  const allInDb = await pool.query('SELECT * FROM pre_bookings ORDER BY created_at DESC');
  console.log(`Total pre-bookings in DB now: ${allInDb.rows.length}`);

  // 4. Save to uploads/pre_bookings_backup.json
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  fs.writeFileSync(backupFile, JSON.stringify(allInDb.rows, null, 2), 'utf-8');
  console.log(`Saved ${allInDb.rows.length} pre-bookings to ${backupFile}`);

  await pool.end();
}

main().catch(console.error);
