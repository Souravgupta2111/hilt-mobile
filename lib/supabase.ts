import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Property, Profile, Itinerary, Booking, HostPayout } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://eccqfucljzppqomaiwgp.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjY3FmdWNsanpwcHFvbWFpd2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NDI1OTgsImV4cCI6MjEwNDExODU5OH0.FT-DT5zos5wuVjzOgjPG15YvLxiZrcUkGNJ_D8fZ6fM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Seed data fallback in case user has not yet executed the SQL script in Supabase
export const FALLBACK_PROPERTIES: Property[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    host_id: 'a0000000-0000-0000-0000-000000000001',
    title: 'The Himalayan Cedar Estate',
    tagline: 'Heritage Timber Sanctuary over Tirthan Valley',
    description: 'Enjoy slow living with high-speed fiber Wi-Fi, 360-degree snow peak views, private cedar lawn, and traditional tandoor fireplace.',
    property_type: 'entire_villa',
    category: 'Home',
    allows_room_booking: true,
    allows_entire_villa: true,
    price_entire_villa: 28600,
    discount_percentage: 15,
    valley: 'Tirthan Valley',
    town: 'Jibhi',
    state: 'Himachal Pradesh',
    address: 'Upper Jibhi Ridge, Banjar Valley',
    latitude: 31.6372,
    longitude: 77.3481,
    altitude_meters: 2150,
    road_accessibility: 'tar_road',
    bedrooms: 4,
    bathrooms: 3,
    floors: 1,
    sqft: 2500,
    max_guests: 8,
    wifi_speed_mbps: 120,
    power_backup: '100% Inverter & Solar Genset',
    heating_types: ['Fireplace', 'Bukhari', 'Electric Blanket'],
    amenities: ['Wi-Fi', 'Kitchen', 'Private Lawn', 'Bonfire Pit', 'Heated Rooms', 'Sedan Accessible'],
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80',
    ],
    rating: 5.0,
    reviews_count: 24,
    days_on_market: 1,
    requires_verified_guests: true,
    is_active: true,
    created_at: new Date().toISOString(),
    host: {
      id: 'a0000000-0000-0000-0000-000000000001',
      full_name: 'Abdur rob',
      email: 'aritbd2020@gmail.com',
      phone: '+91 98160 44219',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
      role: 'host',
      bio: 'Architect turned mountain host. Custodian of 3 heritage cedar homestays across Jibhi & Tirthan Valley.',
      location: 'Jibhi, Himachal Pradesh',
      is_superhost: true,
      is_identity_verified: true,
      id_masked_number: 'XXXX-XXXX-8921',
      tourism_reg_number: 'HP-TOURISM-HOMESTAY-2024-811',
      payout_method: 'upi',
      upi_vpa: 'abdur@okaxis',
      rating: 5.0,
      reviews_count: 200,
      sold_count: 100,
      created_at: new Date().toISOString(),
    },
    rooms: [
      {
        id: 'd0000000-0000-0000-0000-000000000001',
        property_id: 'c0000000-0000-0000-0000-000000000001',
        room_name: 'Deluxe Cedar Attic Room',
        bed_type: 'King Bed',
        max_guests: 2,
        price_per_night: 4500,
        images: ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&auto=format&fit=crop&q=80'],
        amenities: ['Balcony View', 'Ensuite Bathroom', 'Electric Blanket', 'Heater'],
        is_available: true,
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    host_id: 'a0000000-0000-0000-0000-000000000001',
    title: 'The Elements Villa',
    tagline: 'Modern Glasshouse over Deodar Valley',
    description: 'Ultra-modern architecture perched on the ridge with panoramic floor-to-ceiling glass windows and private sundeck.',
    property_type: 'entire_villa',
    category: 'Hotel',
    price_entire_villa: 12000,
    discount_percentage: 20,
    valley: 'Kullu Valley',
    town: 'Manali',
    state: 'Himachal Pradesh',
    address: 'Old Manali Club House Road',
    latitude: 32.2432,
    longitude: 77.1892,
    altitude_meters: 2050,
    road_accessibility: 'tar_road',
    bedrooms: 2,
    bathrooms: 1,
    floors: 2,
    sqft: 1800,
    max_guests: 4,
    wifi_speed_mbps: 150,
    power_backup: '100% Dedicated Genset',
    heating_types: ['Underfloor Heating', 'Italian Fireplace'],
    amenities: ['Wi-Fi', 'Kitchen', 'Glass Balcony', 'Bathtub', 'Pet Friendly'],
    images: [
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&auto=format&fit=crop&q=80',
    ],
    rating: 4.8,
    reviews_count: 48,
    days_on_market: 2,
    requires_verified_guests: true,
    is_active: true,
    created_at: new Date().toISOString(),
    allows_room_booking: false,
    allows_entire_villa: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    host_id: 'a0000000-0000-0000-0000-000000000001',
    title: 'Lakeview Alpine Cottage',
    tagline: 'Tranquil Alpine Lake Retreat & Orchard',
    description: 'Charming stone and timber cottage right next to mountain streams with private apple orchard.',
    property_type: 'cottage',
    category: 'Apartment',
    price_entire_villa: 28600,
    discount_percentage: 0,
    valley: 'Nainital District',
    town: 'Mukteshwar',
    state: 'Uttarakhand',
    address: 'Bhalu Gaon, Near Chauli Ki Jali',
    latitude: 29.4722,
    longitude: 79.6478,
    altitude_meters: 2280,
    road_accessibility: 'tar_road',
    bedrooms: 4,
    bathrooms: 3,
    floors: 2,
    sqft: 3100,
    max_guests: 9,
    wifi_speed_mbps: 80,
    power_backup: 'Inverter Backup',
    heating_types: ['Wood Stove', 'Oil Radiators'],
    amenities: ['Wi-Fi', 'Kitchen', 'Orchard Walk', 'Sunset Deck'],
    images: [
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80',
    ],
    rating: 4.92,
    reviews_count: 18,
    days_on_market: 1,
    requires_verified_guests: true,
    is_active: true,
    created_at: new Date().toISOString(),
    allows_room_booking: true,
    allows_entire_villa: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    host_id: 'a0000000-0000-0000-0000-000000000001',
    title: 'Dharamkot Pine Haven',
    tagline: 'Minimalist Nordic Mountain Chalet',
    description: 'Scandinavian inspired chalet designed for slow creative workations and mountain solitude.',
    property_type: 'homestay',
    category: 'Home',
    price_entire_villa: 38600,
    discount_percentage: 0,
    valley: 'Kangra Valley',
    town: 'Dharamkot',
    state: 'Himachal Pradesh',
    address: 'Upper Bhagsu Trail, Dharamkot',
    latitude: 32.2530,
    longitude: 76.3264,
    altitude_meters: 2100,
    road_accessibility: 'walking_trek',
    bedrooms: 4,
    bathrooms: 4,
    floors: 2,
    sqft: 2800,
    max_guests: 8,
    wifi_speed_mbps: 100,
    power_backup: 'Solar Power System',
    heating_types: ['Electric Heaters', 'Bukhari'],
    amenities: ['Wi-Fi', 'Terrace Cafe', 'Yoga Deck', 'Trek Guide Available'],
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&auto=format&fit=crop&q=80',
    ],
    rating: 4.95,
    reviews_count: 32,
    days_on_market: 3,
    requires_verified_guests: true,
    is_active: true,
    created_at: new Date().toISOString(),
    allows_room_booking: true,
    allows_entire_villa: true,
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    host_id: 'a0000000-0000-0000-0000-000000000001',
    title: 'Ganga Mist Riverside Sanctuary',
    tagline: 'Riverside Stone Villa with Private Plunge Pool',
    description: 'Handcrafted stone villa overlooking the river with soothing waters and private bonfire lawn.',
    property_type: 'entire_villa',
    category: 'Home',
    price_entire_villa: 45900,
    discount_percentage: 10,
    valley: 'Ganga Valley',
    town: 'Rishikesh',
    state: 'Uttarakhand',
    address: 'Tapovan Bypass, Rishikesh',
    latitude: 30.1342,
    longitude: 78.3245,
    altitude_meters: 410,
    road_accessibility: 'tar_road',
    bedrooms: 3,
    bathrooms: 3,
    floors: 1,
    sqft: 2200,
    max_guests: 6,
    wifi_speed_mbps: 200,
    power_backup: '100% Inverter & Genset',
    heating_types: ['AC with Warm Mode'],
    amenities: ['River View', 'Private Pool', 'Chef on Call', 'Fiber Wi-Fi'],
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
    ],
    rating: 4.98,
    reviews_count: 56,
    days_on_market: 1,
    requires_verified_guests: true,
    is_active: true,
    created_at: new Date().toISOString(),
    allows_room_booking: false,
    allows_entire_villa: true,
  },
];

