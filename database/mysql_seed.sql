-- =============================================================================
-- DOON RIDERS - COMPLETE MYSQL SEED DATA
-- Inserts all RBAC, Users, Fleet, CRM Leads, Gallery, FAQs, Testimonials, Settings
-- =============================================================================

USE doon_riders_db;

-- -----------------------------------------------------------------------------
-- 1. SEED PERMISSIONS
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO permissions (id, code, module, description) VALUES
-- Dashboard
(1, 'dashboard.view', 'Dashboard', 'View basic dashboard metrics'),
(2, 'dashboard.view_all', 'Dashboard', 'View enterprise analytics and full company metrics'),
(3, 'dashboard.view_sales', 'Dashboard', 'View personal sales KPI metrics'),

-- Leads
(4, 'leads.view', 'Leads', 'View leads list'),
(5, 'leads.view_all', 'Leads', 'View all leads across entire company'),
(6, 'leads.view_assigned', 'Leads', 'View only assigned leads'),
(7, 'leads.create', 'Leads', 'Create new leads manually'),
(8, 'leads.edit', 'Leads', 'Edit lead contact and requirement details'),
(9, 'leads.delete', 'Leads', 'Delete/Soft-delete lead records'),
(10, 'leads.assign', 'Leads', 'Assign unassigned leads to sales team'),
(11, 'leads.reassign', 'Leads', 'Reassign existing leads between executives'),
(12, 'leads.status_update', 'Leads', 'Change lead status progression'),
(13, 'leads.notes', 'Leads', 'Add and view notes on leads'),
(14, 'leads.followup', 'Leads', 'Schedule and update lead follow-ups'),
(15, 'leads.export', 'Leads', 'Export leads data to CSV/Excel'),

-- Customers
(16, 'customers.view', 'Customers', 'View customer list and profiles'),
(17, 'customers.view_all', 'Customers', 'View all customer profiles'),
(18, 'customers.create', 'Customers', 'Create new customer records'),
(19, 'customers.edit', 'Customers', 'Edit customer details and KYC status'),
(20, 'customers.delete', 'Customers', 'Delete customer records'),

-- Rentals
(21, 'rentals.view', 'Rentals', 'View rental agreements and active bookings'),
(22, 'rentals.create', 'Rentals', 'Create new rental booking and allocate vehicle'),
(23, 'rentals.edit', 'Rentals', 'Edit rental plan, rates, and end dates'),
(24, 'rentals.delete', 'Rentals', 'Delete rental records'),
(25, 'rentals.assign', 'Rentals', 'Allocate EV Scooty to booking'),
(26, 'rentals.cancel', 'Rentals', 'Cancel active or pending rentals'),

-- Fleet
(27, 'fleet.view', 'Fleet', 'View EV Scooty fleet inventory'),
(28, 'fleet.view_all', 'Fleet', 'View all fleet and maintenance metrics'),
(29, 'fleet.create', 'Fleet', 'Add new EV Scooties to fleet'),
(30, 'fleet.edit', 'Fleet', 'Update vehicle rates, status, and specs'),
(31, 'fleet.delete', 'Fleet', 'Remove vehicles from fleet'),
(32, 'fleet.assign', 'Fleet', 'Assign vehicles to customer bookings'),
(33, 'fleet.maintenance', 'Fleet', 'Log and manage fleet maintenance and battery checks'),

-- Reports
(34, 'reports.view', 'Reports', 'Access reports module'),
(35, 'reports.sales', 'Reports', 'View sales performance and conversion funnel reports'),
(36, 'reports.leads', 'Reports', 'View marketing and ad attribution reports'),
(37, 'reports.fleet', 'Reports', 'View fleet utilization and maintenance reports'),
(38, 'reports.revenue', 'Reports', 'View financial revenue and outstanding payments'),
(39, 'reports.export', 'Reports', 'Export reporting data'),

-- Users
(40, 'users.view', 'Users', 'View team users and directory'),
(41, 'users.create', 'Users', 'Create new team user accounts'),
(42, 'users.edit', 'Users', 'Edit team member profiles and statuses'),
(43, 'users.deactivate', 'Users', 'Deactivate or suspend user accounts'),
(44, 'users.delete', 'Users', 'Delete user accounts'),

