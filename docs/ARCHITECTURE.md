# Architecture

Last updated: 2026-05-29

This document describes the current technical architecture and the intended direction. It should be read before any structural code or database changes.

No secrets are stored here.

## High-Level Stack

- Frontend and API: Next.js App Router.
- UI: React client components, mostly custom CSS/classes.
- Database/Auth/RLS/RPC: Supabase.
- Transactional email: Resend.
- Hosting: Vercel.
- Source control: GitHub.
- Timezone target: Argentina / Buenos Aires (`America/Argentina/Buenos_Aires`).

## Next.js Architecture

Main app routes:

- `src/app/page.tsx`  
  Public landing and booking app.

- `src/app/admin/page.tsx`  
  Admin panel route. Renders the same `BookingApp` component in admin mode.

- `src/app/cuenta/page.tsx`  
  Client portal route.

- `src/app/reserva/[token]/page.tsx`  
  Public reservation detail and cancellation route.

API routes:

- `src/app/api/contact/route.ts`  
  Sends contact form email to the professional.

- `src/app/api/notifications/appointment-requested/route.ts`  
  Sends one-appointment request emails.

- `src/app/api/notifications/appointment-requested-group/route.ts`  
  Sends grouped request emails.

- `src/app/api/notifications/appointment-status/route.ts`  
  Sends status-change emails, such as confirmation or rejection.

- `src/app/api/notifications/appointment-cancelled/route.ts`  
  Sends cancellation emails.

Main components:

- `src/components/BookingApp.tsx`  
  Large client component containing public booking, admin panel, auth panel, service selection, contact form, and many handlers. This is functional but too large. Future work should split it into domain components.

- `src/components/ManageAppointmentPage.tsx`  
  Public reservation detail/cancellation UI for `/reserva/[token]`.

- `src/components/ClientPortalPage.tsx`  
  Authenticated client appointment portal.

Core libraries:

- `src/lib/booking.ts`  
  Shared types, fallback data, translations, date helpers, service definitions, and local appointment helpers.

- `src/lib/supabase/client.ts`  
  Supabase browser client and config check.

- `src/lib/supabase/auth.ts`  
  Admin/client auth helpers, signup, OTP verification, password recovery, Google login.

- `src/lib/supabase/bookings.ts`  
  Supabase booking functions for public, admin, and client flows.

- `src/lib/email/resend.ts`  
  Resend send helper and config check.

- `src/lib/email/templates.ts`  
  Email HTML/text template builders.

- `src/lib/email/types.ts`  
  Email payload types.

- `src/lib/notifications/appointments.ts`  
  Client-side notification API callers.

- `src/lib/notifications/server.ts`  
  Server-side validation helpers for notification routes.

## Supabase Architecture

Supabase is used for:

- Postgres database.
- Row Level Security.
- RPC functions.
- Auth users.
- Admin role mapping through `admin_users`.
- Future storage for business images.

Current important tables:

- `services`
- `weekly_availability`
- `availability_exceptions`
- `appointments`
- `admin_users`
- `appointment_requests` (introduced by pending/in-progress migration 0015)
- `auth.users` (managed by Supabase Auth)

Important views/functions:

- `get_public_busy_appointments(range_start, range_end)`
- `request_public_appointment(...)`
- `get_public_appointment(token)`
- `cancel_public_appointment(token)`
- `get_my_appointments()`
- `cancel_my_appointment(appointment_id)`
- `admin_appointment_overview`
- `request_grouped_appointments(...)` (pending/in-progress migration 0015)
- `current_auth_email()`
- `is_admin()`

## Database Tables

### `services`

Stores service offerings.

Typical fields:

- `id`
- `slug`
- `name`
- `description`
- `duration_minutes`
- `price_cents`
- `price_usd_cents`
- `currency`
- `color`
- `sort_order`
- `active`

Current services include:

- Masaje descontracturante.
- Masaje deportivo.
- Masaje descontracturante extendido.
- Servicio de rehabilitacion corporal.

### `weekly_availability`

Stores recurring weekly availability.

Used to define normal working windows, such as weekdays and configurable Saturdays.

### `availability_exceptions`

Stores blocks/exceptions such as holidays, vacation, closed days, or blocked time ranges.

Admin can create blocks. Public busy slots include these exceptions.

### `appointments`

Stores individual appointment requests and bookings.

Important fields include:

- `id`
- `public_token`
- `request_id` (pending/in-progress grouped request support)
- `service_id`
- `starts_at`
- `ends_at`
- `patient_name`
- `patient_email`
- `patient_phone`
- `patient_language`
- `status`
- `notes`
- `created_at`
- `updated_at`

