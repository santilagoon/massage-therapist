# CLAUDE.md

Concise handoff for future Claude Code, Codex, Cursor, ChatGPT, Gemini, or other AI-agent sessions.

## Project Overview

- Purpose: custom online booking app for service professionals. The first live use case is Maria Mikhailova, a therapeutic/sports massage professional in Argentina.
- Business goal: evolve from a custom booking site into a configurable SaaS/white-label booking platform for massage therapists, trainers, barbers, spas, clinics, and similar businesses.
- Production URL: `https://massage-therapist-tau.vercel.app/`
- Admin URL: `https://massage-therapist-tau.vercel.app/admin`
- Client portal URL: `https://massage-therapist-tau.vercel.app/cuenta`
- Canonical local path: `/Users/santiagohernanlaguna/Documents/Codex/booking-app`
- Tech stack: Next.js App Router, React client components, Supabase Postgres/Auth/RLS/RPC, Resend, Vercel, GitHub.
- Timezone: `America/Argentina/Buenos_Aires`.

Read the larger handoff docs before broad changes:

- `docs/CURRENT_STATUS.md`
- `docs/PROJECT_HANDOVER.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_WORKFLOW.md`
- `docs/AI_COLLABORATION_PROTOCOL.md`
- `docs/DEPLOYMENT_AND_OPERATIONS.md`

## Current State

Completed fixes and features:

- Public booking creates pending appointments through Supabase RPC instead of unsafe public table inserts.
- Pending and confirmed appointments block availability.
- Public token reservation pages allow cancellation and release the slot again.
- Client and professional receive request/cancellation/status emails through Resend.
- Notification API routes were hardened with server-side appointment verification helpers.
- Admin panel is separated at `/admin`; admin access requires Supabase Auth plus `admin_users`.
- Admin can view appointments, confirm/reject requests, and block days/times.
- Runtime handler bugs such as missing `submitContact` and `handleCreateBlock` were fixed.
- User-facing errors should not expose provider/tool names.
- Public landing page has Maria branding, service cards, language/currency selectors, modality selection, required phone, optional notes, and confirmation modal.
- Client portal initial UI exists at `/cuenta`.
- Google OAuth has been started but must be verified end to end.

Current email architecture:

- Transactional email is sent with Resend from Next.js API routes.
- Important routes:
  - `src/app/api/contact/route.ts`
  - `src/app/api/notifications/appointment-requested/route.ts`
  - `src/app/api/notifications/appointment-requested-group/route.ts`
  - `src/app/api/notifications/appointment-status/route.ts`
  - `src/app/api/notifications/appointment-cancelled/route.ts`
- Important helpers:
  - `src/lib/email/resend.ts`
  - `src/lib/email/templates.ts`
  - `src/lib/email/types.ts`
  - `src/lib/notifications/appointments.ts`
  - `src/lib/notifications/server.ts`
- Production delivery to arbitrary customer emails depends on verified Resend sending domain and correct `EMAIL_FROM`.

Current auth architecture:

- Supabase Auth handles email/password and OAuth.
- Admin authorization is app-level: a Supabase user must also exist in `admin_users`.
- Client portal auth is in progress.
- Desired customer flow is code/OTP style verification, not confusing branded magic-link emails.
- Supabase default emails/templates/SMTP may still need configuration to avoid visible Supabase branding.

Grouped appointment feature status:

- In progress, not considered complete.
- Related files include:
  - `supabase/migrations/0015_grouped_appointment_requests.sql`
  - `supabase/queries/rollback_0015_grouped_appointment_requests.sql`
  - `src/app/api/notifications/appointment-requested-group/`
- Treat migration `0015` as pending/unverified unless the user confirms it was applied.

Current production limitations:

- Custom Resend domain verification is not fully finalized.
- Google OAuth redirect may still send users to `/admin#`; clients should land in `/cuenta`.
- Password recovery, resend-code, use-different-email, and OTP verification flows need hardening.
- Admin services/prices CRUD is incomplete.
- Income dashboard and manual revenue entry are incomplete.
- Google Places Autocomplete is not implemented.
- Online payments are not implemented.
- Multi-tenant/white-label configuration is not implemented.
- `src/components/BookingApp.tsx` is large and fragile; avoid broad edits without explicit scope.

## Development Rules

- Never overwrite `.env.local`, `.env`, or environment files.
- Never expose secrets, tokens, passwords, API keys, service-role keys, or private values in docs, logs, commits, or responses.
- Never rotate API keys automatically.
- Never apply Supabase migrations without explicit user confirmation.
- Never deploy to production without explicit user confirmation.
- Never manage local terminals, kill processes, or restart servers unless requested.
- Never revert user or other-agent work unless explicitly asked.
- Always inspect current files and git status before editing.
- Prefer small, scoped changes over broad refactors.
- Use `apply_patch` for manual file edits.
- Keep production-facing error messages generic and privacy-safe.

## Multi-Agent Collaboration

Before making changes:

1. Read `docs/CURRENT_STATUS.md`.
2. Review `git status`.
3. Review latest files in `supabase/migrations/`.
4. Review open pull requests.
5. Check whether the current branch already contains uncommitted work from another agent.

Collaboration expectations:

- One feature or fix per branch.
- No direct production deploys from exploratory work.
- Do not overwrite another agent's partial work.
- Update `docs/CURRENT_STATUS.md` after meaningful architecture, auth, DB, email, or deployment changes.
- Update this file when a rule, major status item, or next action changes.

## Environment Variables

Names only. Do not add values here.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `THERAPIST_EMAIL`

## Known Issues

- Google OAuth routing needs to send customers to the client portal and admins to the admin panel.
- Email/password signup still risks Supabase-branded link emails unless templates/SMTP/OTP flow are fully configured.
- Resend custom sending domain must be verified before reliable public email delivery.
- Client portal needs full appointment history, pending/confirmed/cancelled grouping, and cancellation actions.
- Admin panel redesign toward the Stitch-inspired layout is not complete.
- Service/pricing editing by admin is pending.
- Payments, Google Places Autocomplete, chatbot, SEO, and multi-tenant onboarding are future work.
- Migration `0015` grouped appointments remains pending/unverified unless confirmed otherwise.

## Next Recommended Actions

1. Stabilize auth redirects: Google login should route clients to `/cuenta` and admins to `/admin`.
2. Finish OTP/code-based signup, resend code, use different email, and forgot-password flows.
3. Complete the client portal: pending, confirmed, cancelled, and historical appointments.
4. Finish admin panel redesign in small sections, starting with dashboard KPIs and pending requests.
5. Verify Resend custom domain and production `EMAIL_FROM`.
6. Confirm whether migration `0015` should be applied, then apply only after explicit approval.
7. Implement Google Places Autocomplete for home-visit addresses.
8. Add admin-managed services/prices before payments or multi-tenant onboarding.
