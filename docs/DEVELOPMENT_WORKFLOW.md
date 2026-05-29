# Development Workflow

Last updated: 2026-05-29

This document explains how to work on the project locally, deploy safely, handle Supabase, and avoid repeating known issues.

No secrets are stored here.

## Canonical Local Path

Use this folder:

```bash
/Users/santiagohernanlaguna/Documents/Codex/booking-app
```

Historical path:

```bash
/Users/santiagohernanlaguna/Documents/Codex/2026-05-11/i-would-like-to-create-a
```

The historical path is a symlink to the canonical folder. It is not a separate app copy. Prefer `booking-app` in future documentation and commands.

## Local Setup

1. Open terminal.
2. Go to the project:

```bash
cd /Users/santiagohernanlaguna/Documents/Codex/booking-app
```

3. Install dependencies:

```bash
npm install
```

4. Create `.env.local` from the required variable names. Never commit `.env.local`.

5. Start the dev server:

```bash
npm run dev
```

6. Open:

```text
http://localhost:3000
```

## npm Commands

Current package scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Use:

- `npm run dev` for local development.
- `npm run build` before a significant push or production deploy.
- `npm run lint` when changing code structure or before PR review.
- `npm run start` only after building when testing production mode locally.

## Environment Variables

Required for real backend mode:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
RESEND_API_KEY=
EMAIL_FROM=
THERAPIST_EMAIL=
```

Do not store values in docs or commits.

Future variables likely needed:

```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
BINANCE_API_KEY=
BINANCE_API_SECRET=
APP_BASE_URL=
```

Only add future variables when implementing those features.

## Supabase Workflow

Supabase CLI is installed locally through Homebrew.

Expected binary:

```bash
/opt/homebrew/bin/supabase
```

Useful commands:

```bash
/opt/homebrew/bin/supabase --version
/opt/homebrew/bin/supabase login
/opt/homebrew/bin/supabase link --project-ref <project-ref>
/opt/homebrew/bin/supabase migration list --linked
```

Migration source of truth:

```bash
supabase/migrations
```

Guidelines:

- Create a new migration file for database changes.
- Do not manually keep SQL only in Supabase SQL Editor tabs.
- SQL Editor tabs can be closed once the SQL exists in the repo or has been intentionally discarded.
- Do not apply migrations to production without explicit user confirmation.
- Do not use service role keys in frontend code.
- Always review RLS impact.
- Always include rollback notes for risky migrations.

Pending migration to review:

```bash
supabase/migrations/0015_grouped_appointment_requests.sql
```

Rollback helper:

```bash
supabase/queries/rollback_0015_grouped_appointment_requests.sql
```

## Vercel CLI Usage

Vercel is the production host. The project is connected to GitHub/Vercel.

Useful commands if Vercel CLI is available:

```bash
vercel whoami
vercel env ls
vercel env pull .env.local
vercel deploy
vercel deploy --prod
```

Guardrails:

- Do not deploy production without confirmation.
- Do not overwrite environment variables blindly.
- If env vars are changed, redeploy.
- Verify Production and Preview scopes.
- Keep env values out of Git and docs.

## Resend Usage

The app uses the Resend SDK, not a Resend CLI workflow.

Operational setup is mostly through:

- Resend dashboard.
- Resend domain verification UI.
- Resend API logs.
- Application logs in Vercel.

Important:

- `RESEND_API_KEY` must be in Vercel and local `.env.local`.
- `EMAIL_FROM` must use a sender accepted by Resend.
- `THERAPIST_EMAIL` receives professional notifications.
- Real clients require a verified sending domain.
- If Resend is not configured or delivery fails, UI must show user-safe messages and never expose internal provider names.

## Git Workflow

Repository:

```text
https://github.com/santilagoon/massage-therapist.git
```

Recommended:

1. Check status:

```bash
git status --short --branch
```

2. Create a feature branch:

```bash
git switch -c feature/short-description
```

3. Make scoped changes.
4. Run checks.
5. Commit intentionally.
6. Push branch.
7. Open PR.

Do not:

- Commit `.env.local`.
- Commit API keys.
- Force-push shared branches without explicit agreement.
- Directly edit production branch for feature work.
- Revert user changes unless explicitly requested.

## Troubleshooting

### npm Permissions Issue

Issue:

- Local npm/Homebrew/Supabase setup had PATH and permission confusion.
- Homebrew installed but `brew` was not found until shell environment was configured.

Fix pattern:

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Then install/use Supabase CLI:

```bash
brew install supabase/tap/supabase
/opt/homebrew/bin/supabase --version
```

### Hydration Mismatch Issue

Issue:

- React hydration mismatch occurred because server and client formatted dates/times differently.
- Example: non-breaking spaces and locale-specific AM/PM output.

Lesson:

- Use deterministic date/time formatting helpers.
- Normalize formatted strings.
- Avoid rendering time-sensitive values differently on server and client.
- Prefer client-only rendering for values that depend on current local time.

### Admin Handler Bug

Issue:

- Runtime error occurred when a component passed a handler that was not defined.
- Example class of bug: `onCreateBlock={handleCreateBlock}` or `onSubmit={submitContact}` with missing function.

Current state:

- `submitContact` exists.
- `handleCreateBlock` appears present.

Lesson:

- After moving UI sections, search for every prop handler and verify it exists.
- Build or run the affected route after handler changes.

### Notification Security Bug

Issue:

- Notification routes were too trusting of client-provided data.

Fix:

- Server-side verification helpers were added in `src/lib/notifications/server.ts`.
- API routes verify appointment/request identity before sending emails.

Lesson:

- Never let a public client request send arbitrary email.
- Use appointment public token/request token checks.
- Keep Resend/API secrets server-side only.

### Vercel Env Overwrite Incident

Issue:

- Vercel environment variables were missing or overwritten, causing production auth/email failures.

Lesson:

- Before changing Vercel env, list existing variables.
- Add missing variables one at a time.
- Do not bulk overwrite unless you have a verified backup.
- After env changes, redeploy production.
- Verify both production and preview scopes.

### Resend Domain Verification Issue

Issue:

- Resend test sender can work for limited recipients, but real client delivery needs a verified sending domain.

Lesson:

- Configure a real sending domain.
- Add DNS records.
- Verify domain in Resend.
- Use branded `EMAIL_FROM`.
- Watch Resend logs and spam folders.

### Supabase RLS Insert Failure

Issue:

- Public booking failed with:

```text
new row violates row-level security policy
```

Fix:

- Public appointment creation moved to RPC `request_public_appointment`.

Lesson:

- Do not loosen table insert policies unless absolutely necessary.
- Prefer RPC functions for public business actions.

### Supabase Auth Branding Issue

Issue:

- Signup email showed Supabase branding and a confirmation link.

Desired:

- Branded code-based verification flow inside the app.

Lesson:

- Configure Supabase Auth email templates and custom SMTP, or own the verification email flow carefully.
- Site URL and redirect URLs must be correct.

### Google OAuth Redirect Issue

Issue:

- Google login returned users to `/admin#` in some cases.

