begin;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  currency text not null default 'EUR',
  travelers_count integer not null default 1,
  visibility text not null default 'private',
  share_token text unique,
  edit_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_name_not_empty check (length(btrim(name)) > 0),
  constraint trips_slug_not_empty check (length(btrim(slug)) > 0),
  constraint trips_travelers_count_positive check (travelers_count > 0),
  constraint trips_currency_allowed check (currency in ('EUR', 'BRL', 'USD', 'GBP')),
  constraint trips_visibility_allowed check (visibility in ('private', 'unlisted', 'public'))
);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  position integer not null,
  place_name text not null,
  country text,
  region text,
  formatted_address text,
  latitude double precision not null,
  longitude double precision not null,
  nightly_cost numeric(12,2) not null default 0,
  nights integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_stops_place_name_not_empty check (length(btrim(place_name)) > 0),
  constraint trip_stops_position_nonnegative check (position >= 0),
  constraint trip_stops_nightly_cost_nonnegative check (nightly_cost >= 0),
  constraint trip_stops_nights_nonnegative check (nights >= 0),
  constraint trip_stops_latitude_valid check (latitude between -90 and 90),
  constraint trip_stops_longitude_valid check (longitude between -180 and 180),
  constraint trip_stops_trip_position_unique
    unique (trip_id, position) deferrable initially immediate
);

create table public.trip_route_cache (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stops_hash text not null,
  route_geometry jsonb not null,
  route_distance_meters numeric,
  route_provider text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_route_cache_trip_hash_unique unique (trip_id, stops_hash),
  constraint trip_route_cache_distance_nonnegative
    check (route_distance_meters is null or route_distance_meters >= 0)
);

create index trips_slug_idx on public.trips (slug);
create index trips_share_token_idx on public.trips (share_token);
create index trip_stops_trip_id_idx on public.trip_stops (trip_id);
create index trip_stops_trip_position_idx on public.trip_stops (trip_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

create trigger trip_stops_set_updated_at
before update on public.trip_stops
for each row execute function public.set_updated_at();

create trigger trip_route_cache_set_updated_at
before update on public.trip_route_cache
for each row execute function public.set_updated_at();

alter table public.trips enable row level security;
alter table public.trip_stops enable row level security;
alter table public.trip_route_cache enable row level security;

revoke all on table public.trips from anon, authenticated;
revoke all on table public.trip_stops from anon, authenticated;
revoke all on table public.trip_route_cache from anon, authenticated;

create or replace function public.reorder_trip_stops(
  p_trip_id uuid,
  p_stop_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  expected_count integer;
begin
  set constraints trip_stops_trip_position_unique deferred;

  select count(*) into expected_count
  from public.trip_stops
  where trip_id = p_trip_id;

  if expected_count <> coalesce(array_length(p_stop_ids, 1), 0)
    or exists (
      select 1
      from unnest(p_stop_ids) as requested(id)
      left join public.trip_stops as stop
        on stop.id = requested.id and stop.trip_id = p_trip_id
      where stop.id is null
    )
  then
    raise exception 'stop set does not match trip';
  end if;

  update public.trip_stops as stop
  set position = requested_position.position
  from unnest(p_stop_ids) with ordinality as requested(id, ordinality)
  cross join lateral (select (requested.ordinality - 1)::integer as position) as requested_position
  where stop.id = requested.id and stop.trip_id = p_trip_id;
end;
$$;

revoke all on function public.reorder_trip_stops(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_trip_stops(uuid, uuid[]) to service_role;

commit;
