begin;

revoke create on schema public from public;

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

alter table public.trips force row level security;
alter table public.trip_stops force row level security;
alter table public.trip_route_cache force row level security;

grant execute on function public.reorder_trip_stops(uuid, uuid[])
  to service_role;

commit;
