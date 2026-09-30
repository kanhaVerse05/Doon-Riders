import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pgHost = process.env.PGHOST || 'localhost';
const pgPort = Number(process.env.PGPORT) || 5432;
const pgUser = process.env.PGUSER || 'postgres';
const pgPassword = process.env.PGPASSWORD || 'postgres';
const pgDatabase = process.env.PGDATABASE || 'doon_riders_db';
const databaseUrl = process.env.DATABASE_URL || `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;

let pgPool: Pool | null = null;
let isPostgresConnected = false;

// Mock in-memory storage fallback for resilient development
export const memoryStore = {
  roles: [
    { id: 1, name: 'SUPER_ADMIN', display_name: 'Super Admin', description: 'Full system control', is_system: true },
    { id: 2, name: 'ADMIN', display_name: 'Admin', description: 'Operational control', is_system: true },
    { id: 3, name: 'MANAGER', display_name: 'Sales & Operations Manager', description: 'Lead & fleet management', is_system: true },
    { id: 4, name: 'SALES_EXECUTIVE', display_name: 'Sales Executive', description: 'Lead follow-up and sales', is_system: true },
    { id: 5, name: 'HUB_INCHARGE', display_name: 'Hub Incharge', description: 'Hub fleet, repair dispatch & billing control', is_system: false },
    { id: 6, name: 'TECHNICIAN', display_name: 'Technician', description: 'Scooter diagnostics, inspection & repairs', is_system: false },
    { id: 7, name: 'CUSTOMER_SUPPORT', display_name: 'Customer Support', description: 'Customer complaints, breakdown ticket logging & support', is_system: false }
  ],
  users: [
    {
      id: 1,
      name: 'Ankit Kumar',
      email: 'doonridersmain@gmail.com',
      password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
      phone: '+91 8439431999',
      role_id: 1,
      status: 'active',
      avatar_url: '/images/doon-riders-logo.png'
    },
    {
      id: 2,
      name: 'Ananya Negi',
      email: 'admin@doonriders.com',
      password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
      phone: '+91 98970 22222',
      role_id: 2,
      status: 'active',
      avatar_url: '/images/avt-6-70x70.jpg'
    },
    {
      id: 3,
      name: 'Karan Joshi',
      email: 'manager@doonriders.com',
      password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
      phone: '+91 98970 33333',
      role_id: 3,
      status: 'active',
      avatar_url: '/images/avt-2-70x70.jpg'
    },
    {
      id: 4,
      name: 'Rahul Verma',
      email: 'rahul.sales@doonriders.com',
      password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
      phone: '+91 98970 44444',
      role_id: 4,
      status: 'active',
      avatar_url: '/images/avt-4-70x70.jpg'
    },
    {
      id: 5,
      name: 'Amit Sharma',
      email: 'amit.tech@doonriders.com',
      password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
      phone: '+91 98765 11001',
      role_id: 6,
      status: 'active',
      avatar_url: '/images/avt-1-70x70.jpg'
    },
    {
      id: 6,
      name: 'Karan Joshi',
      email: 'hub.isbt@doonriders.com',
      password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
      phone: '+91 98970 33333',
      role_id: 5,
      status: 'active',
      avatar_url: '/images/avt-3-70x70.jpg'
    },
    {
      id: 7,
      name: 'Priya Sharma',
      email: 'support@doonriders.com',
      password_hash: '$2b$10$w8FkVyqYqV.0N/x11xR5t.Wd6m5QOa6N.pE9qO2vO7k1o.M1cWqS6',
      phone: '+91 98970 77777',
      role_id: 7,
      status: 'active',
      avatar_url: '/images/avt-5-70x70.jpg'
    }
  ],
  fleet: [
    {
      id: 1,
      reg_number: 'UK-07-EV-1001',
      brand: 'DOON Riders',
      model: 'DOON Electro Pro',
      vehicle_type: 'Electric Scooty',
      battery_capacity_kwh: 3.20,
      battery_health_percentage: 98,
      battery_type: 'Lithium-ion LFP',
      range_km: 120,
      top_speed_kmh: 75,
      current_km: 2450,
      current_location: 'Dehradun Clock Tower Hub',
      daily_rate: 499.00,
      weekly_rate: 2999.00,
      monthly_rate: 8999.00,
      status: 'Available'
    },
    {
      id: 2,
      reg_number: 'UK-07-EV-1002',
      brand: 'DOON Riders',
      model: 'DOON City Cruise',
      vehicle_type: 'Electric Scooty',
      battery_capacity_kwh: 2.80,
      battery_health_percentage: 95,
      battery_type: 'Lithium-ion NMC',
      range_km: 100,
      top_speed_kmh: 65,
      current_km: 4120,
      current_location: 'Rajpur Road Station',
      daily_rate: 399.00,
      weekly_rate: 2499.00,
      monthly_rate: 7499.00,
      status: 'Available'
    }
  ],
  leads: [
    {
      id: 1,
      lead_code: 'LD-1042',
      name: 'Rohan Mehra',
      phone: '+91 98111 22334',
      email: 'rohan.mehra@gmail.com',
      location: 'Dehradun (Rajpur Road)',
      vehicle_interested_in: 'DOON Electro Pro',
      rental_duration_days: 7,
      rental_plan: 'Weekly',
      lead_source: 'Meta Ads',
      status: 'Interested',
      assigned_to: 4,
      notes: 'Customer wants electric scooty for daily office commute.'
    }
  ],
  vehicles: [
    {
      id: 1,
      name: 'DOON Cyber GT',
      slug: 'doon-cyber-gt',
      tagline: 'High Performance Electric Supercar',
      price: 54900.00,
      range_km: 520,
      acceleration_0_100: 3.1,
      top_speed_kmh: 260,
      battery_kwh: 100,
      charging_time_min: 15,
      image_url: '/images/slide-1-1.webp',
      badge: 'Flagship',
      category: 'Performance Sedan',
      is_featured: true,
    },
    {
      id: 2,
      name: 'DOON Aero Sedan',
      slug: 'doon-aero-sedan',
      tagline: 'Ultra Long-Range Luxury Cruiser',
      price: 44500.00,
      range_km: 610,
      acceleration_0_100: 3.6,
      top_speed_kmh: 240,
      battery_kwh: 88,
      charging_time_min: 15,
      image_url: '/images/slide-2.webp',
      badge: 'Eco Sedan',
      category: 'Luxury Sedan',
      is_featured: true,
    },
    {
      id: 3,
      name: 'DOON Cross SUV',
      slug: 'doon-cross-suv',
      tagline: 'All-Terrain Dual Motor Adventure SUV',
      price: 59000.00,
      range_km: 480,
      acceleration_0_100: 4.2,
      top_speed_kmh: 220,
      battery_kwh: 105,
      charging_time_min: 18,
      image_url: '/images/slide-3.webp',
      badge: 'Cross SUV',
      category: 'Adventure SUV',
      is_featured: true,
    },
    {
      id: 4,
      name: 'DOON Roadster EV',
      slug: 'doon-roadster-ev',
      tagline: 'Track-Ready Open Top Electric Roadster',
      price: 89000.00,
      range_km: 650,
      acceleration_0_100: 2.4,
      top_speed_kmh: 310,
      battery_kwh: 120,
      charging_time_min: 12,
      image_url: '/images/vehice4.jpg',
      badge: 'Hypercar',
      category: 'Hyper Roadster',
      is_featured: true,
    }
  ],
  bookings: [] as any[],
  newsletters: [] as any[],
  testimonials: [
    {
      id: 1,
      name: 'Michael S.',
      role: 'Senior Developer',
      company: 'Tech Corp',
      avatar_url: '/images/avt-1-70x70.jpg',
      rating: 5,
      content: 'Switching to an electric vehicle with Doon Riders has been a game-changer for me. Not only am I saving money on fuel, but the smooth and silent ride has made commuting an absolute pleasure.',
    },
    {
      id: 2,
      name: 'Robert L.',
      role: 'Tech Entrepreneur',
      company: 'InnovateX',
      avatar_url: '/images/avt-2-70x70.jpg',
      rating: 5,
      content: 'I was skeptical at first, but after driving Doon Riders for a month, I can never go back to petrol cars. The instant torque, handling, and smart tech are unmatched!',
    },
    {
      id: 3,
      name: 'Elena Rostova',
      role: 'Creative Director',
      company: 'Studio Design',
      avatar_url: '/images/avt-3-70x70.jpg',
      rating: 5,
      content: 'The minimalist luxury interior and panoramic cockpit are breathtaking. Plus, the fast charging network makes highway road trips completely effortless.',
    }
  ],
  gallery: [
    {
      id: 1,
      title: 'DOON Electro Pro - 360 Studio Showcase',
      category: 'Scooter Angles',
      description: 'Aerodynamic frame engineered with aerospace-grade alloy and LED matrix lighting.',
      image_url: '/images/slide-1-1.webp',
      vehicle_id: 1,
      created_at: '2026-09-01T10:00:00.000Z'
    },
    {
      id: 2,
      title: 'ISBT Dehradun 2-Min Battery Swap Station',
      category: 'Battery Swap Hubs',
      description: 'Fully automated 2-minute battery exchange station with automated temperature & voltage health check.',
      image_url: '/images/bg-img-home1-958x463.jpg',
      vehicle_id: null,
      created_at: '2026-09-02T11:30:00.000Z'
    },
    {
      id: 3,
      title: 'DOON Storm EV - Mussoorie Hill Climb Testing',
      category: 'Hill Climbs & Roads',
      description: 'Conquering 18-degree uphill hairpins effortlessly with 4.2 kW peak dual-torque motor.',
      image_url: '/images/slide-3.webp',
      vehicle_id: 3,
      created_at: '2026-09-03T09:15:00.000Z'
    },
    {
      id: 4,
      title: 'Dehradun Daily Delivery Rider Fleet',
      category: 'Delivery Partners',
      description: 'Over 500+ commercial delivery partners operating daily across Rajpur Road, Paltan Bazar & Clement Town.',
      image_url: '/images/dehradun-clock-tower.jpg',
      vehicle_id: null,
      created_at: '2026-09-04T08:45:00.000Z'
    },
    {
      id: 5,
      title: 'DOON City Cruise - Lightweight Commuter',
      category: 'Scooter Angles',
      description: 'Ultra-lightweight agile chassis designed specifically for swift daily office commutes in city traffic.',
      image_url: '/images/slide-2.webp',
      vehicle_id: 2,
      created_at: '2026-09-04T14:20:00.000Z'
    },
    {
      id: 6,
      title: 'Commercial Heavy-Duty Carrier Setup',
      category: 'Fleet Showcase',
      description: 'Reinforced dual suspension chassis equipped with 80kg rated modular delivery box carrier.',
      image_url: '/images/all-vehicle.webp',
      vehicle_id: 4,
      created_at: '2026-09-05T07:10:00.000Z'
    }
  ],
  faqs: [
    {
      id: 1,
      question: 'What is an electric vehicle (EV)?',
      answer: 'An electric vehicle (EV) is powered by an electric motor using electricity stored in high-density rechargeable battery packs. Unlike internal combustion vehicles, EVs produce zero tailpipe emissions, deliver instant torque, and offer significantly lower running costs.',
      category: 'General',
      display_order: 1
    },
    {
      id: 2,
      question: 'How far can I drive on a single charge?',
      answer: 'Our current Doon Riders fleet delivers between 480 km and 650 km of real-world driving range on a single charge, supported by regenerative braking and intelligent energy management software.',
      category: 'Battery & Range',
      display_order: 2
    },
    {
      id: 3,
      question: 'How long does it take to charge an EV?',
      answer: 'With our DC Ultra-Fast Chargers (up to 250 kW), you can replenish 10% to 80% battery capacity in just 15 minutes. For home charging, an AC Wallbox provides a full 100% overnight charge in 6-8 hours.',
      category: 'Charging',
      display_order: 3
    },
    {
      id: 4,
      question: 'Are electric vehicles cheaper to maintain?',
      answer: 'Yes! EVs have over 90% fewer moving mechanical components compared to petrol engines. There are no oil changes, spark plugs, timing belts, or transmission fluids required, cutting routine maintenance expenses by up to 60%.',
      category: 'Maintenance',
      display_order: 4
    },
    {
      id: 5,
      question: 'What battery warranty is included?',
      answer: 'Every Doon Riders vehicle comes standard with a comprehensive 8-year / 160,000 km battery and powertrain warranty, guaranteeing at least 80% battery capacity retention throughout the warranty period.',
      category: 'Warranty',
      display_order: 5
    }
  ],
  pricingPlans: [
    {
      id: 1,
      name: 'Weekly Pro Rider',
      slug: 'weekly-pro-rider',
      tagline: 'Our most popular high-performance electric scooty subscription for Dehradun students, daily commuters & delivery riders.',
      price: 1699.00,
      period: 'week',
      badge: 'MOST POPULAR PLAN',
      features: [
        'No Driving License Required (Zero Hassle)',
        'Free Doorstep Maintenance & Technical Fault Coverage',
        'Swap, Don’t Wait — 2-Min Instant Battery Swapping at 15+ Hubs',
        '19×7 Dehradun Roadside Emergency Assistance (RSA)',
        '24×7 Dedicated Customer Support Helpline',
        'Zero Fuel Expense (Save ₹3,500+ every month)',
        'Complimentary DOT-Certified Helmet Included',
        'Standard Comprehensive Insurance Coverage Included'
      ],
      security_deposit: 2000.00,
      is_popular: true,
      is_active: true,
      display_order: 1
    }
  ],
  preBookings: [
    {
      id: 1,
      booking_code: 'DR-PB-1001',
      customer_name: 'Aarav Sharma',
      mobile_number: '+91 98970 12345',
      booking_date: '2026-09-27',
      unit_price: 499.00,
      quantity: 1,
      total_amount: 499.00,
      payment_mode: 'UPI',
      payment_status: 'PAID',
      notes: 'Customer pre-booked for Rajpur Road hub pickup',
      created_by_id: 1,
      created_by_name: 'Ankit Kumar (Super Admin)',
      created_at: '2026-09-27T10:30:00.000Z'
    },
    {
      id: 2,
      booking_code: 'DR-PB-1002',
      customer_name: 'Sneha Rawat',
      mobile_number: '+91 98123 45678',
      booking_date: '2026-09-27',
      unit_price: 499.00,
      quantity: 2,
      total_amount: 998.00,
      payment_mode: 'Cash',
      payment_status: 'PAID',
      notes: '2 EV Scooty units booked for college commute',
      created_by_id: 4,
      created_by_name: 'Rahul Verma',
      created_at: '2026-09-27T11:45:00.000Z'
    }
  ],
  inventory: [
    {
      id: 1,
      part_code: 'DR-INV-1001',
      part_name: 'Lithium Battery Pack 60V 30Ah (LFP)',
      category: 'Battery & Electricals',
      image_url: '/images/battery-pack.png',
      quantity: 28,
      min_threshold: 5,
      unit_price: 18500.00,
      status: 'In Stock',
      location: 'Main Hub Workshop - Rack A1',
      supplier: 'Exicom Energy Systems',
      description: 'High-density 60V 30Ah smart swappable lithium battery pack with built-in thermal BMS.',
      created_at: '2026-09-01T10:00:00.000Z'
    },
    {
      id: 2,
      part_code: 'DR-INV-1002',
      part_name: 'Brushless BLDC Hub Motor 1500W',
      category: 'Motor & Drive',
      image_url: '',
      quantity: 14,
      min_threshold: 4,
      unit_price: 6800.00,
      status: 'In Stock',
      location: 'Main Hub Workshop - Rack A2',
      supplier: 'Bosch EV Drive',
      description: 'Waterproof IP67 rated 1500W peak brushless rear hub motor for DOON Electro Pro.',
      created_at: '2026-09-02T11:00:00.000Z'
    },
    {
      id: 3,
      part_code: 'DR-INV-1003',
      part_name: 'Smart Sine-Wave Controller 60V 35A',
      category: 'Battery & Electricals',
      image_url: '',
      quantity: 3,
      min_threshold: 5,
      unit_price: 3200.00,
      status: 'Low Stock',
      location: 'Main Hub Workshop - Rack B1',
      supplier: 'Kelly Controls',
      description: 'Regenerative braking supported 60V intelligent brushless sine-wave controller.',
      created_at: '2026-09-03T09:30:00.000Z'
    },
    {
      id: 4,
      part_code: 'DR-INV-1004',
      part_name: 'Dual-Piston Hydraulic Disc Brake Kit',
      category: 'Brakes & Suspension',
      image_url: '',
      quantity: 22,
      min_threshold: 6,
      unit_price: 1450.00,
      status: 'In Stock',
      location: 'Main Hub Workshop - Rack B2',
      supplier: 'ByBre Brembo India',
      description: 'Front & Rear 220mm stainless steel ventilated disc with dual-piston ceramic caliper.',
      created_at: '2026-09-04T14:15:00.000Z'
    },
    {
      id: 5,
      part_code: 'DR-INV-1005',
      part_name: 'All-Weather Tubeless Tyre 90/90-12',
      category: 'Tires & Wheels',
      image_url: '',
      quantity: 40,
      min_threshold: 10,
      unit_price: 1250.00,
      status: 'In Stock',
      location: 'Tyre Bay - Section C',
      supplier: 'MRF Nylogrip Zapper',
      description: 'Puncture-resistant high traction compound tyre built for wet mountain roads.',
      created_at: '2026-09-05T08:00:00.000Z'
    }
  ],
  qrSettings: {
    upi_id: 'doonriders@icici',
    merchant_name: 'DOON RIDERS EV MOBILITY',
    qr_image_url: '',
    booking_id_prefix: 'DR-PB-',
    starting_booking_number: 1001,
    next_booking_number: 1003
  },
  repairHubs: [
    { id: 1, hub_code: 'DR-HUB-01', hub_name: 'ISBT Main Service Hub', location: 'Haridwar Bypass Road, Near ISBT Dehradun', incharge_name: 'Karan Joshi', incharge_phone: '+91 98970 33333', is_active: true },
    { id: 2, hub_code: 'DR-HUB-02', hub_name: 'Rajpur Road EV Hub', location: 'Near Silver City Mall, Rajpur Road, Dehradun', incharge_name: 'Ananya Negi', incharge_phone: '+91 98970 22222', is_active: true },
    { id: 3, hub_code: 'DR-HUB-03', hub_name: 'Clock Tower City Hub', location: 'Paltan Bazar Entry, Clock Tower, Dehradun', incharge_name: 'Ankit Kumar', incharge_phone: '+91 8439431999', is_active: true },
    { id: 4, hub_code: 'DR-HUB-04', hub_name: 'Clement Town Station', location: 'Subhash Nagar Chowk, Clement Town, Dehradun', incharge_name: 'Sunil Panwar', incharge_phone: '+91 98970 55555', is_active: true },
    { id: 5, hub_code: 'DR-HUB-05', hub_name: 'Prem Nagar Workshop', location: 'Chakrata Road, Prem Nagar, Dehradun', incharge_name: 'Mohit Chauhan', incharge_phone: '+91 98970 66666', is_active: true }
  ],
  technicians: [
    { id: 1, technician_code: 'TECH-101', name: 'Amit Sharma', phone: '+91 98765 11001', email: 'amit.tech@doonriders.com', hub_id: 1, hub_name: 'ISBT Main Service Hub', specialization: 'EV Powertrain & Battery', status: 'Available', active_jobs_count: 0, rating: 4.9 },
    { id: 2, technician_code: 'TECH-102', name: 'Rajesh Rawat', phone: '+91 98765 11002', email: 'rajesh.tech@doonriders.com', hub_id: 2, hub_name: 'Rajpur Road EV Hub', specialization: 'Brakes, Suspension & Wiring', status: 'Available', active_jobs_count: 0, rating: 4.8 },
    { id: 3, technician_code: 'TECH-103', name: 'Sandeep Negi', phone: '+91 98765 11003', email: 'sandeep.tech@doonriders.com', hub_id: 3, hub_name: 'Clock Tower City Hub', specialization: 'Motors & Electronic Controllers', status: 'Available', active_jobs_count: 0, rating: 4.7 }
  ],
  repairJobs: [
    {
      id: 1,
      job_number: 'JOB-000125',
      scooter_id: 1,
      scooter_number: 'UK07-EV-1001',
      rider_name: 'Rahul Sharma',
      rider_contact: '+91 98765 43210',
      hub_id: 1,
      hub_name: 'ISBT Main Service Hub',
      technician_id: 1,
      technician_name: 'Amit Sharma',
      complaint: 'Front disc brake not biting properly and throttle delay',
      priority: 'Urgent',
      status: 'Technician Assigned',
      created_by_id: 1,
      created_by_name: 'Ankit Kumar',
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 2,
      job_number: 'JOB-000124',
      scooter_id: 2,
      scooter_number: 'UK07-EV-1002',
      rider_name: 'Pooja Verma',
      rider_contact: '+91 98123 45678',
      hub_id: 1,
      hub_name: 'ISBT Main Service Hub',
      technician_id: 1,
      technician_name: 'Amit Sharma',
      complaint: 'Rear suspension squeaking and low braking power',
      priority: 'Normal',
      status: 'Repairing',
      created_by_id: 1,
      created_by_name: 'Ankit Kumar',
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 3,
      job_number: 'JOB-000123',
      scooter_id: 4,
      scooter_number: 'UK07-EV-1004',
      rider_name: 'Vikram Singh',
      rider_contact: '+91 98970 88990',
      hub_id: 1,
      hub_name: 'ISBT Main Service Hub',
      technician_id: 1,
      technician_name: 'Amit Sharma',
      complaint: 'Throttle cable sticking during acceleration',
      priority: 'Normal',
      status: 'Inspection Completed',
      created_by_id: 1,
      created_by_name: 'Ankit Kumar',
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 4,
      job_number: 'JOB-000122',
      scooter_id: 3,
      scooter_number: 'UK07-EV-1003',
      rider_name: 'Ananya Negi',
      rider_contact: '+91 98970 22222',
      hub_id: 1,
      hub_name: 'ISBT Main Service Hub',
      technician_id: 1,
      technician_name: 'Amit Sharma',
      complaint: 'Punctured rear tire and minor rim alignment',
      priority: 'Normal',
      status: 'Repair Completed',
      created_by_id: 1,
      created_by_name: 'Ankit Kumar',
      created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
      closed_at: null
    }
  ],
  repairInspections: [
    {
      id: 1,
      job_id: 2,
      technician_id: 1,
      technician_name: 'Amit Sharma',
      problem_found: 'Rear hydraulic caliper leaking oil and brake pads completely worn out.',
      inspection_notes: 'Replaced caliper seal and installed new brake disc pads. Tested hydraulic pressure.',
      estimated_repair_time: '45 mins',
      photos: [],
      inspected_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString()
    },
    {
      id: 2,
      job_id: 3,
      technician_id: 1,
      technician_name: 'Amit Sharma',
      problem_found: 'Accelerator cable frayed at throttle housing clamp.',
      inspection_notes: 'Requires fresh accelerator cable replacement and handle grip adjustment.',
      estimated_repair_time: '30 mins',
      photos: [],
      inspected_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: 3,
      job_id: 4,
      technician_id: 1,
      technician_name: 'Amit Sharma',
      problem_found: 'Rear tire sidewall puncture and rim misalignment.',
      inspection_notes: 'New tubeless tire installed and alloy wheel trued.',
      estimated_repair_time: '1 hour',
      photos: [],
      inspected_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString()
    }
  ],
  repairParts: [
    {
      id: 1,
      job_id: 2,
      part_id: 4,
      part_name: 'Dual-Piston Hydraulic Disc Brake Kit',
      requested_quantity: 1,
      approved_quantity: 1,
      replaced_quantity: 0,
      unit_price: 1450.00,
      total_price: 1450.00,
      status: 'Approved',
      notes: 'Required for rear braking restoration'
    },
    {
      id: 2,
      job_id: 3,
      part_id: 0,
      part_name: 'Accelerator Cable',
      requested_quantity: 1,
      approved_quantity: 0,
      replaced_quantity: 0,
      unit_price: 350.00,
      total_price: 350.00,
      status: 'Requested',
      notes: 'Throttle return sticking'
    },
    {
      id: 3,
      job_id: 4,
      part_id: 5,
      part_name: 'All-Weather Tubeless Tyre 90/90-12',
      requested_quantity: 1,
      approved_quantity: 1,
      replaced_quantity: 1,
      unit_price: 1250.00,
      total_price: 1250.00,
      status: 'Replaced',
      notes: 'Fitted and pressure tested to 32 PSI'
    }
  ],
  repairTiming: [
    {
      id: 1,
      job_id: 2,
      repair_started_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      repair_completed_at: null,
      started_by_id: 1,
      started_by_name: 'Amit Sharma',
      completed_by_id: null,
      completed_by_name: null,
      total_duration_seconds: 2520,
      total_duration_formatted: '42m',
      technician_notes: 'Dismantling rear wheel and brake assembly.',
      completion_photos: []
    },
    {
      id: 2,
      job_id: 4,
      repair_started_at: new Date(Date.now() - 2.75 * 3600 * 1000).toISOString(),
      repair_completed_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
      started_by_id: 1,
      started_by_name: 'Amit Sharma',
      completed_by_id: 1,
      completed_by_name: 'Amit Sharma',
      total_duration_seconds: 4500,
      total_duration_formatted: '1h 15m',
      technician_notes: 'Replaced rear tire, balanced wheel rim, and test drove 2km. Everything smooth.',
      completion_photos: []
    }
  ],
  repairBills: [] as any[],
  repairPayments: [] as any[],
  repairEvents: [
    {
      id: 1,
      job_id: 1,
      event_type: 'JOB_CREATED',
      title: 'Job Created',
      description: 'Job created for vehicle UK07-EV-1001 (Urgent priority).',
      performed_by_id: 1,
      performed_by_name: 'Ankit Kumar',
      performed_by_role: 'Super Admin',
      metadata: null,
      created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    },
    {
      id: 2,
      job_id: 1,
      event_type: 'TECHNICIAN_ASSIGNED',
      title: 'Technician Assigned',
      description: 'Technician Amit Sharma assigned to the job.',
      performed_by_id: 1,
      performed_by_name: 'Ankit Kumar',
      performed_by_role: 'Super Admin',
      metadata: null,
      created_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString()
    }
  ],
  repairNotifications: [] as any[],
  complaints: [
    {
      id: 1,
      complaint_number: 'CMP-00124',
      scooter_id: 1,
      scooter_number: 'UK-07-EV-1001',
      customer_name: 'Rohit Verma',
      customer_phone: '+91 98111 22334',
      location_address: 'Clock Tower, Paltan Bazar, Dehradun',
      location_url: 'https://maps.google.com/?q=30.3256,78.0436',
      latitude: 30.3256,
      longitude: 78.0436,
      issue_category: 'Battery Breakdown',
      description: 'Scooter shut down while riding near Clock Tower. Battery meter shows 0% and throttle is unresponsive.',
      priority: 'Urgent',
      hub_id: 1,
      hub_name: 'ISBT Main Service Hub',
      hub_incharge_id: 6,
      hub_incharge_name: 'Karan Joshi',
      technician_id: 1,
      technician_name: 'Amit Sharma',
      technician_phone: '+91 98765 11001',
      technician_code: 'TECH-101',
      technician_latitude: 30.3012,
      technician_longitude: 78.0215,
      technician_location_updated_at: new Date(Date.now() - 15 * 1000).toISOString(),
      status: 'En Route',
      journey_started_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      reached_at: null,
      reached_latitude: null,
      reached_longitude: null,
      journey_duration_seconds: 840,
      journey_duration_formatted: '14m',
      work_started_at: null,
      work_completed_at: null,
      work_duration_seconds: 0,
      work_duration_formatted: '0m',
      work_performed: null,
      parts_used: [],
      technician_remarks: null,
      proof_photos: [],
      completion_notes: null,
      final_latitude: null,
      final_longitude: null,
      return_journey_started_at: null,
      return_journey_completed_at: null,
      created_by_id: 7,
      created_by_name: 'Priya Sharma',
      created_by_role: 'Customer Support',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 2,
      complaint_number: 'CMP-00125',
      scooter_id: 2,
      scooter_number: 'UK-07-EV-1002',
      customer_name: 'Pooja Negi',
      customer_phone: '+91 98970 44556',
      location_address: 'Silver City Mall, Rajpur Road, Dehradun',
      location_url: 'https://maps.google.com/?q=30.3427,78.0645',
      latitude: 30.3427,
      longitude: 78.0645,
      issue_category: 'Tire Puncture & Brakes',
      description: 'Sharp nail in rear tyre, completely flat. Front brake lever feels loose.',
      priority: 'Normal',
      hub_id: 2,
      hub_name: 'Rajpur Road EV Hub',
      hub_incharge_id: 2,
      hub_incharge_name: 'Ananya Negi',
      technician_id: null,
      technician_name: null,
      technician_phone: null,
      technician_code: null,
      technician_latitude: null,
      technician_longitude: null,
      technician_location_updated_at: null,
      status: 'New',
      journey_started_at: null,
      reached_at: null,
      reached_latitude: null,
      reached_longitude: null,
      journey_duration_seconds: 0,
      journey_duration_formatted: '0m',
      work_started_at: null,
      work_completed_at: null,
      work_duration_seconds: 0,
      work_duration_formatted: '0m',
      work_performed: null,
      parts_used: [],
      technician_remarks: null,
      proof_photos: [],
      completion_notes: null,
      final_latitude: null,
      final_longitude: null,
      return_journey_started_at: null,
      return_journey_completed_at: null,
      created_by_id: 7,
      created_by_name: 'Priya Sharma',
      created_by_role: 'Customer Support',
      created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 3,
      complaint_number: 'CMP-00126',
      scooter_id: 4,
      scooter_number: 'UK-07-EV-1004',
      customer_name: 'Vikas Bhatt',
      customer_phone: '+91 98765 99887',
      location_address: 'Doon University Gate, Mothrowala Road, Dehradun',
      location_url: 'https://maps.google.com/?q=30.2711,78.0418',
      latitude: 30.2711,
      longitude: 78.0418,
      issue_category: 'Throttle Cable Stuck',
      description: 'Throttle sticking at 20 km/h and digital display throwing Error Code E-04.',
      priority: 'Urgent',
      hub_id: 1,
      hub_name: 'ISBT Main Service Hub',
      hub_incharge_id: 6,
      hub_incharge_name: 'Karan Joshi',
      technician_id: 1,
      technician_name: 'Amit Sharma',
      technician_phone: '+91 98765 11001',
      technician_code: 'TECH-101',
      technician_latitude: null,
      technician_longitude: null,
      technician_location_updated_at: null,
      status: 'Assigned',
      journey_started_at: null,
      reached_at: null,
      reached_latitude: null,
      reached_longitude: null,
      journey_duration_seconds: 0,
      journey_duration_formatted: '0m',
      work_started_at: null,
      work_completed_at: null,
      work_duration_seconds: 0,
      work_duration_formatted: '0m',
      work_performed: null,
      parts_used: [],
      technician_remarks: null,
      proof_photos: [],
      completion_notes: null,
      final_latitude: null,
      final_longitude: null,
      return_journey_started_at: null,
      return_journey_completed_at: null,
      created_by_id: 7,
      created_by_name: 'Priya Sharma',
      created_by_role: 'Customer Support',
      created_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 4,
      complaint_number: 'CMP-00127',
      scooter_id: 3,
      scooter_number: 'UK-07-EV-1003',
      customer_name: 'Deepak Rawat',
      customer_phone: '+91 98970 88112',
      location_address: 'Haridwar Road, Near Rispana Bridge, Dehradun',
      location_url: 'https://maps.google.com/?q=30.2981,78.0560',
      latitude: 30.2981,
      longitude: 78.0560,
      issue_category: 'Electrical & Display Failure',
      description: 'Key turns but digital cluster stays black and vehicle does not boot up.',
      priority: 'Normal',
      hub_id: 1,
      hub_name: 'ISBT Main Service Hub',
      hub_incharge_id: 6,
      hub_incharge_name: 'Karan Joshi',
      technician_id: 1,
      technician_name: 'Amit Sharma',
      technician_phone: '+91 98765 11001',
      technician_code: 'TECH-101',
      technician_latitude: 30.2981,
      technician_longitude: 78.0560,
      technician_location_updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      status: 'Reached',
      journey_started_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
      reached_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      reached_latitude: 30.2981,
      reached_longitude: 78.0560,
      journey_duration_seconds: 1440,
      journey_duration_formatted: '24m',
      work_started_at: null,
      work_completed_at: null,
      work_duration_seconds: 0,
      work_duration_formatted: '0m',
      work_performed: null,
      parts_used: [],
      technician_remarks: null,
      proof_photos: [],
      completion_notes: null,
      final_latitude: null,
      final_longitude: null,
      return_journey_started_at: null,
      return_journey_completed_at: null,
      created_by_id: 7,
      created_by_name: 'Priya Sharma',
      created_by_role: 'Customer Support',
      created_at: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 5,
      complaint_number: 'CMP-00128',
      scooter_id: 2,
      scooter_number: 'UK-07-EV-1002',
      customer_name: 'Megha Joshi',
      customer_phone: '+91 98123 66778',
      location_address: 'Prem Nagar Market Chowk, Dehradun',
      location_url: 'https://maps.google.com/?q=30.3344,77.9620',
      latitude: 30.3344,
      longitude: 77.9620,
      issue_category: 'Brake Caliper Jammed',
      description: 'Front wheel locked, scooter won’t roll forward. Smell of burning brake pads.',
      priority: 'Urgent',
      hub_id: 5,
      hub_name: 'Prem Nagar Workshop',
      hub_incharge_id: 6,
      hub_incharge_name: 'Mohit Chauhan',
      technician_id: 2,
      technician_name: 'Rajesh Rawat',
      technician_phone: '+91 98765 11002',
      technician_code: 'TECH-102',
      technician_latitude: 30.3344,
      technician_longitude: 77.9620,
      technician_location_updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'Work In Progress',
      journey_started_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      reached_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      reached_latitude: 30.3344,
      reached_longitude: 77.9620,
      journey_duration_seconds: 1320,
      journey_duration_formatted: '22m',
      work_started_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      work_completed_at: null,
      work_duration_seconds: 1500,
      work_duration_formatted: '25m',
      work_performed: 'Disassembled front brake caliper piston and bleeding mineral oil.',
      parts_used: [],
      technician_remarks: 'Caliper piston was seized due to road debris. Cleaned and replacing brake fluid.',
      proof_photos: [],
      completion_notes: null,
      final_latitude: null,
      final_longitude: null,
      return_journey_started_at: null,
      return_journey_completed_at: null,
      created_by_id: 7,
      created_by_name: 'Priya Sharma',
      created_by_role: 'Customer Support',
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 6,
      complaint_number: 'CMP-00129',
      scooter_id: 1,
      scooter_number: 'UK-07-EV-1001',
      customer_name: 'Suresh Chauhan',
      customer_phone: '+91 98970 11223',
      location_address: 'Subhash Nagar Chowk, Clement Town, Dehradun',
      location_url: 'https://maps.google.com/?q=30.2678,78.0189',
      latitude: 30.2678,
      longitude: 78.0189,
      issue_category: 'Tire Puncture',
      description: 'Rear tire puncture in Clement Town market.',
      priority: 'Normal',
      hub_id: 4,
      hub_name: 'Clement Town Station',
      hub_incharge_id: 6,
      hub_incharge_name: 'Sunil Panwar',
      technician_id: 1,
      technician_name: 'Amit Sharma',
      technician_phone: '+91 98765 11001',
      technician_code: 'TECH-101',
      technician_latitude: 30.2678,
      technician_longitude: 78.0189,
      technician_location_updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      status: 'Work Done',
      journey_started_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      reached_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
      reached_latitude: 30.2678,
      reached_longitude: 78.0189,
      journey_duration_seconds: 1500,
      journey_duration_formatted: '25m',
      work_started_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      work_completed_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      work_duration_seconds: 2400,
      work_duration_formatted: '40m',
      work_performed: 'Inserted 2 tubeless rubber strip seals and checked pressure to 34 PSI. Test ride completed.',
      parts_used: [
        { part_id: 5, part_name: 'Tubeless Tyre Puncture Strip', quantity: 2, unit_price: 150, total_price: 300 }
      ],
      technician_remarks: 'Puncture successfully sealed. Customer scooter is completely road ready.',
      proof_photos: ['/images/vehice4.jpg'],
      completion_notes: 'All electricals, brakes & tyre pressure verified.',
      final_latitude: 30.2678,
      final_longitude: 78.0189,
      return_journey_started_at: null,
      return_journey_completed_at: null,
      created_by_id: 7,
      created_by_name: 'Priya Sharma',
      created_by_role: 'Customer Support',
      created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      closed_at: null
    },
    {
      id: 7,
      complaint_number: 'CMP-00130',
      scooter_id: 4,
      scooter_number: 'UK-07-EV-1004',
      customer_name: 'Kavita Negi',
      customer_phone: '+91 98970 33445',
      location_address: 'Ballupur Chowk, Chakrata Road, Dehradun',
      location_url: 'https://maps.google.com/?q=30.3312,78.0210',
      latitude: 30.3312,
      longitude: 78.0210,
      issue_category: 'LED Headlamp Malfunction',
      description: 'High and low beam completely dead during night ride.',
      priority: 'Normal',
      hub_id: 2,
      hub_name: 'Rajpur Road EV Hub',
      hub_incharge_id: 2,
      hub_incharge_name: 'Ananya Negi',
      technician_id: 3,
      technician_name: 'Sandeep Negi',
      technician_phone: '+91 98765 11003',
      technician_code: 'TECH-103',
      technician_latitude: 30.3312,
      technician_longitude: 78.0210,
      technician_location_updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      status: 'Closed',
      journey_started_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      reached_at: new Date(Date.now() - 5.5 * 3600 * 1000).toISOString(),
      reached_latitude: 30.3312,
      reached_longitude: 78.0210,
      journey_duration_seconds: 1800,
      journey_duration_formatted: '30m',
      work_started_at: new Date(Date.now() - 5.3 * 3600 * 1000).toISOString(),
      work_completed_at: new Date(Date.now() - 4.5 * 3600 * 1000).toISOString(),
      work_duration_seconds: 2880,
      work_duration_formatted: '48m',
      work_performed: 'Replaced headlamp LED relay unit and fixed loose connector pin behind front cowl.',
      parts_used: [
        { part_id: 3, part_name: '12V DC-DC Headlamp Converter Relay', quantity: 1, unit_price: 450, total_price: 450 }
      ],
      technician_remarks: 'Headlight and pilot LED strip operating normally.',
      proof_photos: [],
      completion_notes: 'Issue verified resolved. Closed by Customer Support.',
      final_latitude: 30.3312,
      final_longitude: 78.0210,
      return_journey_started_at: new Date(Date.now() - 4.4 * 3600 * 1000).toISOString(),
      return_journey_completed_at: new Date(Date.now() - 4.1 * 3600 * 1000).toISOString(),
      created_by_id: 7,
      created_by_name: 'Priya Sharma',
      created_by_role: 'Customer Support',
      created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      closed_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    }
  ] as any[],
  complaintEvents: [
    {
      id: 1,
      complaint_id: 1,
      event_type: 'COMPLAINT_CREATED',
      title: 'Complaint Logged',
      description: 'Customer Support logged breakdown complaint for vehicle UK-07-EV-1001 (Priority: Urgent). Sent to ISBT Main Service Hub.',
      status: 'New',
      performed_by_id: 7,
      performed_by_name: 'Priya Sharma',
      performed_by_role: 'Customer Support',
      latitude: 30.3256,
      longitude: 78.0436,
      duration_seconds: 0,
      duration_formatted: null,
      metadata: null,
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
    },
    {
      id: 2,
      complaint_id: 1,
      event_type: 'TECHNICIAN_ASSIGNED',
      title: 'Technician Assigned',
      description: 'Hub Incharge assigned Amit Sharma (TECH-101) to the complaint.',
      status: 'Assigned',
      performed_by_id: 6,
      performed_by_name: 'Karan Joshi',
      performed_by_role: 'Hub Incharge',
      latitude: null,
      longitude: null,
      duration_seconds: 0,
      duration_formatted: null,
      metadata: { technician_id: 1, technician_name: 'Amit Sharma' },
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      complaint_id: 1,
      event_type: 'JOURNEY_STARTED',
      title: 'Journey Started',
      description: 'Technician Amit Sharma accepted the job and started journey to customer location.',
      status: 'En Route',
      performed_by_id: 5,
      performed_by_name: 'Amit Sharma',
      performed_by_role: 'Technician',
      latitude: 30.2863,
      longitude: 78.0069,
      duration_seconds: 0,
      duration_formatted: null,
      metadata: { start_location: 'ISBT Hub', destination: 'Clock Tower' },
      created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString()
    },
    {
      id: 4,
      complaint_id: 4,
      event_type: 'REACHED_LOCATION',
      title: 'Reached Customer Location',
      description: 'Technician Amit Sharma arrived at customer breakdown location. Journey took 24m.',
      status: 'Reached',
      performed_by_id: 5,
      performed_by_name: 'Amit Sharma',
      performed_by_role: 'Technician',
      latitude: 30.2981,
      longitude: 78.0560,
      duration_seconds: 1440,
      duration_formatted: '24m',
      metadata: null,
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString()
    },
    {
      id: 5,
      complaint_id: 5,
      event_type: 'WORK_STARTED',
      title: 'Field Repair Started',
      description: 'Technician Rajesh Rawat initiated scooter diagnostics & repair at Prem Nagar Market.',
      status: 'Work In Progress',
      performed_by_id: 2,
      performed_by_name: 'Rajesh Rawat',
      performed_by_role: 'Technician',
      latitude: 30.3344,
      longitude: 77.9620,
      duration_seconds: 0,
      duration_formatted: null,
      metadata: null,
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    },
    {
      id: 6,
      complaint_id: 6,
      event_type: 'WORK_DONE',
      title: 'Work Completed',
      description: 'Field service repair completed successfully by Amit Sharma. Parts replaced: Tubeless Tyre Puncture Strip.',
      status: 'Work Done',
      performed_by_id: 5,
      performed_by_name: 'Amit Sharma',
      performed_by_role: 'Technician',
      latitude: 30.2678,
      longitude: 78.0189,
      duration_seconds: 2400,
      duration_formatted: '40m',
      metadata: { parts_count: 1 },
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
    },
    {
      id: 7,
      complaint_id: 7,
      event_type: 'COMPLAINT_CLOSED',
      title: 'Complaint Closed & Resolved',
      description: 'Customer feedback received and complaint closed with complete resolution.',
      status: 'Closed',
      performed_by_id: 7,
      performed_by_name: 'Priya Sharma',
      performed_by_role: 'Customer Support',
      latitude: null,
      longitude: null,
      duration_seconds: 0,
      duration_formatted: null,
      metadata: null,
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    }
  ] as any[]
};

// Unified Query Result Interface
export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number;
  insertId?: number;
}

// Helper to normalize ? placeholders to $1, $2... for PostgreSQL
function normalizePostgresSql(sql: string): string {
  let idx = 1;
  return sql.replace(/\?/g, () => `$${idx++}`);
}

// Wrapper around PostgreSQL pool
export const pool = {
  async query(text: string, params: any[] = []): Promise<QueryResult> {
    if (!pgPool || !isPostgresConnected) {
      throw new Error('PostgreSQL Database is not connected');
    }

    let queryText = normalizePostgresSql(text);

    // If query is an INSERT and doesn't have RETURNING id, append RETURNING id to capture insertId
    if (/^\s*INSERT\s+INTO/i.test(queryText) && !/RETURNING/i.test(queryText)) {
      queryText = queryText.replace(/;?\s*$/, ' RETURNING id;');
    }

    const res = await pgPool.query(queryText, params);
    const insertId = res.rows?.[0]?.id !== undefined ? Number(res.rows[0].id) : undefined;

    return {
      rows: res.rows,
      rowCount: res.rowCount || 0,
      insertId
    };
  }
};

export const getRawPool = (): Pool | null => pgPool;
export const getDbStatus = (): boolean => isPostgresConnected;

export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const isRemoteDb = databaseUrl.includes('supabase.co') || 
                       databaseUrl.includes('neon.tech') || 
                       databaseUrl.includes('sslmode=') || 
                       databaseUrl.includes('railway') || 
                       databaseUrl.includes('render') ||
                       process.env.NODE_ENV === 'production';

    const config: PoolConfig = {
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {})
    };

    pgPool = new Pool(config);
    const client = await pgPool.connect();
    const res = await client.query('SELECT NOW() as current_time');
    client.release();

    isPostgresConnected = true;
    console.log(`✅ PostgreSQL Database connected successfully! [DB: ${pgDatabase}, Time: ${res.rows[0].current_time}]`);

    // 1. Roles & Permissions Tables
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(150) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        module VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INT REFERENCES roles(id) ON DELETE CASCADE,
        permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
        scope VARCHAR(50) DEFAULT 'ALL',
        PRIMARY KEY (role_id, permission_id)
      );

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

      CREATE TABLE IF NOT EXISTS gallery_images (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        image_url VARCHAR(500) NOT NULL,
        vehicle_id INT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

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
    `);

    // 1. Seed Roles if empty
    const roleCount = await pgPool.query('SELECT COUNT(*) FROM roles');
    if (parseInt(roleCount.rows[0].count, 10) === 0) {
      await pgPool.query(`
        INSERT INTO roles (id, name, display_name, description, is_system) VALUES
        (1, 'SUPER_ADMIN', 'Super Admin', 'Full Root System Access', TRUE),
        (2, 'ADMIN', 'Admin', 'Operations and CRM Lead Control', TRUE),
        (3, 'MANAGER', 'Sales & Operations Manager', 'Sales overview & fleet dispatch', TRUE),
        (4, 'SALES_EXECUTIVE', 'Sales Executive', 'Direct rider onboarding & lead CRM', TRUE),
        (5, 'HUB_INCHARGE', 'Hub Incharge', 'Hub fleet, repair dispatch & billing control', FALSE),
        (6, 'TECHNICIAN', 'Technician', 'Scooter diagnostics, job card execution & parts replacement', FALSE),
        (7, 'CUSTOMER_SUPPORT', 'Customer Support', 'Customer complaints, breakdown ticket logging & support', FALSE);
      `);
    }

    // 2. Seed Users if empty
    const userCount = await pgPool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count, 10) === 0) {
      for (const u of memoryStore.users) {
        await pgPool.query(`
          INSERT INTO users (id, name, email, password_hash, phone, role_id, status, avatar_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (email) DO NOTHING
        `, [u.id, u.name, u.email, u.password_hash, u.phone, u.role_id, u.status, u.avatar_url]);
      }
    }

    // 3. Seed Fleet if empty
    const fleetCount = await pgPool.query('SELECT COUNT(*) FROM fleet');
    if (parseInt(fleetCount.rows[0].count, 10) === 0) {
      for (const f of memoryStore.fleet) {
        await pgPool.query(`
          INSERT INTO fleet (id, reg_number, brand, model, vehicle_type, battery_capacity_kwh, battery_health_percentage, battery_type, range_km, top_speed_kmh, current_km, current_location, daily_rate, weekly_rate, monthly_rate, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (reg_number) DO NOTHING
        `, [f.id, f.reg_number, f.brand, f.model, f.vehicle_type, f.battery_capacity_kwh, f.battery_health_percentage, f.battery_type, f.range_km, f.top_speed_kmh, f.current_km, f.current_location, f.daily_rate, f.weekly_rate, f.monthly_rate, f.status]);
      }
    }

    // 4. Seed Inventory if empty
    const invCount = await pgPool.query('SELECT COUNT(*) FROM inventory');
    if (parseInt(invCount.rows[0].count, 10) === 0) {
      for (const item of memoryStore.inventory) {
        await pgPool.query(`
          INSERT INTO inventory (id, part_code, part_name, category, image_url, quantity, min_threshold, unit_price, status, location, supplier, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (part_code) DO NOTHING
        `, [item.id, item.part_code, item.part_name, item.category, item.image_url, item.quantity, item.min_threshold, item.unit_price, item.status, item.location, item.supplier, item.description]);
      }
    }

    // 5. Seed Repair Hubs if empty
    const hubCount = await pgPool.query('SELECT COUNT(*) FROM repair_hubs');
    if (parseInt(hubCount.rows[0].count, 10) === 0) {
      for (const h of memoryStore.repairHubs) {
        await pgPool.query(`
          INSERT INTO repair_hubs (id, hub_code, hub_name, location, incharge_name, incharge_phone, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (hub_code) DO NOTHING
        `, [h.id, h.hub_code, h.hub_name, h.location, h.incharge_name, h.incharge_phone, h.is_active]);
      }
    }

    // 6. Seed Technicians if empty
    const techCount = await pgPool.query('SELECT COUNT(*) FROM technicians');
    if (parseInt(techCount.rows[0].count, 10) === 0) {
      for (const t of memoryStore.technicians) {
        await pgPool.query(`
          INSERT INTO technicians (id, technician_code, name, phone, email, hub_id, hub_name, specialization, status, active_jobs_count, rating)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (technician_code) DO NOTHING
        `, [t.id, t.technician_code, t.name, t.phone, t.email, t.hub_id, t.hub_name, t.specialization, t.status, t.active_jobs_count, t.rating]);
      }
    }

    // 7. Seed Repair Jobs if empty
    const jobCount = await pgPool.query('SELECT COUNT(*) FROM repair_jobs');
    if (parseInt(jobCount.rows[0].count, 10) === 0) {
      for (const j of memoryStore.repairJobs) {
        await pgPool.query(`
          INSERT INTO repair_jobs (id, job_number, scooter_id, scooter_number, rider_name, rider_contact, hub_id, hub_name, technician_id, technician_name, complaint, priority, status, created_by_id, created_by_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (job_number) DO NOTHING
        `, [j.id, j.job_number, j.scooter_id, j.scooter_number, j.rider_name, j.rider_contact, j.hub_id, j.hub_name, j.technician_id, j.technician_name, j.complaint, j.priority, j.status, j.created_by_id, j.created_by_name]);
      }
    }

    // 8. Seed Complaints if empty
    const complaintCount = await pgPool.query('SELECT COUNT(*) FROM complaints');
    if (parseInt(complaintCount.rows[0].count, 10) === 0) {
      for (const c of memoryStore.complaints) {
        await pgPool.query(`
          INSERT INTO complaints (
            id, complaint_number, scooter_id, scooter_number, customer_name, customer_phone, location_address,
            location_url, latitude, longitude, issue_category, description, priority, hub_id, hub_name,
            hub_incharge_id, hub_incharge_name, technician_id, technician_name, technician_phone, technician_code,
            technician_latitude, technician_longitude, status, journey_started_at, reached_at,
            journey_duration_seconds, journey_duration_formatted, work_started_at, work_completed_at,
            work_duration_seconds, work_duration_formatted, work_performed, parts_used, technician_remarks,
            proof_photos, completion_notes, created_by_id, created_by_name, created_by_role, created_at, updated_at, closed_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21,
            $22, $23, $24, $25, $26,
            $27, $28, $29, $30,
            $31, $32, $33, $34, $35,
            $36, $37, $38, $39, $40, $41, $42, $43
          ) ON CONFLICT (complaint_number) DO NOTHING
        `, [
          c.id, c.complaint_number, c.scooter_id, c.scooter_number, c.customer_name, c.customer_phone, c.location_address,
          c.location_url, c.latitude, c.longitude, c.issue_category, c.description, c.priority, c.hub_id, c.hub_name,
          c.hub_incharge_id, c.hub_incharge_name, c.technician_id, c.technician_name, c.technician_phone, c.technician_code,
          c.technician_latitude, c.technician_longitude, c.status, c.journey_started_at, c.reached_at,
          c.journey_duration_seconds, c.journey_duration_formatted, c.work_started_at, c.work_completed_at,
          c.work_duration_seconds, c.work_duration_formatted, c.work_performed, JSON.stringify(c.parts_used || []), c.technician_remarks,
          JSON.stringify(c.proof_photos || []), c.completion_notes, c.created_by_id, c.created_by_name, c.created_by_role, c.created_at, c.updated_at, c.closed_at
        ]);
      }
    }

    return true;
  } catch (err: any) {
    isPostgresConnected = false;
    console.warn(`⚠️ PostgreSQL connection Notice: ${err.message}. Using resilient in-memory database store.`);
    return false;
  }
};
