// API Client for DOON Riders Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Vehicle {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  price: number;
  range_km: number;
  acceleration_0_100: number;
  top_speed_kmh: number;
  battery_kwh: number;
  charging_time_min: number;
  image_url: string;
  badge: string;
  category: string;
  is_featured: boolean;
}

export interface BookingPayload {
  fullName: string;
  email: string;
  phone: string;
  vehicleId?: number;
  vehicleName?: string;
  preferredDate: string;
  preferredTime: string;
  city?: string;
  message?: string;
}

export interface Testimonial {
  id: number;
  name: string;
  role: string;
  company?: string;
  avatar_url: string;
  rating: number;
  content: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  display_order: number;
}

export interface GalleryImage {
  id: number;
  title: string;
  category: string;
  description?: string;
  image_url: string;
  vehicle_id?: number | null;
  created_at?: string;
}

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicles`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.warn('Backend unavailable, using fallback static vehicles data');
    return [
      {
        id: 1,
        name: 'DOON Electro Pro',
        slug: 'doon-electro-pro',
        tagline: 'Dual-Motor High Torque Electric Scooter',
        price: 1799,
        range_km: 120,
        acceleration_0_100: 4.8,
        top_speed_kmh: 85,
        battery_kwh: 3.5,
        charging_time_min: 45,
        image_url: '/images/slide-1-1.webp',
        badge: 'Performance',
        category: 'Performance',
        is_featured: true
      },
      {
        id: 2,
        name: 'DOON City Cruise',
        slug: 'doon-city-cruise',
        tagline: 'Lightweight & Agile Daily Commuter',
        price: 1499,
        range_km: 95,
        acceleration_0_100: 5.6,
        top_speed_kmh: 65,
        battery_kwh: 2.2,
        charging_time_min: 60,
        image_url: '/images/slide-2.webp',
        badge: 'City Commuter',
        category: 'City',
        is_featured: true
      },
      {
        id: 3,
        name: 'DOON Storm EV',
        slug: 'doon-storm-ev',
        tagline: 'Heavy-Duty Mountain & Long Range EV',
        price: 1999,
        range_km: 150,
        acceleration_0_100: 3.9,
        top_speed_kmh: 90,
        battery_kwh: 4.2,
        charging_time_min: 30,
        image_url: '/images/slide-3.webp',
        badge: 'Mountain Pro',
        category: 'Performance',
        is_featured: true
      },
      {
        id: 4,
        name: 'DOON Eco Max',
        slug: 'doon-eco-max',
        tagline: 'High Economy Student & Delivery Choice',
        price: 1299,
        range_km: 80,
        acceleration_0_100: 6.2,
        top_speed_kmh: 55,
        battery_kwh: 1.8,
        charging_time_min: 75,
        image_url: '/images/all-vehicle.webp',
        badge: 'Eco Delivery',
        category: 'Eco',
        is_featured: true
      }
    ];
  }
};

export const submitBooking = async (payload: BookingPayload) => {
  const res = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
};

export const subscribeNewsletter = async (email: string) => {
  const res = await fetch(`${API_BASE_URL}/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
};

// ==========================================
// VEHICLE & FLEET GALLERY API
// ==========================================

export const FALLBACK_GALLERY: GalleryImage[] = [
  {
    id: 1,
    title: 'DOON Electro Pro - 360 Studio Showcase',
    category: 'Scooter Angles',
    description: 'Aerodynamic frame engineered with aerospace-grade alloy, digital cluster and LED matrix lighting.',
    image_url: '/images/slide-1-1.webp',
    created_at: '2026-09-01T10:00:00.000Z'
  },
  {
    id: 2,
    title: 'ISBT Dehradun 2-Min Battery Swap Station',
    category: 'Battery Swap Hubs',
    description: 'Fully automated 2-minute battery exchange station with automated temperature & voltage health monitoring.',
    image_url: '/images/bg-img-home1-958x463.jpg',
    created_at: '2026-09-02T11:30:00.000Z'
  },
  {
    id: 3,
    title: 'DOON Storm EV - Mussoorie Hill Climb Testing',
    category: 'Hill Climbs & Roads',
    description: 'Conquering 18-degree uphill hairpin turns effortlessly with 4.2 kW peak dual-torque motor.',
    image_url: '/images/slide-3.webp',
    created_at: '2026-09-03T09:15:00.000Z'
  },
  {
    id: 4,
    title: 'Dehradun Daily Delivery Rider Fleet',
    category: 'Delivery Partners',
    description: 'Over 500+ commercial delivery partners operating daily across Rajpur Road, Paltan Bazar & Clement Town.',
    image_url: '/images/dehradun-clock-tower.jpg',
    created_at: '2026-09-04T08:45:00.000Z'
  },
  {
    id: 5,
    title: 'DOON City Cruise - Lightweight Commuter',
    category: 'Scooter Angles',
    description: 'Ultra-lightweight agile chassis designed specifically for swift daily office commutes in city traffic.',
    image_url: '/images/slide-2.webp',
    created_at: '2026-09-04T14:20:00.000Z'
  },
  {
    id: 6,
    title: 'Commercial Heavy-Duty Carrier Setup',
    category: 'Fleet Showcase',
    description: 'Reinforced dual suspension chassis equipped with 80kg rated modular delivery box carrier.',
    image_url: '/images/all-vehicle.webp',
    created_at: '2026-09-05T07:10:00.000Z'
  }
];

export const fetchGalleryImages = async (category?: string): Promise<GalleryImage[]> => {
  try {
    const url = category && category !== 'All' 
      ? `${API_BASE_URL}/gallery?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/gallery`;
    
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch gallery images');
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
    return FALLBACK_GALLERY;
  } catch (error) {
    console.warn('Backend gallery unavailable, using fallback gallery data:', error);
    if (category && category !== 'All') {
      return FALLBACK_GALLERY.filter(item => item.category === category);
    }
    return FALLBACK_GALLERY;
  }
};

export const uploadGalleryImage = async (formData: FormData): Promise<{ success: boolean; data?: GalleryImage; message?: string }> => {
  try {
    const res = await fetch(`${API_BASE_URL}/gallery/upload`, {
      method: 'POST',
      body: formData,
    });
    return await res.json();
  } catch (error: any) {
    console.error('Failed to upload gallery image:', error);
    return { success: false, message: error.message || 'Upload failed' };
  }
};

export const deleteGalleryImage = async (id: number): Promise<{ success: boolean; message?: string }> => {
  try {
    const res = await fetch(`${API_BASE_URL}/gallery/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  } catch (error: any) {
    console.error('Failed to delete gallery image:', error);
    return { success: false, message: error.message || 'Delete failed' };
  }
};