export const FALLBACK_ITINERARIES: Itinerary[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    author_id: 'a0000000-0000-0000-0000-000000000001',
    property_id: 'c0000000-0000-0000-0000-000000000001',
    title: '3 Days of Slow Living in Shoja & Jalori Pass',
    region: 'Tirthan Valley, HP',
    duration_days: 3,
    hero_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    summary: 'Curated by host Abdur. Hidden forest waterfalls, fresh Himalayan trout, and evening bonfires.',
    is_host_guide: true,
    likes_count: 84,
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'f0000000-0000-0000-0000-000000000001',
        itinerary_id: 'e0000000-0000-0000-0000-000000000001',
        day_number: 1,
        time_of_day: 'morning',
        place_name: 'Shringi Vatika Trout & Siddu',
        category: 'food',
        description: 'Order hot steamed walnut siddu with pure ghee. Ask for the river view table.',
        approx_cost: 350,
        insider_tip: 'Call 30 mins ahead so the siddu is fresh from the steamer.',
      },
      {
        id: 'f0000000-0000-0000-0000-000000000002',
        itinerary_id: 'e0000000-0000-0000-0000-000000000001',
        day_number: 1,
        time_of_day: 'afternoon',
        place_name: 'Choi Waterfall Forest Trail',
        category: 'trek',
        description: 'A gentle 45-minute pine forest walk from the homestay. Crystal clear mountain plunge pool.',
        approx_cost: 0,
        insider_tip: 'Wear water-resistant footwear with good grip on wet stones.',
      },
      {
        id: 'f0000000-0000-0000-0000-000000000003',
        itinerary_id: 'e0000000-0000-0000-0000-000000000001',
        day_number: 2,
        time_of_day: 'morning',
        place_name: 'Serolsar Lake via Jalori Pass',
        category: 'viewpoint',
        description: 'Historic high mountain pass (3,120m) connecting Shimla and Kullu valleys.',
        approx_cost: 200,
        insider_tip: 'Leave before 9 AM for clear panoramic views of the Dhauladhar range.',
      },
    ],
  },
];