-- Roles & Permissions
(45, 'roles.view', 'Roles', 'View roles and permission matrix'),
(46, 'roles.create', 'Roles', 'Create custom roles'),
(47, 'roles.edit', 'Roles', 'Edit role definitions'),
(48, 'roles.delete', 'Roles', 'Delete custom roles'),
(49, 'permissions.manage', 'Roles', 'Configure granular permissions and data scopes'),

-- Settings
(50, 'settings.view', 'Settings', 'View system settings'),
(51, 'settings.edit', 'Settings', 'Modify system configuration and rental rates'),

-- Audit
(52, 'audit.view', 'Audit', 'View immutable audit activity logs');

-- -----------------------------------------------------------------------------
-- 2. SEED ROLES
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO roles (id, name, display_name, description, is_system) VALUES
(1, 'SUPER_ADMIN', 'Super Admin', 'Full unrestricted system control, user management, and security settings', TRUE),
(2, 'ADMIN', 'Admin', 'Full operational control over leads, customers, fleet, rentals, and reports', TRUE),
(3, 'MANAGER', 'Sales & Operations Manager', 'Team lead allocation, sales monitoring, and operational oversight', TRUE),
(4, 'SALES_EXECUTIVE', 'Sales Executive', 'Direct lead management, follow-ups, calling, and conversion for assigned leads', TRUE);

-- -----------------------------------------------------------------------------
-- 3. SEED ROLE PERMISSIONS (RBAC MATRIX)
-- -----------------------------------------------------------------------------
-- Super Admin -> All Permissions with scope ALL
INSERT IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 1, p.id, 'ALL' FROM permissions p;

-- Admin -> Operational Permissions with scope ALL
INSERT IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 2, p.id, 'ALL' FROM permissions p
WHERE p.code NOT IN ('permissions.manage', 'roles.delete');

-- Manager -> Leads, Customers, Rentals, Fleet, Reports, Users View
INSERT IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 3, p.id, 'ALL' FROM permissions p
WHERE p.module IN ('Dashboard', 'Leads', 'Customers', 'Rentals', 'Fleet', 'Reports')
  AND p.code NOT IN ('leads.delete', 'customers.delete', 'rentals.delete', 'fleet.delete');

INSERT IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 3, p.id, 'TEAM' FROM permissions p WHERE p.code = 'users.view';

-- Sales Executive -> Assigned scope for leads & customers, note adding, follow-ups, personal KPI
INSERT IGNORE INTO role_permissions (role_id, permission_id, scope)
SELECT 4, p.id, 'ASSIGNED' FROM permissions p
WHERE p.code IN (
  'dashboard.view', 'dashboard.view_sales',
  'leads.view', 'leads.view_assigned', 'leads.status_update', 'leads.notes', 'leads.followup',
  'customers.view', 'rentals.view', 'fleet.view'
);

-- -----------------------------------------------------------------------------
-- 4. SEED USERS (PASSWORD: Admin@1234 / !Admin@8285)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO users (id, name, email, password_hash, phone, role_id, status, avatar_url) VALUES
(1, 'Vikramaditya Rawat', 'superadmin@doonriders.com', '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6', '+91 98970 11111', 1, 'active', '/images/avt-1-70x70.jpg'),
(2, 'Ananya Negi', 'admin@doonriders.com', '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6', '+91 98970 22222', 2, 'active', '/images/avt-6-70x70.jpg'),
(3, 'Karan Joshi', 'manager@doonriders.com', '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6', '+91 98970 33333', 3, 'active', '/images/avt-2-70x70.jpg'),
(4, 'Rahul Verma', 'rahul.sales@doonriders.com', '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6', '+91 98970 44444', 4, 'active', '/images/avt-4-70x70.jpg'),
(5, 'Priya Bisht', 'priya.sales@doonriders.com', '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6', '+91 98970 55555', 4, 'active', '/images/avt-3-70x70.jpg'),
(6, 'Amit Chauhan', 'amit.sales@doonriders.com', '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6', '+91 98970 66666', 4, 'active', '/images/avt-7-70x70.jpg'),
(7, 'Doon Riders Main', 'doonridersmain@gmail.com', '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6', '+91 98970 00000', 1, 'active', '/images/avt-1-70x70.jpg');

