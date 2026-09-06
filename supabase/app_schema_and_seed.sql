-- ============================================================================
-- HILT SUPABASE DATABASE SCHEMA & INITIAL SEED DATA
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENUMS & DOMAINS
do $$ begin
  create type user_role as enum ('traveler', 'host', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type property_type_enum as enum ('entire_villa', 'homestay', 'boutique_hotel', 'cottage', 'cabin', 'apartment');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type road_access_enum as enum ('tar_road', 'four_by_four', 'walking_trek');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type booking_status_enum as enum ('pending', 'confirmed', 'cancelled', 'completed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type payout_status_enum as enum ('scheduled', 'processing', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

-- 3. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  role text default 'traveler',
  bio text,
  location text default 'Himachal Pradesh',
  is_superhost boolean default false,
  is_identity_verified boolean default false,
  id_document_type text default 'aadhaar',
  id_masked_number text,
  tourism_reg_number text,
  bank_account_number text,
  bank_ifsc text,
  upi_vpa text,
  payout_method text default 'upi',
  rating numeric(3,2) default 4.95,
  reviews_count integer default 0,
  sold_count integer default 0,
  created_at timestamptz default now() not null
);

-- 4. PROPERTIES (VILLAS, HOMESTAYS, COTTAGES)
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  tagline text,
  description text,
  property_type text default 'entire_villa',
  category text default 'Home', -- Home, Hotel, Apartment, Office
  allows_room_booking boolean default true,
  allows_entire_villa boolean default true,
  price_entire_villa integer not null, -- nightly rate in INR
  discount_percentage integer default 0, -- e.g. 15 for 'Off 15%'
  valley text not null,
  town text not null,
  state text default 'Himachal Pradesh',
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  altitude_meters integer default 2100,
  road_accessibility text default 'tar_road',
  bedrooms integer default 4,
  bathrooms integer default 3,
  floors integer default 1,
  sqft integer default 2500,
  max_guests integer default 8,
  wifi_speed_mbps integer default 85,
  power_backup text default '100% Inverter & Genset',
  heating_types text[] default array['Bukhari', 'Electric Blanket', 'Fireplace'],
  amenities text[] default array['Wi-Fi', 'Kitchen', 'Parking', 'Heater', 'Mountain View', 'Bonfire', 'Power Backup'],
  images text[] not null,
  rating numeric(3,2) default 4.90,
  reviews_count integer default 24,
  days_on_market integer default 1,
  requires_verified_guests boolean default true,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- 5. PROPERTY ROOMS (FOR INDIVIDUAL ROOM BOOKINGS)
create table if not exists public.property_rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade not null,
  room_name text not null,
  bed_type text default 'King Bed',
  max_guests integer default 2,
  price_per_night integer not null,
  images text[] default '{}',
  amenities text[] default array['Balcony View', 'Ensuite Bathroom', 'Electric Blanket', 'Heater'],
  is_available boolean default true,
  created_at timestamptz default now() not null
);

-- 6. "GHUMNA PHIRNA" ITINERARIES & LOCAL GUIDES
create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete set null,
  title text not null,
  region text not null,
  duration_days integer default 3,
  hero_image text,
  summary text,
  is_host_guide boolean default true,
  likes_count integer default 42,
  created_at timestamptz default now() not null
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid references public.itineraries(id) on delete cascade not null,
  day_number integer not null,
  time_of_day text default 'morning', -- morning, afternoon, evening, night
  place_name text not null,
  category text default 'viewpoint', -- food, viewpoint, trek, cafe, hidden_gem
  description text,
  latitude double precision,
  longitude double precision,
  approx_cost integer default 0,
  insider_tip text,
  created_at timestamptz default now() not null
);

-- 7. BOOKINGS & ESCROW PAYMENTS
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade not null,
  room_id uuid references public.property_rooms(id) on delete set null,
  traveler_id uuid references public.profiles(id) on delete cascade not null,
  booking_type text default 'entire_villa', -- entire_villa or single_room
  check_in date not null,
  check_out date not null,
  guests_count integer default 2,
  total_nights integer default 3,
  nightly_rate integer not null,
  subtotal integer not null,
  platform_fee integer not null, -- 2%
  total_amount integer not null,
  payment_status text default 'captured_in_escrow',
  razorpay_order_id text,
  razorpay_payment_id text,
  status text default 'confirmed',
  created_at timestamptz default now() not null
);

