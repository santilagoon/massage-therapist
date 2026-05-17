insert into public.services (slug, duration_minutes, currency, title, description)
values
  (
    'therapeutic-60',
    60,
    'ARS',
    '{"es":"Masaje terapeutico","en":"Therapeutic massage","ru":"Терапевтический массаж"}'::jsonb,
    '{"es":"Para dolor muscular, tension cervical, espalda y recuperacion general.","en":"For muscle pain, neck tension, back care, and general recovery.","ru":"Для мышечной боли, напряжения в шее, спины и восстановления."}'::jsonb
  ),
  (
    'sports-90',
    90,
    'ARS',
    '{"es":"Masaje deportivo","en":"Sports massage","ru":"Спортивный массаж"}'::jsonb,
    '{"es":"Ideal para deportistas, cargas de entrenamiento y movilidad.","en":"Ideal for athletes, training load, and mobility work.","ru":"Подходит спортсменам, при нагрузках и для работы с подвижностью."}'::jsonb
  ),
  (
    'deep-recovery-120',
    120,
    'ARS',
    '{"es":"Recuperacion profunda","en":"Deep recovery","ru":"Глубокое восстановление"}'::jsonb,
    '{"es":"Sesion extendida para abordaje completo y trabajo por zonas.","en":"Extended session for a complete treatment and focused body areas.","ru":"Расширенный сеанс для комплексной работы и отдельных зон."}'::jsonb
  )
on conflict (slug) do update set
  duration_minutes = excluded.duration_minutes,
  currency = excluded.currency,
  title = excluded.title,
  description = excluded.description,
  is_active = true;

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
  order by appointments.starts_at;
$$;

grant execute on function public.get_public_busy_appointments(timestamptz, timestamptz)
  to anon, authenticated;
