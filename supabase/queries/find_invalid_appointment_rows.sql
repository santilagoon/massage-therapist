select
  id,
  patient_name,
  patient_email,
  patient_phone,
  notes,
  created_at,
  case
    when not (
      length(trim(patient_name)) between 3 and 80
      and trim(patient_name) ~ '^[[:alpha:]À-ÿА-Яа-яЁё]+([ ''-][[:alpha:]À-ÿА-Яа-яЁё]+){1,5}$'
    ) then 'invalid_name'
    when not (
      length(trim(patient_email)) between 6 and 120
      and trim(patient_email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ) then 'invalid_email'
    when not (
      patient_phone is null
      or trim(patient_phone) = ''
      or trim(patient_phone) ~ '^\+[0-9]{1,4} [0-9]{8,11}$'
    ) then 'invalid_phone'
    when not (
      notes is null
      or trim(notes) = ''
      or length(trim(notes)) between 3 and 600
    ) then 'invalid_notes'
    else 'valid'
  end as issue
from public.appointments
where not (
  length(trim(patient_name)) between 3 and 80
  and trim(patient_name) ~ '^[[:alpha:]À-ÿА-Яа-яЁё]+([ ''-][[:alpha:]À-ÿА-Яа-яЁё]+){1,5}$'
)
or not (
  length(trim(patient_email)) between 6 and 120
  and trim(patient_email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
)
or not (
  patient_phone is null
  or trim(patient_phone) = ''
  or trim(patient_phone) ~ '^\+[0-9]{1,4} [0-9]{8,11}$'
)
or not (
  notes is null
  or trim(notes) = ''
  or length(trim(notes)) between 3 and 600
)
order by created_at desc;
