-- =============================================================================
-- DOON RIDERS - COMPLETE ENTERPRISE POSTGRESQL DATABASE SCHEMA
-- Compatible with PostgreSQL 13+ and Supabase Cloud
-- =============================================================================

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(150) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role_id INT REFERENCES roles(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'active',
  avatar_url VARCHAR(500),
  last_login TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  module VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROLE PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
  scope VARCHAR(50) DEFAULT 'ALL',
  PRIMARY KEY (role_id, permission_id)
);

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(150),
  user_role VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100) NOT NULL,
  record_id INT,
  old_data JSONB,
  new_data JSONB,
  notes TEXT,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. GALLERY IMAGES TABLE
CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  vehicle_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PRICING PLANS TABLE
CREATE TABLE IF NOT EXISTS pricing_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  tagline VARCHAR(255),
  price NUMERIC(10, 2) NOT NULL DEFAULT 1699.00,
  period VARCHAR(50) NOT NULL DEFAULT 'week',
  badge VARCHAR(50),
  features JSONB NOT NULL,
  security_deposit NUMERIC(10, 2) DEFAULT 2000.00,
  is_popular BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PRE BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS pre_bookings (
  id SERIAL PRIMARY KEY,
  booking_code VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(150) NOT NULL,
  mobile_number VARCHAR(50) NOT NULL,
  booking_date DATE NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 499.00,
  quantity INT NOT NULL DEFAULT 1,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 499.00,
  payment_mode VARCHAR(50) NOT NULL DEFAULT 'UPI',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PAID',
  notes TEXT,
  created_by_id INT,
  created_by_name VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. UPI QR SETTINGS TABLE
CREATE TABLE IF NOT EXISTS upi_qr_settings (
  id INT PRIMARY KEY DEFAULT 1,
  upi_id VARCHAR(100) NOT NULL DEFAULT 'doonriders@icici',
  merchant_name VARCHAR(150) NOT NULL DEFAULT 'DOON RIDERS EV MOBILITY',
  qr_image_url VARCHAR(500),
  booking_id_prefix VARCHAR(20) NOT NULL DEFAULT 'DR-PB-',
  starting_booking_number INT NOT NULL DEFAULT 1001,
  next_booking_number INT NOT NULL DEFAULT 1001,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  part_code VARCHAR(50) NOT NULL UNIQUE,
  part_name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Spare Parts',
  image_url VARCHAR(500),
  quantity INT NOT NULL DEFAULT 0,
  min_threshold INT NOT NULL DEFAULT 5,
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'In Stock',
  location VARCHAR(150) DEFAULT 'Main Hub Workshop',
  supplier VARCHAR(150),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. REPAIR HUBS TABLE
CREATE TABLE IF NOT EXISTS repair_hubs (
  id SERIAL PRIMARY KEY,
  hub_code VARCHAR(50) NOT NULL UNIQUE,
  hub_name VARCHAR(150) NOT NULL,
  location VARCHAR(200) NOT NULL,
  incharge_name VARCHAR(150) NOT NULL,
  incharge_phone VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TECHNICIANS TABLE
CREATE TABLE IF NOT EXISTS technicians (
  id SERIAL PRIMARY KEY,
  technician_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(150),
  hub_id INT,
  hub_name VARCHAR(150),
  specialization VARCHAR(150) DEFAULT 'General EV Technician',
  status VARCHAR(50) NOT NULL DEFAULT 'Available',
  active_jobs_count INT DEFAULT 0,
  rating NUMERIC(3, 2) DEFAULT 4.8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. FLEET TABLE
CREATE TABLE IF NOT EXISTS fleet (
  id SERIAL PRIMARY KEY,
  reg_number VARCHAR(50) NOT NULL UNIQUE,
  brand VARCHAR(100) NOT NULL DEFAULT 'DOON Riders',
  model VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(100) DEFAULT 'Electric Scooty',
  battery_capacity_kwh NUMERIC(5, 2) DEFAULT 3.20,
  battery_health_percentage INT DEFAULT 98,
  battery_type VARCHAR(100) DEFAULT 'Lithium-ion LFP',
  range_km INT DEFAULT 120,
  top_speed_kmh INT DEFAULT 75,
  current_km INT DEFAULT 0,
  current_location VARCHAR(150) DEFAULT 'Main Hub Workshop',
  daily_rate NUMERIC(10, 2) DEFAULT 499.00,
  weekly_rate NUMERIC(10, 2) DEFAULT 2999.00,
  monthly_rate NUMERIC(10, 2) DEFAULT 8999.00,
  status VARCHAR(50) DEFAULT 'Available',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. LEADS TABLE
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  lead_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(150),
  location VARCHAR(150),
  vehicle_interested_in VARCHAR(150),
  rental_duration_days INT DEFAULT 7,
  rental_plan VARCHAR(50) DEFAULT 'Weekly',
  lead_source VARCHAR(100) DEFAULT 'Website Form',
  status VARCHAR(50) DEFAULT 'New',
  assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100) DEFAULT 'Dehradun',
  kyc_status VARCHAR(50) DEFAULT 'Verified',
  total_rentals INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. REPAIR JOBS TABLE
CREATE TABLE IF NOT EXISTS repair_jobs (
  id SERIAL PRIMARY KEY,
  job_number VARCHAR(50) NOT NULL UNIQUE,
  scooter_id INT,
  scooter_number VARCHAR(50) NOT NULL,
  rider_name VARCHAR(150) NOT NULL,
  rider_contact VARCHAR(50) NOT NULL,
  hub_id INT,
  hub_name VARCHAR(150) NOT NULL,
  technician_id INT,
  technician_name VARCHAR(150),
  complaint TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
  status VARCHAR(50) NOT NULL DEFAULT 'Pending Inspection',
  created_by_id INT,
  created_by_name VARCHAR(150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 17. REPAIR INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS repair_inspections (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES repair_jobs(id) ON DELETE CASCADE,
  technician_id INT,
  technician_name VARCHAR(150),
  problem_found TEXT NOT NULL,
  inspection_notes TEXT,
  estimated_repair_time VARCHAR(50),
  photos JSONB DEFAULT '[]',
  inspected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. REPAIR PARTS TABLE
CREATE TABLE IF NOT EXISTS repair_parts (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES repair_jobs(id) ON DELETE CASCADE,
  part_id INT,
  part_name VARCHAR(150) NOT NULL,
  requested_quantity INT DEFAULT 1,
  approved_quantity INT DEFAULT 0,
  replaced_quantity INT DEFAULT 0,
  unit_price NUMERIC(10, 2) DEFAULT 0.00,
  total_price NUMERIC(10, 2) DEFAULT 0.00,
  status VARCHAR(50) DEFAULT 'Requested',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. REPAIR TIMING TABLE
CREATE TABLE IF NOT EXISTS repair_timing (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES repair_jobs(id) ON DELETE CASCADE,
  repair_started_at TIMESTAMPTZ,
  repair_completed_at TIMESTAMPTZ,
  started_by_id INT,
  started_by_name VARCHAR(150),
  completed_by_id INT,
  completed_by_name VARCHAR(150),
  total_duration_seconds INT DEFAULT 0,
  total_duration_formatted VARCHAR(50),
  technician_notes TEXT,
  completion_photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. REPAIR AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS repair_audit_logs (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES repair_jobs(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  performed_by_id INT,
  performed_by_name VARCHAR(150),
  performed_by_role VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. COMPLAINTS TABLE (Breakdown & Field Jobs)
CREATE TABLE IF NOT EXISTS complaints (
  id SERIAL PRIMARY KEY,
  complaint_number VARCHAR(50) NOT NULL UNIQUE,
  scooter_id INT,
  scooter_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  location_address TEXT NOT NULL,
  location_url TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  issue_category VARCHAR(100) NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL,
  priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
  hub_id INT REFERENCES repair_hubs(id) ON DELETE SET NULL,
  hub_name VARCHAR(150),
  hub_incharge_id INT,
  hub_incharge_name VARCHAR(150),
  technician_id INT REFERENCES technicians(id) ON DELETE SET NULL,
  technician_name VARCHAR(150),
  technician_phone VARCHAR(50),
  technician_code VARCHAR(50),
  technician_latitude NUMERIC(10, 7),
  technician_longitude NUMERIC(10, 7),
  technician_location_updated_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'New',
  journey_started_at TIMESTAMPTZ,
  reached_at TIMESTAMPTZ,
  reached_latitude NUMERIC(10, 7),
  reached_longitude NUMERIC(10, 7),
  journey_duration_seconds INT DEFAULT 0,
  journey_duration_formatted VARCHAR(50),
  work_started_at TIMESTAMPTZ,
  work_completed_at TIMESTAMPTZ,
  work_duration_seconds INT DEFAULT 0,
  work_duration_formatted VARCHAR(50),
  work_performed TEXT,
  parts_used JSONB DEFAULT '[]',
  technician_remarks TEXT,
  proof_photos JSONB DEFAULT '[]',
  completion_notes TEXT,
  final_latitude NUMERIC(10, 7),
  final_longitude NUMERIC(10, 7),
  return_journey_started_at TIMESTAMPTZ,
  return_journey_completed_at TIMESTAMPTZ,
  created_by_id INT,
  created_by_name VARCHAR(150),
  created_by_role VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- 22. COMPLAINT EVENTS TABLE
CREATE TABLE IF NOT EXISTS complaint_events (
  id SERIAL PRIMARY KEY,
  complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  performed_by_id INT,
  performed_by_name VARCHAR(150),
  performed_by_role VARCHAR(100),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  duration_seconds INT DEFAULT 0,
  duration_formatted VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. SCOOTY RETURNS TABLE
CREATE TABLE IF NOT EXISTS scooty_returns (
  id SERIAL PRIMARY KEY,
  return_number VARCHAR(50) NOT NULL UNIQUE,
  rider_name VARCHAR(150) NOT NULL,
  rider_phone VARCHAR(50) NOT NULL,
  scooter_number VARCHAR(50) NOT NULL,
  scooter_id INT,
  hub_id INT REFERENCES repair_hubs(id) ON DELETE SET NULL,
  hub_name VARCHAR(150),
  hub_incharge_id INT,
  hub_incharge_name VARCHAR(150),
  return_date DATE NOT NULL,
  return_time VARCHAR(50) NOT NULL,
  initial_meter_reading NUMERIC(10, 2),
  security_deposit_amount NUMERIC(10, 2) DEFAULT 2000.00,
  technician_id INT REFERENCES technicians(id) ON DELETE SET NULL,
  technician_name VARCHAR(150),
  technician_phone VARCHAR(50),
  technician_code VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'Pending Inspection',
  damage_items JSONB DEFAULT '[]',
  gross_damage_total NUMERIC(10, 2) DEFAULT 0.00,
  payable_damage_total NUMERIC(10, 2) DEFAULT 0.00,
  waived_damage_total NUMERIC(10, 2) DEFAULT 0.00,
  settlement_type VARCHAR(50) DEFAULT 'FULL_REFUND',
  refund_amount_to_rider NUMERIC(10, 2) DEFAULT 2000.00,
  due_amount_from_rider NUMERIC(10, 2) DEFAULT 0.00,
  rider_payment_status VARCHAR(50) DEFAULT 'Pending',
  rider_payment_mode VARCHAR(50),
  rider_payment_reference VARCHAR(150),
  settlement_notes TEXT,
  initial_remarks TEXT,
  inspection_started_at TIMESTAMPTZ,
  inspection_completed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_by_id INT,
  created_by_name VARCHAR(150),
  created_by_role VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. SCOOTY RETURN EVENTS TABLE
CREATE TABLE IF NOT EXISTS scooty_return_events (
  id SERIAL PRIMARY KEY,
  return_id INT REFERENCES scooty_returns(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  performed_by_id INT,
  performed_by_name VARCHAR(150),
  performed_by_role VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 25. SCOOTY RECOVERIES TABLE
CREATE TABLE IF NOT EXISTS scooty_recoveries (
  id SERIAL PRIMARY KEY,
  recovery_number VARCHAR(50) NOT NULL UNIQUE,
  rider_name VARCHAR(150) NOT NULL,
  rider_phone VARCHAR(50) NOT NULL,
  scooter_number VARCHAR(50) NOT NULL,
  scooter_id INT,
  hub_id INT REFERENCES repair_hubs(id) ON DELETE SET NULL,
  hub_name VARCHAR(150),
  hub_incharge_id INT,
  hub_incharge_name VARCHAR(150),
  recovered_by VARCHAR(150) NOT NULL,
  recovery_date DATE NOT NULL,
  recovery_time VARCHAR(50) NOT NULL,
  recovery_charge NUMERIC(10, 2) DEFAULT 1000.00,
  security_deposit_amount NUMERIC(10, 2) DEFAULT 2000.00,
  technician_id INT REFERENCES technicians(id) ON DELETE SET NULL,
  technician_name VARCHAR(150),
  technician_phone VARCHAR(50),
  technician_code VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'Pending Inspection',
  damage_items JSONB DEFAULT '[]',
  gross_damage_total NUMERIC(10, 2) DEFAULT 0.00,
  payable_damage_total NUMERIC(10, 2) DEFAULT 0.00,
  waived_damage_total NUMERIC(10, 2) DEFAULT 0.00,
  total_charges NUMERIC(10, 2) DEFAULT 1000.00,
  settlement_type VARCHAR(50) DEFAULT 'PARTIAL_REFUND',
  refund_amount_to_rider NUMERIC(10, 2) DEFAULT 1000.00,
  due_amount_from_rider NUMERIC(10, 2) DEFAULT 0.00,
  rider_payment_status VARCHAR(50) DEFAULT 'Pending',
  rider_payment_mode VARCHAR(50),
  rider_payment_reference VARCHAR(150),
  settlement_notes TEXT,
  recovery_reason TEXT,
  initial_remarks TEXT,
  inspection_started_at TIMESTAMPTZ,
  inspection_completed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_by_id INT,
  created_by_name VARCHAR(150),
  created_by_role VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 26. SCOOTY RECOVERY EVENTS TABLE
CREATE TABLE IF NOT EXISTS scooty_recovery_events (
  id SERIAL PRIMARY KEY,
  recovery_id INT REFERENCES scooty_recoveries(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  performed_by_id INT,
  performed_by_name VARCHAR(150),
  performed_by_role VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
