-- Tighten function permissions and tune a small RLS policy.
-- Postgres grants EXECUTE on functions to PUBLIC by default, so we revoke
-- broad access first and then grant only the roles that need each function.

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.get_my_appointments() from public, anon;
grant execute on function public.get_my_appointments() to authenticated;

revoke execute on function public.cancel_my_appointment(uuid) from public, anon;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;

revoke execute on function public.get_public_busy_appointments(timestamptz, timestamptz) from public;
grant execute on function public.get_public_busy_appointments(timestamptz, timestamptz)
  to anon, authenticated;

revoke execute on function public.get_public_appointment(uuid) from public;
grant execute on function public.get_public_appointment(uuid)
  to anon, authenticated;

revoke execute on function public.cancel_public_appointment(uuid) from public;
grant execute on function public.cancel_public_appointment(uuid)
  to anon, authenticated;

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

drop policy if exists "Admins can read own admin record" on public.admin_users;
create policy "Admins can read own admin record"
  on public.admin_users for select
  using (user_id = (select auth.uid()));
