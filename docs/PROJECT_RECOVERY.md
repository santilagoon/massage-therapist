# Project Recovery - Maria Mikhailova Booking App

Last updated: 2026-05-23

This file is the recovery memory for the project. Use it when opening a new chat, onboarding a collaborator, restoring context after closing Codex, or checking what has already been decided.

Do not store passwords, API keys, Supabase service-role keys, Resend keys, Google client secrets, or other private tokens in this file.

## Project Summary

This is a custom appointment booking web app for Maria Mikhailova, a therapeutic massage professional in Argentina.

The public goal is simple: a patient can request a massage appointment online without contacting Maria directly through WhatsApp, Telegram, or phone.

The business rule is that appointments are not instantly confirmed. A patient submits a request, the slot becomes unavailable, and Maria later confirms, rejects, or cancels it from the admin panel.

## Main URLs

- GitHub repository: `https://github.com/santilagoon/massage-therapist`
- Production app: `https://massage-therapist-tau.vercel.app/`
- Admin panel: `https://massage-therapist-tau.vercel.app/admin`
- Client portal: `https://massage-therapist-tau.vercel.app/cuenta`

## Local Project Path

Current local folder:

```txt
/Users/santiagohernanlaguna/Documents/Codex/booking-app
```

Use this folder for future local commands and references. Older generated folder names should be ignored.

## Tech Stack

- Frontend and app routes: Next.js App Router
- UI: React, TypeScript, CSS/Tailwind v4 style setup
- Database and Auth: Supabase
- Transactional email: Resend
- Deployment: Vercel connected to GitHub
- Timezone expectation: `America/Argentina/Buenos_Aires`

## Current Implemented Flows

### Public Booking

- Public landing page for Maria Mikhailova.
- Hero section with Maria's session photo.
- Spanish/English/Russian language selector.
- ARS/USD currency selector.
- Service cards with price, duration, and descriptions.
- First step asks modality of attention:
  - `A domicilio`
  - `Zapiola`
  - another professional location option
- At-home modality collects address fields.
- Patient phone is required.
- Patient notes are optional.
- Request button shows a clear success modal after creation.

### Appointment Status Model

Current important statuses:

- `pending_approval`: request created, waiting for Maria.
- `confirmed`: Maria accepted the appointment.
- `rejected`: Maria rejected the request.
- `cancelled`: appointment was cancelled.

Busy-slot behavior:

- `pending_approval` and `confirmed` block the selected time slot.
- `cancelled` and `rejected` free the slot again.

### Public Appointment Request

Public appointment creation uses Supabase RPC instead of direct browser insert:

- Function: `public.request_public_appointment`
- Local migration: `supabase/migrations/0008_public_appointment_request_rpc.sql`

Reason: Supabase Row Level Security blocks unsafe anonymous inserts, so the public flow must go through a controlled function.

### Emails

Emails are sent from server-side API routes using Resend.

Routes:

- `POST /api/notifications/appointment-requested`
- `POST /api/notifications/appointment-status`
- `POST /api/notifications/appointment-cancelled`

Current email behavior:

- Patient submits a request.
- Maria receives a new-request email.
- Patient receives a request-received email.
- If the appointment is cancelled, both Maria and the patient receive cancellation emails.
- Emails include a public reservation link/token where the appointment can be opened.

Important Resend note:

- `onboarding@resend.dev` works for test sender behavior.
- For real patient delivery at scale, configure a verified domain in Resend.

### Public Reservation Page

Route:

- `/reserva/[token]`

Purpose:

- Open appointment details from email.
- Show current status.
- Allow cancellation when allowed.
- After cancellation, the selected slot becomes available again.

### Admin Panel

Route:

- `/admin`

Implemented sections:

- Panel
- Agenda
- Solicitudes
- Bloquear Dias
- Servicios
- Equipo
- Clientes
- Ingresos
- Perfil

Admin panel behavior:

- Requires Supabase Auth.
- Real admin users must also exist in `public.admin_users`.
- Normal client users must not stay in `/admin`.
- If a client signs in with Google and lands on `/admin#`, the app redirects them to `/cuenta`.
- Admin can confirm, reject, or cancel appointments from the panel.
- Admin KPIs have been simplified to selected-day metrics:
  - Confirmados
  - Por confirmar
  - Total del dia