Important statuses:

- `pending_approval`
- `confirmed`
- `declined`
- `cancelled`
- `completed`

### `admin_users`

Maps Supabase Auth users to admin access.

The app checks whether the current authenticated user exists in this table before showing admin functions.

### `appointment_requests`

Introduced by pending/in-progress migration 0015.

Purpose:

- Group multiple `appointments` under one client request.
- Support clients requesting several appointments for a month in one flow.
- Allow shared request code/public token for grouped communication.

Status:

- Migration file exists locally.
- It needs verification, tracking, and deployment confirmation.

## Migration Overview

Migrations live under `supabase/migrations`.

Current known migrations:

- `0001_initial_booking_schema.sql`  
  Initial services, availability, appointments, status enum, and RLS setup.

- `0002_seed_services_and_public_busy_slots.sql`  
  Seeds services and exposes public busy slots.

- `0003_restrict_admin_access.sql`  
  Adds admin users and admin-only policies.

- `0004_appointment_data_quality.sql`  
  Adds data-quality checks.

- `0005_seed_service_prices.sql`  
  Updates services, ARS/USD prices, and rehabilitation service.

- `0006_admin_blocks.sql`  
  Adds admin block policies and public busy block logic.

- `0007_public_appointment_cancellation.sql`  
  Adds public token reservation access/cancellation.

- `0008_public_appointment_request_rpc.sql`  
  Adds public appointment request RPC.

- `0009_client_appointment_portal.sql`  
  Adds client appointment portal functions.

- `0010_booking_indexes_and_admin_views.sql`  
  Adds indexes and admin overview view.

- `0011_function_grants_and_rls_tuning.sql`  
  Tightens grants and RLS behavior.

- `0012_booking_integrity_and_client_rls.sql`  
  Adds booking integrity, overlap protection, and client RLS improvements.

- `0013_appointments_policy_consolidation.sql`  
  Consolidates appointment read/update policies.

- `0014_auth_email_policy_helper.sql`  
  Adds auth email helper for RLS.

- `0015_grouped_appointment_requests.sql`  
  Adds grouped appointment request support. Pending verification and deployment status should be checked before use.

Rollback helper:

- `supabase/queries/rollback_0015_grouped_appointment_requests.sql`

## RLS Overview

Core principle:

- Public users should not have broad insert/update access to appointment tables.
- Public writes should go through narrowly scoped RPC functions.
- Admin reads/writes should require Supabase Auth and membership in `admin_users`.
- Client reads should match the authenticated email through helper functions.
- Service role keys must never be exposed to the browser.

Important public functions:

- `request_public_appointment(...)`
- `get_public_appointment(token)`
- `cancel_public_appointment(token)`
- `get_public_busy_appointments(...)`

Important authenticated client functions:

- `get_my_appointments()`
- `cancel_my_appointment(appointment_id)`

Important admin protections:

- `is_admin()`
- `admin_users`
- Admin RLS policies.

## Authentication Flow

### Admin Authentication

1. Admin opens `/admin`.
2. App shows login screen if no valid session.
3. Admin signs in with Supabase Auth email/password.
4. App checks `admin_users`.
5. If user is admin, admin dashboard loads.
6. If not admin, app should deny admin access with a generic safe message.

### Client Authentication

Client auth is in progress.

Intended flow:

1. Client opens `/cuenta` or clicks login.
2. Client can register with first name, last name, email, password.
3. Client receives verification code.
4. Client enters code in the UI.
5. Client is redirected to `/cuenta`.
6. Client sees pending, confirmed, cancelled, and completed appointments.
7. Client can cancel allowed appointments.

Current limitation:

- Supabase may send default branded confirmation links unless custom SMTP/templates/OTP flow are fully configured.

### Google OAuth

Current code calls Google OAuth through Supabase and intends to redirect to `/cuenta`.

External configuration needed:

- Enable Google provider in Supabase.
- Configure Google Cloud OAuth client.
- Add Supabase callback URL to Google OAuth redirect URIs.
- Configure Supabase site URL and redirect URLs.

The user noticed Google OAuth previously returned to `/admin#`. This must be verified and fixed before relying on client Google login.

## Booking Flow

Public booking flow:

