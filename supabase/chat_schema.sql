-- ============================================================================
-- HILT CHAT, MODERATION & IN-APP CALL SIGNALLING
-- Run in Supabase SQL Editor after app_schema_and_seed.sql
-- No phone numbers are stored here. Calls are signalled in-app only.
-- ============================================================================

-- 1. CONVERSATIONS (one per booking between traveler and host)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade not null unique,
  property_id uuid references public.properties(id) on delete cascade not null,
  traveler_id uuid references public.profiles(id) on delete cascade not null,
  host_id uuid references public.profiles(id) on delete cascade not null,
  last_message_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- 2. MESSAGES (Wayzyy-moderated; blocked text is never stored)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  moderation_action text default 'allow' not null,
  moderation_score real default 0 not null,
  flagged boolean default false not null,
  created_at timestamptz default now() not null
);
create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at);
create index if not exists idx_messages_flagged on public.messages (flagged) where flagged = true;

-- 3. CALL SIGNALS (ephemeral in-app call setup; no phone numbers)
create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  caller_id uuid references public.profiles(id) on delete cascade not null,
  callee_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'ringing' not null, -- ringing | accepted | declined | ended | missed
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
create index if not exists idx_call_signals_conversation on public.call_signals (conversation_id, created_at);

-- 4. RLS (same open-client model as the rest of the Hilt schema)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.call_signals enable row level security;

drop policy if exists "Allow public read conversations" on public.conversations;
create policy "Allow public read conversations" on public.conversations for select using (true);
drop policy if exists "Allow public insert conversations" on public.conversations;
create policy "Allow public insert conversations" on public.conversations for insert with check (true);
drop policy if exists "Allow public update conversations" on public.conversations;
create policy "Allow public update conversations" on public.conversations for update using (true);

drop policy if exists "Allow public read messages" on public.messages;
create policy "Allow public read messages" on public.messages for select using (true);
drop policy if exists "Allow public insert messages" on public.messages;
create policy "Allow public insert messages" on public.messages for insert with check (true);

drop policy if exists "Allow public read call_signals" on public.call_signals;
create policy "Allow public read call_signals" on public.call_signals for select using (true);
drop policy if exists "Allow public insert call_signals" on public.call_signals;
create policy "Allow public insert call_signals" on public.call_signals for insert with check (true);
drop policy if exists "Allow public update call_signals" on public.call_signals;
create policy "Allow public update call_signals" on public.call_signals for update using (true);