### Client Portal

Route:

- `/cuenta`

Purpose:

- Future home for client self-service.
- Shows client appointments tied to authenticated email.
- Active appointments and history are separated.
- Client can cancel eligible pending or confirmed appointments.
- Cancelled appointments remain visible as history.

### Login and Registration

Current direction:

- Public booking should not require login.
- Client login/register is for later self-service: history, cancellations, repeat bookings.
- Google login has been configured through Supabase Auth / Google Cloud.
- Email/password registration currently relies on Supabase Auth email behavior.

Desired next behavior:

- Replace Supabase-branded email links with a cleaner code-based verification flow.
- First-time email validation should use a temporary code.
- Add:
  - resend code
  - use different email
  - forgot password
  - Google login
  - better recovery screens

Important branding note:

- Supabase default emails show `Supabase Auth` and Supabase URLs unless custom SMTP/email templates or a custom auth domain strategy is configured.
- For professional production branding, use a verified domain and custom auth/email templates.

## Current Database/Migration Files

Run migrations in order when setting up a new Supabase project.

Current migration files:

1. `supabase/migrations/0001_initial_booking_schema.sql`
2. `supabase/migrations/0002_seed_services_and_public_busy_slots.sql`
3. `supabase/migrations/0003_restrict_admin_access.sql`
4. `supabase/migrations/0004_appointment_data_quality.sql`
5. `supabase/migrations/0005_seed_service_prices.sql`
6. `supabase/migrations/0006_admin_blocks.sql`
7. `supabase/migrations/0007_public_appointment_cancellation.sql`
8. `supabase/migrations/0008_public_appointment_request_rpc.sql`
9. `supabase/migrations/0009_client_appointment_portal.sql`
10. `supabase/migrations/0010_booking_indexes_and_admin_views.sql`
11. `supabase/migrations/0011_function_grants_and_rls_tuning.sql`
12. `supabase/migrations/0012_booking_integrity_and_client_rls.sql`
13. `supabase/migrations/0013_appointments_policy_consolidation.sql`
14. `supabase/migrations/0014_auth_email_policy_helper.sql`

Important helper query files:

- `supabase/queries/admin_appointment_queries.sql`
- `supabase/queries/find_invalid_appointment_rows.sql`

Supabase SQL Editor tabs can be closed if their contents are already in these files. The source of truth should be the repo, not open browser tabs.

## Important Supabase Concepts

### RLS

Row Level Security is enabled to protect patient data.

Public users should not directly read private appointment details. Public reads should be limited to:

- available services
- busy slot windows
- token-based reservation pages

Authenticated users can read appointments if:

- they are admins, or
- the appointment email matches their authenticated email.

### Admin Users

An authenticated Supabase user is not automatically an admin.

The user must also be inserted into `public.admin_users`.

Example shape:

```sql
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where email = 'admin@example.com'
on conflict (user_id) do update set
  email = excluded.email;
```

Never store plain-text passwords in the database. Supabase Auth manages password hashing and recovery.

## Environment Variables

Local file:

- `.env.local`

Example file:

- `.env.example`

