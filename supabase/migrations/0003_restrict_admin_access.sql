create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "Admins can read own admin record" on public.admin_users;
create policy "Admins can read own admin record"
  on public.admin_users for select
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admin full access to appointments" on public.appointments;
drop policy if exists "Admins can read appointments" on public.appointments;
drop policy if exists "Admins can update appointments" on public.appointments;

create policy "Admins can read appointments"
  on public.appointments for select
  using (public.is_admin());

create policy "Admins can update appointments"
  on public.appointments for update
  using (public.is_admin())
  with check (public.is_admin());
