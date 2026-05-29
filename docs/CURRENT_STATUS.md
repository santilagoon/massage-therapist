# Current Status

Last updated: 2026-05-29 (session 2 — admin panel UX + clients table)

This file is the first document a future AI agent should read. It captures where the project stands now and what should happen next.

No secrets are stored here.

## Current Production URL

```text
https://massage-therapist-tau.vercel.app/
```

Admin:

```text
https://massage-therapist-tau.vercel.app/admin
```

Client portal:

```text
https://massage-therapist-tau.vercel.app/cuenta
```

## Current Local Path

Canonical path:

```text
/Users/santiagohernanlaguna/Documents/Codex/booking-app
```

Historical path:

```text
/Users/santiagohernanlaguna/Documents/Codex/2026-05-11/i-would-like-to-create-a
```

The historical path is a symlink to the canonical path.

## Current Git State

Branch: `main`. All changes committed and pushed. Repo is clean.

Recent commits (newest first):
- `add778c` fix: user selector iOS sheet positioning + admin session handling
- `5994da7` feat: user selector sheet on landing page icon
- `6a0bf91` fix: user icon session awareness on landing page
- `560654f` fix: user icon links to /admin directly
- `92cae1e` fix: admin clients UX — delete modal, email editing, compact mobile panel
- `d37cd91` feat: real clients table (Option B) — CRUD from admin panel
- `a35d069` feat: admin panel UX improvements — mobile login, solicitudes, clientes

Future agents must run `git status --short --branch` before editing.

## Completed This Session (2026-05-29 session 2)

### Admin panel mobile UX
- Login button on `/admin` scrolls to auth form (was silently returning).
- User icon on landing: session-aware selector with bottom sheet (mobile) and dropdown (desktop).
  - Admin session active → solid black icon → `/admin` directly.
  - No session / client session → sheet with "Soy paciente" (→ `/cuenta`) and "Panel profesional" (→ `/admin`).
  - Sheet moved to root DOM level to fix iOS Safari `position: fixed` bug inside `backdrop-blur` header.
- Solicitudes: "Futuros" filter tab removed.
- Solicitudes: filter tabs now scroll horizontally on mobile (no wrapping).
- Solicitudes: search input full-width on mobile.
- Dashboard KPIs: always 3-column grid, compact padding/text on mobile, heading smaller on mobile.

### Clients table (migration 0016) — Option B full implementation
- New table `clients`: email (unique lowercase), name, phone, notes, timestamps.
- `client_id uuid FK` added to `appointments` (on delete set null).
- BEFORE INSERT trigger `sync_appointment_client`: auto creates/updates client on every new booking — existing RPCs (`request_public_appointment`, `request_grouped_appointments`) unchanged.
- Backfill: 14 clients created from existing appointments, all FKs linked.
- RLS: admin-only via `is_admin()`.
- `update_client` and `delete_client` RPCs (auth-gated).
- Frontend: `Client` type, `loadAdminClients`, `updateClient` (direct table update, supports email), `deleteClient` in `bookings.ts`.
- `AdminClients` now reads from real DB (not derived from appointments).
- `AdminClientCard`: inline edit form (name, email, phone, notes), delete with modal confirmation, "Ver solicitudes" shortcut navigates to Solicitudes filtered by client email.

## Completed P0 Fixes

P0 means required for the core booking system to avoid broken flows or unsafe production behavior.

Completed:

- Public booking can create appointments through Supabase RPC instead of unsafe public table insert.
- RLS insert failure was addressed by `request_public_appointment`.
- Pending appointments block availability.
- Public cancellation flow exists and frees slots.
- Cancellation emails can be sent to client and professional.
- Notification API routes were hardened with server-side verification helpers.
- Admin route separated at `/admin`.
- Admin login checks Supabase Auth plus `admin_users`.
- Admin can confirm/reject appointments.
- Admin can create blocks/time exceptions.
- Public reservation token detail page exists at `/reserva/[token]`.
- Client portal route exists at `/cuenta`.
- Runtime missing handler class of bugs was addressed for current known handlers:
  - `submitContact`
  - `handleCreateBlock`
- User-facing errors were moved toward generic messages instead of exposing provider names.
- Vercel environment variables were restored enough for production booking/email flows to work again.

## Completed P1 Fixes

P1 means important product/UX improvements but not all final.

Completed or partially completed:

- Public landing redesigned with Maria Mikhailova branding and hero image.
- Service copy and prices updated.
- Currency dropdown exists.
- Language dropdown exists.
- Phone field is required.
- Notes field is optional.
- Booking success modal implemented.
- A domicilio/Zapiola/other location modality added.
- Client portal initial UI exists.
- Client appointment history/current views exist.
- Client cancellation from portal exists for eligible appointments.
- Google login implementation started.
- Auth UI supports login/register/verification/recovery modes.
- Reusable login auth skill exists locally and should be updated as auth UI changes.
- Admin mobile navigation improved but still needs final redesign.
- Grouped appointment request implementation started.

## Current Custom Email Domain

No custom Resend sending domain is confirmed in this handover.

Current state:

- Resend SDK integration exists.
- A test sender may have been used during development.
- Production delivery to arbitrary clients should not be considered fully ready until a custom sending domain is verified.

Action required:

- Verify custom sending domain in Resend.
- Add DNS records.
- Update `EMAIL_FROM`.
- Redeploy.
- Test client and professional emails.

## Current Authentication State

Admin auth:

- Implemented through Supabase Auth.
- Admin access requires matching row in `admin_users`.
- Admin route is `/admin`.

Client auth:

- In progress.
- `/cuenta` exists.
- Email/password registration and login UI exists.
- Verification-code UI exists.
- Password recovery UI exists.
- Google OAuth is started.

