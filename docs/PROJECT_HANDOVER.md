# Project Handover

Last updated: 2026-05-29

This document explains the project from zero context. A future AI agent should be able to read this file and understand what the app is, why it exists, what has been built, and what remains.

No secrets are stored here. Do not add secrets to this file.

## Project Purpose

This project is a custom online booking web application for service professionals. The first real use case is a therapeutic and sports massage professional, Maria Mikhailova, based in Argentina.

The original goal was simple:

- Let patients request appointments online.
- Avoid manual coordination by WhatsApp, Telegram, or phone.
- Let the professional approve or reject each request before the appointment becomes confirmed.
- Support Spanish, English, and Russian audiences.
- Deploy to a real production URL.

The product direction has since expanded. The app is no longer only a one-off massage website. It is becoming the first prototype of a configurable booking platform for different service businesses: massage therapists, trainers, barbers, spas, clinics, beauty professionals, and other appointment-based businesses.

## Business Goals

Primary goals:

- Reduce manual scheduling work for the professional.
- Increase conversion by giving clients a clean, mobile-friendly booking flow.
- Keep the professional in control through pre-approval instead of automatic confirmation.
- Build a reusable foundation that can become a SaaS booking platform.
- Differentiate from existing booking tools by adding AI-assisted flows, better customization, client portals, payments, and smarter admin insights.

Future platform goals:

- Multi-tenant businesses.
- Configurable landing pages.
- Dynamic branding and templates.
- White-label domains.
- Online payments.
- AI FAQ chatbot for landing pages and client portals.
- AI admin assistant connected to appointments, revenue, clients, and availability.
- Self-service onboarding so the developer does not become a manual agency for every client.

## Target Users

### Public Visitors / Patients

People who want to book a service from a professional.

They should be able to:

- View the professional landing page.
- Choose language and currency.
- Choose service modality and location.
- Choose service, day, and time.
- Enter patient details.
- Request pre-approval.
- Receive email confirmation of the request.
- Open the reservation detail page from email.
- Cancel the request or appointment if allowed.
- Eventually log in to view appointment history.

### Professional / Admin

The business owner or professional who manages appointments.

They should be able to:

- Log in securely.
- View pending requests.
- Confirm or reject requests.
- View a calendar/agenda.
- Block days or time ranges.
- View clients.
- Manage services and prices.
- View income metrics.
- Configure business data, images, social links, and landing content.
- Eventually ask an AI assistant about business performance and schedule.

### Future Platform Owner

The SaaS operator.

They should be able to:

- Onboard new businesses.
- Configure plans and billing.
- Offer white-label domains.
- Manage templates.
- Monitor usage, abuse, email deliverability, and payments.

## Current MVP Scope

The MVP is focused on appointment requests with professional approval.

In scope now:

- Public booking landing page.
- Service selection.
- Modality/location selection.
- Date and time selection.
- Patient form.
- Required phone number.
- Optional notes.
- Appointment created as `pending_approval`.
- Pending appointments block that slot so double booking is avoided.
- Confirmation modal after request.
- Email to professional.
- Email to client.
- Public reservation detail page with token.
- Public cancellation flow.
- Admin login.
- Admin panel route.
- Admin can confirm/reject.
- Admin can block days/time ranges.
- Client portal route exists.
- Google OAuth is partially configured.
- Grouped/multiple appointment request support is in progress.

Out of scope for initial MVP:

- Mandatory client registration before booking.
- Payment collection.
- Full service CRUD in admin.
- Full business onboarding.
- Full white-label multi-tenant model.
- Full AI chatbot.
- Full revenue dashboard.
- Native mobile apps.

## Current Architecture Summary

The app uses:

- Next.js App Router for frontend and API routes.
- React client components for the interactive booking/admin UI.
- Supabase for database, auth, RLS, RPC functions, and storage direction.
- Resend for transactional email.
- Vercel for hosting and deployment.
- GitHub as source control.

Current production URL:

- `https://massage-therapist-tau.vercel.app/`

Current local canonical project folder:

- `/Users/santiagohernanlaguna/Documents/Codex/booking-app`

Historical folder path:

- `/Users/santiagohernanlaguna/Documents/Codex/2026-05-11/i-would-like-to-create-a`

