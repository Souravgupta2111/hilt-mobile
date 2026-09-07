-- Hilt RLS lockdown: replace every permissive USING (true) / WITH CHECK (true)
-- policy with auth.uid()-scoped ownership. Public read stays ONLY where
-- anonymous browsing requires it (listings, reviews, itineraries).
-- Safe to re-run (drops by name first).

-- ============================================================
-- 0. New tables needed by locked-down flows
-- ============================================================

create table if not exists public.guest_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  traveler_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create table if not exists public.push_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'unknown',
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

alter table public.host_payouts
  add column if not exists attempt_count int not null default 0,
  add column if not exists last_error text;

create unique index if not exists host_payouts_booking_id_uidx
  on public.host_payouts (booking_id);
create unique index if not exists reviews_property_reviewer_uidx
  on public.reviews (property_id, reviewer_id);

alter table public.guest_reviews enable row level security;
alter table public.push_tokens enable row level security;

-- ============================================================
-- 1. profiles (id = auth user id; public read for marketplace display)
-- ============================================================
drop policy if exists "Allow public read access to profiles" on public.profiles;
drop policy if exists "Allow public insert to profiles" on public.profiles;
drop policy if exists "Allow public update to profiles" on public.profiles;

create policy "profiles public read"
  on public.profiles for select using (true);
create policy "profiles insert own"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
-- 2. properties
-- ============================================================
drop policy if exists "Allow public read access to properties" on public.properties;
drop policy if exists "Allow public insert to properties" on public.properties;
drop policy if exists "Allow public update to properties" on public.properties;

create policy "properties public read active or own"
  on public.properties for select
  using (is_active is true or host_id = auth.uid());
create policy "properties insert own"
  on public.properties for insert with check (host_id = auth.uid());
create policy "properties update own"
  on public.properties for update
  using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy "properties delete own"
  on public.properties for delete using (host_id = auth.uid());

-- ============================================================
-- 3. property_rooms (owner via parent property)
-- ============================================================
drop policy if exists "Allow public read access to property_rooms" on public.property_rooms;
drop policy if exists "Allow public insert to property_rooms" on public.property_rooms;

create policy "rooms public read"
  on public.property_rooms for select using (true);
create policy "rooms insert owner"
  on public.property_rooms for insert with check (
    exists (select 1 from public.properties p
            where p.id = property_id and p.host_id = auth.uid())
  );
create policy "rooms update owner"
  on public.property_rooms for update
  using (exists (select 1 from public.properties p
                 where p.id = property_id and p.host_id = auth.uid()));
create policy "rooms delete owner"
  on public.property_rooms for delete
  using (exists (select 1 from public.properties p
                 where p.id = property_id and p.host_id = auth.uid()));

-- ============================================================
-- 4. property_blocks (public read for availability search)
-- ============================================================
drop policy if exists "Allow public read blocks" on public.property_blocks;
drop policy if exists "Allow public insert blocks" on public.property_blocks;
drop policy if exists "Allow public delete blocks" on public.property_blocks;

create policy "blocks public read"
  on public.property_blocks for select using (true);
create policy "blocks write owner"
  on public.property_blocks for insert with check (
    exists (select 1 from public.properties p
            where p.id = property_id and p.host_id = auth.uid())
  );
create policy "blocks update owner"
  on public.property_blocks for update
  using (exists (select 1 from public.properties p
                 where p.id = property_id and p.host_id = auth.uid()));
create policy "blocks delete owner"
  on public.property_blocks for delete
  using (exists (select 1 from public.properties p
                 where p.id = property_id and p.host_id = auth.uid()));

-- ============================================================
-- 5. itineraries + items (public read, author-only write)
-- ============================================================
drop policy if exists "Allow public read access to itineraries" on public.itineraries;
drop policy if exists "Allow public insert to itineraries" on public.itineraries;

create policy "itineraries public read"
  on public.itineraries for select using (true);
create policy "itineraries insert own"
  on public.itineraries for insert with check (author_id = auth.uid());
create policy "itineraries update own"
  on public.itineraries for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "itineraries delete own"
  on public.itineraries for delete using (author_id = auth.uid());