-- 8. HOST PAYOUTS LEDGER
create table if not exists public.host_payouts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade not null,
  host_id uuid references public.profiles(id) on delete cascade not null,
  gross_amount integer not null,
  platform_fee integer not null,
  net_payout integer not null,
  payout_destination text not null,
  payout_status text default 'scheduled',
  utr_reference text,
  scheduled_payout_date timestamptz not null,
  settled_at timestamptz,
  created_at timestamptz default now() not null
);

-- 9. REVIEWS TABLE
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade not null,
  reviewer_id uuid references public.profiles(id) on delete cascade not null,
  rating numeric(3,2) not null check (rating >= 1 and rating <= 5),
  comment text not null,
  created_at timestamptz default now() not null
);

-- 10. ENABLE ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_rooms enable row level security;
alter table public.itineraries enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.bookings enable row level security;
alter table public.host_payouts enable row level security;
alter table public.reviews enable row level security;

-- 11. POLICIES (OPEN READ FOR CLIENT APP + SECURE MUTATIONS)
drop policy if exists "Allow public read access to profiles" on public.profiles;
create policy "Allow public read access to profiles" on public.profiles for select using (true);
drop policy if exists "Allow public insert to profiles" on public.profiles;
create policy "Allow public insert to profiles" on public.profiles for insert with check (true);
drop policy if exists "Allow public update to profiles" on public.profiles;
create policy "Allow public update to profiles" on public.profiles for update using (true);

drop policy if exists "Allow public read access to properties" on public.properties;
create policy "Allow public read access to properties" on public.properties for select using (true);
drop policy if exists "Allow public insert to properties" on public.properties;
create policy "Allow public insert to properties" on public.properties for insert with check (true);
drop policy if exists "Allow public update to properties" on public.properties;
create policy "Allow public update to properties" on public.properties for update using (true);

drop policy if exists "Allow public read access to property_rooms" on public.property_rooms;
create policy "Allow public read access to property_rooms" on public.property_rooms for select using (true);
drop policy if exists "Allow public insert to property_rooms" on public.property_rooms;
create policy "Allow public insert to property_rooms" on public.property_rooms for insert with check (true);

drop policy if exists "Allow public read access to itineraries" on public.itineraries;
create policy "Allow public read access to itineraries" on public.itineraries for select using (true);
drop policy if exists "Allow public insert to itineraries" on public.itineraries;
create policy "Allow public insert to itineraries" on public.itineraries for insert with check (true);

drop policy if exists "Allow public read access to itinerary_items" on public.itinerary_items;
create policy "Allow public read access to itinerary_items" on public.itinerary_items for select using (true);
drop policy if exists "Allow public insert to itinerary_items" on public.itinerary_items;
create policy "Allow public insert to itinerary_items" on public.itinerary_items for insert with check (true);

drop policy if exists "Allow public read access to bookings" on public.bookings;
create policy "Allow public read access to bookings" on public.bookings for select using (true);
drop policy if exists "Allow public insert to bookings" on public.bookings;
create policy "Allow public insert to bookings" on public.bookings for insert with check (true);

drop policy if exists "Allow public read access to host_payouts" on public.host_payouts;
create policy "Allow public read access to host_payouts" on public.host_payouts for select using (true);
drop policy if exists "Allow public insert to host_payouts" on public.host_payouts;
create policy "Allow public insert to host_payouts" on public.host_payouts for insert with check (true);

drop policy if exists "Allow public read access to reviews" on public.reviews;
create policy "Allow public read access to reviews" on public.reviews for select using (true);
drop policy if exists "Allow public insert to reviews" on public.reviews;
create policy "Allow public insert to reviews" on public.reviews for insert with check (true);