Important note: the historical path is a symlink to the canonical `booking-app` folder, not a separate copy. Future agents should prefer the canonical folder name.

## Completed Features

### Public Booking

- Landing page for Maria Mikhailova.
- Hero image background.
- Spanish-first copy with multilingual support structure.
- Service cards with price/currency handling.
- Service names updated:
  - Masaje descontracturante.
  - Masaje deportivo.
  - Masaje descontracturante extendido.
  - Servicio de rehabilitacion corporal.
- Modality/location selection:
  - A domicilio.
  - Zapiola.
  - Otro domicilio de atencion.
- A domicilio is intended to be preselected.
- Patient phone is required.
- Notes are optional.
- Booking success modal shows request code and booking details.
- Public booking can create real appointments through Supabase RPC.

### Booking Approval Model

- Appointments are created with `pending_approval`.
- Pending and confirmed appointments are considered busy.
- Professional/admin confirms or rejects.
- Rejected/cancelled appointments release availability.

### Email Notifications

- Resend integrated.
- Email sent to professional when a new request is created.
- Email sent to client when request is created.
- Cancellation email sent to both professional and client.
- Email routes were hardened to verify appointment/request tokens before sending.

### Public Reservation Detail / Cancellation

- Public token added to appointments.
- `/reserva/[token]` page loads appointment details.
- Client or professional can open reservation from email.
- Cancellation uses public token.
- Cancelling frees the slot.
- Cancellation state remains recorded in the database.

### Admin Area

- `/admin` route exists.
- Admin login via Supabase Auth and `admin_users`.
- Admin is separated from public landing content.
- Admin panel includes views/sections:
  - Panel.
  - Agenda.
  - Solicitudes.
  - Bloquear Dias.
  - Servicios.
  - Equipo.
  - Clientes.
  - Ingresos.
  - Perfil.
- Admin can confirm/reject appointments.
- Admin can block days/time ranges through `availability_exceptions`.
- Admin logout returns to public home.

### Client Portal

- `/cuenta` route exists.
- Client portal can load appointments for the authenticated user.
- Client can view current appointments and history.
- Client can cancel eligible appointments.
- Admin users are redirected away from client portal to `/admin`.

### Auth Work

- Admin auth exists.
- Client auth work started:
  - Email/password login.
  - Registration.
  - Verification-code UI flow.
  - Password recovery UI flow.
  - Google login integration started.
- A reusable login/auth screen skill exists in local skills and should be kept updated when auth UI changes.

### Database Safety

- RLS enabled on application tables.
- Public booking moved from direct insert to RPC to avoid unsafe public insert policies.
- Public cancellation moved to token-based RPC.
- Admin access uses `admin_users`.
- Data-quality constraints added.
- Indexes and views added for admin queries.

## Unfinished Features

High priority:

- Finish client portal after Google login.
- Ensure Google OAuth always redirects regular clients to `/cuenta`, never `/admin`.
- Replace Supabase-branded auth emails with branded OTP/code flow.
- Configure custom SMTP or email templates for auth.
- Verify production auth URL configuration.
- Verify pending migration `0015_grouped_appointment_requests.sql`.
- Finish grouped appointment requests end-to-end.
- Redesign admin panel using the new black/white minimal dashboard direction.

Medium priority:

- Google Places Autocomplete for Buenos Aires addresses.
- Service CRUD in admin.
- Price editing in admin.
- Admin business/profile editor.
- Admin can update landing copy, images, colors, services, locations, social links, and notice banners.
- Income dashboard with manual revenue entries.
- Client history and cancellation UX improvements.
- Appointment modification/rescheduling.
- Better mobile admin navigation.

Future:

- Mercado Pago payments.
- Binance payment feasibility research.
- AI FAQ chatbot.
- AI admin assistant.
- Multi-tenant onboarding.
- Subscription plans.
- White-label domains.
- SEO, metadata, indexing, ads, moderation.
- Platform templates for industries beyond massage.

## Known Limitations

