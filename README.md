# Massage Therapist Booking App

Web app for online appointment requests for a massage therapist specializing in therapeutic and sports massage.

The MVP lets patients request an available appointment without contacting the therapist directly. Requests are saved as `pending_approval`, and the therapist can confirm or decline them from a protected admin panel.

## Main Features

- Patient booking form with service, date, time, name, email, phone, and notes.
- Appointment pre-approval workflow.
- Admin panel protected with Supabase Auth.
- Supabase database with row-level security.
- Email notifications through Resend.
- Multilingual interface: Spanish, English, and Russian.
- Argentina timezone configuration.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Supabase
- Resend
- Vercel

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` at the project root using `.env.example` as a guide:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=...
THERAPIST_EMAIL=...
```

Run the local development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Supabase Setup

Run the SQL files in this order from Supabase SQL Editor:

1. `supabase/migrations/0001_initial_booking_schema.sql`
2. `supabase/migrations/0002_seed_services_and_public_busy_slots.sql`
3. `supabase/migrations/0003_restrict_admin_access.sql`
4. `supabase/migrations/0004_appointment_data_quality.sql`

More details are in `docs/supabase-setup.md`.

## Email Setup

Email delivery uses Resend from server-side API routes.

More details are in `docs/email-setup.md`.

## Deployment

The recommended deployment target is Vercel because it connects directly to GitHub and supports Next.js environment variables.

Deployment instructions are in `docs/deployment.md`.