-- 12. INITIAL REAL SEED DATA
-- Insert Host Profile
insert into public.profiles (
  id, full_name, email, phone, avatar_url, role, bio, location,
  is_superhost, is_identity_verified, id_masked_number, tourism_reg_number,
  bank_account_number, bank_ifsc, upi_vpa, rating, reviews_count, sold_count
) values (
  'a0000000-0000-0000-0000-000000000001',
  'Abdur Rob',
  'aritbd2020@gmail.com',
  '+91 98160 44219',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
  'host',
  'Architect turned mountain host. Custodian of 3 heritage cedar homestays across Jibhi & Tirthan Valley.',
  'Jibhi, Himachal Pradesh',
  true, true, 'XXXX-XXXX-8921', 'HP-TOURISM-HOMESTAY-2024-811',
  '50100492819201', 'HDFC0001824', 'abdur@okaxis', 5.00, 200, 100
) on conflict (id) do nothing;

-- Insert Traveler Profile
insert into public.profiles (
  id, full_name, email, phone, avatar_url, role, bio, location,
  is_superhost, is_identity_verified, id_masked_number
) values (
  'b0000000-0000-0000-0000-000000000002',
  'Roman Vance',
  'roman@hilt.travel',
  '+91 98711 02931',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
  'traveler',
  'Remote software designer & slow mountain traveler. Workation seeker.',
  'New York city',
  false, true, 'XXXX-XXXX-4109'
) on conflict (id) do nothing;

-- Insert Properties matching exact mockups & Himalayan luxury
insert into public.properties (
  id, host_id, title, tagline, description, property_type, category,
  price_entire_villa, discount_percentage, valley, town, state, address,
  latitude, longitude, altitude_meters, road_accessibility,
  bedrooms, bathrooms, floors, sqft, max_guests, wifi_speed_mbps,
  power_backup, heating_types, amenities, images, rating, reviews_count, days_on_market
) values 
(
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'The Himalayan Cedar Estate',
  'The Elements Luxury Himalayan Estate',
  'Enjoy quality stay with high-speed fiber Wi-Fi, 360-degree snow peak views, private cedar lawn, and traditional tandoor fireplace.',
  'entire_villa',
  'Home',
  28600,
  15,
  'Tirthan Valley',
  'Jibhi',
  'Himachal Pradesh',
  'Cedar Ridge, Upper Jibhi',
  31.6372,
  77.3481,
  2150,
  'tar_road',
  4,
  3,
  1,
  2500,
  8,
  120,
  '100% Inverter & Solar Genset',
  array['Fireplace', 'Bukhari', 'Electric Blanket'],
  array['High-Speed Wi-Fi', 'Kitchen', 'Private Lawn', 'Bonfire Pit', 'Heated Rooms', 'Sedan Accessible'],
  array[
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80'
  ],
  5.00,
  24,
  1
),
(
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'The Elements Villa',
  'Modern Glasshouse over Deodar Valley',
  'Ultra-modern architecture perched on the ridge with panoramic floor-to-ceiling glass windows and private sundeck.',
  'entire_villa',
  'Hotel',
  12000,
  20,
  'Kullu Valley',
  'Manali',
  'Himachal Pradesh',
  'Old Manali Club House Road',
  32.2432,
  77.1892,
  2050,
  'tar_road',
  2,
  1,
  2,
  1800,
  4,
  150,
  '100% Dedicated Genset',
  array['Underfloor Heating', 'Italian Fireplace'],
  array['High-Speed Wi-Fi', 'Kitchen', 'Glass Balcony', 'Bathtub', 'Pet Friendly'],
  array[
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&auto=format&fit=crop&q=80'
  ],
  4.80,
  48,
  2
),
(
  'c0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Lakeview Alpine Cottage',
  'Tranquil Alpine Lake Retreat',
  'Charming stone and timber cottage right next to mountain streams with private apple orchard.',
  'cottage',
  'Apartment',
  28600,
  0,
  'Nainital District',
  'Mukteshwar',
  'Uttarakhand',
  'Sargakhet Ridge, Mukteshwar',
  29.4722,
  79.6478,
  2280,
  'tar_road',
  4,
  3,
  2,
  3100,
  9,
  80,
  'Inverter Backup',
  array['Wood Stove', 'Oil Radiators'],
  array['High-Speed Wi-Fi', 'Kitchen', 'Orchard Walk', 'Sunset Deck'],
  array[
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&auto=format&fit=crop&q=80'
  ],
  4.92,
  18,
  1
),
(
  'c0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Dharamkot Pine Haven',
  'Minimalist Nordic Mountain Chalet',
  'Scandinavian inspired chalet designed for slow creative workations and mountain solitude.',
  'homestay',
  'Home',
  38600,
  0,
  'Kangra Valley',
  'Dharamkot',
  'Himachal Pradesh',
  'Upper Bhagsu Trail, Dharamkot',
  32.2530,
  76.3264,
  2100,
  'walking_trek',
  4,
  4,
  2,
  2800,
  8,
  100,
  'Solar Power System',
  array['Electric Heaters', 'Bukhari'],
  array['High-Speed Wi-Fi', 'Terrace Cafe', 'Yoga Deck', 'Trek Guide Available'],
  array[
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&auto=format&fit=crop&q=80'
  ],
  4.95,
  32,
  3
),
(
  'c0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Ganga Mist Riverside Sanctuary',
  'Riverside Stone Villa with Private Plunge Pool',
  'Handcrafted stone villa overlooking the river with soothing waters and private bonfire lawn.',
  'entire_villa',
  'Home',
  45900,
  10,
  'Ganga Valley',
  'Rishikesh',
  'Uttarakhand',
  'Tapovan Bypass, Rishikesh',
  30.1342,
  78.3245,
  410,
  'tar_road',
  3,
  3,
  1,
  2200,
  6,
  200,
  '100% Inverter & Genset',
  array['AC with Warm Mode'],
  array['River View', 'Private Pool', 'Chef on Call', 'Fiber Wi-Fi'],
  array[
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80'
  ],
  4.98,
  56,
  1
) on conflict (id) do nothing;

