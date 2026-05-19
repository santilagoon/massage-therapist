# Supabase setup

## Environment variables

The app expects this file at the project root:

```txt
.env.local
```

Required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=Massage Booking <onboarding@resend.dev>
THERAPIST_EMAIL=therapist@example.com
```

Only use the anon public key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do not place the service role key in browser-exposed variables.

`RESEND_API_KEY`, `EMAIL_FROM`, and `THERAPIST_EMAIL` are server-side email settings. They are not exposed to the browser because they do not start with `NEXT_PUBLIC_`.

## SQL order

Run these files in Supabase SQL Editor:

1. `supabase/migrations/0001_initial_booking_schema.sql`
2. `supabase/migrations/0002_seed_services_and_public_busy_slots.sql`
3. `supabase/migrations/0003_restrict_admin_access.sql`
4. `supabase/migrations/0004_appointment_data_quality.sql`
5. `supabase/migrations/0005_seed_service_prices.sql`
6. `supabase/migrations/0006_admin_blocks.sql`

If `0004_appointment_data_quality.sql` fails because old test data violates a rule, run:

```txt
supabase/migrations/0004_find_invalid_appointment_rows.sql
```

Then either fix/delete those old rows, or re-run the updated `0004_appointment_data_quality.sql`, which uses `not valid` so the constraints protect new rows without blocking on historical test data.

The second file inserts the initial services and creates a public function that exposes only busy appointment windows, not patient data.

## Current connection behavior

- Public users can read active services.
- Public users can request appointments as `pending_approval`.
- Supabase rejects low-quality appointment data, such as invalid email, too-short names, malformed phone numbers, or one-character notes.
- Services can show ARS prices from `price_cents` and USD prices from `price_usd_cents`.
- Public users can only see busy time windows, not patient names or emails.
- The admin approval panel requires a Supabase Auth user that is also listed in `public.admin_users`.
- Only listed admins can read appointments and update their status.

## Create the therapist admin user

In Supabase:

1. Go to `Authentication`.
2. Open `Users`.
3. Click `Add user`.
4. Create an email and password for the therapist.
5. Confirm the user if Supabase asks for email confirmation.

Use that email and password in the app's `Panel` tab.

## Allow the therapist user to manage appointments

After creating the therapist in `Authentication > Users`, run this in Supabase SQL Editor.

Replace the email with the therapist's real login email:

```sql
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where email = 'therapist@example.com'
on conflict (user_id) do update set
  email = excluded.email;
```

To verify the admin user:

```sql
select
  admin_users.user_id,
  admin_users.email,
  admin_users.created_at
from public.admin_users
order by admin_users.created_at desc;
```
