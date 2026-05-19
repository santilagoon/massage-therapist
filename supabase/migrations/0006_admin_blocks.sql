drop policy if exists "Admins can read availability exceptions" on public.availability_exceptions;
drop policy if exists "Admins can insert availability exceptions" on public.availability_exceptions;
drop policy if exists "Admins can update availability exceptions" on public.availability_exceptions;
drop policy if exists "Admins can delete availability exceptions" on public.availability_exceptions;

create policy "Admins can read availability exceptions"
  on public.availability_exceptions for select
  using (public.is_admin());

create policy "Admins can insert availability exceptions"
  on public.availability_exceptions for insert
  with check (public.is_admin());

create policy "Admins can update availability exceptions"
  on public.availability_exceptions for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete availability exceptions"
  on public.availability_exceptions for delete
  using (public.is_admin());

create or replace function public.get_public_busy_appointments(
  range_start timestamptz,
  range_end timestamptz
)
returns table (
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select appointments.starts_at, appointments.ends_at
  from public.appointments
  where appointments.status in ('pending_approval', 'confirmed')
    and appointments.starts_at < range_end
    and appointments.ends_at > range_start

  union all

  select availability_exceptions.starts_at, availability_exceptions.ends_at
  from public.availability_exceptions
  where availability_exceptions.is_available = false
    and availability_exceptions.starts_at < range_end
    and availability_exceptions.ends_at > range_start
  order by starts_at;
$$;

grant execute on function public.get_public_busy_appointments(timestamptz, timestamptz)
  to anon, authenticated;