drop policy if exists "Allow public read access to itinerary_items" on public.itinerary_items;
drop policy if exists "Allow public insert to itinerary_items" on public.itinerary_items;

create policy "itinerary_items public read"
  on public.itinerary_items for select using (true);
create policy "itinerary_items insert author"
  on public.itinerary_items for insert with check (
    exists (select 1 from public.itineraries i
            where i.id = itinerary_id and i.author_id = auth.uid())
  );
create policy "itinerary_items update author"
  on public.itinerary_items for update
  using (exists (select 1 from public.itineraries i
                 where i.id = itinerary_id and i.author_id = auth.uid()));
create policy "itinerary_items delete author"
  on public.itinerary_items for delete
  using (exists (select 1 from public.itineraries i
                 where i.id = itinerary_id and i.author_id = auth.uid()));

-- ============================================================
-- 6. bookings (participants only)
-- ============================================================
drop policy if exists "Allow public read access to bookings" on public.bookings;
drop policy if exists "Allow public insert to bookings" on public.bookings;
drop policy if exists "Allow public update bookings" on public.bookings;

create policy "bookings select participant"
  on public.bookings for select
  using (
    traveler_id = auth.uid()
    or exists (select 1 from public.properties p
               where p.id = property_id and p.host_id = auth.uid())
  );
create policy "bookings insert traveler"
  on public.bookings for insert with check (traveler_id = auth.uid());
create policy "bookings update participant"
  on public.bookings for update
  using (
    traveler_id = auth.uid()
    or exists (select 1 from public.properties p
               where p.id = property_id and p.host_id = auth.uid())
  );

-- ============================================================
-- 7. host_payouts (host read-only; writes via trigger / service role)
-- ============================================================
drop policy if exists "Allow public read access to host_payouts" on public.host_payouts;
drop policy if exists "Allow public insert to host_payouts" on public.host_payouts;
drop policy if exists "Allow public update host_payouts" on public.host_payouts;

create policy "payouts select host"
  on public.host_payouts for select using (host_id = auth.uid());

-- ============================================================
-- 8. reviews (public read, reviewer-only write, one per stay)
-- ============================================================
drop policy if exists "Allow public read access to reviews" on public.reviews;
drop policy if exists "Allow public insert to reviews" on public.reviews;
drop policy if exists "Allow public update reviews" on public.reviews;

create policy "reviews public read"
  on public.reviews for select using (true);
create policy "reviews insert own"
  on public.reviews for insert with check (reviewer_id = auth.uid());
create policy "reviews update own"
  on public.reviews for update
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy "reviews delete own"
  on public.reviews for delete using (reviewer_id = auth.uid());

-- ============================================================
-- 9. guest_reviews (host reviews guest; both sides can read)
-- ============================================================
drop policy if exists "guest_reviews select participant" on public.guest_reviews;
drop policy if exists "guest_reviews insert host" on public.guest_reviews;

create policy "guest_reviews select participant"
  on public.guest_reviews for select
  using (host_id = auth.uid() or traveler_id = auth.uid());
create policy "guest_reviews insert host"
  on public.guest_reviews for insert with check (host_id = auth.uid());

-- ============================================================
-- 10. wishlists (owner only)
-- ============================================================
drop policy if exists "Allow public read wishlists" on public.wishlists;
drop policy if exists "Allow public insert wishlists" on public.wishlists;
drop policy if exists "Allow public delete wishlists" on public.wishlists;

create policy "wishlists owner all"
  on public.wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 11. conversations (participants only)
-- ============================================================
drop policy if exists "Allow public read conversations" on public.conversations;
drop policy if exists "Allow public insert conversations" on public.conversations;
drop policy if exists "Allow public update conversations" on public.conversations;

create policy "conversations select participant"
  on public.conversations for select
  using (traveler_id = auth.uid() or host_id = auth.uid());
create policy "conversations insert participant"
  on public.conversations for insert
  with check (traveler_id = auth.uid() or host_id = auth.uid());
create policy "conversations update participant"
  on public.conversations for update
  using (traveler_id = auth.uid() or host_id = auth.uid());

