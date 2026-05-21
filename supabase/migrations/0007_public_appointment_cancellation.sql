alter table public.appointments
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists appointments_public_token_idx
  on public.appointments (public_token);

create or replace function public.get_public_appointment(appointment_token uuid)
returns table (
  id uuid,
  public_token uuid,
  service_id uuid,
  service_title text,
  service_description text,
  service_duration_minutes integer,
  service_price_cents integer,
  starts_at timestamptz,
  ends_at timestamptz,
  patient_name text,
  patient_email text,
  patient_phone text,
  patient_language text,
  notes text,
  status appointment_status,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    appointments.id,
    appointments.public_token,
    appointments.service_id,
    coalesce(services.title ->> appointments.patient_language, services.title ->> 'es') as service_title,
    coalesce(services.description ->> appointments.patient_language, services.description ->> 'es') as service_description,
    services.duration_minutes as service_duration_minutes,
    services.price_cents as service_price_cents,
    appointments.starts_at,
    appointments.ends_at,
    appointments.patient_name,
    appointments.patient_email,
    appointments.patient_phone,
    appointments.patient_language,
    appointments.notes,
    appointments.status,
    appointments.created_at
  from public.appointments
  join public.services on services.id = appointments.service_id
  where appointments.public_token = appointment_token
  limit 1;
$$;

create or replace function public.cancel_public_appointment(appointment_token uuid)
returns table (
  id uuid,
  public_token uuid,
  service_id uuid,
  service_title text,
  service_description text,
  service_duration_minutes integer,
  service_price_cents integer,
  starts_at timestamptz,
  ends_at timestamptz,
  patient_name text,
  patient_email text,
  patient_phone text,
  patient_language text,
  notes text,
  status appointment_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appointments
  set status = 'cancelled',
      updated_at = now()
  where appointments.public_token = appointment_token
    and appointments.status in ('pending_approval', 'confirmed')
    and appointments.starts_at > now();

  return query
  select *
  from public.get_public_appointment(appointment_token);
end;
$$;

grant execute on function public.get_public_appointment(uuid) to anon, authenticated;
grant execute on function public.cancel_public_appointment(uuid) to anon, authenticated;
