# Product and design notes

These notes summarize the intended direction after reviewing Turnify screenshots and the current MVP.

## Product Direction

The app should feel like a simple, premium booking tool for a massage therapist, not like a generic technical demo.

Primary users:

- Patient booking from mobile.
- Massage therapist managing pending and confirmed appointments from desktop or mobile.

## Booking Without Mandatory Registration

For the MVP, patients should not be forced to create an account before requesting an appointment.

Reasons:

- Lower friction on mobile.
- Faster conversion from social link, Instagram, Google Maps, or referral.
- The therapist still keeps control because every appointment is `pending_approval`.
- The booking form already collects enough identity data: full name, email, phone, language, and notes.

Recommended flow:

1. Patient chooses service, date, and time.
2. Patient enters full name, email, phone, and optional notes.
3. Appointment is created as `pending_approval`.
4. Therapist confirms or declines from the admin panel.
5. Patient receives an email.

Future account option:

- Let returning patients create an account later.
- Do not block first booking behind registration.
- Add "returning patient" features only if they clearly help: booking history, faster checkout, reminders, cancellations.

## Visual Direction

Reference: Turnify's clean cards, centered layouts, simple admin navigation, horizontal date picker, and clear booking summary.

Preferred palette for this project:

- White background.
- Black and near-black text.
- Soft gray borders.
- Black primary actions.
- Muted beige/stone support color only where warmth is needed.
- Avoid the purple/violet brand feel from Turnify.

Tone:

- Quiet.
- Premium.
- Minimal.
- Trustworthy.
- More wellness/professional than SaaS-dashboard.

## Public Booking UI

The patient booking page should be redesigned as a step flow:

1. Choose service.
2. Choose day.
3. Choose time.
4. Review summary.
5. Enter patient details.
6. Request appointment.

Important UI details:

- Service cards should show title, duration, price, and short description.
- Date selection should use horizontal day pills/cards.
- Time slots should be clear buttons, not a native select.
- Summary should stay close to the confirm button.
- Mobile should feel like the primary experience.

## Admin UI

Current admin panel should evolve into sections similar to:

- Panel: daily snapshot and pending actions.
- Services: configurable service list.
- Agenda: date strip plus appointments for selected day.
- Blocks: blocked days or ranges.
- Clients: patient list/search.
- Income: KPIs for completed appointments.
- Profile: therapist/business settings and booking link.

For the MVP, prioritize:

1. Panel / pending appointments.
2. Agenda.
3. Services.
4. Blocks.

Clients, income, and team can come later.

## Prices and Currency

The app must support prices in Argentine pesos and optionally USD.

Recommended product behavior:

- Each service can have ARS price.
- Each service can optionally have USD price.
- Public booking page can show one or both prices depending on therapist settings.
- Admin services screen should make prices easy to edit later.

Recommended database direction:

- Keep `services.price_cents` and `services.currency` for the primary price.
- Add optional `services.price_usd_cents` later if the therapist wants to show USD alongside ARS.
- If pricing becomes more complex, create a separate `service_prices` table.

## Near-Term Implementation Plan

1. Redesign public booking page using black/white visual system.
2. Replace service/date/time native selects with card and pill interactions.
3. Add visible price labels to services.
4. Add database migration for service prices.
5. Improve admin panel visual structure.
6. Add agenda view for selected day.
7. Add block days/ranges management.
8. Add service editing in admin.

## Open Questions

- What is the real public brand/name of the therapist?
- Should prices be visible publicly from day one?
- Should USD be shown to everyone or only as an alternate reference?
- Should the therapist accept online payment later, or only appointment requests?
- Should patients be allowed to cancel from email link later?
