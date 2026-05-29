# Deployment and Operations

Last updated: 2026-05-29

This document covers production operations for Vercel, Supabase, Resend, DNS, rollback, and release checks.

No secrets are stored here.

## Production Hosting

Platform:

- Vercel.

Current production URL:

```text
https://massage-therapist-tau.vercel.app/
```

Admin route:

```text
https://massage-therapist-tau.vercel.app/admin
```

Client portal route:

```text
https://massage-therapist-tau.vercel.app/cuenta
```

Reservation detail route pattern:

```text
https://massage-therapist-tau.vercel.app/reserva/<public-token>
```

## GitHub/Vercel Flow

Expected flow:

1. Develop locally.
2. Commit to feature branch.
3. Push to GitHub.
4. Open PR.
5. Vercel creates preview deployment.
6. Review preview.
7. Merge after approval.
8. Vercel deploys production.

Direct production deploys should require explicit confirmation.

## Vercel Project

Project name in Vercel has been referred to as:

```text
massage-therapist
```

If project name changes, update this file.

Important Vercel sections:

- Deployments.
- Logs.
- Environment Variables.
- Domains.
- Observability.

## Vercel Environment Variables

Names only:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
RESEND_API_KEY
EMAIL_FROM
THERAPIST_EMAIL
```

Future names likely needed:

```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_PUBLIC_KEY
BINANCE_API_KEY
BINANCE_API_SECRET
APP_BASE_URL
```

Important rules:

- Do not include values in docs.
- Do not overwrite variables blindly.
- Apply variables to Production and Preview if needed.
- Redeploy after env changes.
- If production behaves differently from local, check Vercel env first.

## Supabase Configuration

Supabase is used for:

- Database.
- Auth.
- RLS.
- RPC functions.
- Admin user mapping.

Important external settings:

- Authentication providers.
- Google OAuth provider.
- Site URL.
- Redirect URLs.
- Email templates.
- SMTP settings if custom auth email is used.
- Database migrations.

Known Supabase project reference appears in code/config externally, but do not document keys or private URLs here.

## Supabase Auth Configuration

Required for current and future auth:

- Email/password provider enabled.
- Google provider enabled when Google login is active.
- Site URL should point to the production app.
- Redirect URLs should include:
  - production root
  - production `/cuenta`
  - production `/admin` if admin OAuth is intentionally supported
  - localhost equivalents for development
- Custom SMTP/templates needed to avoid Supabase-branded auth emails.

Desired auth behavior:

- Admin login -> `/admin`.
- Client login -> `/cuenta`.
- Google client login -> `/cuenta`.
- Password recovery -> branded recovery code or recovery flow.

## Resend Setup

Resend is used for transactional email:

- New booking request to professional.
- New booking request to client.
- Status update emails.
- Cancellation emails.
- Contact form emails.

Required env variable names:

```bash
RESEND_API_KEY
EMAIL_FROM
THERAPIST_EMAIL
```

Current limitation:

- If only Resend's test sender is used, production delivery to arbitrary clients is limited.

Production requirement:

- Verify a custom sender domain in Resend.
- Configure DNS records.
- Use a branded `EMAIL_FROM`.

## SMTP Configuration

SMTP is not currently required for Resend transactional emails because the app uses the Resend SDK.

SMTP is relevant for Supabase Auth email branding.

If using Supabase custom SMTP:

- Configure SMTP provider in Supabase Auth settings.
- Use a verified sending domain.
- Update email templates for:
  - signup verification
  - recovery
  - magic link or OTP
- Test on production and localhost.

Do not include SMTP passwords in docs.

## DNS Requirements

### App Domain

Future custom domains:

- Platform domain: to be decided.
- Maria white-label domain: planned as a first example.

If using Vercel domains:

- Add domain in Vercel.
- Configure DNS records as Vercel instructs.
- Wait for verification.
- Update Supabase Auth Site URL and redirect URLs.
- Update Resend links/base URL if needed.

### Email Domain

For Resend:

- Add sending domain in Resend.
- Add required DNS records:
  - SPF/TXT.
  - DKIM/CNAME or TXT records.
  - Optional but recommended DMARC.
- Verify in Resend dashboard.
- Set `EMAIL_FROM` to a sender on the verified domain.

## Custom Domains

Current confirmed production app domain:

```text
https://massage-therapist-tau.vercel.app/
```

Current custom app domain:

- Not confirmed in repo/handover.

Current custom email domain:

- Not confirmed in repo/handover.
- If a domain has been configured in Resend UI, document it after confirmation without exposing DNS secrets.

Planned:

- Main SaaS platform domain.
- White-label domain for Maria.

## Rollback Procedures

### Code Rollback in Vercel

Fast rollback:

1. Open Vercel Deployments.
2. Select previous known-good deployment.
3. Promote/redeploy previous deployment.
4. Verify public booking, admin, and reservation pages.

Git rollback:

1. Identify bad commit.
2. Revert with Git.
3. Push revert branch/PR.
4. Deploy after review.

### Database Rollback

Database rollback is riskier.

Rules:

- Do not roll back database without explicit confirmation.
- Prefer forward fixes where possible.
- Use rollback SQL only after reviewing data impact.
- Backup or export critical data before destructive rollback.

Known rollback helper:

```text
supabase/queries/rollback_0015_grouped_appointment_requests.sql
```

### Environment Rollback

If env vars were changed:

1. Check Vercel env history/notes if available.
2. Restore previous values from secure password manager or dashboard.
3. Redeploy.
4. Verify auth/email.

Do not guess secret values.

## Release Checklist

Before production release:

- Git status is clean except intentional changes.
- PR reviewed.
- `npm run build` passes.
- `npm run lint` passes or known lint gaps are documented.
- Supabase migrations reviewed.
- No unconfirmed migrations pending.
- Vercel env variables verified by name/scope.
- No secrets in diff.
- Public booking tested.
- Admin login tested.
- Admin confirm/reject tested.
- Public cancellation tested.
- Email delivery tested in Resend logs and inbox.
- Client portal tested if touched.
- Mobile layout checked.
- Production deployment confirmed by user.

After production release:

- Open production URL.
- Create a test booking if appropriate.
- Confirm email logs.
- Confirm Supabase row created.
- Confirm busy slot behavior.
- Cancel test booking and confirm slot frees.
- Check Vercel logs for API errors.
- Update `CURRENT_STATUS.md`.

## Incident Checklist

If production breaks:

1. Identify whether issue is frontend, API, Supabase, Resend, auth, or env.
2. Check Vercel logs.
3. Check browser console.
4. Check Supabase logs/query result.
5. Check Resend logs.
6. Check recent deployments.
7. Check recent migrations.
8. Roll back code only if it is clearly a code regression.
9. Do not change secrets during triage unless confirmed necessary.
10. Document the incident and fix.

## Operational Risks

Current risks:

- Auth email branding and OTP flow unfinished.
- Google OAuth redirect needs verification.
- Resend custom domain not confirmed.
- Grouped appointment migration not fully verified.
- Admin service/income/profile sections incomplete.
- Single-tenant assumptions still exist.

