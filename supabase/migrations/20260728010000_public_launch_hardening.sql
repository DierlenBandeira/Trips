begin;

alter table public.trips
  add constraint trips_slug_unique unique (slug);

drop index public.trips_slug_idx;

alter table public.trip_stops
  add constraint trip_stops_position_within_limit
  check (position between 0 and 49);

commit;