Known auth gaps:

- Supabase default email branding may still appear unless custom SMTP/templates are configured.
- Supabase may send link-style confirmation instead of desired code flow unless Auth settings/templates are adjusted.
- Google OAuth redirect must be verified so clients go to `/cuenta`, not `/admin#`.
- Forgot password flow must be fully tested with real configured email.
- "Use another email" and "Resend code" UX must be tested after SMTP/template decisions.

## Current Admin Functionality

Working or partially working:

- Admin login.
- Admin dashboard route.
- Section navigation.
- Panel metrics.
- Agenda by day.
- Solicitudes view.
- Confirm/reject pending requests.
- Bloquear Dias/time blocks.
- Basic clients view derived from appointments.
- Placeholder/incomplete services section.
- Placeholder/incomplete income section.
- Placeholder/incomplete profile/team configuration.

Recent desired admin changes:

- KPIs should be simplified to:
  - Confirmados.
  - Por confirmar.
  - Total del dia or revenue only if useful.
- User requested reducing confusing KPI count.
- KPIs should update based on selected agenda day.
- Admin design should move toward provided black/white minimal dashboard with sidebar/mobile bottom navigation.

## Current Patient Portal Functionality

Route:

```text
/cuenta
```

Current capabilities:

- Authenticated client page.
- Loads current user's appointments.
- Shows current appointments and history.
- Allows cancellation for eligible future pending/confirmed appointments.
- Admin users should redirect to `/admin`.

Needs work:

- Better post-Google-login landing.
- Better empty states.
- Appointment modification/rescheduling.
- Clear separation of pending, confirmed, cancelled, completed.
- Branded login/register/recovery flow.
- Email verification code flow.

## Grouped Appointment Feature Status

Goal:

- Let a client request multiple dates/times in one booking flow, for example all appointments for a month.

Current code status:

- Client code references grouped booking flow.
- Grouped notification API route exists.
- Supabase function/migration exists locally:

```text
supabase/migrations/0015_grouped_appointment_requests.sql
```

Rollback helper exists:

```text
supabase/queries/rollback_0015_grouped_appointment_requests.sql
```

Current status:

- In progress.
- Not fully verified from this handover pass.
- Treat as pending until migration status is checked against linked Supabase and production behavior is tested.

## Pending Migration 0015 Status

Migration:

```text
0015_grouped_appointment_requests.sql
```

Purpose:

- Add grouped request support through `appointment_requests`.
- Add `appointments.request_id`.
- Add `request_grouped_appointments(...)`.

Status:

- File exists locally.
- It appeared untracked in the last git audit.
- It may or may not be applied to Supabase.
- Do not assume it is live.

Next required checks:

1. Run git status.
2. Check migration list against linked Supabase.
3. Review SQL for RLS and backward compatibility.
4. Confirm with user before applying to production.
5. Test grouped booking end-to-end.
6. Commit migration and rollback helper if approved.

## Pending Deployment Status

No production deploy should be assumed after this documentation update.

Before deployment:

- Run build.
- Review git diff.
- Confirm migrations.
- Confirm env variables.
- Confirm with user.

## Main User Flows Current State

### Public Booking Flow

Status: mostly functional.

Needs verification after every relevant change:

- Select modality.
- Select service.
- Select day/time.
- Enter patient info.
- Submit request.
- Appointment row created.
- Modal appears.
- Emails sent.
- Slot becomes busy.

### Cancellation Flow

Status: tested successfully in prior session.

Known behavior:

- Opening reservation from email works.
- Cancelled appointment becomes available again.
- Cancellation email goes to client and professional.

Needs regression testing after grouped request work.

### Admin Confirmation Flow

Status: functional.

Needs continued verification:

- Admin can confirm.
- Admin can reject.
- Client/professional status emails behave correctly.
- Slot behavior remains correct.

### Client Portal Flow

Status: partial.

Needs:

- Google login final routing.
- Email verification flow.
- Password recovery.
- Appointment history polishing.

## Mock Data vs Real Backend

Real backend:

- Supabase configured with public env variables.
- App uses RPC/functions and real tables.

Mock/fallback:

- In development, if Supabase env vars are missing, app can use local fallback data.
- This is useful for UI but not production validation.

When testing real booking:

- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

## Next Recommended Actions

Priority order:

1. **Verify mobile UX** (needs phone login): tabs en Solicitudes scroll horizontal OK, "Ver solicitudes" en Clientes funciona, editar/eliminar cliente desde mobile.
2. **Auto-expire pendientes vencidos**: marcar `declined` donde `status = 'pending_approval'` y `starts_at < now()`. Consultar al usuario qué implementación prefiere (pg_cron, check al cargar, o función manual).
3. **Google OAuth redirect**: clientes → `/cuenta`, admins → `/admin`. Hoy puede ir a `/admin#`.
4. **OTP/código en auth de clientes**: reemplazar magic link de Supabase con flujo de código para evitar branding de Supabase.
5. **Portal clientes `/cuenta`**: historial de turnos, separar pending/confirmed/cancelled, cancelación elegible.
6. **Admin servicios CRUD**: precios y duración editables desde el panel (hoy hardcodeados en `booking.ts`).
7. **Income dashboard**: ingresos por período.
8. **Custom domain**: configurar dominio propio (hoy en massage-therapist-tau.vercel.app).
9. Google Places Autocomplete para direcciones a domicilio.

## Notes for Future Agents

- Do not continue by making huge unrelated refactors.
- Work in small blocks.
- Keep docs updated.
- Use the existing repo patterns first.
- Treat `BookingApp.tsx` as fragile because it contains many flows.
- Split components only when there is a clear safety plan.
- Do not apply Supabase migrations or deploy production without explicit confirmation.

