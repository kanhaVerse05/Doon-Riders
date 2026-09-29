import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbHost = process.env.MYSQL_HOST || 'localhost';
const dbPort = Number(process.env.MYSQL_PORT) || 3306;
const dbUser = process.env.MYSQL_USER || 'root';
const dbPassword = process.env.MYSQL_PASSWORD || '';
const dbName = process.env.MYSQL_DATABASE || 'doon_riders_db';

async function runMySqlMigration() {
  console.log('=====================================================');
  console.log('🚀 DOON RIDERS - MYSQL DATABASE MIGRATION SYSTEM');
  console.log('=====================================================');
  console.log(`📡 Connecting to MySQL at ${dbHost}:${dbPort} (User: ${dbUser})...`);

  let connection;
  try {
    // 1. Connect without specific DB to ensure DB exists
    connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      multipleStatements: true
    });

    console.log(`✅ Connected to MySQL server!`);
    console.log(`📦 Creating database '${dbName}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);

    // 2. Read schema file
    const schemaPath = path.join(__dirname, '../../database/mysql_schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('🔨 Executing mysql_schema.sql (Creating 18 tables, keys & indexes)...');
    await connection.query(schemaSql);
    console.log('✅ All 18 MySQL tables and constraints created successfully!');

    // 3. Read seed file
    const seedPath = path.join(__dirname, '../../database/mysql_seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`Seed file not found at: ${seedPath}`);
    }
    const seedSql = fs.readFileSync(seedPath, 'utf-8');

    console.log('🌱 Executing mysql_seed.sql (Inserting RBAC, Admin, CRM Leads, Fleet, Gallery)...');
    await connection.query(seedSql);
    console.log('✅ Seed data inserted successfully!');

    // 4. Verification queries
    const tables = [
      'roles',
      'permissions',
      'role_permissions',
      'users',
      'fleet',
      'leads',
      'lead_timeline',
      'customers',
      'rentals',
      'audit_logs',
      'system_settings',
      'vehicles',
      'test_drive_bookings',
      'newsletters',
      'testimonials',
      'faqs',
      'gallery_images'
    ];

    console.log('\n📊 DATABASE RECORD VERIFICATION SUMMARY:');
    console.log('-----------------------------------------------------');
    for (const table of tables) {
      try {
        const [rows] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
        const count = (rows as any[])[0]?.cnt || 0;
        console.log(`  ✓ Table [${table.padEnd(20)}]: ${count} record(s)`);
      } catch (err: any) {
        console.warn(`  ⚠️ Table [${table.padEnd(20)}]: ${err.message}`);
      }
    }
    console.log('-----------------------------------------------------');
    console.log('🎉 MYSQL DATABASE FULLY PROVISIONED AND READY FOR DOON RIDERS!\n');

  } catch (err: any) {
    console.error('\n❌ MySQL Migration Failed:', err.message);
    console.error('Tip: Make sure your MySQL service (XAMPP / MySQL Server / Docker) is running on port 3306.');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMySqlMigration();
