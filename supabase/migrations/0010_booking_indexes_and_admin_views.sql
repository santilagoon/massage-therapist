-- Booking read performance and query-editor helpers.
-- These indexes support the main access patterns in the app:
-- client portal by email, admin filters by status/date, public availability,
-- service history, and blocked time ranges.

create index if not exists appointments_patient_email_lower_idx
  on public.appointments (lower(patient_email));

create index if not exists appointments_status_starts_at_idx
  on public.appointments (status, starts_at);

create index if not exists appointments_future_active_time_idx
  on public.appointments (starts_at, ends_at)
  where status in ('pending_approval', 'confirmed');

create index if not exists appointments_service_starts_at_idx
  on public.appointments (service_id, starts_at);

create index if not exists appointments_created_at_desc_idx
  on public.appointments (created_at desc);

create index if not exists availability_exceptions_blocked_range_idx
  on public.availability_exceptions (starts_at, ends_at)
  where is_available = false;

create index if not exists weekly_availability_active_weekday_idx
  on public.weekly_availability (weekday, starts_at, ends_at)
  where is_active = true;

create index if not exists services_active_duration_idx
  on public.services (is_active, duration_minutes);

create or replace view public.admin_appointment_overview
with (security_invoker = true)
as
select
  appointments.id,
  appointments.public_token,
  appointments.status,
  appointments.starts_at,
  appointments.ends_at,
  appointments.starts_at::date as appointment_date,
  appointments.created_at,
  appointments.updated_at,
  appointments.patient_name,
  appointments.patient_email,
  appointments.patient_phone,
  appointments.patient_language,
  appointments.notes,
  appointments.service_id,
  services.slug as service_slug,
  coalesce(services.title ->> appointments.patient_language, services.title ->> 'es') as service_title,
  coalesce(services.description ->> appointments.patient_language, services.description ->> 'es') as service_description,
  services.duration_minutes as service_duration_minutes,
  services.price_cents as service_price_cents,
  services.currency as service_currency
from public.appointments
join public.services on services.id = appointments.service_id;

revoke all on public.admin_appointment_overview from anon, authenticated;
grant select on public.admin_appointment_overview to authenticated;

comment on view public.admin_appointment_overview is
  'Admin-friendly appointment view. Uses security_invoker so appointments RLS still protects patient data.';
