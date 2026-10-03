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
  leads: [] as any[],
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
  preBookings: [] as any[],
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
    },
    {
      id: 6,
      part_code: 'DR-INV-1006',
      part_name: '12V High-Tone Waterproof EV Horn',
      category: 'Electricals',
      image_url: '',
      quantity: 35,
      min_threshold: 8,
      unit_price: 250.00,
      status: 'In Stock',
      location: 'Rack E1',
      supplier: 'Minda EV',
      description: '105dB waterproof horn with mount bracket.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 7,
      part_code: 'DR-INV-1007',
      part_name: 'Left Side Rearview Mirror Assembly',
      category: 'Body Parts',
      image_url: '',
      quantity: 25,
      min_threshold: 5,
      unit_price: 180.00,
      status: 'In Stock',
      location: 'Rack E2',
      supplier: 'Doon Riders OEM',
      description: 'Convex wide-angle left mirror with M10 reverse thread.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 8,
      part_code: 'DR-INV-1008',
      part_name: 'Right Side Rearview Mirror Assembly',
      category: 'Body Parts',
      image_url: '',
      quantity: 25,
      min_threshold: 5,
      unit_price: 180.00,
      status: 'In Stock',
      location: 'Rack E2',
      supplier: 'Doon Riders OEM',
      description: 'Convex wide-angle right mirror with M10 standard thread.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 9,
      part_code: 'DR-INV-1009',
      part_name: 'Front Mudguard / Fender (FRP Gloss Black)',
      category: 'Body Parts',
      image_url: '',
      quantity: 18,
      min_threshold: 4,
      unit_price: 450.00,
      status: 'In Stock',
      location: 'Rack F1',
      supplier: 'Doon Riders OEM',
      description: 'Impact-resistant FRP aerodynamic front mudguard.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 10,
      part_code: 'DR-INV-1010',
      part_name: 'Alloy Brake Lever (Left / Right)',
      category: 'Controls',
      image_url: '',
      quantity: 30,
      min_threshold: 6,
      unit_price: 220.00,
      status: 'In Stock',
      location: 'Rack E3',
      supplier: 'Endurance Brakes',
      description: 'CNC machined forged alloy brake lever with switch sensor.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 11,
      part_code: 'DR-INV-1011',
      part_name: 'High-Lumen LED Headlight Assembly',
      category: 'Lighting',
      image_url: '',
      quantity: 15,
      min_threshold: 3,
      unit_price: 650.00,
      status: 'In Stock',
      location: 'Rack D2',
      supplier: 'Lumax Industries',
      description: 'Dual-projector LED matrix headlight unit with DRL.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 12,
      part_code: 'DR-INV-1012',
      part_name: 'Tail Light & Rear Indicator Set',
      category: 'Lighting',
      image_url: '',
      quantity: 20,
      min_threshold: 4,
      unit_price: 350.00,
      status: 'In Stock',
      location: 'Rack D3',
      supplier: 'Lumax Industries',
      description: 'Integrated LED tail brake lamp with amber turn signals.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 13,
      part_code: 'DR-INV-1013',
      part_name: 'Side Body Panel / Cowl (Major Repair/Replace)',
      category: 'Body Parts',
      image_url: '',
      quantity: 12,
      min_threshold: 3,
      unit_price: 850.00,
      status: 'In Stock',
      location: 'Rack F3',
      supplier: 'Doon Riders OEM',
      description: 'ABS molded rear side panel with mounting clips.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 14,
      part_code: 'DR-INV-1014',
      part_name: 'Minor Body Scratch & Dent Touchup',
      category: 'Body Care',
      image_url: '',
      quantity: 50,
      min_threshold: 10,
      unit_price: 300.00,
      status: 'In Stock',
      location: 'Paint Bay',
      supplier: 'Nippon Paint EV',
      description: 'Professional color-matched rubbing, buffing and touchup.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 15,
      part_code: 'DR-INV-1015',
      part_name: 'Battery Compartment Hatch Lock & Key',
      category: 'Chassis & Locks',
      image_url: '',
      quantity: 22,
      min_threshold: 5,
      unit_price: 400.00,
      status: 'In Stock',
      location: 'Rack E4',
      supplier: 'Godrej OEM',
      description: 'Reinforced stainless steel lock mechanism with dual brass keys.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 16,
      part_code: 'DR-INV-1016',
      part_name: 'Waterproof Anti-Slip Seat Cover',
      category: 'Accessories',
      image_url: '',
      quantity: 30,
      min_threshold: 5,
      unit_price: 350.00,
      status: 'In Stock',
      location: 'Rack G1',
      supplier: 'Doon Riders OEM',
      description: 'High-durability ribbed Rexine seat cover with memory cushion.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 17,
      part_code: 'DR-INV-1017',
      part_name: 'Tubeless Tyre Puncture Repair',
      category: 'Tires & Wheels',
      image_url: '',
      quantity: 60,
      min_threshold: 15,
      unit_price: 250.00,
      status: 'In Stock',
      location: 'Tyre Bay',
      supplier: 'MRF Service',
      description: 'Cold vulcanized tyre puncture patch & valve core replacement.',
      created_at: '2026-09-05T08:00:00.000Z'
    },
    {
      id: 18,
      part_code: 'DR-INV-1018',
      part_name: 'Rear Grab Rail / Carrier Luggage Mount',
      category: 'Chassis & Locks',
      image_url: '',
      quantity: 15,
      min_threshold: 3,
      unit_price: 400.00,
      status: 'In Stock',
      location: 'Rack G2',
      supplier: 'Doon Riders OEM',
      description: 'Heavy duty steel powder coated rear grab rail.',
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
  repairJobs: [] as any[],
  repairInspections: [] as any[],
  repairParts: [] as any[],
  repairTiming: [] as any[],
  repairBills: [] as any[],
  repairPayments: [] as any[],
  repairEvents: [] as any[],
  repairNotifications: [] as any[],
  complaints: [] as any[],
  complaintEvents: [] as any[],
  scootyReturns: [] as any[],
  scootyReturnEvents: [] as any[],
  scootyRecoveries: [] as any[],
  scootyRecoveryEvents: [] as any[]
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

    // 7. Wipe out all transactional demo data from PostgreSQL so database starts 100% fresh
    await pgPool.query(`
      TRUNCATE TABLE complaints, complaint_events, repair_jobs, repair_inspections, repair_parts, repair_timing, repair_audit_logs, leads, pre_bookings RESTART IDENTITY CASCADE;
    `).catch(err => {
      console.log('DB Clean wipe notice:', err.message);
    });

    return true;
  } catch (err: any) {
    isPostgresConnected = false;
    console.warn(`⚠️ PostgreSQL connection Notice: ${err.message}. Using resilient in-memory database store.`);
    return false;
  }
};