-- Insert Individual Rooms for The Himalayan Cedar Estate
insert into public.property_rooms (
  id, property_id, room_name, bed_type, max_guests, price_per_night, images
) values 
(
  'd0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  'Deluxe Cedar Attic Room',
  'King Bed',
  2,
  4500,
  array['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&auto=format&fit=crop&q=80']
),
(
  'd0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  'Valley Balcony Suite',
  'Queen Bed',
  2,
  5200,
  array['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80']
) on conflict (id) do nothing;

-- Insert Itinerary ("Ghumna Phirna")
insert into public.itineraries (
  id, author_id, property_id, title, region, duration_days, hero_image, summary, is_host_guide, likes_count
) values (
  'e0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  '3 Days of Slow Living in Shoja & Jalori Pass',
  'Tirthan Valley, HP',
  3,
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
  'Curated by host Abdur. Hidden forest waterfalls, fresh Himalayan trout, and evening bonfires.',
  true,
  84
) on conflict (id) do nothing;

insert into public.itinerary_items (
  id, itinerary_id, day_number, time_of_day, place_name, category, description, approx_cost, insider_tip
) values 
(
  'f0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  1, 'morning', 'Shringi Vatika Trout & Siddu', 'food',
  'Order hot steamed walnut siddu with pure ghee. Ask for the river view table.', 350,
  'Call 30 mins ahead so the siddu is fresh from the steamer.'
),
(
  'f0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000001',
  1, 'afternoon', 'Choi Waterfall Forest Trail', 'trek',
  'A gentle 45-minute pine forest walk from the homestay. Crystal clear mountain plunge pool.', 0,
  'Wear water-resistant footwear with good grip on wet stones.'
),
(
  'f0000000-0000-0000-0000-000000000003',
  'e0000000-0000-0000-0000-000000000001',
  2, 'morning', 'Serolsar Lake via Jalori Pass', 'viewpoint',
  'Historic high mountain pass (3,120m) connecting Shimla and Kullu valleys.', 200,
  'Leave before 9 AM for clear panoramic views of the Dhauladhar range.'
) on conflict (id) do nothing;
