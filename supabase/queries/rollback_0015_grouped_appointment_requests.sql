-- Emergency rollback for 0015_grouped_appointment_requests.sql.
-- Apply only after confirming no grouped requests need to be retained.

drop function if exists public.get_public_appointment_request(uuid);
drop function if exists public.request_grouped_appointments(
  uuid,
  timestamptz[],
  timestamptz[],
  text,
  text,
  text,
  text,
  text
);

drop index if exists public.appointments_request_id_idx;
alter table public.appointments drop column if exists request_id;
drop table if exists public.appointment_requests;
