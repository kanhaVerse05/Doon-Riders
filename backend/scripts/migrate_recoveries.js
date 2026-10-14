const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log('Running DB migration...');

    // 1. Add missing columns to scooty_recoveries
    await pool.query(`
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS recovery_agent_id INT;
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS recovery_agent_name VARCHAR(150);
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS recovery_agent_phone VARCHAR(50);
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS pickup_location TEXT;
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS pickup_live_location TEXT;
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS pickup_latitude NUMERIC(10, 7);
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS pickup_longitude NUMERIC(10, 7);
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS pickup_photos JSONB DEFAULT '[]';
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS reached_hub_at TIMESTAMPTZ;
      ALTER TABLE scooty_recoveries ADD COLUMN IF NOT EXISTS agent_notes TEXT;
    `);
    console.log('✅ Added missing columns to scooty_recoveries');

    // 2. Ensure RECOVERY_AGENT role exists
    await pool.query(`
      INSERT INTO roles (name, display_name, description, is_system)
      VALUES ('RECOVERY_AGENT', 'Recovery Agent', 'Field scooty recovery & pickup execution', FALSE)
      ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name;
    `);
    console.log('✅ RECOVERY_AGENT role ensured');

    // 3. Ensure recoveries permissions exist
    await pool.query(`
      INSERT INTO permissions (code, module, description) VALUES
        ('recoveries.view', 'Scooty Recovery', 'View scooty recovery tickets and status'),
        ('recoveries.view_all', 'Scooty Recovery', 'View all company recoveries across hubs'),
        ('recoveries.create', 'Scooty Recovery', 'Assign new scooty recovery request'),
        ('recoveries.accept', 'Scooty Recovery', 'Accept assigned recovery request'),
        ('recoveries.pickup', 'Scooty Recovery', 'Record vehicle pickup with GPS & 4 photos'),
        ('recoveries.reached_hub', 'Scooty Recovery', 'Mark scooty reached service hub'),
        ('recoveries.assign_tech', 'Scooty Recovery', 'Assign technician for damage inspection'),
        ('recoveries.inspect', 'Scooty Recovery', 'Submit technician damage inspection report'),
        ('recoveries.settle', 'Scooty Recovery', 'Approve final settlement and generate slip'),
        ('recoveries.delete', 'Scooty Recovery', 'Delete or cancel recovery record')
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('✅ recoveries permissions inserted');

    // 4. Role permissions
    // SUPER_ADMIN
    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'ALL'
      FROM roles r, permissions p
      WHERE r.name = 'SUPER_ADMIN' AND p.code LIKE 'recoveries.%'
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);

    // MANAGER
    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'ALL'
      FROM roles r, permissions p
      WHERE r.name = 'MANAGER' AND p.code IN ('recoveries.view', 'recoveries.view_all', 'recoveries.create', 'recoveries.settle')
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);

    // HUB_INCHARGE
    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'TEAM'
      FROM roles r, permissions p
      WHERE r.name = 'HUB_INCHARGE' AND p.code IN ('recoveries.view', 'recoveries.create', 'recoveries.assign_tech', 'recoveries.settle')
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);

    // TECHNICIAN
    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'ASSIGNED'
      FROM roles r, permissions p
      WHERE r.name = 'TECHNICIAN' AND p.code IN ('recoveries.view', 'recoveries.inspect')
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);

    // RECOVERY_AGENT
    await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id, scope)
      SELECT r.id, p.id, 'ASSIGNED'
      FROM roles r, permissions p
      WHERE r.name = 'RECOVERY_AGENT' AND p.code IN ('recoveries.view', 'recoveries.accept', 'recoveries.pickup', 'recoveries.reached_hub')
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    `);
    console.log('✅ role_permissions seeded');

    const checkPerms = await pool.query(`
      SELECT r.name as role, p.code, rp.scope
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE p.code LIKE 'recoveries.%'
    `);
    console.log('Active recovery role_permissions in DB:', checkPerms.rows.length);
  } catch (e) {
    console.error('Migration error:', e);
  } finally {
    await pool.end();
  }
})();
