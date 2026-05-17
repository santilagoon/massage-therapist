create type appointment_status as enum (
  'pending_approval',
  'confirmed',
  'declined',
  'cancelled',
  'completed'
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer,
  currency text not null default 'ARS',
  is_active boolean not null default true,
  title jsonb not null,
  description jsonb not null,
  created_at timestamptz not null default now()
);

create table public.weekly_availability (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  patient_name text not null,
  patient_email text not null,
  patient_phone text,
  patient_language text not null default 'es' check (patient_language in ('es', 'en', 'ru')),
  notes text,
  status appointment_status not null default 'pending_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create index appointments_time_idx on public.appointments (starts_at, ends_at);
create index appointments_status_idx on public.appointments (status);

alter table public.services enable row level security;
alter table public.weekly_availability enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.appointments enable row level security;

create policy "Public can read active services"
  on public.services for select
  using (is_active = true);

create policy "Public can request appointments"
  on public.appointments for insert
  with check (status = 'pending_approval');

create policy "Admin full access to appointments"
  on public.appointments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

insert into public.weekly_availability (weekday, starts_at, ends_at)
values
  (1, '09:00', '19:00'),
  (2, '09:00', '19:00'),
  (3, '09:00', '19:00'),
  (4, '09:00', '19:00'),
  (5, '09:00', '19:00');