// Backend fetchers with live Supabase query first
export async function getProperties(category?: string): Promise<Property[]> {
  try {
    let query = supabase.from('properties').select('*, host:profiles(*)');
    if (category && category !== 'Home') {
      query = query.eq('category', category);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      // Return fallback if table not yet populated or error occurs
      if (category && category !== 'Home') {
        return FALLBACK_PROPERTIES.filter(p => p.category === category);
      }
      return FALLBACK_PROPERTIES;
    }
    return data as Property[];
  } catch {
    return FALLBACK_PROPERTIES;
  }
}

export async function getPropertyById(id: string): Promise<Property | null> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, host:profiles(*), rooms:property_rooms(*)')
      .eq('id', id)
      .single();
    if (error || !data) {
      const found = FALLBACK_PROPERTIES.find(p => p.id === id);
      return found || FALLBACK_PROPERTIES[0];
    }
    return data as Property;
  } catch {
    return FALLBACK_PROPERTIES[0];
  }
}

export async function getItineraries(): Promise<Itinerary[]> {
  try {
    const { data, error } = await supabase
      .from('itineraries')
      .select('*, author:profiles(*), items:itinerary_items(*)')
      .order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      return FALLBACK_ITINERARIES;
    }
    return data as Itinerary[];
  } catch {
    return FALLBACK_ITINERARIES;
  }
}

