const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const realBookings = [
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
  }
];

async function main() {
  console.log('Synchronizing Supabase database with exact real pre-bookings...');

  // 1. Clear out dummy / obsolete records from pre_bookings
  await pool.query('DELETE FROM pre_bookings');
  console.log('Cleared old pre_bookings table.');

  // 2. Insert the 6 real records exactly matching Supabase Table Editor
  for (const b of realBookings) {
    await pool.query(`
      INSERT INTO pre_bookings (
        id, booking_code, customer_name, mobile_number, booking_date,
        unit_price, quantity, total_amount, payment_mode, payment_status,
        notes, created_by_id, created_by_name, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      b.id, b.booking_code, b.customer_name, b.mobile_number, b.booking_date,
      b.unit_price, b.quantity, b.total_amount, b.payment_mode, b.payment_status,
      b.notes, b.created_by_id, b.created_by_name, b.created_at, b.updated_at
    ]);
    console.log(`Inserted: ${b.booking_code} -> ${b.customer_name} (${b.mobile_number})`);
  }

  // 3. Reset Postgres ID sequence to 9 so future bookings get id 9, 10, ...
  await pool.query("SELECT setval(pg_get_serial_sequence('pre_bookings', 'id'), 8, true)").catch(() => {});

  // 4. Update upi_qr_settings next_booking_number to 20260007
  await pool.query(`
    INSERT INTO upi_qr_settings (id, upi_id, merchant_name, booking_id_prefix, starting_booking_number, next_booking_number, updated_at)
    VALUES (1, 'doonriders@icici', 'DOON RIDERS EV MOBILITY', 'DR-', 20260001, 20260007, NOW())
    ON CONFLICT (id) DO UPDATE SET
      booking_id_prefix = 'DR-',
      next_booking_number = 20260007,
      updated_at = NOW();
  `);
  console.log('Updated next_booking_number to 20260007');

  const check = await pool.query('SELECT id, booking_code, customer_name, mobile_number, booking_date FROM pre_bookings ORDER BY id ASC');
  console.log('Current rows in Supabase pre_bookings:', check.rows);

  await pool.end();
}

main().catch(console.error);
