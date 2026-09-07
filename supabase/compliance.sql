-- Hilt compliance layer: GST invoicing, TDS 194-O, penny-drop verification,
-- HillCover claims. Idempotent. Run AFTER rls_lockdown.sql.
--
-- NORMS (verified 2026-09, CA must sign off final classification):
--  * GST: 18% on Hilt's 2% facilitation fee. SAC 998552 (hotel booking by
--    agent) is the best-fit code for a homestay marketplace commission.
--    Decision point for CA: facilitator model (Hilt charges fee, host is
--    supplier) vs section 9(5) deemed supplier — this schema assumes the
--    facilitator model, which is how the app is built.
--  * TDS 194-O: 0.1% of gross payout (Finance (No. 2) Act 2024, effective
--    1 Oct 2024; was 1%). Nil for resident individual/HUF with PAN when
--    platform gross <= Rs 5,00,000/FY (194-O(2)). 5% when PAN missing
--    (s.206AA). Quarterly returns, resident participants only.
--  * Penny-drop: RazorpayX POST /v1/fund_accounts/validations
--    (validation_type: pennydrop; bank or VPA) returns registered_name +
--    account_status. Live mode only, RazorpayX account + IP allowlist.

-- 1. Host tax identity + payout verification
alter table public.profiles
  add column if not exists pan_number text,
  add column if not exists gstin text,
  add column if not exists is_payout_verified boolean not null default false,
  add column if not exists payout_verified_name text,
  add column if not exists payout_verified_at timestamptz;

-- 2. TDS ledger on payouts (computed at settlement, not creation)
alter table public.host_payouts
  add column if not exists tds_amount integer not null default 0,
  add column if not exists tds_rate real not null default 0;

-- 3. GST invoice number on bookings (series HILT/<FY>/<seq>)
alter table public.bookings
  add column if not exists invoice_number text;
create unique index if not exists bookings_invoice_number_uidx
  on public.bookings (invoice_number) where invoice_number is not null;

create table if not exists public.invoice_counters (
  fy text primary key,          -- e.g. '2627' (FY 2026-27)
  last_number integer not null default 0
);

-- 4. HillCover claims
create table if not exists public.hillcover_claims (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  raised_by uuid not null references public.profiles(id) on delete cascade,
  side text not null default 'guest' check (side in ('guest','host')),
  category text not null check (category in ('road_closed','stay_different','damage','safety','other')),
  description text not null,
  evidence text[] not null default '{}',
  status text not null default 'submitted'
    check (status in ('submitted','in_review','approved','rejected','resolved')),
  resolution_amount integer,
  resolution_note text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists hillcover_claims_booking on public.hillcover_claims (booking_id);
create index if not exists hillcover_claims_status on public.hillcover_claims (status) where status in ('submitted','in_review');

-- 5. RLS for new objects / columns
alter table public.invoice_counters enable row level security;
alter table public.hillcover_claims enable row level security;

drop policy if exists "invoice_counters service only" on public.invoice_counters;
create policy "invoice_counters service only"
  on public.invoice_counters for select using (false);
-- (no insert/update policy: only the service role / definer fn touches it)

drop policy if exists "claims select participant" on public.hillcover_claims;
drop policy if exists "claims insert participant" on public.hillcover_claims;
drop policy if exists "claims update admin" on public.hillcover_claims;
create policy "claims select participant or admin"
  on public.hillcover_claims for select
  using (
    raised_by = auth.uid()
    or exists (select 1 from public.bookings b
               where b.id = booking_id
               and (b.traveler_id = auth.uid()
                    or exists (select 1 from public.properties p
                               where p.id = b.property_id and p.host_id = auth.uid())))
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid() and pr.role = 'admin')
  );
create policy "claims insert participant"
  on public.hillcover_claims for insert
  with check (
    raised_by = auth.uid()
    and exists (select 1 from public.bookings b
                where b.id = booking_id
                and (b.traveler_id = auth.uid()
                     or exists (select 1 from public.properties p
                                where p.id = b.property_id and p.host_id = auth.uid())))
  );
create policy "claims update admin"
  on public.hillcover_claims for update
  using (
    exists (select 1 from public.profiles pr
            where pr.id = auth.uid() and pr.role = 'admin')
  );

-- 6. Invoice generation (definer; series HILT/<FY>/<00001>)
create or replace function public.generate_invoice_number(p_booking_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_fy text;
  v_seq int;
  v_invoice text;
begin
  select invoice_number into v_invoice from public.bookings where id = p_booking_id;
  if v_invoice is not null then return v_invoice; end if;

  -- Indian FY: Apr-Mar. '2627' = FY starting Apr 2026.
  select case when extract(month from now()) >= 4
              then to_char(now(), 'YY') || (to_char(now(), 'YY')::int + 1)::text
              else (to_char(now(), 'YY')::int - 1)::text || to_char(now(), 'YY')
         end into v_fy;

  insert into public.invoice_counters (fy, last_number) values (v_fy, 1)
  on conflict (fy) do update set last_number = public.invoice_counters.last_number + 1
  returning last_number into v_seq;

  v_invoice := 'HILT/' || v_fy || '/' || lpad(v_seq::text, 5, '0');
  update public.bookings set invoice_number = v_invoice where id = p_booking_id;
  return v_invoice;
end;
$$;
grant execute on function public.generate_invoice_number(uuid) to authenticated;

-- 7. FY gross for a host (drives the 194-O Rs 5L individual/HUF threshold)
create or replace function public.host_fy_gross(p_host_id uuid)
returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(gross_amount), 0)::bigint
  from public.host_payouts hp
  join public.bookings b on b.id = hp.booking_id
  where hp.host_id = p_host_id
    and b.status in ('confirmed','completed')
    and b.created_at >= date_trunc('year', now()) + interval '3 months' - interval '1 year'
      - (case when extract(month from now()) >= 4 then interval '0 months' else interval '0 months' end)
    and b.created_at < date_trunc('year', now())
      + (case when extract(month from now()) >= 4 then interval '3 months' else interval '15 months' end);
$$;
grant execute on function public.host_fy_gross(uuid) to authenticated;
