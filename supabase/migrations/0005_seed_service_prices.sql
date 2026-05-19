alter table public.services
  add column if not exists price_usd_cents integer;

insert into public.services (
  slug,
  duration_minutes,
  price_cents,
  price_usd_cents,
  currency,
  title,
  description
)
values
  (
    'therapeutic-60',
    60,
    5500000,
    4000,
    'ARS',
    '{"es":"Masaje descontracturante","en":"Deep tissue massage","ru":"Глубокий расслабляющий массаж"}'::jsonb,
    '{"es":"Para dolor muscular, tension cervical, espalda y recuperacion general.","en":"For muscle pain, neck tension, back care, and general recovery.","ru":"Для мышечной боли, напряжения в шее, спины и восстановления."}'::jsonb
  ),
  (
    'sports-90',
    90,
    6500000,
    4500,
    'ARS',
    '{"es":"Masaje deportivo","en":"Sports massage","ru":"Спортивный массаж"}'::jsonb,
    '{"es":"Ideal para deportistas, cargas de entrenamiento y movilidad.","en":"Ideal for athletes, training load, and mobility work.","ru":"Подходит спортсменам, при нагрузках и для работы с подвижностью."}'::jsonb
  ),
  (
    'deep-recovery-120',
    120,
    9000000,
    6500,
    'ARS',
    '{"es":"Masaje descontracturante extendido","en":"Extended deep tissue massage","ru":"Расширенный глубокий массаж"}'::jsonb,
    '{"es":"Sesion extendida para abordaje completo y trabajo por zonas.","en":"Extended session for a complete treatment and focused body areas.","ru":"Расширенный сеанс для комплексной работы и отдельных зон."}'::jsonb
  ),
  (
    'body-rehabilitation',
    60,
    null,
    null,
    'ARS',
    '{"es":"Servicio de rehabilitacion corporal","en":"Body rehabilitation service","ru":"Телесная реабилитация"}'::jsonb,
    '{"es":"Abordaje personalizado para recuperar movilidad, aliviar molestias y acompanar procesos de rehabilitacion.","en":"Personalized support to restore mobility, ease discomfort, and support rehabilitation processes.","ru":"Индивидуальный подход для восстановления подвижности, снятия дискомфорта и поддержки реабилитации."}'::jsonb
  )
on conflict (slug) do update set
  duration_minutes = excluded.duration_minutes,
  price_cents = excluded.price_cents,
  price_usd_cents = excluded.price_usd_cents,
  currency = excluded.currency,
  title = excluded.title,
  description = excluded.description,
  is_active = true;