Desired:

- Client Google login should redirect to `/cuenta`.
- Admin login should remain admin-only.

Lesson:

- Check `signInWithGoogle("/cuenta")`.
- Check Supabase URL Configuration.
- Check Google Cloud OAuth redirect URIs.
- Test from production and localhost.

### Browser Extension Noise

Issue:

- DevTools showed errors from browser extensions such as MetaMask/content scripts.

Lesson:

- Confirm whether errors come from app bundle, Supabase requests, API routes, or extensions.
- Do not chase extension errors unless they break the app.

## Local Mock Data vs Real Backend

The app has fallback/local behavior when Supabase is not configured in development.

Real backend mode requires:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

If these are missing in development:

- App can use local fallback services/appointments.
- This is useful for UI work but not reliable for testing production flows.

Before validating booking, cancellation, admin, or client portal, ensure the app is using real Supabase config.

## Lessons Learned

- Keep database changes in migrations, not only SQL Editor tabs.
- Keep docs updated after major architecture changes.
- Separate client, admin, and public concerns gradually.
- Do not expose internal provider names in UI error messages.
- Do not rely on emails until Resend domain is verified.
- Do not trust client-side notification payloads.
- Use public tokens for reservation management.
- Use RPC for public writes.
- Validate production environment variables before debugging app code.
- Preserve the user's work in a dirty tree; do not revert unrelated changes.

