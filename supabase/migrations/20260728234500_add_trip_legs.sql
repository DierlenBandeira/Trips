begin;

alter table public.trip_stops
  add constraint trip_stops_trip_id_id_unique unique (trip_id, id);

create table public.trip_legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_stop_id uuid not null references public.trip_stops(id) on delete cascade,
  to_stop_id uuid not null references public.trip_stops(id) on delete cascade,
  transport_mode text not null default 'road',
  transport_cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_legs_distinct_stops check (from_stop_id <> to_stop_id),
  constraint trip_legs_mode_allowed check (transport_mode in ('road', 'flight')),
  constraint trip_legs_cost_nonnegative check (transport_cost >= 0),
  constraint trip_legs_from_stop_same_trip
    foreign key (trip_id, from_stop_id)
    references public.trip_stops(trip_id, id) on delete cascade,
  constraint trip_legs_to_stop_same_trip
    foreign key (trip_id, to_stop_id)
    references public.trip_stops(trip_id, id) on delete cascade,
  constraint trip_legs_pair_unique unique (trip_id, from_stop_id, to_stop_id)
);

create index trip_legs_trip_id_idx on public.trip_legs (trip_id);

create trigger trip_legs_set_updated_at
before update on public.trip_legs
for each row execute function public.set_updated_at();

alter table public.trip_legs enable row level security;
alter table public.trip_legs force row level security;
revoke all on table public.trip_legs from anon, authenticated;

commit;
