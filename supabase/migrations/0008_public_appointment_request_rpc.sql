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
    appointment_patient_name,
    lower(trim(appointment_patient_email)),
    nullif(appointment_patient_phone, ''),
    appointment_patient_language,
    nullif(appointment_notes, ''),
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
