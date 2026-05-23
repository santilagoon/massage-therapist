-- Strengthen booking integrity and reduce SECURITY DEFINER surface area.

drop policy if exists "Public can request appointments" on public.appointments;

drop policy if exists "Clients can read own appointments" on public.appointments;
create policy "Clients can read own appointments"
  on public.appointments for select
  to authenticated
  using (
    lower(patient_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

drop policy if exists "Clients can cancel own future appointments" on public.appointments;
create policy "Clients can cancel own future appointments"
  on public.appointments for update
  to authenticated
  using (
    lower(patient_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and status in ('pending_approval', 'confirmed')
    and starts_at > now()
  )
  with check (
    lower(patient_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    and status = 'cancelled'
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_no_active_overlap'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_no_active_overlap
      exclude using gist (
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('pending_approval', 'confirmed'));
  end if;
end;
$$;

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
security invoker
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
security invoker
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

create or replace function public.request_public_appointment(
  appointment_service_id uuid,
  appointment_starts_at timestamptz,
  appointment_ends_at timestamptz,
  appointment_patient_name text,
  appointment_patient_email text,
  appointment_patient_phone text,
  appointment_patient_language text,
  appointment_notes text
)
returns table (
  id uuid,
  public_token uuid,
  service_id uuid,
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
  if appointment_starts_at >= appointment_ends_at then
    raise exception 'Invalid appointment time range.';
  end if;

  if appointment_starts_at <= now() then
    raise exception 'Appointment must be in the future.';
  end if;

  if appointment_patient_language not in ('es', 'en', 'ru') then
    raise exception 'Invalid patient language.';
  end if;

  if not exists (
    select 1
    from public.services
    where services.id = appointment_service_id
      and services.is_active = true
  ) then
    raise exception 'Invalid service.';
  end if;

  if exists (
    select 1
    from public.appointments
    where appointments.status in ('pending_approval', 'confirmed')
      and appointments.starts_at < appointment_ends_at
      and appointments.ends_at > appointment_starts_at
  ) or exists (
    select 1
    from public.availability_exceptions
    where availability_exceptions.is_available = false
      and availability_exceptions.starts_at < appointment_ends_at
      and availability_exceptions.ends_at > appointment_starts_at
  ) then
    raise exception 'Appointment time is unavailable.';
  end if;

  return query
  insert into public.appointments (
    service_id,
    starts_at,
    ends_at,
    patient_name,
    patient_email,
    patient_phone,
    patient_language,
    notes,
    status
  )
  values (
    appointment_service_id,
    appointment_starts_at,
    appointment_ends_at,
    trim(appointment_patient_name),
    lower(trim(appointment_patient_email)),
    nullif(trim(appointment_patient_phone), ''),
    appointment_patient_language,
    nullif(trim(appointment_notes), ''),
    'pending_approval'
  )
  returning
    appointments.id,
    appointments.public_token,
    appointments.service_id,
    appointments.starts_at,
    appointments.ends_at,
    appointments.patient_name,
    appointments.patient_email,
    appointments.patient_phone,
    appointments.patient_language,
    appointments.notes,
    appointments.status,
    appointments.created_at;
end;
$$;

revoke execute on function public.get_my_appointments() from public, anon;
grant execute on function public.get_my_appointments() to authenticated;

revoke execute on function public.cancel_my_appointment(uuid) from public, anon;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;

revoke execute on function public.request_public_appointment(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.request_public_appointment(
  uuid,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;
