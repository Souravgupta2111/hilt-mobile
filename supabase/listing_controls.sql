-- Listing controls hosts expect: per-listing cancellation policy, house
-- rules, check-in/out times, cleaning fee, min/max nights, instant-book vs
-- request-to-book. Idempotent (safe to re-run).

alter table public.properties
  add column if not exists cancellation_policy text not null default 'moderate',
  add column if not exists house_rules text not null default '',
  add column if not exists check_in_time text not null default '12:00',
  add column if not exists check_out_time text not null default '11:00',
  add column if not exists cleaning_fee integer not null default 0,
  add column if not exists min_nights integer not null default 1,
  add column if not exists max_nights integer not null default 30,
  add column if not exists instant_book boolean not null default true;

alter table public.bookings
  add column if not exists cleaning_fee integer not null default 0;
