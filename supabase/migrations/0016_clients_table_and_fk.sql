-- Real clients table with FK to appointments.
-- A trigger on appointments automatically creates or updates client records
-- on every new booking, so existing RPCs need no changes.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists clients_email_key on public.clients (lower(email));

alter table public.clients enable row level security;

create policy "Admins can manage clients"
  on public.clients for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Link appointments to clients.
alter table public.appointments
  add column if not exists client_id uuid references public.clients(id) on delete set null;

create index if not exists appointments_client_id_idx
  on public.appointments (client_id);

-- Trigger function: find or create client on every appointment insert.
-- Runs BEFORE INSERT so it can set client_id on the new row.
create or replace function public.sync_appointment_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  if new.patient_email is null or trim(new.patient_email) = '' then
    return new;
  end if;

  select id into v_client_id
  from public.clients
  where lower(email) = lower(trim(new.patient_email));

  if found then
    update public.clients
    set
      name = case
        when trim(new.patient_name) <> '' then trim(new.patient_name)
        else name
      end,
      phone = case
        when trim(coalesce(new.patient_phone, '')) <> '' then nullif(trim(new.patient_phone), '')
        else phone
      end,
      updated_at = now()
    where id = v_client_id;
  else
    insert into public.clients (email, name, phone)
    values (
      lower(trim(new.patient_email)),
      trim(new.patient_name),
      nullif(trim(new.patient_phone), '')
    )
    returning id into v_client_id;
  end if;

  new.client_id := v_client_id;
  return new;
end;
$$;

create trigger sync_appointment_client
  before insert on public.appointments
  for each row
  execute function public.sync_appointment_client();

-- Backfill: create client records from existing appointments.
-- Uses the earliest appointment per email as the source of truth for name/phone.
insert into public.clients (email, name, phone, created_at)
select distinct on (lower(patient_email))
  lower(patient_email),
  patient_name,
  patient_phone,
  created_at
from public.appointments
where patient_email is not null
  and trim(patient_email) <> ''
order by lower(patient_email), created_at asc
on conflict do nothing;

-- Backfill: link existing appointments to their client records.
update public.appointments a
set client_id = c.id
from public.clients c
where lower(a.patient_email) = c.email
  and a.client_id is null;

-- Admin RPC: update a client record.
create or replace function public.update_client(
  p_id uuid,
  p_name text,
  p_phone text,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  update public.clients
  set
    name = trim(p_name),
    phone = nullif(trim(p_phone), ''),
    notes = nullif(trim(p_notes), ''),
    updated_at = now()
  where id = p_id;
end;
$$;

revoke execute on function public.update_client(uuid, text, text, text) from public;
grant execute on function public.update_client(uuid, text, text, text) to authenticated;

-- Admin RPC: delete a client (appointments keep the record via set null).
create or replace function public.delete_client(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  delete from public.clients where id = p_id;
end;
$$;

revoke execute on function public.delete_client(uuid) from public;
grant execute on function public.delete_client(uuid) to authenticated;
