-- Common admin queries for the Supabase SQL editor.
-- These are read-only helpers; they do not modify patient data.

-- 1) Latest appointments, all statuses.
select
  id,
  status,
  patient_name,
  patient_email,
  patient_phone,
  service_title,
  starts_at,
  ends_at,
  service_price_cents,
  service_currency,
  created_at
from public.admin_appointment_overview
order by created_at desc
limit 50;

-- 2) Pending appointment requests, newest first.
select
  id,
  patient_name,
  patient_email,
  patient_phone,
  service_title,
  starts_at,
  ends_at,
  notes,
  created_at
from public.admin_appointment_overview
where status = 'pending_approval'
order by starts_at asc;

-- 3) Future confirmed appointments.
select
  id,
  patient_name,
  patient_email,
  patient_phone,
  service_title,
  starts_at,
  ends_at,
  notes
from public.admin_appointment_overview
where status = 'confirmed'
  and starts_at >= now()
order by starts_at asc;

-- 4) Appointment counts for one day.
-- Replace the date literal with the day you want to inspect.
select
  appointment_date,
  count(*) filter (where status = 'confirmed') as confirmed,
  count(*) filter (where status = 'pending_approval') as pending_approval,
  count(*) filter (where status = 'cancelled') as cancelled,
  count(*) filter (where status = 'declined') as declined,
  count(*) filter (where status = 'completed') as completed
from public.admin_appointment_overview
where appointment_date = date '2026-05-21'
group by appointment_date;

-- 5) Cancelled or declined appointments for history.
select
  id,
  status,
  patient_name,
  patient_email,
  service_title,
  starts_at,
  ends_at,
  updated_at
from public.admin_appointment_overview
where status in ('cancelled', 'declined')
order by updated_at desc nulls last, starts_at desc
limit 50;
