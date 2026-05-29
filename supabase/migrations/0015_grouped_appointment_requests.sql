-- Group monthly booking requests while preserving individual appointment approval.

create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  public_token uuid not null unique default gen_random_uuid(),
  patient_email text not null,
  requested_starts_at timestamptz[] not null,
  unavailable_starts_at timestamptz[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (cardinality(requested_starts_at) between 2 and 12)
);

alter table public.appointment_requests enable row level security;

alter table public.appointments
  add column if not exists request_id uuid references public.appointment_requests(id) on delete set null;

create index if not exists appointments_request_id_idx
  on public.appointments (request_id);

drop policy if exists "Admins can read appointment requests" on public.appointment_requests;
create policy "Admins can read appointment requests"
  on public.appointment_requests for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Clients can read own appointment requests" on public.appointment_requests;
create policy "Clients can read own appointment requests"
  on public.appointment_requests for select
  to authenticated
  using (lower(patient_email) = (select public.current_auth_email()));

create or replace function public.request_grouped_appointments(
  appointment_service_id uuid,
  appointment_starts_at timestamptz[],
  appointment_ends_at timestamptz[],
  appointment_patient_name text,
  appointment_patient_email text,
  appointment_patient_phone text,
  appointment_patient_language text,
  appointment_notes text
)
returns table (
  request_id uuid,
  request_public_token uuid,
  requested_start_at timestamptz,
  requested_end_at timestamptz,
  saved boolean,
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
declare
  new_request public.appointment_requests%rowtype;
  new_appointment public.appointments%rowtype;
  unavailable timestamptz[] := '{}';
  slot_index integer;
  slot_start timestamptz;
  slot_end timestamptz;
begin
  if cardinality(appointment_starts_at) is null
    or cardinality(appointment_starts_at) not between 2 and 12
    or cardinality(appointment_starts_at) <> cardinality(appointment_ends_at) then
    raise exception 'Select between 2 and 12 valid appointment slots.';
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

  if (
    select count(distinct selected_start)
    from unnest(appointment_starts_at) as selected_start
  ) <> cardinality(appointment_starts_at) then
    raise exception 'Duplicate appointment slots are not allowed.';
  end if;

  for slot_index in 1..cardinality(appointment_starts_at) loop
    slot_start := appointment_starts_at[slot_index];
    slot_end := appointment_ends_at[slot_index];

    if slot_start >= slot_end or slot_start <= now() then
      raise exception 'Invalid appointment time range.';
    end if;
  end loop;

  insert into public.appointment_requests (
    patient_email,
    requested_starts_at
  )
  values (
    lower(trim(appointment_patient_email)),
    appointment_starts_at
  )
  returning * into new_request;

  for slot_index in 1..cardinality(appointment_starts_at) loop
    slot_start := appointment_starts_at[slot_index];
    slot_end := appointment_ends_at[slot_index];
    new_appointment := null;

    if exists (
      select 1
      from public.appointments
      where appointments.status in ('pending_approval', 'confirmed')
        and appointments.starts_at < slot_end
        and appointments.ends_at > slot_start
    ) or exists (
      select 1
      from public.availability_exceptions
      where availability_exceptions.is_available = false
        and availability_exceptions.starts_at < slot_end
        and availability_exceptions.ends_at > slot_start
    ) then
      unavailable := array_append(unavailable, slot_start);
    else
      begin
        insert into public.appointments (
          request_id,
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
          new_request.id,
          appointment_service_id,
          slot_start,
          slot_end,
          trim(appointment_patient_name),
          lower(trim(appointment_patient_email)),
          nullif(trim(appointment_patient_phone), ''),
          appointment_patient_language,
          nullif(trim(appointment_notes), ''),
          'pending_approval'
        )
        returning * into new_appointment;
      exception when exclusion_violation then
        unavailable := array_append(unavailable, slot_start);
      end;
    end if;

    return query
    select
      new_request.id,
      new_request.public_token,
      slot_start,
      slot_end,
      new_appointment.id is not null,
      new_appointment.id,
      new_appointment.public_token,
      new_appointment.service_id,
      new_appointment.starts_at,
      new_appointment.ends_at,
      new_appointment.patient_name,
      new_appointment.patient_email,
      new_appointment.patient_phone,
      new_appointment.patient_language,
      new_appointment.notes,
      new_appointment.status,
      new_appointment.created_at;
  end loop;

  update public.appointment_requests
  set unavailable_starts_at = unavailable
  where appointment_requests.id = new_request.id;
end;
$$;

create or replace function public.get_public_appointment_request(request_token uuid)
returns table (
  request_id uuid,
  request_public_token uuid,
  unavailable_starts_at timestamptz[],
  id uuid,
  public_token uuid,
  service_title text,
  starts_at timestamptz,
  ends_at timestamptz,
  patient_name text,
  patient_email text,
  patient_phone text,
  patient_language text,
  notes text,
  status appointment_status
)
language sql
security definer
set search_path = public
stable
as $$
  select
    appointment_requests.id,
    appointment_requests.public_token,
    appointment_requests.unavailable_starts_at,
    appointments.id,
    appointments.public_token,
    coalesce(services.title ->> appointments.patient_language, services.title ->> 'es'),
    appointments.starts_at,
    appointments.ends_at,
    appointments.patient_name,
    appointments.patient_email,
    appointments.patient_phone,
    appointments.patient_language,
    appointments.notes,
    appointments.status
  from public.appointment_requests
  join public.appointments
    on appointments.request_id = appointment_requests.id
  join public.services
    on services.id = appointments.service_id
  where appointment_requests.public_token = request_token
  order by appointments.starts_at;
$$;

revoke execute on function public.request_grouped_appointments(
  uuid,
  timestamptz[],
  timestamptz[],
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.request_grouped_appointments(
  uuid,
  timestamptz[],
  timestamptz[],
  text,
  text,
  text,
  text,
  text
) to anon, authenticated;

revoke execute on function public.get_public_appointment_request(uuid) from public;
grant execute on function public.get_public_appointment_request(uuid) to anon, authenticated;