- `BookingApp.tsx` is large and mixes public booking, admin panel, and auth UI in one file. Future work should split it carefully.
- Auth email branding currently depends on Supabase defaults unless custom SMTP/templates are configured.
- Google OAuth provider setup is external to code and must be verified in Supabase and Google Cloud.
- Resend arbitrary recipient delivery requires verified sender domain. Test sender is not enough for production clients.
- Admin services/income/profile sections are not complete business tools yet.
- Grouped appointment requests are partially implemented and require migration verification.
- Multi-tenant model is not implemented yet. Current app is effectively single-business.
- Public landing copy and design are still specific to Maria.
- Some local fallback/mock mode still exists for development when Supabase env vars are missing.

## Major Design Decisions

### Pre-Approval Instead of Auto-Confirmation

Appointments are not automatically confirmed. The professional should decide whether to accept a patient. This is important for trust, scheduling control, and service suitability.

### Pending Appointments Block Availability

Once a request is made, the selected slot becomes unavailable while pending approval. This avoids two people requesting the same slot at the same time.

### No Required Registration for MVP Booking

The MVP does not force clients to create accounts before requesting. This reduces friction. Client accounts are being added as an optional portal flow.

### Public Token for Reservation Management

Emails include a reservation link with a public token. The token lets the client or professional view/cancel the request without exposing internal IDs.

### Supabase RPC for Public Writes

Public booking and cancellation use RPC functions instead of broad table insert/update policies. This keeps RLS tighter and makes business rules explicit.

### Email Notification Routes Are Verified Server-Side

Client-side code can request notifications, but server routes verify the appointment/request before sending. This prevents arbitrary email sending through public API routes.

### Single-Tenant First, Multi-Tenant Later

The MVP is for one professional. The roadmap is to evolve into multi-tenant SaaS. Do not add tenant columns casually without a planned migration and data model review.

## Future Roadmap

### Phase 1: Stabilize MVP

- Finish current handover docs.
- Verify build/lint.
- Confirm all existing migrations are applied.
- Track and verify migration 0015.
- Fix remaining auth redirect and email verification flow.
- Verify production env variables.
- Verify public booking, admin approval, cancellation, and client portal.

### Phase 2: Improve Admin UX

- Redesign admin panel based on current black/white dashboard mockups.
- Split admin components from `BookingApp.tsx`.
- Improve mobile admin navigation.
- Add service management.
- Add location and schedule management.
- Add client list and appointment history.

### Phase 3: Client Accounts

- Finish client login/register/recovery.
- Branded OTP emails.
- Google OAuth.
- Client appointment history.
- Client cancellation and rescheduling.

### Phase 4: Business Configuration

- Business profile editor.
- Landing content editor.
- Social links.
- Notice banner.
- Images upload.
- Colors/theme/template selection.
- Multi-location support.

### Phase 5: Monetization

- Mercado Pago.
- Payment status in appointments.
- Manual income entries.
- Admin revenue dashboard.
- SaaS subscriptions.
- White-label plan.

### Phase 6: Platformization

- Multi-tenant schema.
- Business onboarding.
- Template system.
- White-label custom domains.
- Public business slugs.
- Admin roles/team.
- AI chatbot and AI admin assistant.

## Glossary

### Appointment

A single booking time block. Stored in `appointments`.

### Pending Approval

Appointment status used immediately after a client requests a turn. It blocks the slot but still needs professional approval.

### Confirmed

Appointment accepted by the professional.

### Declined

Appointment rejected by the professional.

### Cancelled

Appointment cancelled by the client or professional. The time slot becomes available again.

### Completed

Appointment already performed. Intended for future income/history features.

### Public Token

UUID-like token attached to an appointment so the reservation can be opened from email without exposing internal IDs.

### Grouped Appointment Request

A request containing multiple appointment slots, useful when a client knows all appointments for the month in advance. In progress through migration 0015.

### Admin User

A Supabase Auth user listed in `admin_users`, allowed to manage appointments.

### Client Portal

Authenticated client page at `/cuenta`, intended for current appointments, history, cancellations, and eventually rescheduling.

### RLS

Row Level Security in Supabase/Postgres. It restricts which rows each user or role can read/write.

### RPC

Postgres function exposed through Supabase. Used for safe public writes such as appointment creation/cancellation.

### Tenant

Future business/account in the SaaS platform. Current MVP has one implicit tenant.

