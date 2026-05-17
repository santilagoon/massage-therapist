# Email setup with Resend

The app sends emails through server-side API routes:

- `POST /api/notifications/appointment-requested`
- `POST /api/notifications/appointment-status`

These routes use Resend and require environment variables in `.env.local` locally and in Vercel later.

## Variables

```bash
RESEND_API_KEY=...
EMAIL_FROM=Massage Booking <onboarding@resend.dev>
THERAPIST_EMAIL=therapist@example.com
```

## What each variable means

- `RESEND_API_KEY`: private API key from Resend. Never expose it with `NEXT_PUBLIC_`.
- `EMAIL_FROM`: sender shown in the email. For early testing, Resend's onboarding sender can work. For production, use a verified domain.
- `THERAPIST_EMAIL`: email where the therapist receives new pending appointment requests.

## Current email behavior

When a patient requests an appointment:

- the patient receives a request-received email
- the therapist receives a new-pending-request email

When the therapist confirms or declines:

- the patient receives a status email

If Resend is not configured, the appointment flow still works and the server skips email delivery.
