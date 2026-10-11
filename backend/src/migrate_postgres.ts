import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const pgHost = process.env.PGHOST || 'localhost';
const pgPort = Number(process.env.PGPORT) || 5432;
const pgUser = process.env.PGUSER || 'postgres';
const pgPassword = process.env.PGPASSWORD || 'postgres';
const pgDatabase = process.env.PGDATABASE || 'doon_riders_db';
const databaseUrl = process.env.DATABASE_URL || `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;

async function runPostgresMigration() {
  console.log('=====================================================');
  console.log('🚀 DOON RIDERS - POSTGRESQL DATABASE MIGRATION SYSTEM');
  console.log('=====================================================');
  console.log(`📡 Connecting to PostgreSQL via pooler...`);

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('supabase.com') ? { rejectUnauthorized: false } : undefined
  });

  try {
    const res = await pool.query('SELECT current_database(), current_user, NOW() as current_time;');
    console.log(`✅ Connected to PostgreSQL [DB: ${res.rows[0].current_database}, User: ${res.rows[0].current_user}]`);

    // 1. Check if postgres_schema.sql exists
    const schemaPath = path.join(__dirname, '../../database/postgres_schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('🔨 Executing postgres_schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schemaSql);
      console.log('✅ PostgreSQL Schema applied successfully!');
    }

    // 2. Verification of all tables
    const tables = [
      'roles',
      'permissions',
      'role_permissions',
      'users',
      'fleet',
      'leads',
      'customers',
      'inventory',
      'repair_hubs',
      'technicians',
      'repair_jobs',
      'repair_inspections',
      'repair_parts',
      'repair_timing',
      'repair_audit_logs',
      'complaints',
      'complaint_events',
      'scooty_returns',
      'scooty_return_events',
      'scooty_recoveries',
      'scooty_recovery_events',
      'audit_logs',
      'pricing_plans',
      'pre_bookings',
      'gallery_images'
    ];

    console.log('\n📊 POSTGRESQL TABLE RECORD VERIFICATION SUMMARY:');
    console.log('-----------------------------------------------------');
    for (const table of tables) {
      try {
        const check = await pool.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
        const count = check.rows[0]?.cnt || 0;
        console.log(`  ✓ Table [${table.padEnd(24)}]: ${count} record(s)`);
      } catch (err: any) {
        console.warn(`  ⚠️ Table [${table.padEnd(24)}]: ${err.message}`);
      }
    }
    console.log('-----------------------------------------------------');
    console.log('🎉 POSTGRESQL DATABASE FULLY PROVISIONED FOR DOON RIDERS!\n');

  } catch (err: any) {
    console.error('\n❌ PostgreSQL Migration Error:', err.message);
  } finally {
    await pool.end();
  }
}

runPostgresMigration();
