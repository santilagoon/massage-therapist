# AI Collaboration Protocol

Last updated: 2026-05-29

This file defines mandatory collaboration rules for Claude, ChatGPT, Gemini, Cursor, Codex, and any other AI agent working on this project.

The goal is to prevent conflicting edits, accidental secret exposure, broken migrations, and production incidents.

## Prime Directive

Every agent must preserve project continuity.

Before coding, understand the current state. Before deploying, confirm. Before changing data, confirm. Before overwriting, stop.

## Branching Strategy

- Use one feature per branch.
- Do not make direct feature edits on the production branch.
- Use descriptive branch names:
  - `feature/client-portal-history`
  - `fix/auth-google-redirect`
  - `admin/services-crud`
  - `db/grouped-appointment-requests`
- Keep PRs small enough to review.
- Do not mix unrelated frontend, backend, database, and copy changes in one PR unless the feature requires it.
- If the working tree is dirty, identify which changes are yours before editing.

## Production Branch Rules

- No direct production branch edits unless explicitly requested.
- No production deploy unless explicitly confirmed by the user.
- No production database migration unless explicitly confirmed by the user.
- No secret rotation unless explicitly confirmed by the user.
- No rollback unless explicitly confirmed by the user, except local non-destructive checks.

## Conflict Prevention

Every agent must:

- Read [CURRENT_STATUS.md](./CURRENT_STATUS.md) first.
- Read this protocol before editing.
- Review current git status before changing files.
- Review open PRs before coding if GitHub access is available.
- Review latest migrations before changing database logic.
- Check whether the same feature is already in progress.
- Prefer minimal scoped changes.

Every agent must not:

- Overwrite `.env`, `.env.local`, `.env.production`, or any secret file.
- Commit secrets, tokens, API keys, passwords, Supabase keys, Resend keys, or Google keys.
- Rotate secrets automatically.
- Apply Supabase migrations without confirmation.
- Deploy production without confirmation.
- Manage local terminals or kill dev servers unless explicitly requested.
- Revert user changes unless explicitly requested.
- Rewrite large files casually.
- Refactor unrelated code while fixing a bug.

## Session Startup Checklist

Every new AI session must do this before coding:

1. Read all handover documents in `/docs`.
2. Review current git status.
3. Review open PRs if GitHub access is available.
4. Review latest migrations in `supabase/migrations`.
5. Review [CURRENT_STATUS.md](./CURRENT_STATUS.md).
6. Identify the canonical project folder.
7. Confirm whether the task touches:
   - frontend only
   - backend/API
   - Supabase migrations
   - auth
   - email
   - deployment
   - production data
8. State the intended scope before making non-trivial edits.

## Before Editing Checklist

Before editing files:

- Search for existing implementation.
- Read the relevant component/module.
- Check for similar local patterns.
- Avoid introducing a second pattern unless necessary.
- If touching auth, read `src/lib/supabase/auth.ts`.
- If touching booking, read `src/lib/supabase/bookings.ts`.
- If touching notifications, read `src/lib/notifications/server.ts` and API routes.
- If touching emails, read `src/lib/email/templates.ts`, `types.ts`, and `resend.ts`.
- If touching admin UI, read `BookingApp.tsx` and consider whether to split components safely.

## Database Change Protocol

Database changes require extra care.

Before creating a migration:

- Read all existing migrations.
- Identify current schema.
- Decide if the change is backward-compatible.
- Write a rollback note or rollback SQL for risky changes.
- Consider RLS.
- Consider existing production data.
- Ask for confirmation before applying to linked production Supabase.

Allowed without confirmation:

- Reading local migration files.
- Creating a local migration file.
- Explaining SQL.

Not allowed without confirmation:

- Running migrations against linked Supabase.
- Dropping tables/columns.
- Deleting production data.
- Rotating DB credentials.
- Disabling RLS.
- Widening public table policies.

## Environment Variable Protocol

Agents may document variable names.

Agents must not:

- Print secret values.
- Ask the user to paste secret values into chat unless absolutely necessary.
- Commit secret values.
- Add secrets to handover docs.
- Overwrite Vercel env values blindly.

When env issues are suspected:

- Check variable names.
- Check if the app reports missing config.
- Ask the user to verify values in the dashboard if necessary.
- Prefer `vercel env pull .env.local` only if safe and approved.

## Auth Protocol

Auth is sensitive because it affects clients and admin access.

Rules:

- Keep admin and client auth separate.
- Normal clients should land on `/cuenta`.
- Admin users should land on `/admin`.
- Non-admin authenticated users must not see admin data.
- Error messages must be generic and user-safe.
- Do not expose Supabase internals in UI copy.
- Do not store plaintext passwords.
- Do not add password columns.
- Use Supabase Auth or a vetted auth provider.

## Notification and Email Protocol

Rules:

- Email routes must verify appointments/server-side data before sending.
- Do not trust client-provided recipient emails alone.
- Do not expose Resend errors directly to users.
- Use generic UI errors:
  - "No pudimos completar la accion. Intenta nuevamente."
- Keep detailed provider errors in server logs only.
- Verify sender domain before production client emails.

## UI/UX Protocol

Rules:

- Mobile-first for public booking.
- Admin mobile navigation must not require horizontal scrolling.
- Keep black/white design direction unless user changes brand preferences.
- Avoid decorative complexity.
- Do not add large marketing sections where the user needs an app workflow.
- Text must fit on mobile.
- Buttons and interactive controls must use pointer cursor.
- Do not expose internal implementation terms to public users.

## Testing Protocol

For code changes:

- Run relevant local checks when feasible.
- For frontend changes, open localhost and click the affected flow if possible.
- For auth changes, test both admin and client paths.
- For booking changes, test:
  - public request
  - busy slot
  - admin confirm/reject
  - public cancellation
  - email route behavior
- For database changes, test with real Supabase only after confirmation.

## Documentation Protocol

Update docs when changing:

- Architecture.
- Auth flow.
- Booking flow.
- Notification flow.
- Database migrations.
- Env variables.
- Deployment process.
- Current known status.
- Reusable AI skills.

At minimum, update:

- `docs/CURRENT_STATUS.md`
- relevant handover doc
- any skill file if a reusable pattern changed

## Local Terminal Protocol

The user asked in the past to run commands without repeatedly asking, but future agents must still obey sandbox/security policy.

Do not:

- Kill dev servers unless the user asks or the task requires it.
- Start long-running processes without tracking them.
- Leave needed sessions running at final response.
- Run destructive commands without explicit request.

Allowed:

- Read-only commands.
- `npm run dev` if user asks to start server.
- `npm run build` for verification.
- Git status/diff/log.

## PR Review Protocol

Before opening or updating a PR:

- Summarize changed files.
- Mention migrations.
- Mention env changes.
- Mention tests run.
- Mention manual QA.
- Mention known risks.

Do not hide:

- Failed tests.
- Unverified production behavior.
- Pending migrations.
- Required dashboard changes.

## Handoff Protocol

When ending a session after meaningful work:

- Update `CURRENT_STATUS.md`.
- Mention what changed.
- Mention what was not done.
- Mention any commands/tests run.
- Mention any manual actions required from user.
- Keep final answer concise but explicit.

