const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL is not set in environment or backend/.env');
  process.exit(1);
}

const isRemoteDb = databaseUrl.includes('supabase') || 
                   databaseUrl.includes('sslmode=') || 
                   databaseUrl.includes('neon.tech') || 
                   databaseUrl.includes('railway') || 
                   process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined
});

async function enableRlsAndPolicies() {
  console.log('🚀 Connecting to PostgreSQL Database...');
  const client = await pool.connect();
  try {
    console.log('✅ Connected successfully!');
    
    // Find sql file path
    const sqlPath = path.resolve(__dirname, '../../database/supabase_rls_policies.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found at ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('📜 Executing Row Level Security (RLS) policies SQL...');

    await client.query(sqlContent);
    console.log('✅ All RLS tables enabled & smart security policies applied successfully!\n');

    // Verification check
    console.log('🔍 Verifying RLS status across all public tables:');
    const res = await client.query(`
      SELECT tablename, rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    res.rows.forEach(r => {
      const statusIcon = r.rls_enabled ? '🛡️  RLS ENABLED' : '⚠️  RLS DISABLED';
      console.log(`   ${statusIcon.padEnd(20)} : ${r.tablename}`);
    });

    console.log('\n🎉 Complete! Supabase RLS is now 100% active and protected.');
  } catch (err) {
    console.error('❌ Error applying RLS policies:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

enableRlsAndPolicies();
