alter table public.appointments
  drop constraint if exists appointments_patient_name_quality,
  add constraint appointments_patient_name_quality
    check (
      length(trim(patient_name)) between 3 and 80
      and trim(patient_name) ~ '^[[:alpha:]À-ÿА-Яа-яЁё]+([ ''-][[:alpha:]À-ÿА-Яа-яЁё]+){1,5}$'
    ) not valid;

alter table public.appointments
  drop constraint if exists appointments_patient_email_quality,
  add constraint appointments_patient_email_quality
    check (
      length(trim(patient_email)) between 6 and 120
      and trim(patient_email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ) not valid;

alter table public.appointments
  drop constraint if exists appointments_patient_phone_quality,
  add constraint appointments_patient_phone_quality
    check (
      patient_phone is null
      or trim(patient_phone) = ''
      or trim(patient_phone) ~ '^\+[0-9]{1,4} [0-9]{8,11}$'
    ) not valid;

alter table public.appointments
  drop constraint if exists appointments_notes_quality,
  add constraint appointments_notes_quality
    check (
      notes is null
      or trim(notes) = ''
      or length(trim(notes)) between 3 and 600
    ) not valid;