-- -----------------------------------------------------------------------------
-- 5. SEED FLEET (ELECTRIC SCOOTIES)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO fleet (id, reg_number, brand, model, vehicle_type, battery_capacity_kwh, battery_health_percentage, battery_type, range_km, top_speed_kmh, current_km, current_location, daily_rate, weekly_rate, monthly_rate, status) VALUES
(1, 'UK-07-EV-1001', 'DOON Riders', 'DOON Electro Pro', 'Electric Scooty', 3.20, 98, 'Lithium-ion LFP', 120, 75, 2450, 'Dehradun Clock Tower Hub', 499.00, 2999.00, 8999.00, 'Available'),
(2, 'UK-07-EV-1002', 'DOON Riders', 'DOON City Cruise', 'Electric Scooty', 2.80, 95, 'Lithium-ion NMC', 100, 65, 4120, 'Rajpur Road Station', 399.00, 2499.00, 7499.00, 'Available'),
(3, 'UK-07-EV-1003', 'DOON Riders', 'DOON Storm EV', 'Electric Scooty', 3.60, 96, 'Lithium-ion LFP', 140, 85, 1890, 'ISBT Dehradun Terminal', 599.00, 3499.00, 9999.00, 'Rented'),
(4, 'UK-07-EV-1004', 'DOON Riders', 'DOON Eco Max', 'Electric Scooty', 2.50, 92, 'Lithium-ion LFP', 90, 55, 6200, 'Dehradun Railway Station', 349.00, 1999.00, 6499.00, 'Available'),
(5, 'UK-07-EV-1005', 'DOON Riders', 'DOON Electro Pro', 'Electric Scooty', 3.20, 88, 'Lithium-ion LFP', 115, 75, 8340, 'Workshop & Service Bay', 499.00, 2999.00, 8999.00, 'Maintenance'),
(6, 'UK-07-EV-1006', 'DOON Riders', 'DOON Storm EV', 'Electric Scooty', 3.60, 99, 'Lithium-ion LFP', 140, 85, 540, 'Sahastradhara Rental Hub', 599.00, 3499.00, 9999.00, 'Available'),
(7, 'UK-07-EV-1007', 'DOON Riders', 'DOON City Cruise', 'Electric Scooty', 2.80, 94, 'Lithium-ion NMC', 100, 65, 3100, 'Dehradun Clock Tower Hub', 399.00, 2499.00, 7499.00, 'Reserved');

-- -----------------------------------------------------------------------------
-- 6. SEED CRM LEADS
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO leads (id, lead_code, name, phone, email, location, vehicle_interested_in, rental_duration_days, rental_plan, expected_start_date, lead_source, campaign, ad_set, ad, utm_source, utm_medium, utm_campaign, status, assigned_to, created_by, notes) VALUES
(1, 'LD-1042', 'Rohan Mehra', '+91 98111 22334', 'rohan.mehra@gmail.com', 'Dehradun (Rajpur Road)', 'DOON Electro Pro', 7, 'Weekly', '2026-09-08', 'Meta Ads', 'Monsoon_EV_Drive', 'Dehradun_Youth_25-35', 'Video_Ad_02', 'facebook', 'cpc', 'monsoon_ev_rentals', 'Interested', 4, 3, 'Customer wants electric scooty for daily office commute. Very keen on high speed model.'),
(2, 'LD-1043', 'Pooja Bhatt', '+91 98222 33445', 'pooja.bhatt@outlook.com', 'Dehradun (Chakrata Road)', 'DOON City Cruise', 30, 'Monthly', '2026-09-10', 'Google Ads', 'Search_EV_Rental_Dehradun', 'Student_Commute', 'Ad_Copy_01', 'google', 'search', 'ev_monthly_rent', 'Contacted', 4, 3, 'Called customer, sent pricing brochure on WhatsApp. Scheduled follow-up on Friday.'),
(3, 'LD-1044', 'Vikram Sen', '+91 98333 44556', 'vikram.sen@yahoo.com', 'Dehradun (ISBT)', 'DOON Storm EV', 14, 'Weekly', '2026-09-05', 'Website', 'Organic_Web', NULL, NULL, 'direct', 'organic', 'website_header_cta', 'Documents Pending', 5, 3, 'Aadhaar submitted, waiting for Driving License copy verification.'),
(4, 'LD-1045', 'Neha Semwal', '+91 98444 55667', 'neha.semwal@gmail.com', 'Dehradun (Clock Tower)', 'DOON Eco Max', 3, 'Daily', '2026-09-04', 'Walk-in', NULL, NULL, NULL, 'offline', 'walk-in', NULL, 'Converted', 5, 3, 'Walked into Clock Tower Hub. Verified KYC and handed over vehicle UK-07-EV-1003.'),
(5, 'LD-1046', 'Harshvardhan Rana', '+91 98555 66778', 'harsh.rana@gmail.com', 'Mussoorie Diversion', 'DOON Storm EV', 30, 'Monthly', '2026-09-12', 'WhatsApp', 'WhatsApp_Direct_Chat', NULL, NULL, 'whatsapp', 'social', 'wa_campaign', 'Follow-up', 6, 3, 'Requested dual-battery option for uphill Mussoorie commute.'),
(6, 'LD-1047', 'Siddharth Kaul', '+91 98666 77889', 'siddharth.k@techhub.in', 'Patel Nagar', 'DOON Electro Pro', 7, 'Weekly', '2026-09-07', 'Instagram', 'Reel_Explore_Uttarakhand', 'EV_Travelers', 'Reel_05', 'instagram', 'social', 'travel_ev', 'New', NULL, NULL, 'New lead generated from Instagram Reel campaign. Needs assignment.');