1. User visits public landing page.
2. User chooses language and currency.
3. User chooses modality/location.
4. User chooses service.
5. User chooses day and time.
6. User enters patient details.
7. User submits request.
8. Client-side calls `requestRemoteAppointment` or `requestRemoteAppointmentGroup`.
9. Supabase RPC validates and inserts appointment(s).
10. Appointment starts as `pending_approval`.
11. Pending appointment becomes busy.
12. Client-side calls notification API.
13. Server verifies appointment/request token.
14. Resend sends emails.
15. UI shows success modal with request code and details.

Busy logic:

- `pending_approval` and `confirmed` appointments block slots.
- `declined` and `cancelled` appointments should not block slots.
- Admin blocks from `availability_exceptions` block slots.

## Admin Flow

Admin route:

- `/admin`

Admin sections:

- Panel.
- Agenda.
- Solicitudes.
- Bloquear Dias.
- Servicios.
- Equipo.
- Clientes.
- Ingresos.
- Perfil.

Important admin actions:

- Load appointments.
- View daily agenda.
- Confirm appointment.
- Reject appointment.
- Block day/time range.
- Log out.

Current admin limitations:

- Services management is not complete.
- Income dashboard is not complete.
- Profile/business settings are not complete.
- Team management is placeholder/future.

## Notification Flow

Notification routes are server-side API routes.

Request email flow:

1. Public booking creates appointment.
2. Client sends notification request to `/api/notifications/appointment-requested`.
3. Server verifies appointment token/request token with Supabase.
4. Server sends professional email.
5. Server sends client email.

Grouped request email flow:

1. Public booking creates grouped appointments through grouped RPC.
2. Client sends notification request to `/api/notifications/appointment-requested-group`.
3. Server verifies grouped request.
4. Server sends grouped email payloads.

Status-change email flow:

1. Admin confirms/rejects.
2. Client calls `/api/notifications/appointment-status`.
3. Server verifies appointment state.
4. Server sends appropriate email.

Cancellation email flow:

1. Client/professional cancels through public token or client portal.
2. Client calls `/api/notifications/appointment-cancelled`.
3. Server verifies cancellation state.
4. Server sends cancellation email to professional and client.

Security principle:

- Notification APIs must not send arbitrary email based only on client-provided addresses.
- They must re-load and verify the appointment/request from Supabase.

## Email Flow

Email provider:

- Resend.

Environment variables:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `THERAPIST_EMAIL`

Email files:

- `src/lib/email/resend.ts`
- `src/lib/email/templates.ts`
- `src/lib/email/types.ts`

Known email requirements:

- For production, use a verified custom domain in Resend.
- Add DNS records required by Resend.
- Avoid using `onboarding@resend.dev` for real clients.
- Auth emails from Supabase require custom SMTP/templates if the app should hide Supabase branding.

## Vercel Deployment Flow

Source:

- GitHub repository connected to Vercel.

Production URL:

- `https://massage-therapist-tau.vercel.app/`

Expected deployment flow:

1. Code committed to GitHub.
2. Vercel builds from GitHub.
3. Vercel injects environment variables.
4. App runs with production Supabase and Resend config.

Important:

- Changing Vercel environment variables requires redeploy.
- Do not overwrite env vars blindly.
- Check Production and Preview scopes.
- Do not deploy production without explicit confirmation.

## Resend Integration

Current app uses the Resend SDK through `src/lib/email/resend.ts`.

If Resend is not configured:

- Email helper returns skipped/failed status.
- UI should use generic language and not expose internal tool names.

If Resend is configured but sender domain is not verified:

- Emails to arbitrary recipients may fail.
- Emails to verified/test recipients may work.

Production requirement:

- Verified sending domain.
- SPF/DKIM records.
- Prefer DMARC.
- Branded `EMAIL_FROM`.

## Tenant Strategy

Current state:

- Single-tenant, implicitly Maria Mikhailova.
- Services, copy, landing, and admin are mostly specific to this business.

Future multi-tenant target:

- Add `businesses`.
- Add `business_members`.
- Add `business_locations`.
- Add `business_services` or tenant-scoped `services`.
- Add `tenant_id` / `business_id` to:
  - services
  - weekly availability
  - availability exceptions
  - appointments
  - appointment requests
  - clients
  - payments
  - revenue entries
  - chatbot configuration
  - landing configuration
- Add business slug and custom-domain mapping.
- RLS must scope every tenant table by authenticated membership or public business slug.

Future white-label strategy:

- Main platform domain for onboarding.
- Optional custom domain per business.
- First white-label example planned around Maria's domain.

Do not start a multi-tenant migration without:

- Database backup.
- Migration plan.
- Rollback plan.
- Test data.
- RLS review.
- Explicit user confirmation.

