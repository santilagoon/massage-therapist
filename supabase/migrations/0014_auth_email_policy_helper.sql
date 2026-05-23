-- Helper used by RLS policies so auth.jwt() is evaluated once per statement.

create or replace function public.current_auth_email()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

revoke execute on function public.current_auth_email() from public, anon;
grant execute on function public.current_auth_email() to authenticated;

drop policy if exists "Appointments read access" on public.appointments;
drop policy if exists "Appointments update access" on public.appointments;

create policy "Appointments read access"
  on public.appointments for select
  to authenticated
  using (
    public.is_admin()
    or lower(patient_email) = (select public.current_auth_email())
  );

create policy "Appointments update access"
  on public.appointments for update
  to authenticated
  using (
    public.is_admin()
    or (
      lower(patient_email) = (select public.current_auth_email())
      and status in ('pending_approval', 'confirmed')
      and starts_at > now()
    )
  )
  with check (
    public.is_admin()
    or (
      lower(patient_email) = (select public.current_auth_email())
      and status = 'cancelled'
    )
  );