-- -----------------------------------------------------------------------------
-- 7. SEED LEAD ACTIVITY TIMELINES
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO lead_timeline (id, lead_id, performed_by, action, field_name, old_value, new_value, notes) VALUES
(1, 1, 3, 'CREATED', 'status', NULL, 'New', 'Lead received via Meta Ads campaign'),
(2, 1, 3, 'ASSIGNED', 'assigned_to', 'Unassigned', 'Rahul Verma', 'Assigned to Sales Executive based on territory workload'),
(3, 1, 4, 'STATUS_CHANGED', 'status', 'New', 'Interested', 'Spoke to customer on phone. Very keen on DOON Electro Pro.'),
(4, 4, 5, 'CREATED', 'status', NULL, 'New', 'Walk-in customer at Clock Tower hub'),
(5, 4, 5, 'STATUS_CHANGED', 'status', 'New', 'Converted', 'Completed KYC and vehicle handover');

-- -----------------------------------------------------------------------------
-- 8. SEED CUSTOMERS
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO customers (id, customer_code, lead_id, name, phone, alternate_phone, email, address, city, id_proof_type, id_proof_number, driving_license_number, kyc_status, total_rentals) VALUES
(1, 'CUST-2026-001', 4, 'Neha Semwal', '+91 98444 55667', 'neha.semwal@gmail.com', 'neha.semwal@gmail.com', '124 Rajpur Road, Near Jakhan', 'Dehradun', 'Aadhaar Card', '9876-5432-1098', 'UK-0720230045612', 'Verified', 1),
(2, 'CUST-2026-002', NULL, 'Aditya Rawat', '+91 98777 88990', NULL, 'aditya.rawat@gmail.com', '45 EC Road, Karanpur', 'Dehradun', 'Aadhaar Card', '4567-8901-2345', 'UK-0720220089123', 'Verified', 3);

-- -----------------------------------------------------------------------------
-- 9. SEED RENTALS
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO rentals (id, rental_code, customer_id, vehicle_id, lead_id, start_date, end_date, rental_plan, rent_amount, security_deposit, paid_amount, outstanding_amount, payment_status, rental_status, start_odometer_km, created_by) VALUES
(1, 'RNT-2026-101', 1, 3, 4, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), 'Daily', 1797.00, 2000.00, 3797.00, 0.00, 'Paid', 'Active', 1890, 5);

-- -----------------------------------------------------------------------------
-- 10. SEED AUDIT LOGS
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO audit_logs (id, user_name, user_role, action, module, record_id, notes) VALUES
(1, 'Vikramaditya Rawat', 'SUPER_ADMIN', 'LOGIN', 'AUTH', NULL, 'Super Admin logged into system dashboard'),
(2, 'Karan Joshi', 'MANAGER', 'ASSIGN', 'LEADS', 'LD-1042', 'Assigned lead #LD-1042 to Rahul Verma'),
(3, 'Priya Bisht', 'SALES_EXECUTIVE', 'STATUS_CHANGE', 'LEADS', 'LD-1045', 'Updated lead #LD-1045 to Converted'),
(4, 'Priya Bisht', 'SALES_EXECUTIVE', 'CREATE', 'RENTALS', 'RNT-2026-101', 'Created active rental for vehicle UK-07-EV-1003');

