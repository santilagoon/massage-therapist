create or replace function public.get_my_appointments()
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
declare
  requester_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or requester_email = '' then
    raise exception 'Authentication required.';
  end if;

  return query
  select
    appointments.id,
    appointments.public_token,
    appointments.service_id,
    coalesce(services.title ->> appointments.patient_language, services.title ->> 'es') as service_title,
    coalesce(services.description ->> appointments.patient_language, services.description ->> 'es') as service_description,
    services.duration_minutes,
    services.price_cents,
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
  where lower(appointments.patient_email) = requester_email
  order by appointments.starts_at desc;
end;
$$;

create or replace function public.cancel_my_appointment(appointment_id uuid)
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
declare
  requester_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or requester_email = '' then
    raise exception 'Authentication required.';
  end if;

  update public.appointments
  set status = 'cancelled',
      updated_at = now()
  where appointments.id = appointment_id
    and lower(appointments.patient_email) = requester_email
    and appointments.status in ('pending_approval', 'confirmed')
    and appointments.starts_at > now();

  return query
  select *
  from public.get_my_appointments() as appointment
  where appointment.id = appointment_id;
end;
$$;

grant execute on function public.get_my_appointments() to authenticated;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;
