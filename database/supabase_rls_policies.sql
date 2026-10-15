-- =============================================================================
-- DOON RIDERS EV MOBILITY - COMPLETE ENTERPRISE ROW LEVEL SECURITY (RLS) POLICIES
-- Compatible with PostgreSQL 13+ & Supabase Cloud / Self-Hosted Supabase Studio
-- =============================================================================

-- Ensure standard Supabase roles exist (if running in standard Postgres)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

-- =============================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY (RLS) ON ALL 26 DATABASE TABLES
-- =============================================================================
ALTER TABLE IF EXISTS roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pre_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS upi_qr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS repair_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS repair_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS repair_timing ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS repair_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS complaint_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scooty_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scooty_return_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scooty_recoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scooty_recovery_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: BACKEND & SERVICE ROLE FULL ACCESS POLICIES
-- Ensures Node.js Express backend and Super Admin direct connections have full access.
-- =============================================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'roles', 'users', 'permissions', 'role_permissions', 'audit_logs',
    'gallery_images', 'pricing_plans', 'pre_bookings', 'upi_qr_settings',
    'inventory', 'repair_hubs', 'technicians', 'fleet', 'leads', 'customers',
    'repair_jobs', 'repair_inspections', 'repair_parts', 'repair_timing',
    'repair_audit_logs', 'complaints', 'complaint_events', 'scooty_returns',
    'scooty_return_events', 'scooty_recoveries', 'scooty_recovery_events'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop existing policy if any
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON %I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "postgres_all_%I" ON %I;', tbl, tbl);
    
    -- Grant full ALL access to service_role and postgres
    EXECUTE format('
      CREATE POLICY "service_role_all_%I" ON %I
      FOR ALL
      TO service_role, postgres
      USING (true)
      WITH CHECK (true);
    ', tbl, tbl);
  END LOOP;
END $$;

-- =============================================================================
-- TIER 1: PUBLIC READ-ONLY CONTENT (Website Display)
-- Public visitors can read marketing content; protected writes use the backend.
-- =============================================================================

-- 1. Pricing Plans (Public can view active subscription plans)
DROP POLICY IF EXISTS "pricing_plans_public_read" ON pricing_plans;
DROP POLICY IF EXISTS "pricing_plans_auth_manage" ON pricing_plans;
CREATE POLICY "pricing_plans_public_read" ON pricing_plans
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
CREATE POLICY "pricing_plans_auth_manage" ON pricing_plans
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 2. Vehicle Gallery Images (Public can view gallery photos)
DROP POLICY IF EXISTS "gallery_public_read" ON gallery_images;
DROP POLICY IF EXISTS "gallery_auth_manage" ON gallery_images;
CREATE POLICY "gallery_public_read" ON gallery_images
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "gallery_auth_manage" ON gallery_images
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 3. Fleet Models (Public can view available scooter models & specifications)
DROP POLICY IF EXISTS "fleet_public_read" ON fleet;
DROP POLICY IF EXISTS "fleet_auth_manage" ON fleet;
CREATE POLICY "fleet_public_read" ON fleet
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "fleet_auth_manage" ON fleet
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 4. Repair Hubs & Swap Stations (Public can find hub locations)
DROP POLICY IF EXISTS "hubs_public_read" ON repair_hubs;
DROP POLICY IF EXISTS "hubs_auth_manage" ON repair_hubs;
CREATE POLICY "hubs_public_read" ON repair_hubs
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
CREATE POLICY "hubs_auth_manage" ON repair_hubs
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 5. UPI QR Settings (Public booking receipt can read payment QR & prefix)
DROP POLICY IF EXISTS "upi_qr_public_read" ON upi_qr_settings;
DROP POLICY IF EXISTS "upi_qr_auth_manage" ON upi_qr_settings;
CREATE POLICY "upi_qr_public_read" ON upi_qr_settings
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "upi_qr_auth_manage" ON upi_qr_settings
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TIER 2: PUBLIC INBOUND SUBMISSION FORMS
-- Public visitors can submit bookings / leads / breakdown tickets.
-- Reading, updating, and deleting other users' data is strictly blocked from anon.
-- =============================================================================

-- 6. Leads (Website Inbound CRM Leads)
DROP POLICY IF EXISTS "leads_public_insert" ON leads;
DROP POLICY IF EXISTS "leads_auth_manage" ON leads;
CREATE POLICY "leads_public_insert" ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "leads_auth_manage" ON leads
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 7. Pre-Bookings (EV Pre-Order Reservations & Vouchers)
DROP POLICY IF EXISTS "pre_bookings_public_insert" ON pre_bookings;
DROP POLICY IF EXISTS "pre_bookings_auth_manage" ON pre_bookings;
CREATE POLICY "pre_bookings_public_insert" ON pre_bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "pre_bookings_auth_manage" ON pre_bookings
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 8. Customer Breakdown Complaints (Roadside Assistance Tickets)
DROP POLICY IF EXISTS "complaints_public_insert" ON complaints;
DROP POLICY IF EXISTS "complaints_auth_manage" ON complaints;
CREATE POLICY "complaints_public_insert" ON complaints
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "complaints_auth_manage" ON complaints
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TIER 3: OPERATIONS, INVENTORY & FLEET CRM (Backend Only)
-- Anonymous and direct authenticated access is denied; the API uses the privileged DB role.
-- =============================================================================

-- 9. Inventory & Spare Parts
DROP POLICY IF EXISTS "inventory_auth_all" ON inventory;
CREATE POLICY "inventory_auth_all" ON inventory
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 10. Technicians Directory
DROP POLICY IF EXISTS "technicians_auth_all" ON technicians;
CREATE POLICY "technicians_auth_all" ON technicians
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 11. Customers Directory
DROP POLICY IF EXISTS "customers_auth_all" ON customers;
CREATE POLICY "customers_auth_all" ON customers
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 12. Repair Jobs & Workshop Tracking
DROP POLICY IF EXISTS "repair_jobs_auth_all" ON repair_jobs;
CREATE POLICY "repair_jobs_auth_all" ON repair_jobs
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 13. Repair Inspections
DROP POLICY IF EXISTS "repair_inspections_auth_all" ON repair_inspections;
CREATE POLICY "repair_inspections_auth_all" ON repair_inspections
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 14. Repair Parts Requisition
DROP POLICY IF EXISTS "repair_parts_auth_all" ON repair_parts;
CREATE POLICY "repair_parts_auth_all" ON repair_parts
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 15. Repair Timing & Diagnostic Clock
DROP POLICY IF EXISTS "repair_timing_auth_all" ON repair_timing;
CREATE POLICY "repair_timing_auth_all" ON repair_timing
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 16. Repair Audit Logs
DROP POLICY IF EXISTS "repair_audit_auth_read" ON repair_audit_logs;
DROP POLICY IF EXISTS "repair_audit_auth_insert" ON repair_audit_logs;
CREATE POLICY "repair_audit_auth_read" ON repair_audit_logs
  FOR SELECT TO service_role, postgres
  USING (true);
CREATE POLICY "repair_audit_auth_insert" ON repair_audit_logs
  FOR INSERT TO service_role, postgres
  WITH CHECK (true);

-- 17. Complaint Event History
DROP POLICY IF EXISTS "complaint_events_auth_all" ON complaint_events;
CREATE POLICY "complaint_events_auth_all" ON complaint_events
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 18. Scooty Return Inspections & Settlements
DROP POLICY IF EXISTS "scooty_returns_auth_all" ON scooty_returns;
CREATE POLICY "scooty_returns_auth_all" ON scooty_returns
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 19. Scooty Return Event Log
DROP POLICY IF EXISTS "scooty_return_events_auth_all" ON scooty_return_events;
CREATE POLICY "scooty_return_events_auth_all" ON scooty_return_events
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 20. Scooty Recoveries (Field In-pound & Impound Settlement)
DROP POLICY IF EXISTS "scooty_recoveries_auth_all" ON scooty_recoveries;
CREATE POLICY "scooty_recoveries_auth_all" ON scooty_recoveries
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 21. Scooty Recovery Event History
DROP POLICY IF EXISTS "scooty_recovery_events_auth_all" ON scooty_recovery_events;
CREATE POLICY "scooty_recovery_events_auth_all" ON scooty_recovery_events
  FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- =============================================================================
-- TIER 4: USERS, ROLES, RBAC & SYSTEM SECURITY (Backend Only)
-- Sensitive security tables remain inaccessible to direct client database sessions.
-- =============================================================================

-- 22. Roles Table
DROP POLICY IF EXISTS "roles_auth_read" ON roles;
CREATE POLICY "roles_auth_read" ON roles
  FOR SELECT TO service_role, postgres
  USING (true);

-- 23. Permissions Table
DROP POLICY IF EXISTS "permissions_auth_read" ON permissions;
CREATE POLICY "permissions_auth_read" ON permissions
  FOR SELECT TO service_role, postgres
  USING (true);

-- 24. Role Permissions Mapping Table
DROP POLICY IF EXISTS "role_permissions_auth_read" ON role_permissions;
CREATE POLICY "role_permissions_auth_read" ON role_permissions
  FOR SELECT TO service_role, postgres
  USING (true);

-- 25. Users Table (Staff & Super Admin Directory)
-- Direct client access is denied (protects password hashes).
DROP POLICY IF EXISTS "users_auth_select" ON users;
DROP POLICY IF EXISTS "users_auth_update" ON users;
CREATE POLICY "users_auth_select" ON users
  FOR SELECT TO service_role, postgres
  USING (deleted_at IS NULL);
CREATE POLICY "users_auth_update" ON users
  FOR UPDATE TO service_role, postgres
  USING (true) WITH CHECK (true);

-- 26. Audit Logs Table
DROP POLICY IF EXISTS "audit_logs_auth_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_auth_insert" ON audit_logs;
CREATE POLICY "audit_logs_auth_select" ON audit_logs
  FOR SELECT TO service_role, postgres
  USING (true);
CREATE POLICY "audit_logs_auth_insert" ON audit_logs
  FOR INSERT TO service_role, postgres
  WITH CHECK (true);

-- =============================================================================
-- VERIFICATION QUERY
-- Shows all enabled RLS tables and their policy counts.
-- =============================================================================
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