-- -----------------------------------------------------------------------------
-- 11. SEED SYSTEM SETTINGS
-- -----------------------------------------------------------------------------
INSERT INTO system_settings (id, `key`, value, description) VALUES
(1, 'business_info', '{"company_name": "DOON Riders", "support_phone": "+91 98970 11111", "support_email": "support@doonriders.com", "headquarters": "Dehradun, Uttarakhand, India"}', 'Company details and contact information'),
(2, 'rental_rates', '{"daily_base": 499, "weekly_base": 2999, "monthly_base": 8999, "security_deposit_default": 2000, "late_return_penalty_per_hour": 100}', 'Standard pricing models for electric scooty rentals'),
(3, 'lead_assignment_rules', '{"mode": "manual_and_round_robin", "auto_assign_new_leads": false, "max_leads_per_salesperson": 25}', 'Lead assignment and workload distribution algorithms')
ON DUPLICATE KEY UPDATE value = VALUES(value), description = VALUES(description);

-- -----------------------------------------------------------------------------
-- 12. SEED PUBLIC VEHICLES
-- -----------------------------------------------------------------------------
INSERT INTO vehicles (id, name, slug, tagline, price, range_km, acceleration_0_100, top_speed_kmh, battery_kwh, charging_time_min, image_url, badge, category, is_featured) VALUES
(1, 'DOON Cyber GT', 'doon-cyber-gt', 'High Performance Electric Supercar', 54900.00, 520, 3.1, 260, 100, 15, '/images/slide-1-1.webp', 'Flagship', 'Performance Sedan', TRUE),
(2, 'DOON Aero Sedan', 'doon-aero-sedan', 'Ultra Long-Range Luxury Cruiser', 44500.00, 610, 3.6, 240, 88, 15, '/images/slide-2.webp', 'Eco Sedan', 'Luxury Sedan', TRUE),
(3, 'DOON Cross SUV', 'doon-cross-suv', 'All-Terrain Dual Motor Adventure SUV', 59000.00, 480, 4.2, 220, 105, 18, '/images/slide-3.webp', 'Cross SUV', 'Adventure SUV', TRUE),
(4, 'DOON Roadster EV', 'doon-roadster-ev', 'Track-Ready Open Top Electric Roadster', 89000.00, 650, 2.4, 310, 120, 12, '/images/vehice4.jpg', 'Hypercar', 'Hyper Roadster', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price);

-- -----------------------------------------------------------------------------
-- 13. SEED TESTIMONIALS
-- -----------------------------------------------------------------------------
INSERT INTO testimonials (id, name, role, company, avatar_url, rating, content, is_approved) VALUES
(1, 'Michael S.', 'Senior Developer', 'Tech Corp', '/images/avt-1-70x70.jpg', 5, 'Switching to an electric vehicle with Doon Riders has been a game-changer for me. Not only am I saving money on fuel, but the smooth and silent ride has made commuting an absolute pleasure.', TRUE),
(2, 'Robert L.', 'Tech Entrepreneur', 'InnovateX', '/images/avt-2-70x70.jpg', 5, 'I was skeptical at first, but after driving Doon Riders for a month, I can never go back to petrol cars. The instant torque, handling, and smart tech are unmatched!', TRUE),
(3, 'Elena Rostova', 'Creative Director', 'Studio Design', '/images/avt-3-70x70.jpg', 5, 'The minimalist luxury interior and panoramic cockpit are breathtaking. Plus, the fast charging network makes highway road trips completely effortless.', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), content = VALUES(content);

