// TypeScript types matching Hilt Supabase Database Schema

export interface Profile {
  id: string;
  full_name: string;
  email?: string;
  phone: string;
  avatar_url?: string;
  role: 'traveler' | 'host' | 'admin';
  bio?: string;
  location?: string;
  is_superhost: boolean;
  is_identity_verified: boolean;
  id_document_type?: string;
  id_masked_number?: string;
  tourism_reg_number?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  upi_vpa?: string;
  payout_method: 'bank' | 'upi';
  pan_number?: string;
  gstin?: string;
  is_payout_verified?: boolean;
  payout_verified_name?: string;
  payout_verified_at?: string;
  rating: number;
  reviews_count: number;
  sold_count: number;
  created_at: string;
}

export interface PropertyRoom {
  id: string;
  property_id: string;
  room_name: string;
  bed_type: string;
  max_guests: number;
  price_per_night: number;
  images: string[];
  amenities: string[];
  is_available: boolean;
  created_at: string;
}

export interface Property {
  id: string;
  host_id: string;
  title: string;
  tagline?: string;
  description?: string;
  property_type: 'entire_villa' | 'homestay' | 'boutique_hotel' | 'cottage' | 'cabin' | 'apartment';
  category: 'Home' | 'Hotel' | 'Apartment' | 'Office';
  allows_room_booking: boolean;
  allows_entire_villa: boolean;
  price_entire_villa: number;
  discount_percentage: number;
  valley: string;
  town: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  altitude_meters: number;
  road_accessibility: 'tar_road' | 'four_by_four' | 'walking_trek';
  bedrooms: number;
  bathrooms: number;
  floors: number;
  sqft: number;
  max_guests: number;
  wifi_speed_mbps: number;
  power_backup: string;
  heating_types: string[];
  amenities: string[];
  images: string[];
  rating: number;
  reviews_count: number;
  days_on_market: number;
  requires_verified_guests: boolean;
  is_active: boolean;
  created_at: string;
  cancellation_policy: 'flexible' | 'moderate' | 'strict';
  house_rules: string;
  check_in_time: string;
  check_out_time: string;
  cleaning_fee: number;
  min_nights: number;
  max_nights: number;
  instant_book: boolean;
  // Joins
  host?: Profile;
  rooms?: PropertyRoom[];
}

export interface ItineraryItem {
  id: string;
  itinerary_id: string;
  day_number: number;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  place_name: string;
  category: 'food' | 'viewpoint' | 'trek' | 'culture' | 'cafe' | 'hidden_gem';
  description?: string;
  latitude?: number;
  longitude?: number;
  approx_cost: number;
  insider_tip?: string;
}

export interface Itinerary {
  id: string;
  author_id: string;
  property_id?: string;
  title: string;
  region: string;
  duration_days: number;
  hero_image?: string;
  summary?: string;
  is_host_guide: boolean;
  likes_count: number;
  created_at: string;
  author?: Profile;
  items?: ItineraryItem[];
}

export interface GuestReview {
  id: string;
  booking_id: string;
  property_id: string;
  host_id: string;
  traveler_id: string;
  rating: number;
  comment: string;
  created_at: string;
  host?: Profile;
}

export interface Booking {
  id: string;
  property_id: string;
  room_id?: string;
  traveler_id: string;
  booking_type: 'entire_villa' | 'single_room';
  check_in: string;
  check_out: string;
  guests_count: number;
  total_nights: number;
  nightly_rate: number;
  subtotal: number;
  cleaning_fee: number;
  platform_fee: number;
  gst_amount: number;
  total_amount: number;
  payment_status: 'pending' | 'captured_in_escrow' | 'refunded' | 'settled_to_host';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  invoice_number?: string;
  created_at: string;
  property?: Property;
  room?: PropertyRoom;
  traveler?: Profile;
}

export interface HostPayout {
  id: string;
  booking_id: string;
  host_id: string;
  gross_amount: number;
  platform_fee: number;
  net_payout: number;
  tds_amount?: number;
  tds_rate?: number;
  payout_destination: string;
  payout_status: 'scheduled' | 'processing' | 'completed' | 'failed';
  utr_reference?: string;
  scheduled_payout_date: string;
  settled_at?: string;
  created_at: string;
}

export interface Review {
  id: string;
  property_id: string;
  reviewer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: Profile;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property?: Property;
}

export interface PropertyBlock {
  id: string;
  property_id: string;
  blocked_date: string;
  source: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  booking_id: string;
  property_id: string;
  traveler_id: string;
  host_id: string;
  last_message_at: string;
  created_at: string;
  property?: Property;
  other_party?: Profile;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  moderation_action: string;
  moderation_score: number;
  flagged: boolean;
  created_at: string;
}

export interface CallSignal {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';
  created_at: string;
  updated_at: string;
}

export interface HillCoverClaim {
  id: string;
  booking_id: string;
  raised_by: string;
  side: 'guest' | 'host';
  category: 'road_closed' | 'stay_different' | 'damage' | 'safety' | 'other';
  description: string;
  evidence: string[];
  status: 'submitted' | 'in_review' | 'approved' | 'rejected' | 'resolved';
  resolution_amount?: number | null;
  resolution_note?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  created_at: string;
  booking?: Booking;
  claimant?: Profile;
}

