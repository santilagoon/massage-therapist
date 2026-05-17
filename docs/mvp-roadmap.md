# Massage Booking MVP

## Current MVP behavior

- Patients can request an appointment in Spanish, English, or Russian.
- A requested appointment is created as `pending_approval`.
- Pending and confirmed appointments block the selected time slot.
- The therapist can confirm or decline requests from the admin panel.
- Declined appointments stop blocking the time slot.

## Next implementation stages

1. Connect Supabase and replace local browser storage with database reads/writes.
2. Add therapist login for the admin panel.
3. Add Resend emails for request received, confirmed, and declined states.
4. Add editable services, weekly schedule, and exceptions for holidays or Saturdays.
5. Deploy through Vercel and connect the GitHub repository.