Required names:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
EMAIL_FROM
THERAPIST_EMAIL
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` is browser-visible and expected.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is browser-visible and safe only when RLS is configured correctly.
- `RESEND_API_KEY` must stay private.
- `EMAIL_FROM` is the visible email sender.
- `THERAPIST_EMAIL` is where Maria/admin notifications are delivered.
- Never add Supabase service-role keys to `NEXT_PUBLIC_*`.

## Local Development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open locally:

```txt
http://localhost:3000
```

Build check:

```bash
npm run build
```

Lint check:

```bash
npm run lint
```

## Deployment

Production deploy runs through Vercel.

Normal workflow:

1. Make code changes locally.
2. Run `npm run build`.
3. Commit changes.
4. Push to GitHub `main`.
5. Vercel redeploys automatically.

Vercel must have the same required environment variables as `.env.local`.

If Auth redirects break, check:

- Supabase `Authentication > URL Configuration`
- Google Cloud OAuth redirect URIs
- Vercel production domain
- Any custom domain later added

## Current Product Decisions

- The public booking flow should stay available without forcing registration.
- Patient registration is useful later for history, repeat bookings, cancellation, and profile data.
- Appointments start as pre-approved/pending, not confirmed.
- Maria keeps final control through the admin panel.
- Phone number is required.
- Notes are optional.
- Public errors should not mention Supabase, Resend, Vercel, or internal tools.
- Spanish copy should feel natural for Argentina/Latin America.
- The visual direction is black/white, clean, premium, centered, and mobile-friendly.

## Things Already Solved

- Supabase setup and RLS basics.
- Admin-only appointment access.
- Public appointment request through RPC.
- Resend emails for request and cancellation flows.
- Public cancellation token flow.
- Slot becomes available again after cancellation.
- Admin panel separated from public landing.
- Client portal route exists.
- Google login does not leave normal clients stuck in `/admin#`.
- Supabase CLI is installed and logged in locally.

## Known Remaining Work

### High Priority

- Finish client account portal after Google login.
- Make Google-authenticated clients land cleanly in `/cuenta`.
- Improve email verification flow using temporary code instead of link-only flow.
- Improve forgot-password flow and error handling.
- Finish login/register UI polish.
- Add Google Places Autocomplete for Buenos Aires at-home addresses.
- Finish admin sections:
  - Services CRUD
  - Clients
  - Ingresos
  - Perfil

### Medium Priority

- Add income dashboard:
  - daily income
  - monthly income
  - manual income entries
  - custom/manual amount for "precio a consultar"
- Allow clients to modify appointments, not only cancel.
- Add multi-appointment request flow for patients who know all monthly appointments.
- Add custom domain.
- Add verified Resend sender domain.

### Later

- FAQ bot or guided assistant on the landing page.
- Telegram/WhatsApp automation only if it clearly improves operations.
- Online payments.
- Team/professionals expansion if Maria later works with someone else.

## Useful Validation Queries

Recent appointments:

```sql
select
  id,
  public_token,
  patient_name,
  patient_email,
  patient_phone,
  starts_at,
  ends_at,
  status,
  created_at
from public.appointments
order by created_at desc
limit 20;
```

Future confirmed appointments:

```sql
select
  patient_name,
  patient_email,
  starts_at,
  ends_at,
  status
from public.appointments
where status = 'confirmed'
  and starts_at > now()
order by starts_at asc;
```

Pending requests:

```sql
select
  patient_name,
  patient_email,
  starts_at,
  ends_at,
  status,
  created_at
from public.appointments
where status = 'pending_approval'
order by starts_at asc;
```

Admin users:

```sql
select
  user_id,
  email,
  created_at
from public.admin_users
order by created_at desc;
```

## Troubleshooting Notes

If the app says the request was sent but no row exists:

- Check DevTools Network for the Supabase RPC call.
- Check for RLS errors.
- Confirm `0008_public_appointment_request_rpc.sql` was applied.
- Query recent appointments without filtering by email.

If email is not delivered:

- Check Vercel logs for `/api/notifications/appointment-requested`.
- Check Resend dashboard.
- Confirm `RESEND_API_KEY`, `EMAIL_FROM`, and `THERAPIST_EMAIL` are set in Vercel.
- Redeploy after changing Vercel environment variables.
- For arbitrary real recipients, configure a verified domain in Resend.

If Google login returns to the wrong place:

- Confirm Supabase Google provider is enabled.
- Confirm Google OAuth redirect URI includes the Supabase callback URL.
- Confirm the app code redirects clients to `/cuenta` and admins to `/admin`.

If Supabase SQL Editor tabs are messy:

- Close old tabs.
- Keep durable SQL in `supabase/migrations` or `supabase/queries`.
- Prefer applying migrations from the repo through the Supabase CLI when possible.

## How To Use This File In A Future Chat

Paste or reference this file first and say:

```txt
Use docs/PROJECT_RECOVERY.md as the source of truth and continue from the current repo state.
```

Then describe the next task.

This lets an assistant recover the project context without reading the entire original conversation.
