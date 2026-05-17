# Deployment guide

This guide explains how to publish the app with GitHub, Vercel, Supabase, and Resend.

## 1. Confirm the app works locally

Run:

```bash
npm run build
```

What this does:

- Compiles the app like Vercel will do in production.
- Checks TypeScript.
- Checks that pages and API routes can be generated.

If this command passes locally, deployment problems are usually easier to solve.

## 2. Push the project to GitHub

Make sure `.env.local` is not committed. It contains private keys.

The repo should include `.env.example`, which documents the variables without exposing real secrets.

## 3. Create the Vercel project

1. Go to Vercel.
2. Choose `Add New > Project`.
3. Import the GitHub repository.
4. Keep the default Next.js settings.
5. Add the environment variables before deploying.

## 4. Add environment variables in Vercel

In Vercel:

```txt
Project > Settings > Environment Variables
```

Add these variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
RESEND_API_KEY=...
EMAIL_FROM=...
THERAPIST_EMAIL=...
```

Use the same values that work in `.env.local`, except do not paste quotes unless the value itself needs them.

Important:

- `NEXT_PUBLIC_SUPABASE_URL` is safe to expose to the browser.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose if Supabase row-level security is configured.
- `RESEND_API_KEY` must stay private and must not start with `NEXT_PUBLIC_`.

## 5. Deploy

Click `Deploy`.

Vercel will:

- Install dependencies.
- Run the Next.js build.
- Publish the app to a temporary Vercel domain.

## 6. Update Supabase Auth URLs

In Supabase:

```txt
Authentication > URL Configuration
```

Set:

```txt
Site URL = https://your-vercel-domain.vercel.app
```

If you later connect a custom domain, update this value again.

## 7. Test production

After deploy:

1. Open the public Vercel URL.
2. Create a test appointment.
3. Confirm the row appears in `public.appointments`.
4. Confirm the therapist receives the pending-request email.
5. Log into the admin panel.
6. Confirm or decline the appointment.
7. Confirm the patient receives the status email.

## 8. Production email note

For early testing, Resend can send from:

```txt
onboarding@resend.dev
```

For real production, configure a verified domain in Resend so emails are sent from a professional address, for example:

```txt
turnos@yourdomain.com
```
