-- Consolidate appointment policies so the planner evaluates fewer policies
-- per query while preserving admin and client access rules.

drop policy if exists "Admins can read appointments" on public.appointments;
drop policy if exists "Admins can update appointments" on public.appointments;
drop policy if exists "Clients can read own appointments" on public.appointments;
drop policy if exists "Clients can cancel own future appointments" on public.appointments;

create policy "Appointments read access"
  on public.appointments for select
  to authenticated
  using (
    public.is_admin()
    or lower(patient_email) = (select lower(coalesce(auth.jwt() ->> 'email', '')))
  );

create policy "Appointments update access"
  on public.appointments for update
  to authenticated
  using (
    public.is_admin()
    or (
      lower(patient_email) = (select lower(coalesce(auth.jwt() ->> 'email', '')))
      and status in ('pending_approval', 'confirmed')
      and starts_at > now()
    )
  )
  with check (
    public.is_admin()
    or (
      lower(patient_email) = (select lower(coalesce(auth.jwt() ->> 'email', '')))
      and status = 'cancelled'
    )
  );