export async function getHostProfile(): Promise<Profile> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'host')
      .limit(1)
      .single();
    if (error || !data) {
      return FALLBACK_PROPERTIES[0].host!;
    }
    return data as Profile;
  } catch {
    return FALLBACK_PROPERTIES[0].host!;
  }
}

export async function getCurrentUserProfile(): Promise<Profile> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'traveler')
      .limit(1)
      .single();
    if (!error && data) {
      return data as Profile;
    }
  } catch (err) {
    console.error('Error fetching current user:', err);
  }
  return {
    id: 'b0000000-0000-0000-0000-000000000002',
    full_name: 'Roman Vance',
    email: 'roman@hilt.travel',
    phone: '+91 98160 49210',
    role: 'traveler',
    location: 'Himachal Pradesh',
    is_superhost: false,
    is_identity_verified: true,
    rating: 5.0,
    reviews_count: 8,
    sold_count: 0,
    payout_method: 'upi',
    created_at: new Date().toISOString(),
  };
}

export async function createBooking(booking: Partial<Booking>): Promise<{ data: Booking | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select('*, property:properties(*, host:profiles(*))')
      .single();

    if (!error && data) {
      // Create scheduled escrow payout in host_payouts table
      const hostId = data.property?.host_id || 'a0000000-0000-0000-0000-000000000001';
      const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('host_payouts').insert([{
        booking_id: data.id,
        host_id: hostId,
        gross_amount: data.subtotal,
        platform_fee: data.platform_fee,
        net_payout: data.subtotal - data.platform_fee,
        payout_destination: data.property?.host?.upi_vpa || 'abdur@okaxis',
        payout_status: 'scheduled',
        scheduled_payout_date: scheduledDate,
      }]);
    }

    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function getTravelerBookings(): Promise<Booking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, property:properties(*, host:profiles(*)), room:property_rooms(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching traveler bookings:', error);
      return [];
    }
    return (data || []) as Booking[];
  } catch (err) {
    console.error('Error fetching traveler bookings:', err);
    return [];
  }
}

export async function getHostStats(): Promise<{
  grossEarnings: number;
  occupancyPercent: number;
  viewsCount: number;
  bookingsCount: number;
  reviewsCount: number;
  rating: number;
  nextPayoutAmount: number;
  nextPayoutDate: string;
}> {
  try {
    const { data: bookings } = await supabase.from('bookings').select('*');
    const { data: host } = await supabase.from('profiles').select('*').eq('role', 'host').limit(1).single();

    const count = bookings?.length || 0;
    const grossEarnings = bookings?.reduce((acc, b) => acc + (b.total_amount || 0), 0) || 0;
    const occupancyPercent = count > 0 ? Math.min(95, 60 + count * 8) : 0;
    const nextPayoutAmount = Math.round(grossEarnings * 0.98);

    return {
      grossEarnings,
      occupancyPercent,
      viewsCount: count > 0 ? 1200 + count * 140 : 1840,
      bookingsCount: count,
      reviewsCount: host?.reviews_count || 200,
      rating: host?.rating || 5.0,
      nextPayoutAmount,
      nextPayoutDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      }),
    };
  } catch {
    return {
      grossEarnings: 0,
      occupancyPercent: 0,
      viewsCount: 1840,
      bookingsCount: 0,
      reviewsCount: 200,
      rating: 5.0,
      nextPayoutAmount: 0,
      nextPayoutDate: 'Pending Check-in',
    };
  }
}

