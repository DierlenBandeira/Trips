begin;

delete from public.trips
where name = 'Security smoke test'
  and slug like 'security-smoke-%';

commit;
