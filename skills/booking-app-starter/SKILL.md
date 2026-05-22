---
name: booking-app-starter
description: Use when building or adapting a custom appointment booking app for service professionals with Next.js, Supabase, Resend, and Vercel. Covers pending approval bookings, multilingual public reservation flows, admin panels, public token cancellation, Supabase RLS/RPC patterns, transactional email, and deployment diagnostics.
---

# Booking App Starter

Use this skill for service-booking apps where a client requests an appointment online and the professional confirms, rejects, or cancels it later.

## Default Architecture

- Next.js App Router for the public landing, booking flow, admin panel, and public reservation pages.
- Supabase for Postgres, Auth, RLS policies, and RPC functions.
- Resend for transactional emails to the client and professional.
- Vercel for deployment and environment variables.
- Default timezone for Argentina projects: `America/Argentina/Buenos_Aires`.

## Core Booking Flow

1. The client chooses modality, service, day, time, and enters patient data.
2. The app creates the appointment through a Supabase RPC, not a direct browser insert.
3. New requests start as `pending_approval`.
4. The selected slot is treated as unavailable while pending or confirmed.
5. The app sends email to the professional and to the client.
6. The professional confirms or rejects from the private admin panel.
7. A public token URL lets the client or professional open the reservation and cancel it if allowed.
8. Cancellation changes the status to `cancelled`, frees the slot, and sends cancellation emails.

## Supabase Patterns

- Prefer RPC functions such as `request_public_appointment` for public appointment creation when RLS is enabled.
- Do not insert public appointment rows directly from the browser if RLS blocks anonymous inserts.
- Keep public manage links token-based; never expose privileged IDs or service keys in the browser.
- Treat `pending_approval` and `confirmed` as busy statuses when calculating availability.
- Keep `cancelled` and `rejected` out of busy-slot calculations so the time becomes available again.
- Store secrets only in server-side environment variables. Never expose service-role keys as `NEXT_PUBLIC_*`.

## Email Patterns

- Use `RESEND_API_KEY`, `EMAIL_FROM`, and `THERAPIST_EMAIL`.
- `EMAIL_FROM` is the sender identity, for example `Massage Booking <onboarding@resend.dev>` during test mode.
- `THERAPIST_EMAIL` is where professional notifications are delivered.
- With Resend test mode, delivery to arbitrary patient emails requires a verified domain.
- Check both thrown exceptions and returned `{ error }` from the Resend SDK.
- The UI should distinguish between “appointment saved” and “email delivery failed”.

## Admin Panel

- Keep the admin panel separate from the public landing page, usually `/admin`.
- Use navigation sections such as: Panel, Agenda, Solicitudes, Bloquear Dias, Servicios, Equipo, Clientes, Ingresos, Perfil.
- In the dashboard, prefer a few selected-day KPIs over global clutter.
- Useful day KPIs: confirmed appointments, pending requests, and total appointments for the selected day.
- Put pending requests first and make confirm/reject actions available from the panel, not only from email links.
- On mobile, use a compact dropdown or menu instead of a horizontally overflowing navigation bar.

## UX Decisions

- Do not require client registration in the MVP unless the business truly needs patient history.
- When client accounts are added, include an email-code verification step after login or registration before showing private history.
- Make phone required if the professional needs it to validate or contact patients.
- Keep notes optional.
- Show a clear success modal after request creation with the request code and selected appointment details.
- Use public wording such as “solicitud enviada” or “pendiente de aprobación”; avoid exposing internal tools in errors.
- For Spanish Argentina copy, prefer natural local wording and include accents where appropriate.

## Diagnostics Checklist

- If the UI says success but no row exists in Supabase, check for local fallback logic or a failed RPC/insert.
- If DevTools shows `new row violates row-level security policy`, use or fix the public RPC/policies.
- Check Vercel logs for POST routes such as `/api/notifications/appointment-requested`.
- Check Resend dashboard for delivered or rejected emails.
- Verify Vercel env vars exist in Production and Preview, then redeploy.
- Run SQL migrations before deploying code that depends on new tables, columns, policies, or RPC functions.
- Query recent rows with `order by created_at desc` when validating production behavior.

## Future Extensions

- Google Places Autocomplete for at-home addresses in Buenos Aires.
- Client login and registration with Google/email for history and self-service changes.
- Email verification code UI for account login/registration, with resend-code and use-different-email actions.
- Service CRUD for prices, duration, currency, descriptions, and active/inactive status.
- Income dashboard with manual revenue entries for custom-priced services.
- FAQ bot or guided assistant on the landing page; start with a simple FAQ widget before adding Telegram, WhatsApp, or AI automation.