-- -----------------------------------------------------------------------------
-- 14. SEED FAQS
-- -----------------------------------------------------------------------------
INSERT INTO faqs (id, question, answer, category, display_order, is_active) VALUES
(1, 'What is an electric vehicle (EV)?', 'An electric vehicle (EV) is powered by an electric motor using electricity stored in high-density rechargeable battery packs. Unlike internal combustion vehicles, EVs produce zero tailpipe emissions, deliver instant torque, and offer significantly lower running costs.', 'General', 1, TRUE),
(2, 'How far can I drive on a single charge?', 'Our current Doon Riders fleet delivers between 480 km and 650 km of real-world driving range on a single charge, supported by regenerative braking and intelligent energy management software.', 'Battery & Range', 2, TRUE),
(3, 'How long does it take to charge an EV?', 'With our DC Ultra-Fast Chargers (up to 250 kW), you can replenish 10% to 80% battery capacity in just 15 minutes. For home charging, an AC Wallbox provides a full 100% overnight charge in 6-8 hours.', 'Charging', 3, TRUE),
(4, 'Are electric vehicles cheaper to maintain?', 'Yes! EVs have over 90% fewer moving mechanical components compared to petrol engines. There are no oil changes, spark plugs, timing belts, or transmission fluids required, cutting routine maintenance expenses by up to 60%.', 'Maintenance', 4, TRUE),
(5, 'What battery warranty is included?', 'Every Doon Riders vehicle comes standard with a comprehensive 8-year / 160,000 km battery and powertrain warranty, guaranteeing at least 80% battery capacity retention throughout the warranty period.', 'Warranty', 5, TRUE)
ON DUPLICATE KEY UPDATE question = VALUES(question), answer = VALUES(answer);

-- -----------------------------------------------------------------------------
-- 15. SEED GALLERY IMAGES
-- -----------------------------------------------------------------------------
INSERT INTO gallery_images (id, title, category, description, image_url, vehicle_id) VALUES
(1, 'DOON Electro Pro - 360 Studio Showcase', 'Scooter Angles', 'Aerodynamic frame engineered with aerospace-grade alloy and LED matrix lighting.', '/images/slide-1-1.webp', 1),
(2, 'ISBT Dehradun 2-Min Battery Swap Station', 'Battery Swap Hubs', 'Fully automated 2-minute battery exchange station with automated temperature & voltage health check.', '/images/bg-img-home1-958x463.jpg', NULL),
(3, 'DOON Storm EV - Mussoorie Hill Climb Testing', 'Hill Climbs & Roads', 'Conquering 18-degree uphill hairpins effortlessly with 4.2 kW peak dual-torque motor.', '/images/slide-3.webp', 3),
(4, 'Dehradun Daily Delivery Rider Fleet', 'Delivery Partners', 'Over 500+ commercial delivery partners operating daily across Rajpur Road, Paltan Bazar & Clement Town.', '/images/dehradun-clock-tower.jpg', NULL),
(5, 'DOON City Cruise - Lightweight Commuter', 'Scooter Angles', 'Ultra-lightweight agile chassis designed specifically for swift daily office commutes in city traffic.', '/images/slide-2.webp', 2),
(6, 'Commercial Heavy-Duty Carrier Setup', 'Fleet Showcase', 'Reinforced dual suspension chassis equipped with 80kg rated modular delivery box carrier.', '/images/all-vehicle.webp', 4)
ON DUPLICATE KEY UPDATE title = VALUES(title), category = VALUES(category);

-- -----------------------------------------------------------------------------
-- 16. SEED PRICING PLANS (DEFAULT ₹1,699 PLAN)
-- -----------------------------------------------------------------------------
INSERT INTO pricing_plans (id, name, slug, tagline, price, period, badge, features, security_deposit, is_popular, is_active, display_order) VALUES
(1, 'Weekly Pro Rider', 'weekly-pro-rider', 'Our most popular high-performance electric scooty subscription for Dehradun students, daily commuters & delivery riders.', 1699.00, 'week', 'MOST POPULAR PLAN', '["No Driving License Required (Zero Hassle)", "Free Doorstep Maintenance & Technical Fault Coverage", "Swap, Don’t Wait — 2-Min Instant Battery Swapping at 15+ Hubs", "19×7 Dehradun Roadside Emergency Assistance (RSA)", "24×7 Dedicated Customer Support Helpline", "Zero Fuel Expense (Save ₹3,500+ every month)", "Complimentary DOT-Certified Helmet Included", "Standard Comprehensive Insurance Coverage Included"]', 2000.00, TRUE, TRUE, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), features = VALUES(features);

