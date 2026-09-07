-- ============================================================================
-- HILT EXTENDED SCHEMA: wishlist, host availability blocks, photo storage
-- Run in Supabase SQL Editor AFTER app_schema_and_seed.sql and chat_schema.sql
-- ============================================================================

-- 1. WISHLIST (persisted hearts)
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  property_id uuid references public.properties(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_id, property_id)
);
create index if not exists idx_wishlists_user on public.wishlists (user_id);

-- 2. HOST AVAILABILITY BLOCKS (manual + iCal-imported blackout dates)
create table if not exists public.property_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade not null,
  blocked_date date not null,
  source text default 'manual' not null, -- manual | airbnb | mmt
  created_at timestamptz default now() not null,
  unique (property_id, blocked_date)
);
create index if not exists idx_blocks_property on public.property_blocks (property_id, blocked_date);

-- 3. IDEMPOTENCY for webhook booking confirmation
create unique index if not exists idx_bookings_order_id
  on public.bookings (razorpay_order_id);

-- 4. PHOTO STORAGE (public read, authenticated write)
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read property images" on storage.objects;
create policy "Public read property images" on storage.objects
  for select using (bucket_id = 'property-images');
drop policy if exists "Authenticated upload property images" on storage.objects;
create policy "Authenticated upload property images" on storage.objects
  for insert with check (bucket_id = 'property-images');
drop policy if exists "Authenticated delete own property images" on storage.objects;
create policy "Authenticated delete own property images" on storage.objects
  for delete using (bucket_id = 'property-images');

-- 5. RLS (same open-client model as the rest of the Hilt schema)
alter table public.wishlists enable row level security;
alter table public.property_blocks enable row level security;

drop policy if exists "Allow public read wishlists" on public.wishlists;
create policy "Allow public read wishlists" on public.wishlists for select using (true);
drop policy if exists "Allow public insert wishlists" on public.wishlists;
create policy "Allow public insert wishlists" on public.wishlists for insert with check (true);
drop policy if exists "Allow public delete wishlists" on public.wishlists;
create policy "Allow public delete wishlists" on public.wishlists for delete using (true);

drop policy if exists "Allow public read blocks" on public.property_blocks;
create policy "Allow public read blocks" on public.property_blocks for select using (true);
drop policy if exists "Allow public insert blocks" on public.property_blocks;
create policy "Allow public insert blocks" on public.property_blocks for insert with check (true);
drop policy if exists "Allow public delete blocks" on public.property_blocks;
create policy "Allow public delete blocks" on public.property_blocks for delete using (true);

-- Bookings need owner updates for cancel / modify flows
drop policy if exists "Allow public update bookings" on public.bookings;
create policy "Allow public update bookings" on public.bookings for update using (true);

-- Host payouts need settlement updates
drop policy if exists "Allow public update host_payouts" on public.host_payouts;
create policy "Allow public update host_payouts" on public.host_payouts for update using (true);

-- Messages need removal for the safety-review queue
drop policy if exists "Allow public delete messages" on public.messages;
create policy "Allow public delete messages" on public.messages for delete using (true);

-- Reviews need updates for aggregate consistency (recompute path)
drop policy if exists "Allow public update reviews" on public.reviews;
create policy "Allow public update reviews" on public.reviews for update using (true);
