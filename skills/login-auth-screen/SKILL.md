---
name: login-auth-screen
description: Use when designing or implementing a reusable login, registration, email verification, password recovery, or social sign-in screen for web apps. Covers compact auth-card UI, step-based flows, Supabase Auth OTP patterns, Google login, resend-code and use-different-email interactions, and privacy-safe error wording.
---

# Login Auth Screen

Use this skill for authentication screens that need to feel simple, modern, compact, and reusable across projects.

## Design Direction

- Prefer a centered auth card over a full-page form.
- Keep the visual system quiet: neutral background, white card, clear border, soft shadow, strong primary button.
- Use tabs or segmented controls for `Ingresar` and `Registrarse`.
- Keep field heights consistent and compact; avoid oversized generic form inputs.
- Make the active action obvious, but avoid visually heavy decoration.
- Use hover/click cursors on all actionable items.
- Keep copy human-facing; never expose provider names such as Supabase, Resend, or internal API errors.

## Core States

Model the screen as explicit states rather than separate pages when possible:

- `login`: email, password, Google sign-in, forgot password link.
- `register`: first name, last name, email, password.
- `verifySignup`: email-code input after first registration.
- `recover`: email input for password recovery.
- `verifyRecovery`: email-code input for password recovery.
- `resetPassword`: new password input after recovery code is verified.

## Required Flows

- First registration sends an email code and moves the user to a verification-code screen.
- Verification screen includes: code field, resend code, and use different email.
- Resend signup code should call the auth provider's resend signup flow.
- Password recovery sends a recovery code or recovery link depending on provider configuration.
- Recovery verification should allow the user to set a new password.
- Google login should be present when enabled, but the app must still enforce role permissions after OAuth succeeds.
- Client social login should redirect to the client portal/account area, not to the admin dashboard.
- If OAuth ever lands on an admin URL because of provider/Site URL configuration, detect the authenticated non-admin account and immediately redirect it to the client portal.

## Supabase Auth Pattern

- Register with `supabase.auth.signUp({ email, password, options: { data } })`.
- Verify signup code with `supabase.auth.verifyOtp({ email, token, type: "signup" })`.
- Resend signup code with `supabase.auth.resend({ email, type: "signup" })`.
- Send password recovery with `supabase.auth.resetPasswordForEmail(email)`.
- Verify recovery code with `supabase.auth.verifyOtp({ email, token, type: "recovery" })`.
- Save the new password with `supabase.auth.updateUser({ password })` after recovery verification.
- Start Google login with `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })`.
- Supabase's default Auth emails may show Supabase branding and send links. For a code-entry UX, customize the Supabase Auth email templates to show `{{ .Token }}` and avoid relying only on `{{ .ConfirmationURL }}`.
- To brand the sender, configure custom SMTP in Supabase Auth, usually through a verified email domain/provider such as Resend SMTP. Otherwise users can see the default Supabase sender.
- Configure Supabase Auth Site URL and Redirect URLs for both production/custom domain and localhost. Wrong redirect settings can send users to `localhost` after clicking an Auth email link.
- Google OAuth must be enabled in Supabase Auth Providers with Google Client ID/Secret and the Supabase callback URL configured in Google Cloud. This is not solved by adding a Vercel environment variable.

## Role Safety

- Registration creates a user account, not an admin account.
- Do not grant admin access just because a user can log in.
- After login or OAuth, check app-specific authorization such as an `admin_users` table.
- If a logged-in user lacks admin access, sign them out or redirect to the client area.
- Password recovery should not reveal whether an email exists. Use generic copy such as "Si el email está registrado, vas a recibir un código" to avoid account enumeration.
- Keep admin and client destinations separate. Public user icons and Google login should go to a client portal such as `/cuenta`; `/admin` should remain a protected professional-only surface.

## UX Copy

- Spanish examples:
  - `Revisá tu email`
  - `Ingresalo abajo para verificar {email}.`
  - `Reenviar código`
  - `Usar otro email`
  - `Olvidé mi contraseña`
  - `Continuar con Google`
  - `Si el email está registrado, vas a recibir un código para recuperar la contraseña.`
- Error wording should be generic and useful:
  - `No se pudo completar la acción. Intentá nuevamente.`
  - `El código no es válido o venció. Intentá nuevamente.`

## Maintenance Rule

Whenever the project login, registration, verification-code, password-recovery, or social-login screen changes, update this skill in the same commit or in a companion commit.
