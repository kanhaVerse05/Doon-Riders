const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  console.log('Connecting to database...');
  
  // 1. Alter users.avatar_url to TEXT
  await pool.query('ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT;');
  console.log('1. users.avatar_url altered to TEXT successfully.');

  // 2. Remove ADMIN role
  const adminRole = await pool.query("SELECT id FROM roles WHERE name = 'ADMIN'");
  if (adminRole.rows.length > 0) {
    const adminRoleId = adminRole.rows[0].id;
    await pool.query("UPDATE users SET role_id = 1 WHERE role_id = $1", [adminRoleId]);
    await pool.query("DELETE FROM role_permissions WHERE role_id = $1", [adminRoleId]);
    await pool.query("DELETE FROM roles WHERE id = $1", [adminRoleId]);
    console.log('2. ADMIN role removed and users re-assigned to SUPER_ADMIN.');
  } else {
    console.log('2. ADMIN role already removed.');
  }

  // 3. Insert Pre-Booking permissions
  await pool.query(`
    INSERT INTO permissions (code, module, description) VALUES
      ('pre_bookings.view', 'Pre-Bookings', 'View pre-booking list and reservation vouchers'),
      ('pre_bookings.view_all', 'Pre-Bookings', 'View company-wide pre-bookings and financial collections'),
      ('pre_bookings.create', 'Pre-Bookings', 'Create customer EV pre-bookings and issue vouchers'),
      ('pre_bookings.status_update', 'Pre-Bookings', 'Update booking status (Paid, Cancelled, Pending)'),
      ('pre_bookings.delete', 'Pre-Bookings', 'Delete pre-booking entries from system'),
      ('pre_bookings.export', 'Pre-Bookings', 'Export pre-bookings list to CSV/Excel'),
      ('pre_bookings.settings', 'Pre-Bookings', 'Configure QR UPI payments and dynamic receipt series')
    ON CONFLICT (code) DO NOTHING;
  `);
  console.log('3. Pre-Bookings permissions created successfully.');

  // 4. Grant Pre-Bookings permissions to SUPER_ADMIN
  const superAdminRole = await pool.query("SELECT id FROM roles WHERE name = 'SUPER_ADMIN'");
  if (superAdminRole.rows.length > 0) {
    const saId = superAdminRole.rows[0].id;
    const pbPerms = await pool.query("SELECT id FROM permissions WHERE module = 'Pre-Bookings'");
    for (const p of pbPerms.rows) {
      await pool.query(`
        INSERT INTO role_permissions (role_id, permission_id, scope)
        VALUES ($1, $2, 'ALL')
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `, [saId, p.id]);
    }
    console.log('4. Pre-Bookings permissions granted to SUPER_ADMIN.');
  }

  console.log('Migration finished successfully!');
}

migrate()
  .catch(err => {
    console.error('Migration error:', err.message);
  })
  .finally(() => pool.end());