-- ============================================================
-- 12. messages (conversation participants; hosts can moderate)
-- ============================================================
drop policy if exists "Allow public read messages" on public.messages;
drop policy if exists "Allow public insert messages" on public.messages;
drop policy if exists "Allow public delete messages" on public.messages;

create policy "messages select participant"
  on public.messages for select
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id
                 and (c.traveler_id = auth.uid() or c.host_id = auth.uid())));
create policy "messages insert participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id
                and (c.traveler_id = auth.uid() or c.host_id = auth.uid()))
  );
create policy "messages update sender or host"
  on public.messages for update
  using (
    sender_id = auth.uid()
    or exists (select 1 from public.conversations c
               where c.id = conversation_id and c.host_id = auth.uid())
  );
create policy "messages delete sender or host"
  on public.messages for delete
  using (
    sender_id = auth.uid()
    or exists (select 1 from public.conversations c
               where c.id = conversation_id and c.host_id = auth.uid())
  );

-- ============================================================
-- 13. call_signals (participants only)
-- ============================================================
drop policy if exists "Allow public read call_signals" on public.call_signals;
drop policy if exists "Allow public insert call_signals" on public.call_signals;
drop policy if exists "Allow public update call_signals" on public.call_signals;

create policy "calls select participant"
  on public.call_signals for select
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id
                 and (c.traveler_id = auth.uid() or c.host_id = auth.uid())));
create policy "calls insert caller"
  on public.call_signals for insert
  with check (
    caller_id = auth.uid()
    and exists (select 1 from public.conversations c
                where c.id = conversation_id
                and (c.traveler_id = auth.uid() or c.host_id = auth.uid()))
  );
create policy "calls update participant"
  on public.call_signals for update
  using (exists (select 1 from public.conversations c
                 where c.id = conversation_id
                 and (c.traveler_id = auth.uid() or c.host_id = auth.uid())));

-- ============================================================
-- 14. push_tokens (owner only)
-- ============================================================
drop policy if exists "push_tokens owner all" on public.push_tokens;
create policy "push_tokens owner all"
  on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 15. Server-side helpers (bypass RLS where the app needs
--     aggregate/public data participants can't see)
-- ============================================================

-- Availability ranges any guest (even logged out) may see.
create or replace function public.booked_ranges_for_property(p_property_id uuid)
returns table (check_in date, check_out date)
language sql stable security definer set search_path = public as $$
  select check_in, check_out from public.bookings
  where property_id = p_property_id
    and status in ('pending', 'confirmed', 'completed');
$$;
grant execute on function public.booked_ranges_for_property(uuid) to anon, authenticated;

-- Batch variant for search-result availability filtering.
create or replace function public.booked_ranges_for_properties(p_property_ids uuid[])
returns table (property_id uuid, check_in date, check_out date)
language sql stable security definer set search_path = public as $$
  select property_id, check_in, check_out from public.bookings
  where property_id = any(p_property_ids)
    and status in ('pending', 'confirmed', 'completed');
$$;
grant execute on function public.booked_ranges_for_properties(uuid[]) to anon, authenticated;

-- Payout row creation moves server-side so travelers never write payouts.
create or replace function public.create_payout_for_booking()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_host_id uuid;
  v_upi text;
begin
  select p.host_id, h.upi_vpa into v_host_id, v_upi
  from public.properties p
  join public.profiles h on h.id = p.host_id
  where p.id = NEW.property_id;
  if v_host_id is null then
    return NEW;
  end if;
  insert into public.host_payouts
    (booking_id, host_id, gross_amount, platform_fee, net_payout,
     payout_destination, payout_status, scheduled_payout_date)
  values
    (NEW.id, v_host_id, NEW.subtotal, NEW.platform_fee,
     NEW.subtotal - NEW.platform_fee, coalesce(v_upi, ''),
     'scheduled', now() + interval '24 hours')
  on conflict (booking_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists trg_create_payout on public.bookings;
create trigger trg_create_payout
  after insert on public.bookings
  for each row execute function public.create_payout_for_booking();

-- Realtime for chat/calls/booking updates.
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.call_signals;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null;
end $$;
